// backend/models/_id.js
import crypto from "crypto";

// 32-char id to fit VARCHAR(32)
export function makeId() {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 32);
}
