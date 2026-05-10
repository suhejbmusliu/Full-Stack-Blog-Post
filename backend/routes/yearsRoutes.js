import { Router } from "express";
import pool from "../config/database.js";
import { requireAuth } from "../middleware/auth.js";
import { makeId } from "../models/_id.js";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT year FROM activity_years ORDER BY year DESC`
    );
    res.json({ ok: true, years: rows });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.post("/", requireAuth, async (req, res) => {
  try {
    const year = Number(req.body?.year);
    if (!Number.isInteger(year) || year < 1900 || year > 3000) {
      return res.status(400).json({ ok: false, error: "Invalid year" });
    }

    await pool.query(
      `INSERT IGNORE INTO activity_years (id, year) VALUES (?, ?)`,
      [makeId(), year]
    );

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.delete("/:year", requireAuth, async (req, res) => {
  try {
    const year = Number(req.params.year);
    if (!Number.isInteger(year)) {
      return res.status(400).json({ ok: false, error: "Invalid year" });
    }

    await pool.query(`DELETE FROM activity_years WHERE year = ?`, [year]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

export default router;
