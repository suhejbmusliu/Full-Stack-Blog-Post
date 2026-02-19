import pool from "../config/database.js";
import { makeId } from "./_id.js";

class RefreshToken {
  static async create({ adminId, tokenHash, expiresAt, ip, userAgent }) {
    const id = makeId();

    await pool.query(
      `INSERT INTO refresh_tokens (id, adminId, tokenHash, expiresAt, ip, userAgent)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, adminId, tokenHash, expiresAt, ip || null, userAgent || null]
    );

    return { id };
  }

  static async findById(id) {
    const [rows] = await pool.query(
      `SELECT * FROM refresh_tokens WHERE id = ? LIMIT 1`,
      [id]
    );
    return rows[0] || null;
  }

  static async revoke(id) {
    await pool.query(
      `UPDATE refresh_tokens SET revokedAt = NOW() WHERE id = ?`,
      [id]
    );
  }
}

export default RefreshToken;
