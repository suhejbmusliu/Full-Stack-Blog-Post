import { Router } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { prisma } from "../lib/prisma.js";
import { authLimiter } from "../middleware/rateLimiter.js";
import {
  signAccessToken,
  storeRefreshToken,
  makeRandomToken,
  signRefreshToken,
  verifyRefresh,
  validateRefreshToken,
  revokeRefreshToken
} from "../lib/jwtUtils.js";
import { sendEmail } from "../lib/emailService.js";
import { requireAuth } from "../middleware/auth.js";
import { logAdminAction } from "../lib/logger.js";
import { generate2FASecret, makeQRCodeDataUrl, verify2FAToken } from "../lib/twoFactorAuth.js";

const router = Router();

function setRefreshCookie(res, value) {
  res.cookie("refreshToken", value, {
    httpOnly: true,
    sameSite: "lax",
    secure: String(process.env.COOKIE_SECURE) === "true",
    path: "/api/auth",
  });
}

// LOGIN (supports 2FA if enabled)
router.post("/login", authLimiter, async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  const { password, twoFactorCode } = req.body;

  const admin = await prisma.admin.findUnique({ where: { email } });
  if (!admin || !admin.isActive) return res.status(401).json({ ok: false, error: "Invalid credentials" });

  if (admin.lockedUntil && admin.lockedUntil > new Date()) {
    return res.status(429).json({ ok: false, error: "Account locked. Try later." });
  }

  const ok = await bcrypt.compare(password, admin.passwordHash);
  if (!ok) {
    const failed = admin.failedLogins + 1;
    const lockedUntil = failed >= 8 ? new Date(Date.now() + 15 * 60 * 1000) : null;

    await prisma.admin.update({
      where: { id: admin.id },
      data: { failedLogins: failed, lockedUntil },
    });

    return res.status(401).json({ ok: false, error: "Invalid credentials" });
  }

  // If 2FA enabled, require code
  if (admin.twoFactorEnabled) {
    if (!twoFactorCode) {
      return res.status(401).json({ ok: false, error: "2FA_REQUIRED" });
    }
    const valid2fa = verify2FAToken(admin.twoFactorSecret, twoFactorCode);
    if (!valid2fa) return res.status(401).json({ ok: false, error: "INVALID_2FA" });
  }

  await prisma.admin.update({
    where: { id: admin.id },
    data: { failedLogins: 0, lockedUntil: null, lastLoginAt: new Date() },
  });

  const rawRefresh = makeRandomToken();
  const expiresAt = new Date(Date.now() + Number(process.env.JWT_REFRESH_EXPIRES_DAYS || 14) * 86400000);

  const rt = await storeRefreshToken({
    adminId: admin.id,
    rawToken: rawRefresh,
    expiresAt,
    ip: req.ip,
    userAgent: req.headers["user-agent"] || "",
  });

  const accessToken = signAccessToken(admin);
  const refreshJwt = signRefreshToken(admin, rt.id);

  setRefreshCookie(res, `${refreshJwt}.${rawRefresh}`);

  return res.json({
    ok: true,
    accessToken,
    admin: { id: admin.id, email: admin.email, name: admin.name, role: admin.role },
  });
});

// REFRESH (rotation)
router.post("/refresh", async (req, res) => {
  const cookieVal = req.cookies?.refreshToken;
  if (!cookieVal) return res.status(401).json({ ok: false, error: "Missing refresh token" });

  // cookie contains "refreshJwt.rawRandom"
  const dot = cookieVal.lastIndexOf(".");
  if (dot === -1) return res.status(401).json({ ok: false, error: "Invalid refresh format" });

  const refreshJwt = cookieVal.slice(0, dot);
  const raw = cookieVal.slice(dot + 1);

  let payload;
  try {
    payload = verifyRefresh(refreshJwt);
  } catch {
    return res.status(401).json({ ok: false, error: "Invalid refresh token" });
  }

  const tokenId = payload.tid;
  const adminId = payload.sub;

  const check = await validateRefreshToken(tokenId, raw);
  if (!check.ok) return res.status(401).json({ ok: false, error: "Refresh rejected" });

  // rotate: revoke old, issue new
  await revokeRefreshToken(tokenId);

  const admin = await prisma.admin.findUnique({ where: { id: adminId } });
  if (!admin || !admin.isActive) return res.status(401).json({ ok: false, error: "Admin not active" });

  const newRaw = makeRandomToken();
  const expiresAt = new Date(Date.now() + Number(process.env.JWT_REFRESH_EXPIRES_DAYS || 14) * 86400000);

  const rt2 = await storeRefreshToken({
    adminId,
    rawToken: newRaw,
    expiresAt,
    ip: req.ip,
    userAgent: req.headers["user-agent"] || "",
  });

  const newAccess = signAccessToken(admin);
  const newRefreshJwt = signRefreshToken(admin, rt2.id);

  setRefreshCookie(res, `${newRefreshJwt}.${newRaw}`);
  return res.json({ ok: true, accessToken: newAccess });
});

