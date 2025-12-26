import { verifyAccess } from "../lib/jwtUtils.js";

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) return res.status(401).json({ ok: false, error: "Missing token" });

  try {
    const payload = verifyAccess(token);
    req.user = payload; // {sub, role, email}
    next();
  } catch {
    return res.status(401).json({ ok: false, error: "Invalid/expired token" });
  }
}
