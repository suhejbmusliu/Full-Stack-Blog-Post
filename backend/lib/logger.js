import { prisma } from "./prisma.js";

export async function logAdminAction(req, { action, entity, entityId, meta }) {
  const adminId = req.user?.sub || null;

  return prisma.adminLog.create({
    data: {
      adminId,
      action,
      entity: entity || null,
      entityId: entityId || null,
      meta: meta || undefined,
      ip: req.ip,
      userAgent: req.headers["user-agent"] || null,
    },
  });
}
