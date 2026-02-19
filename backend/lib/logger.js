import pool from "../config/database.js";
import { makeId } from "../models/_id.js";

export async function logAdminAction(req, { action, entity, entityId, meta }) {
  const adminId = req.user?.sub || null;

  const id = makeId();

  await pool.query(
    `
    INSERT INTO admin_logs
      (id, adminId, action, entity, entityId, meta, ip, userAgent)
    VALUES
      (?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      id,
      adminId,
      action,
      entity || null,
      entityId || null,
      meta ? JSON.stringify(meta) : null,
      req.ip,
      req.headers["user-agent"] || null,
    ]
  );
}
