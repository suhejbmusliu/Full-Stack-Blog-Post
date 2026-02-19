import pool from "../config/database.js";

class Admin {
  static async findById(id) {
    const [rows] = await pool.query(
      "SELECT * FROM admins WHERE id = ? LIMIT 1",
      [id]
    );
    return rows[0] || null;
  }

  static async findByEmail(email) {
    const [rows] = await pool.query(
      "SELECT * FROM admins WHERE email = ? LIMIT 1",
      [email]
    );
    return rows[0] || null;
  }

  static async update(id, data, options = {}) {
    const conn = options.connection || pool;

    const keys = Object.keys(data);
    if (keys.length === 0) return this.findById(id);

    const setSql = keys.map((k) => `${k} = ?`).join(", ");
    const values = keys.map((k) => data[k]);

    await conn.query(`UPDATE admins SET ${setSql} WHERE id = ?`, [...values, id]);
    return this.findById(id);
  }

  /**
   * ✅ 2FA Recovery Reset (Lost Authenticator)
   * This is NOT the normal "disable 2FA" from settings.
   * This is used when user can't login because they lost 2FA device.
   *
   * It will:
   * - turn off twoFactorEnabled
   * - clear twoFactorSecret and twoFactorTemp
   * - optional: unlock account + reset failed logins (safe for recovery)
   */
  static async reset2FARecovery(adminId, options = {}) {
    const conn = options.connection || pool;

    await conn.query(
      `
      UPDATE admins
      SET
        twoFactorEnabled = 0,
        twoFactorSecret = NULL,
        twoFactorTemp = NULL,
        failedLogins = 0,
        lockedUntil = NULL
      WHERE id = ?
      `,
      [adminId]
    );

    return this.findById(adminId);
  }

  /**
   * ✅ Revoke ALL refresh tokens for this admin (force logout everywhere)
   * This is recommended after 2FA reset to stop old sessions.
   */
  static async revokeAllRefreshTokens(adminId, options = {}) {
    const conn = options.connection || pool;

    const [result] = await conn.query(
      `
      UPDATE refresh_tokens
      SET revokedAt = NOW()
      WHERE adminId = ? AND revokedAt IS NULL
      `,
      [adminId]
    );

    return result.affectedRows || 0;
  }
}

export default Admin;
