import fs from "fs";
import path from "path";
import sharp from "sharp";

const UPLOAD_DIR = process.env.UPLOAD_DIR || "uploads";

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

export async function processPostImage({ buffer, postId }) {
  const base = path.join(UPLOAD_DIR, "posts", postId);
  const thumbs = path.join(UPLOAD_DIR, "thumbnails", postId);
  ensureDir(base);
  ensureDir(thumbs);

  const fileName = `${Date.now()}.webp`;
  const fullPath = path.join(base, fileName);
  const thumbPath = path.join(thumbs, fileName);

  await sharp(buffer)
    .resize(1600, 900, { fit: "inside" })
    .webp({ quality: 82 })
    .toFile(fullPath);

  await sharp(buffer)
    .resize(500, 300, { fit: "cover" })
    .webp({ quality: 75 })
    .toFile(thumbPath);

  return {
    imagePath: fullPath.replace(/\\/g, "/"),
    thumbPath: thumbPath.replace(/\\/g, "/"),
  };
}
