import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { upload } from "../middleware/upload.js";
import { processPostImage } from "../lib/imageProcessor.js";
import { logAdminAction } from "../lib/logger.js";
import { makeSlug } from "../lib/slugGenerator.js";

const router = Router();

const uploadPostMedia = upload.fields([
  { name: "cover", maxCount: 1 },
  { name: "images", maxCount: 20 },
]);

// ✅ GET ALL CATEGORIES (for your dropdown)
router.get("/categories/all", async (req, res) => {
  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, slug: true },
  });
  res.json({ ok: true, categories });
});

// CREATE POST (cover + detail images + categoryId)
router.post("/", requireAuth, uploadPostMedia, async (req, res) => {
  const {
    title,
    content,
    excerpt,
    status,
    categories = [],
    tags = [],
    categoryId,
    activityDate, // ✅ NEW
  } = req.body;

  const slug = makeSlug(title);

  const post = await prisma.post.create({
    data: {
      title,
      slug,
      content,
      excerpt: excerpt || null,
      status: status || "DRAFT",
      authorId: req.user.sub,
      activityDate: activityDate ? new Date(activityDate) : null, // ✅ NEW
    },
  });

  // ✅ If categoryId exists -> attach it
  if (categoryId) {
    await prisma.postCategory.create({
      data: { postId: post.id, categoryId: String(categoryId) },
    });
  } else {
    // ✅ keep old behavior
    await attachCatsTags(post.id, categories, tags);
  }

  // ✅ still attach tags even if categoryId used (so tags work same)
  if (tags && String(tags).length) {
    await attachCatsTags(post.id, [], tags);
  }

  // files
  const coverFile = req.files?.cover?.[0];
  const imageFiles = req.files?.images || [];

  // cover image (appearance)
  if (coverFile?.buffer) {
    const img = await processPostImage({ buffer: coverFile.buffer, postId: post.id });
    await prisma.post.update({
      where: { id: post.id },
      data: { coverImage: img.imagePath, coverThumb: img.thumbPath },
    });
  }

  // detail images (gallery)
  if (imageFiles.length) {
    for (let i = 0; i < imageFiles.length; i++) {
      const f = imageFiles[i];
      if (!f?.buffer) continue;

      const img = await processPostImage({ buffer: f.buffer, postId: post.id });

      await prisma.postImage.create({
        data: {
          postId: post.id,
          url: img.imagePath,
          sortOrder: i,
        },
      });
    }
  }

  await logAdminAction(req, {
    action: "POST_CREATED",
    entity: "Post",
    entityId: post.id,
    meta: { title, categoryId: categoryId || null, detailImages: imageFiles.length, activityDate: activityDate || null },
  });

  const full = await prisma.post.findUnique({
    where: { id: post.id },
    include: {
      categories: { include: { category: true } },
      tags: { include: { tag: true } },
      images: { orderBy: { sortOrder: "asc" } },
    },
  });

  res.json({ ok: true, post: full });
});

// UPDATE POST (can replace cover + append new detail images + set categoryId)
router.put("/:id", requireAuth, uploadPostMedia, async (req, res) => {
  const { id } = req.params;

  const {
    title,
    content,
    excerpt,
    status,
    categories = [],
    tags = [],
    categoryId,
    activityDate, // ✅ NEW
  } = req.body;

  const data = {
    title,
    content,
    excerpt: excerpt ?? null,
    status: status || undefined,
  };

  if (title) data.slug = makeSlug(title);

  // ✅ NEW: update activityDate only if provided
  if (activityDate !== undefined) {
    data.activityDate = activityDate ? new Date(activityDate) : null;
  }

  const post = await prisma.post.update({ where: { id }, data });

  // ✅ categories/tags logic
  if (categoryId) {
    await prisma.postCategory.deleteMany({ where: { postId: id } });
    await prisma.postCategory.create({ data: { postId: id, categoryId: String(categoryId) } });

    await prisma.postTag.deleteMany({ where: { postId: id } });
    await attachCatsTags(id, [], tags);
  } else {
    await prisma.postCategory.deleteMany({ where: { postId: id } });
    await prisma.postTag.deleteMany({ where: { postId: id } });
    await attachCatsTags(id, categories, tags);
  }

  // files
  const coverFile = req.files?.cover?.[0];
  const imageFiles = req.files?.images || [];

  // replace cover
  if (coverFile?.buffer) {
    const img = await processPostImage({ buffer: coverFile.buffer, postId: id });
    await prisma.post.update({
      where: { id },
      data: { coverImage: img.imagePath, coverThumb: img.thumbPath },
    });
  }

  // append new detail images (keep old ones)
  if (imageFiles.length) {
    const last = await prisma.postImage.findFirst({
      where: { postId: id },
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    });

    let startOrder = (last?.sortOrder ?? -1) + 1;

    for (let i = 0; i < imageFiles.length; i++) {
      const f = imageFiles[i];
      if (!f?.buffer) continue;

      const img = await processPostImage({ buffer: f.buffer, postId: id });

      await prisma.postImage.create({
        data: {
          postId: id,
          url: img.imagePath,
          sortOrder: startOrder + i,
        },
      });
    }
  }

  await logAdminAction(req, {
    action: "POST_UPDATED",
    entity: "Post",
    entityId: id,
    meta: { activityDate: activityDate ?? undefined },
  });

  const full = await prisma.post.findUnique({
    where: { id },
    include: {
      categories: { include: { category: true } },
      tags: { include: { tag: true } },
      images: { orderBy: { sortOrder: "asc" } },
    },
  });

  res.json({ ok: true, post: full });
});

