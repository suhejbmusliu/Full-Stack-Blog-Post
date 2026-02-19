import sharp from "sharp";

// Converts uploaded image buffer to a single optimized WEBP buffer (no thumbnails, no disk)
export async function processPostImage({ buffer }) {
  const webp = await sharp(buffer)
    .resize(1600, 900, { fit: "inside" })
    .webp({ quality: 82 })
    .toBuffer();

  return {
    imageBuffer: webp,
    mime: "image/webp",
  };
}
