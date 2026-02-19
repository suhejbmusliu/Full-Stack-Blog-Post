import pool from "../config/database.js";

class TwoFactorResetToken {
  static async create({ adminId, tokenHash, expiresAt }, options = {}) {
    const conn = options.connection || pool;

    // invalidate previous unused tokens
    await conn.query(
      `
      UPDATE two_factor_reset_tokens
      SET used_at = NOW()
      WHERE admin_id = ? AND used_at IS NULL
      `,
      [adminId]
    );

    await conn.query(
      `
      INSERT INTO two_factor_reset_tokens
        (admin_id, token_hash, expires_at, used_at, created_at)
      VALUES (?, ?, ?, NULL, NOW())
      `,
      [adminId, tokenHash, expiresAt]
    );
  }

  static async findLatestUnused(adminId, tokenHash) {
    const [rows] = await pool.query(
      `
      SELECT *
      FROM two_factor_reset_tokens
      WHERE admin_id = ?
        AND token_hash = ?
        AND used_at IS NULL
      ORDER BY created_at DESC
      LIMIT 1
      `,
      [adminId, tokenHash]
    );

    return rows[0] || null;
  }

  static async update(id, data, options = {}) {
    const conn = options.connection || pool;

    const fields = [];
    const values = [];

    if (data.usedAt) {
      fields.push("used_at = ?");
      values.push(data.usedAt);
    }

    if (fields.length === 0) return true;

    await conn.query(
      `UPDATE two_factor_reset_tokens SET ${fields.join(", ")} WHERE id = ?`,
      [...values, id]
    );

    return true;
  }
}

export default TwoFactorResetToken;
