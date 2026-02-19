import "dotenv/config";
import bcrypt from "bcryptjs";
import pool from "../config/database.js";
import { makeId } from "../models/_id.js";

async function main() {
  const emailArg = process.argv[2];
  const pass = process.argv[3];

  if (!emailArg || !pass) {
    console.log("Usage: node scripts/seedAdmin.js shoqatadituria@gmail.com D1tur!a@2025#X9");
    process.exit(1);
  }

  const email = String(emailArg).trim().toLowerCase();
  const passwordHash = await bcrypt.hash(pass, 12);

  // Check if admin exists
  const [rows] = await pool.query(
    `SELECT id, email FROM admins WHERE email = ? LIMIT 1`,
    [email]
  );

  if (rows[0]) {
    // Update password
    await pool.query(
      `UPDATE admins
       SET passwordHash = ?, failedLogins = 0, lockedUntil = NULL
       WHERE id = ?`,
      [passwordHash, rows[0].id]
    );

    console.log("✅ Admin password UPDATED:", rows[0].email);
    process.exit(0);
  }

  // Create new admin
  const id = makeId();

  await pool.query(
    `INSERT INTO admins (id, email, passwordHash, role, isActive)
     VALUES (?, ?, ?, ?, TRUE)`,
    [id, email, passwordHash, "ADMIN"]
  );

  console.log("✅ Admin CREATED:", email);
  process.exit(0);
}

main().catch((err) => {
  console.error("Seed error:", err);
  process.exit(1);
});
