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

  // ✅ Do NOT fetch BLOB columns into JSON
  const [imgRows] = await pool.query(
    `SELECT id, postId, sortOrder FROM post_images WHERE postId = ? ORDER BY sortOrder ASC`,
    [postId]
  );

  const [authorRows] = await pool.query(
    `SELECT id, name, email FROM admins WHERE id = ? LIMIT 1`,
    [post.authorId]
  );

  return {
    ...post,

    // ✅ frontend loads images via endpoints
    coverUrl: `/api/posts/${post.id}/cover`,
    images: imgRows.map((r) => ({
      id: r.id,
      postId: r.postId,
      sortOrder: r.sortOrder,
      url: `/api/posts/image/${r.id}`,
    })),

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

// --- image endpoints --------------------------------------------
// ⚠️ Must be above "/:slug"

router.get("/:id/cover", async (req, res) => {
  const { id } = req.params;

  const [rows] = await pool.query(
    `SELECT coverImage, coverImageMime FROM posts WHERE id = ? LIMIT 1`,
    [id]
  );
  const r = rows[0];
  if (!r?.coverImage) return res.status(404).end();

  res.setHeader("Content-Type", r.coverImageMime || "image/webp");
  res.send(r.coverImage);
});

router.get("/image/:imageId", async (req, res) => {
  const { imageId } = req.params;

  const [rows] = await pool.query(
    `SELECT image, imageMime FROM post_images WHERE id = ? LIMIT 1`,
    [imageId]
  );
  const r = rows[0];
  if (!r?.image) return res.status(404).end();

  res.setHeader("Content-Type", r.imageMime || "image/webp");
  res.send(r.image);
});

// --- routes -----------------------------------------------------

router.get("/categories/all", async (req, res) => {
  const [rows] = await pool.query(`SELECT id, name, slug FROM categories ORDER BY name ASC`);
  res.json({ ok: true, categories: rows });
});

router.post("/", requireAuth, uploadPostMedia, async (req, res) => {
  const {
    title,
    content,
    excerpt,
    status,
    categories = [],
    tags = [],
    categoryId,
    activityDate,
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

  if (categoryId) {
    await pool.query(
      `INSERT IGNORE INTO post_categories (postId, categoryId) VALUES (?, ?)`,
      [postId, String(categoryId)]
    );
  } else {
    await attachCatsTags(postId, categories, tags);
  }

  if (tags && String(tags).length) {
    await attachCatsTags(postId, [], tags);
  }

  const coverFile = req.files?.cover?.[0];
  const imageFiles = req.files?.images || [];

  // ✅ Cover stored in DB
  if (coverFile?.buffer) {
    const img = await processPostImage({ buffer: coverFile.buffer });

    await pool.query(
      `UPDATE posts SET coverImage = ?, coverImageMime = ? WHERE id = ?`,
      [img.imageBuffer, img.mime, postId]
    );
  }

  // ✅ Gallery stored in DB
  if (imageFiles.length) {
    for (let i = 0; i < imageFiles.length; i++) {
      const f = imageFiles[i];
      if (!f?.buffer) continue;

      const img = await processPostImage({ buffer: f.buffer });

      await pool.query(
        `INSERT INTO post_images (id, postId, image, imageMime, sortOrder) VALUES (?, ?, ?, ?, ?)`,
        [makeId(), postId, img.imageBuffer, img.mime, i]
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
    activityDate,
  } = req.body;

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
  if (activityDate !== undefined) {
    fields.push("activityDate = ?");
    values.push(activityDate ? new Date(activityDate) : null);
  }

  if (fields.length) {
    await pool.query(`UPDATE posts SET ${fields.join(", ")} WHERE id = ?`, [...values, id]);
  }

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

  const coverFile = req.files?.cover?.[0];
  const imageFiles = req.files?.images || [];

  // ✅ replace cover in DB
  if (coverFile?.buffer) {
    const img = await processPostImage({ buffer: coverFile.buffer });

    await pool.query(
      `UPDATE posts SET coverImage = ?, coverImageMime = ? WHERE id = ?`,
      [img.imageBuffer, img.mime, id]
    );
  }

  // ✅ append gallery in DB
  if (imageFiles.length) {
    const [lastRows] = await pool.query(
      `SELECT sortOrder FROM post_images WHERE postId = ? ORDER BY sortOrder DESC LIMIT 1`,
      [id]
    );

    const startOrder = (Number(lastRows[0]?.sortOrder ?? -1) + 1);

    for (let i = 0; i < imageFiles.length; i++) {
      const f = imageFiles[i];
      if (!f?.buffer) continue;

      const img = await processPostImage({ buffer: f.buffer });

      await pool.query(
        `INSERT INTO post_images (id, postId, image, imageMime, sortOrder) VALUES (?, ?, ?, ?, ?)`,
        [makeId(), id, img.imageBuffer, img.mime, startOrder + i]
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

router.get("/", async (req, res) => {
  const { q, status, category, tag, year, page = 1, limit = 10, sort = "newest" } = req.query;

  const take = Math.min(Number(limit), 50);
  const skip = (Number(page) - 1) * take;

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

  const [countRows] = await pool.query(
    `SELECT COUNT(DISTINCT p.id) AS total ${joinSql} ${whereSql}`,
    params
  );
  const total = Number(countRows[0]?.total || 0);

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

  const items = [];
  for (const p of postRows) {
    const full = await getFullPostById(p.id);
    items.push(full);
  }

  res.json({ ok: true, total, page: Number(page), limit: take, items });
});

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

// SINGLE BY SLUG (keep last)
router.get("/:slug", async (req, res) => {
  const post = await getFullPostBySlug(req.params.slug);

  if (!post) return res.status(404).json({ ok: false, error: "Not found" });

  if (post.author) {
    post.author = { id: post.author.id, name: post.author.name };
  }

  res.json({ ok: true, post });
});

export default router;