// LOGOUT
router.post("/logout", async (req, res) => {
  setRefreshCookie(res, "");
  return res.json({ ok: true });
});

// ME
router.get("/me", requireAuth, async (req, res) => {
  const admin = await prisma.admin.findUnique({
    where: { id: req.user.sub },
    select: { id: true, email: true, name: true, role: true, twoFactorEnabled: true },
  });
  res.json({ ok: true, admin });
});


// PASSWORD RESET REQUEST
router.post("/forgot-password", authLimiter, async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  const admin = await prisma.admin.findUnique({ where: { email } });

  // Always respond ok (avoid email enumeration)
  if (!admin) return res.json({ ok: true });

  const raw = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(raw).digest("hex");
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 min

  await prisma.passwordResetToken.create({
    data: { adminId: admin.id, tokenHash, expiresAt },
  });

  const link = `${process.env.FRONTEND_URL}/admin/reset-password?token=${raw}&email=${encodeURIComponent(email)}`;

  try {
    await sendEmail({
      to: email,
      subject: "Password reset",
      html: `<p>Click to reset your password:</p><p><a href="${link}">${link}</a></p><p>This link expires in 30 minutes.</p>`,
    });
    console.log("✅ Reset email sent to:", email);
  } catch (err) {
    console.error("❌ EMAIL SEND ERROR:", err);
  }

  return res.json({ ok: true });
});

// PASSWORD RESET CONFIRM
router.post("/reset-password", authLimiter, async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  const { token, newPassword } = req.body;

  const admin = await prisma.admin.findUnique({ where: { email } });
  if (!admin) return res.status(400).json({ ok: false, error: "Invalid request" });

  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

  const rec = await prisma.passwordResetToken.findFirst({
    where: { adminId: admin.id, tokenHash, usedAt: null },
    orderBy: { createdAt: "desc" },
  });

  if (!rec || rec.expiresAt < new Date()) {
    return res.status(400).json({ ok: false, error: "Token expired/invalid" });
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);

  await prisma.$transaction([
    prisma.admin.update({ where: { id: admin.id }, data: { passwordHash } }),
    prisma.passwordResetToken.update({ where: { id: rec.id }, data: { usedAt: new Date() } }),
  ]);

  return res.json({ ok: true });
});

// 2FA SETUP (generate secret + QR)
router.post("/2fa/setup", requireAuth, async (req, res) => {
  const admin = await prisma.admin.findUnique({ where: { id: req.user.sub } });
  if (!admin) return res.status(404).json({ ok: false });

  const secret = generate2FASecret(admin.email);
  const qr = await makeQRCodeDataUrl(secret.otpauth_url);

  await prisma.admin.update({
    where: { id: admin.id },
    data: { twoFactorTemp: secret.base32 },
  });

  await logAdminAction(req, { action: "2FA_SETUP_STARTED", entity: "Admin", entityId: admin.id });

  res.json({ ok: true, qr, secretBase32: secret.base32 });
});

// 2FA ENABLE (verify code)
router.post("/2fa/enable", requireAuth, async (req, res) => {
  const { code } = req.body;
  const admin = await prisma.admin.findUnique({ where: { id: req.user.sub } });
  if (!admin || !admin.twoFactorTemp) return res.status(400).json({ ok: false, error: "No setup in progress" });

  const ok = verify2FAToken(admin.twoFactorTemp, code);
  if (!ok) return res.status(400).json({ ok: false, error: "Invalid code" });

  await prisma.admin.update({
    where: { id: admin.id },
    data: { twoFactorEnabled: true, twoFactorSecret: admin.twoFactorTemp, twoFactorTemp: null },
  });

  await logAdminAction(req, { action: "2FA_ENABLED", entity: "Admin", entityId: admin.id });

  res.json({ ok: true });
});

// 2FA DISABLE (require 2FA code)
router.post("/2fa/disable", requireAuth, async (req, res) => {
  const { code } = req.body;

  const admin = await prisma.admin.findUnique({ where: { id: req.user.sub } });
  if (!admin) return res.status(404).json({ ok: false, error: "Admin not found" });

  if (!admin.twoFactorEnabled || !admin.twoFactorSecret) {
    return res.status(400).json({ ok: false, error: "2FA_NOT_ENABLED" });
  }

  if (!code) {
    return res.status(400).json({ ok: false, error: "CODE_REQUIRED" });
  }

  const valid = verify2FAToken(admin.twoFactorSecret, String(code));
  if (!valid) {
    return res.status(401).json({ ok: false, error: "INVALID_2FA" });
  }

  const updated = await prisma.admin.update({
    where: { id: admin.id },
    data: { twoFactorEnabled: false, twoFactorSecret: null, twoFactorTemp: null },
  });

  await logAdminAction(req, { action: "2FA_DISABLED", entity: "Admin", entityId: updated.id });
  return res.json({ ok: true });
});

export default router;
