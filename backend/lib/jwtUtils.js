import jwt from "jsonwebtoken";
import crypto from "crypto";
import bcrypt from "bcryptjs";

// ✅ Use MySQL model instead of Prisma
import RefreshToken from "../models/RefreshToken.js";

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
const ACCESS_EXPIRES = process.env.JWT_ACCESS_EXPIRES || "15m";
const REFRESH_HOURS = Number(process.env.JWT_REFRESH_EXPIRES_HOURS || 24);

export function signAccessToken(admin) {
  return jwt.sign(
    { sub: admin.id, role: admin.role, email: admin.email },
    ACCESS_SECRET,
    { expiresIn: ACCESS_EXPIRES }
  );
}

export function signRefreshToken(admin, tokenId) {
  return jwt.sign(
    { sub: admin.id, tid: tokenId },
    REFRESH_SECRET,
    { expiresIn: `${REFRESH_HOURS}d` }
  );
}

export function verifyAccess(token) {
  return jwt.verify(token, ACCESS_SECRET);
}

export function verifyRefresh(token) {
  return jwt.verify(token, REFRESH_SECRET);
}

export function makeRandomToken() {
  return crypto.randomBytes(40).toString("hex");
}

export async function storeRefreshToken({ adminId, rawToken, expiresAt, ip, userAgent }) {
  const tokenHash = await bcrypt.hash(rawToken, 12);

  // ✅ Create in MySQL
  return RefreshToken.create({
    adminId,
    tokenHash,
    expiresAt,
    ip,
    userAgent,
  });
}

export async function revokeRefreshToken(tokenId) {
  // ✅ Revoke in MySQL
  return RefreshToken.revoke(tokenId);
}

export async function validateRefreshToken(tokenId, rawToken) {
  // ✅ Read from MySQL
  const db = await RefreshToken.findById(tokenId);

  if (!db) return { ok: false, reason: "NOT_FOUND" };
  if (db.revokedAt) return { ok: false, reason: "REVOKED" };

  // MySQL returns DATETIME; convert safely
  const expiresAt = db.expiresAt instanceof Date ? db.expiresAt : new Date(db.expiresAt);
  if (expiresAt < new Date()) return { ok: false, reason: "EXPIRED" };

  const match = await bcrypt.compare(rawToken, db.tokenHash);
  if (!match) return { ok: false, reason: "MISMATCH" };

  return { ok: true, db };
}
