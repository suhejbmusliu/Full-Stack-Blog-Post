import { Router } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { authLimiter } from "../middleware/rateLimiter.js";
import {
  signAccessToken,
  storeRefreshToken,
  makeRandomToken,
  signRefreshToken,
  verifyRefresh,
  validateRefreshToken,
  revokeRefreshToken,
} from "../lib/jwtUtils.js";
import { sendEmail } from "../lib/emailService.js";
import { requireAuth } from "../middleware/auth.js";
import { logAdminAction } from "../lib/logger.js";
import {
  generate2FASecret,
  makeQRCodeDataUrl,
  verify2FAToken,
} from "../lib/twoFactorAuth.js";

import Admin from "../models/Admin.js";
import PasswordResetToken from "../models/PasswordResetToken.js";
import TwoFactorResetToken from "../models/TwoFactorResetToken.js";
import pool from "../config/database.js";

const router = Router();

function setRefreshCookie(res, value) {
  res.cookie("refreshToken", value, {
    httpOnly: true,
    sameSite: "lax",
    secure: String(process.env.COOKIE_SECURE) === "true",
    path: "/api/auth",
  });
}

/* =========================================================
   LOGIN
========================================================= */
router.post("/login", authLimiter, async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  const { password, twoFactorCode } = req.body;

  const admin = await Admin.findByEmail(email);
  if (!admin || !admin.isActive)
    return res.status(401).json({ ok: false, error: "Invalid credentials" });

  if (admin.lockedUntil && new Date(admin.lockedUntil) > new Date()) {
    return res.status(429).json({ ok: false, error: "Account locked. Try later." });
  }

  const ok = await bcrypt.compare(password, admin.passwordHash);
  if (!ok) {
    const failed = admin.failedLogins + 1;
    const lockedUntil =
      failed >= 8 ? new Date(Date.now() + 15 * 60 * 1000) : null;

    await Admin.update(admin.id, { failedLogins: failed, lockedUntil });

    return res.status(401).json({ ok: false, error: "Invalid credentials" });
  }

  if (admin.twoFactorEnabled) {
    if (!twoFactorCode)
      return res.status(401).json({ ok: false, error: "2FA_REQUIRED" });

    const valid2fa = verify2FAToken(admin.twoFactorSecret, twoFactorCode);
    if (!valid2fa)
      return res.status(401).json({ ok: false, error: "INVALID_2FA" });
  }

  await Admin.update(admin.id, {
    failedLogins: 0,
    lockedUntil: null,
    lastLoginAt: new Date(),
  });

  const rawRefresh = makeRandomToken();
  const expiresAt = new Date(
    Date.now() + Number(process.env.JWT_REFRESH_EXPIRES_DAYS || 14) * 86400000
  );

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
    admin: {
      id: admin.id,
      email: admin.email,
      name: admin.name,
      role: admin.role,
    },
  });
});

/* =========================================================
   REFRESH
========================================================= */
router.post("/refresh", async (req, res) => {
  const cookieVal = req.cookies?.refreshToken;
  if (!cookieVal)
    return res.status(401).json({ ok: false, error: "Missing refresh token" });

  const dot = cookieVal.lastIndexOf(".");
  if (dot === -1)
    return res.status(401).json({ ok: false, error: "Invalid refresh format" });

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
  if (!check.ok)
    return res.status(401).json({ ok: false, error: "Refresh rejected" });

  await revokeRefreshToken(tokenId);

  const admin = await Admin.findById(adminId);
  if (!admin || !admin.isActive)
    return res.status(401).json({ ok: false, error: "Admin not active" });

  const newRaw = makeRandomToken();
  const expiresAt = new Date(
    Date.now() + Number(process.env.JWT_REFRESH_EXPIRES_DAYS || 14) * 86400000
  );

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

/* =========================================================
   LOGOUT
========================================================= */
router.post("/logout", async (req, res) => {
  setRefreshCookie(res, "");
  return res.json({ ok: true });
});

/* =========================================================
   ME
========================================================= */
router.get("/me", requireAuth, async (req, res) => {
  const admin = await Admin.findById(req.user.sub);

  res.json({
    ok: true,
    admin: admin
      ? {
          id: admin.id,
          email: admin.email,
          name: admin.name,
          role: admin.role,
          twoFactorEnabled: admin.twoFactorEnabled,
        }
      : null,
  });
});

/* =========================================================
   PASSWORD RESET
========================================================= */
router.post("/forgot-password", authLimiter, async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  const admin = await Admin.findByEmail(email);
  if (!admin) return res.json({ ok: true });

  const raw = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(raw).digest("hex");
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

  await PasswordResetToken.create({
    adminId: admin.id,
    tokenHash,
    expiresAt,
  });

  const link = `${process.env.FRONTEND_URL}/admin/reset-password?token=${raw}&email=${encodeURIComponent(email)}`;

  await sendEmail({
    to: email,
    subject: "Password reset",
    html: `<p>Click to reset your password:</p>
           <p><a href="${link}">${link}</a></p>
           <p>This link expires in 30 minutes.</p>`,
  });

  return res.json({ ok: true });
});

router.post("/reset-password", authLimiter, async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  const { token, newPassword } = req.body;

  const admin = await Admin.findByEmail(email);
  if (!admin)
    return res.status(400).json({ ok: false, error: "Invalid request" });

  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const rec = await PasswordResetToken.findLatestUnused(admin.id, tokenHash);

  if (!rec || new Date(rec.expiresAt) < new Date())
    return res.status(400).json({ ok: false, error: "Token expired/invalid" });

  const passwordHash = await bcrypt.hash(newPassword, 12);

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await Admin.update(admin.id, { passwordHash }, { connection: conn });
    await PasswordResetToken.update(
      rec.id,
      { usedAt: new Date() },
      { connection: conn }
    );
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }

  return res.json({ ok: true });
});

