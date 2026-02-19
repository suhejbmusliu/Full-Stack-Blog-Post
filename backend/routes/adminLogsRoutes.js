import { Router } from "express";
import pool from "../config/database.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const take = Math.min(Number(limit), 50);
  const skip = (Number(page) - 1) * take;

  // items with included admin (select id, email, name)
  const itemsPromise = pool.query(
    `
    SELECT
      l.id,
      l.adminId,
      l.action,
      l.entity,
      l.entityId,
      l.meta,
      l.ip,
      l.userAgent,
      l.createdAt,
      a.id AS a_id,
      a.email AS a_email,
      a.name AS a_name
    FROM admin_logs l
    LEFT JOIN admins a ON a.id = l.adminId
    ORDER BY l.createdAt DESC
    LIMIT ? OFFSET ?
    `,
    [take, skip]
  );

  const totalPromise = pool.query(`SELECT COUNT(*) AS total FROM admin_logs`);

  const [[rows], [countRows]] = await Promise.all([itemsPromise, totalPromise]);

  const items = rows.map((r) => ({
    id: r.id,
    adminId: r.adminId,
    action: r.action,
    entity: r.entity,
    entityId: r.entityId,
    meta: r.meta, // mysql2 will return JSON as string unless configured; keep as-is
    ip: r.ip,
    userAgent: r.userAgent,
    createdAt: r.createdAt,
    admin: r.a_id
      ? { id: r.a_id, email: r.a_email, name: r.a_name }
      : null,
  }));

  const total = Number(countRows[0]?.total || 0);

  res.json({ ok: true, total, page: Number(page), limit: take, items });
});

export default router;
