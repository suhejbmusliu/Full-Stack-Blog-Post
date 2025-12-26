import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const take = Math.min(Number(limit), 50);
  const skip = (Number(page) - 1) * take;

  const [items, total] = await Promise.all([
    prisma.adminLog.findMany({
      orderBy: { createdAt: "desc" },
      take,
      skip,
      include: { admin: { select: { id: true, email: true, name: true } } },
    }),
    prisma.adminLog.count(),
  ]);

  res.json({ ok: true, total, page: Number(page), limit: take, items });
});

export default router;