// LIST + SEARCH + FILTERS (✅ add year filter)
router.get("/", async (req, res) => {
  const { q, status, category, tag, year, page = 1, limit = 10, sort = "newest" } = req.query;

  const take = Math.min(Number(limit), 50);
  const skip = (Number(page) - 1) * take;

  const where = {};

  if (status) where.status = String(status);

  if (q) {
    where.OR = [
      { title: { contains: String(q), mode: "insensitive" } },
      { content: { contains: String(q), mode: "insensitive" } },
      { excerpt: { contains: String(q), mode: "insensitive" } },
    ];
  }

  if (category) where.categories = { some: { category: { slug: String(category) } } };
  if (tag) where.tags = { some: { tag: { slug: String(tag) } } };

  // ✅ NEW: Filter by year using activityDate
  if (year) {
    const y = Number(year);
    const from = new Date(Date.UTC(y, 0, 1));
    const to = new Date(Date.UTC(y + 1, 0, 1));
    where.activityDate = { gte: from, lt: to };
  }

  const orderBy =
    sort === "oldest"
      ? { createdAt: "asc" }
      : sort === "title"
      ? { title: "asc" }
      : { createdAt: "desc" };

  const [items, total] = await Promise.all([
    prisma.post.findMany({
      where,
      orderBy,
      skip,
      take,
      include: {
        categories: { include: { category: true } },
        tags: { include: { tag: true } },
        images: { orderBy: { sortOrder: "asc" } },
        author: { select: { id: true, name: true, email: true } },
      },
    }),
    prisma.post.count({ where }),
  ]);

  res.json({ ok: true, total, page: Number(page), limit: take, items });
});

// DELETE POST
router.delete("/:id", requireAuth, async (req, res) => {
  const { id } = req.params;

  const existing = await prisma.post.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ ok: false, error: "Not found" });

  await prisma.postCategory.deleteMany({ where: { postId: id } });
  await prisma.postTag.deleteMany({ where: { postId: id } });
  await prisma.postImage.deleteMany({ where: { postId: id } });

  await prisma.post.delete({ where: { id } });

  await logAdminAction(req, { action: "POST_DELETED", entity: "Post", entityId: id });

  res.json({ ok: true });
});

// SINGLE BY SLUG
router.get("/:slug", async (req, res) => {
  const post = await prisma.post.findUnique({
    where: { slug: req.params.slug },
    include: {
      categories: { include: { category: true } },
      tags: { include: { tag: true } },
      images: { orderBy: { sortOrder: "asc" } },
      author: { select: { id: true, name: true } },
    },
  });

  if (!post) return res.status(404).json({ ok: false, error: "Not found" });
  res.json({ ok: true, post });
});

async function attachCatsTags(postId, categories, tags) {
  const catArr = Array.isArray(categories)
    ? categories
    : String(categories).split(",").map((s) => s.trim()).filter(Boolean);

  const tagArr = Array.isArray(tags)
    ? tags
    : String(tags).split(",").map((s) => s.trim()).filter(Boolean);

  for (const catName of catArr) {
    const slug = makeSlug(catName);
    const c = await prisma.category.upsert({
      where: { slug },
      create: { name: catName, slug },
      update: {},
    });
    await prisma.postCategory.create({ data: { postId, categoryId: c.id } });
  }

  for (const tagName of tagArr) {
    const slug = makeSlug(tagName);
    const t = await prisma.tag.upsert({
      where: { slug },
      create: { name: tagName, slug },
      update: {},
    });
    await prisma.postTag.create({ data: { postId, tagId: t.id } });
  }
}

export default router;
