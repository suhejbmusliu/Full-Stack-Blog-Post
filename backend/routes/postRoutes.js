import { Router } from "express";
import pool from "../config/database.js";
import { requireAuth } from "../middleware/auth.js";
import { upload } from "../middleware/upload.js";
import { processPostImage } from "../lib/imageProcessor.js";
import { logAdminAction } from "../lib/logger.js";
import { makeSlug } from "../lib/slugGenerator.js";
import { makeId } from "../models/_id.js";

const router = Router();

const uploadPostMedia = upload.fields([
  { name: "cover", maxCount: 1 },
  { name: "images", maxCount: 20 },
]);

// --- helpers ----------------------------------------------------

async function getFullPostById(postId) {
  const [postRows] = await pool.query(`SELECT * FROM posts WHERE id = ? LIMIT 1`, [postId]);
  const post = postRows[0];
  if (!post) return null;

  const [catRows] = await pool.query(
    `
    SELECT
      pc.postId,
      pc.categoryId,
      c.id AS c_id, c.name AS c_name, c.slug AS c_slug, c.createdAt AS c_createdAt
    FROM post_categories pc
    JOIN categories c ON c.id = pc.categoryId
    WHERE pc.postId = ?
    `,
    [postId]
  );

  const [tagRows] = await pool.query(
    `
    SELECT
      pt.postId,
      pt.tagId,
      t.id AS t_id, t.name AS t_name, t.slug AS t_slug, t.createdAt AS t_createdAt
    FROM post_tags pt
    JOIN tags t ON t.id = pt.tagId
    WHERE pt.postId = ?
    `,
    [postId]
  );

  const [imgRows] = await pool.query(
    `SELECT * FROM post_images WHERE postId = ? ORDER BY sortOrder ASC`,
    [postId]
  );

  const [authorRows] = await pool.query(
    `SELECT id, name, email FROM admins WHERE id = ? LIMIT 1`,
    [post.authorId]
  );

  return {
    ...post,
    categories: catRows.map((r) => ({
      postId: r.postId,
      categoryId: r.categoryId,
      category: { id: r.c_id, name: r.c_name, slug: r.c_slug, createdAt: r.c_createdAt },
    })),
    tags: tagRows.map((r) => ({
      postId: r.postId,
      tagId: r.tagId,
      tag: { id: r.t_id, name: r.t_name, slug: r.t_slug, createdAt: r.t_createdAt },
    })),
    images: imgRows,
    author: authorRows[0] || null,
  };
}

async function getFullPostBySlug(slug) {
  const [postRows] = await pool.query(`SELECT * FROM posts WHERE slug = ? LIMIT 1`, [slug]);
  const post = postRows[0];
  if (!post) return null;
  return getFullPostById(post.id);
}

async function upsertCategoryBySlug(name) {
  const slug = makeSlug(name);
  const [rows] = await pool.query(`SELECT * FROM categories WHERE slug = ? LIMIT 1`, [slug]);
  if (rows[0]) return rows[0];

  const id = makeId();
  await pool.query(`INSERT INTO categories (id, name, slug) VALUES (?, ?, ?)`, [id, name, slug]);
  return { id, name, slug };
}

async function upsertTagBySlug(name) {
  const slug = makeSlug(name);
  const [rows] = await pool.query(`SELECT * FROM tags WHERE slug = ? LIMIT 1`, [slug]);
  if (rows[0]) return rows[0];

  const id = makeId();
  await pool.query(`INSERT INTO tags (id, name, slug) VALUES (?, ?, ?)`, [id, name, slug]);
  return { id, name, slug };
}

async function attachCatsTags(postId, categories, tags) {
  const catArr = Array.isArray(categories)
    ? categories
    : String(categories).split(",").map((s) => s.trim()).filter(Boolean);

  const tagArr = Array.isArray(tags)
    ? tags
    : String(tags).split(",").map((s) => s.trim()).filter(Boolean);

  for (const catName of catArr) {
    const c = await upsertCategoryBySlug(catName);
    await pool.query(
      `INSERT IGNORE INTO post_categories (postId, categoryId) VALUES (?, ?)`,
      [postId, c.id]
    );
  }

  for (const tagName of tagArr) {
    const t = await upsertTagBySlug(tagName);
    await pool.query(
      `INSERT IGNORE INTO post_tags (postId, tagId) VALUES (?, ?)`,
      [postId, t.id]
    );
  }
}

// --- routes -----------------------------------------------------

