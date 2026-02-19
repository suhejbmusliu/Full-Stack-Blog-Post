import "dotenv/config";
import pool from "../config/database.js";

try {
  const [rows] = await pool.query("SELECT 1 AS ok");
  console.log("✅ MySQL connected:", rows);
  process.exit(0);
} catch (err) {
  console.error("❌ MySQL connection failed:", err);
  process.exit(1);
}
