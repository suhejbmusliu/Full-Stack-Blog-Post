import pool from "../config/database.js";
import { makeId } from "./_id.js";

class PasswordResetToken {
  static async create({ adminId, tokenHash, expiresAt }, options = {}) {
    const conn = options.connection || pool;
    const id = makeId();

    await conn.query(
      `INSERT INTO password_reset_tokens (id, adminId, tokenHash, expiresAt)
       VALUES (?, ?, ?, ?)`,
      [id, adminId, tokenHash, expiresAt]
    );

    return { id, adminId, tokenHash, expiresAt, usedAt: null };
  }

  // Prisma equivalent:
  // findFirst where { adminId, tokenHash, usedAt: null } orderBy createdAt desc
  static async findLatestUnused(adminId, tokenHash) {
    const [rows] = await pool.query(
      `SELECT *
       FROM password_reset_tokens
       WHERE adminId = ? AND tokenHash = ? AND usedAt IS NULL
       ORDER BY createdAt DESC
       LIMIT 1`,
      [adminId, tokenHash]
    );
    return rows[0] || null;
  }

  static async update(id, data, options = {}) {
    const conn = options.connection || pool;

    const keys = Object.keys(data);
    if (keys.length === 0) return;

    const setSql = keys.map((k) => `${k} = ?`).join(", ");
    const values = keys.map((k) => data[k]);

    await conn.query(
      `UPDATE password_reset_tokens SET ${setSql} WHERE id = ?`,
      [...values, id]
    );
  }
}

export default PasswordResetToken;