// ✅ GET ALL CATEGORIES (for your dropdown)
router.get("/categories/all", async (req, res) => {
  const [rows] = await pool.query(
    `SELECT id, name, slug FROM categories ORDER BY name ASC`
  );
  res.json({ ok: true, categories: rows });
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
  const postId = makeId();

  await pool.query(
    `
    INSERT INTO posts (id, title, slug, content, excerpt, status, authorId, activityDate)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      postId,
      title,
      slug,
      content,
      excerpt || null,
      status || "DRAFT",
      req.user.sub,
      activityDate ? new Date(activityDate) : null,
    ]
  );

  // ✅ If categoryId exists -> attach it
  if (categoryId) {
    await pool.query(
      `INSERT IGNORE INTO post_categories (postId, categoryId) VALUES (?, ?)`,
      [postId, String(categoryId)]
    );
  } else {
    // ✅ keep old behavior
    await attachCatsTags(postId, categories, tags);
  }

  // ✅ still attach tags even if categoryId used (so tags work same)
  if (tags && String(tags).length) {
    await attachCatsTags(postId, [], tags);
  }

  // files
  const coverFile = req.files?.cover?.[0];
  const imageFiles = req.files?.images || [];

  // cover image (appearance)
  if (coverFile?.buffer) {
    const img = await processPostImage({ buffer: coverFile.buffer, postId });
    await pool.query(
      `UPDATE posts SET coverImage = ?, coverThumb = ? WHERE id = ?`,
      [img.imagePath, img.thumbPath, postId]
    );
  }

  // detail images (gallery)
  if (imageFiles.length) {
    for (let i = 0; i < imageFiles.length; i++) {
      const f = imageFiles[i];
      if (!f?.buffer) continue;

      const img = await processPostImage({ buffer: f.buffer, postId });

      await pool.query(
        `INSERT INTO post_images (id, postId, url, sortOrder) VALUES (?, ?, ?, ?)`,
        [makeId(), postId, img.imagePath, i]
      );
    }
  }

  await logAdminAction(req, {
    action: "POST_CREATED",
    entity: "Post",
    entityId: postId,
    meta: {
      title,
      categoryId: categoryId || null,
      detailImages: imageFiles.length,
      activityDate: activityDate || null,
    },
  });

  const full = await getFullPostById(postId);
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

  // Build update dynamically to mimic Prisma behavior (skip undefined)
  const fields = [];
  const values = [];

  if (title !== undefined) {
    fields.push("title = ?");
    values.push(title);
    fields.push("slug = ?");
    values.push(makeSlug(title));
  }
  if (content !== undefined) {
    fields.push("content = ?");
    values.push(content);
  }
  if (excerpt !== undefined) {
    fields.push("excerpt = ?");
    values.push(excerpt ?? null);
  }
  if (status !== undefined) {
    fields.push("status = ?");
    values.push(status || "DRAFT");
  }

  // ✅ NEW: update activityDate only if provided
  if (activityDate !== undefined) {
    fields.push("activityDate = ?");
    values.push(activityDate ? new Date(activityDate) : null);
  }

  if (fields.length) {
    await pool.query(`UPDATE posts SET ${fields.join(", ")} WHERE id = ?`, [...values, id]);
  }

  // ✅ categories/tags logic
  if (categoryId) {
    await pool.query(`DELETE FROM post_categories WHERE postId = ?`, [id]);
    await pool.query(
      `INSERT IGNORE INTO post_categories (postId, categoryId) VALUES (?, ?)`,
      [id, String(categoryId)]
    );

    await pool.query(`DELETE FROM post_tags WHERE postId = ?`, [id]);
    await attachCatsTags(id, [], tags);
  } else {
    await pool.query(`DELETE FROM post_categories WHERE postId = ?`, [id]);
    await pool.query(`DELETE FROM post_tags WHERE postId = ?`, [id]);
    await attachCatsTags(id, categories, tags);
  }

  // files
  const coverFile = req.files?.cover?.[0];
  const imageFiles = req.files?.images || [];

  // replace cover
  if (coverFile?.buffer) {
    const img = await processPostImage({ buffer: coverFile.buffer, postId: id });
    await pool.query(
      `UPDATE posts SET coverImage = ?, coverThumb = ? WHERE id = ?`,
      [img.imagePath, img.thumbPath, id]
    );
  }

  // append new detail images (keep old ones)
  if (imageFiles.length) {
    const [lastRows] = await pool.query(
      `SELECT sortOrder FROM post_images WHERE postId = ? ORDER BY sortOrder DESC LIMIT 1`,
      [id]
    );

    let startOrder = ((lastRows[0]?.sortOrder ?? -1) + 1);

    for (let i = 0; i < imageFiles.length; i++) {
      const f = imageFiles[i];
      if (!f?.buffer) continue;

      const img = await processPostImage({ buffer: f.buffer, postId: id });

      await pool.query(
        `INSERT INTO post_images (id, postId, url, sortOrder) VALUES (?, ?, ?, ?)`,
        [makeId(), id, img.imagePath, startOrder + i]
      );
    }
  }

  await logAdminAction(req, {
    action: "POST_UPDATED",
    entity: "Post",
    entityId: id,
    meta: { activityDate: activityDate ?? undefined },
  });

  const full = await getFullPostById(id);
  res.json({ ok: true, post: full });
});

// LIST + SEARCH + FILTERS (✅ add year filter)
router.get("/", async (req, res) => {
  const { q, status, category, tag, year, page = 1, limit = 10, sort = "newest" } = req.query;

  const take = Math.min(Number(limit), 50);
  const skip = (Number(page) - 1) * take;

  // Build SQL WHERE similar to Prisma
  const whereParts = [];
  const params = [];

  if (status) {
    whereParts.push(`p.status = ?`);
    params.push(String(status));
  }

  if (q) {
    const like = `%${String(q).toLowerCase()}%`;
    whereParts.push(
      `(LOWER(p.title) LIKE ? OR LOWER(p.content) LIKE ? OR LOWER(p.excerpt) LIKE ?)`
    );
    params.push(like, like, like);
  }

  // ✅ NEW: Filter by year using activityDate
  if (year) {
    const y = Number(year);
    const from = new Date(Date.UTC(y, 0, 1));
    const to = new Date(Date.UTC(y + 1, 0, 1));
    whereParts.push(`p.activityDate >= ? AND p.activityDate < ?`);
    params.push(from, to);
  }

  let joinSql = `FROM posts p`;
  if (category) {
    joinSql += `
      JOIN post_categories pc_f ON pc_f.postId = p.id
      JOIN categories c_f ON c_f.id = pc_f.categoryId AND c_f.slug = ?
    `;
    params.push(String(category));
  }

  if (tag) {
    joinSql += `
      JOIN post_tags pt_f ON pt_f.postId = p.id
      JOIN tags t_f ON t_f.id = pt_f.tagId AND t_f.slug = ?
    `;
    params.push(String(tag));
  }

  const whereSql = whereParts.length ? `WHERE ${whereParts.join(" AND ")}` : "";

  const orderSql =
    sort === "oldest"
      ? `ORDER BY p.createdAt ASC`
      : sort === "title"
      ? `ORDER BY p.title ASC`
      : `ORDER BY p.createdAt DESC`;

  // Count total (distinct because joins can duplicate)
  const [countRows] = await pool.query(
    `SELECT COUNT(DISTINCT p.id) AS total ${joinSql} ${whereSql}`,
    params
  );
  const total = Number(countRows[0]?.total || 0);

  // Fetch page items
  const [postRows] = await pool.query(
    `
    SELECT DISTINCT p.*
    ${joinSql}
    ${whereSql}
    ${orderSql}
    LIMIT ? OFFSET ?
    `,
    [...params, take, skip]
  );

  // Attach includes (same shape as Prisma include)
  const items = [];
  for (const p of postRows) {
    const full = await getFullPostById(p.id);
    // add author select id/name/email like original list route
    items.push(full);
  }

  res.json({ ok: true, total, page: Number(page), limit: take, items });
});

// DELETE POST
router.delete("/:id", requireAuth, async (req, res) => {
  const { id } = req.params;

  const [rows] = await pool.query(`SELECT id FROM posts WHERE id = ? LIMIT 1`, [id]);
  const existing = rows[0];
  if (!existing) return res.status(404).json({ ok: false, error: "Not found" });

  await pool.query(`DELETE FROM post_categories WHERE postId = ?`, [id]);
  await pool.query(`DELETE FROM post_tags WHERE postId = ?`, [id]);
  await pool.query(`DELETE FROM post_images WHERE postId = ?`, [id]);

  await pool.query(`DELETE FROM posts WHERE id = ?`, [id]);

  await logAdminAction(req, { action: "POST_DELETED", entity: "Post", entityId: id });

  res.json({ ok: true });
});

// SINGLE BY SLUG
router.get("/:slug", async (req, res) => {
  const post = await getFullPostBySlug(req.params.slug);

  if (!post) return res.status(404).json({ ok: false, error: "Not found" });

  // match original author select { id, name } for single slug route
  if (post.author) {
    post.author = { id: post.author.id, name: post.author.name };
  }

  res.json({ ok: true, post });
});

export default router;