/* =========================================================
   2FA RECOVERY
========================================================= */
router.post("/2fa-reset/request", authLimiter, async (req, res) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const admin = await Admin.findByEmail(email);
    if (!admin) return res.json({ ok: true });

    const raw = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(raw).digest("hex");
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    await TwoFactorResetToken.create({
      adminId: admin.id,
      tokenHash,
      expiresAt,
    });

    const link = `${process.env.FRONTEND_URL}/admin/reset-2fa?token=${raw}&email=${encodeURIComponent(email)}`;

    await sendEmail({
      to: email,
      subject: "2FA Recovery",
      html: `<p>You requested to reset 2FA.</p>
             <p><a href="${link}">${link}</a></p>
             <p>This link expires in 30 minutes.</p>`,
    });

    res.json({ ok: true });
  } catch (err) {
    console.error("❌ 2FA reset request error:", err);
    res.status(500).json({ ok: false, error: "Server error" });
  }
});

router.post("/2fa-reset/confirm", authLimiter, async (req, res) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const { token } = req.body;

    const admin = await Admin.findByEmail(email);
    if (!admin)
      return res.status(400).json({ ok: false, error: "Invalid request" });

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const rec = await TwoFactorResetToken.findLatestUnused(
      admin.id,
      tokenHash
    );

    if (!rec || new Date(rec.expires_at) < new Date())
      return res
        .status(400)
        .json({ ok: false, error: "Token expired or invalid" });

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      await Admin.update(
        admin.id,
        {
          twoFactorEnabled: false,
          twoFactorSecret: null,
          twoFactorTemp: null,
        },
        { connection: conn }
      );

      await TwoFactorResetToken.update(
        rec.id,
        { usedAt: new Date() },
        { connection: conn }
      );

      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }

    res.json({ ok: true });
  } catch (err) {
    console.error("❌ 2FA reset confirm error:", err);
    res.status(500).json({ ok: false, error: "Server error" });
  }
});

export default router;


/* =========================================================
   2FA SETUP / ENABLE / DISABLE (logged in)
========================================================= */

// 2FA SETUP (generate secret + QR)
router.post("/2fa/setup", requireAuth, async (req, res) => {
  const admin = await Admin.findById(req.user.sub);
  if (!admin) return res.status(404).json({ ok: false, error: "Admin not found" });

  const secret = generate2FASecret(admin.email);
  const qr = await makeQRCodeDataUrl(secret.otpauth_url);

  // store temp secret until user verifies code
  await Admin.update(admin.id, { twoFactorTemp: secret.base32 });

  // optional log
  try {
    await logAdminAction(req, { action: "2FA_SETUP_STARTED", entity: "Admin", entityId: admin.id });
  } catch {}

  return res.json({ ok: true, qr, secretBase32: secret.base32 });
});

// 2FA ENABLE (verify code)
router.post("/2fa/enable", requireAuth, async (req, res) => {
  const { code } = req.body;

  const admin = await Admin.findById(req.user.sub);
  if (!admin || !admin.twoFactorTemp) {
    return res.status(400).json({ ok: false, error: "No setup in progress" });
  }

  const ok = verify2FAToken(admin.twoFactorTemp, String(code));
  if (!ok) return res.status(400).json({ ok: false, error: "Invalid code" });

  await Admin.update(admin.id, {
    twoFactorEnabled: true,
    twoFactorSecret: admin.twoFactorTemp,
    twoFactorTemp: null,
  });

  try {
    await logAdminAction(req, { action: "2FA_ENABLED", entity: "Admin", entityId: admin.id });
  } catch {}

  return res.json({ ok: true });
});

// 2FA DISABLE (verify code)
router.post("/2fa/disable", requireAuth, async (req, res) => {
  const { code } = req.body;

  const admin = await Admin.findById(req.user.sub);
  if (!admin) return res.status(404).json({ ok: false, error: "Admin not found" });

  if (!admin.twoFactorEnabled) return res.json({ ok: true });

  if (!code) return res.status(400).json({ ok: false, error: "CODE_REQUIRED" });

  if (!admin.twoFactorSecret) return res.status(401).json({ ok: false, error: "INVALID_2FA" });

  const valid = verify2FAToken(admin.twoFactorSecret, String(code));
  if (!valid) return res.status(401).json({ ok: false, error: "INVALID_2FA" });

  await Admin.update(admin.id, {
    twoFactorEnabled: false,
    twoFactorSecret: null,
    twoFactorTemp: null,
  });

  try {
    await logAdminAction(req, { action: "2FA_DISABLED", entity: "Admin", entityId: admin.id });
  } catch {}

  return res.json({ ok: true });
});