import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";

import { apiLimiter } from "./middleware/rateLimiter.js";

import authRoutes from "./config/authRoutes.js";
import postRoutes from "./routes/postRoutes.js";
import adminLogRoutes from "./routes/adminLogsRoutes.js";
import { sendEmail } from "./lib/emailService.js";

const app = express();

app.set("trust proxy", 1);

app.get("/api/test-email", async (req, res) => {
  try {
    await sendEmail({
      to: process.env.SMTP_USER,
      subject: "Test email",
      html: "<p>If you got this, SMTP works.</p>",
    });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

app.use(express.json({ limit: "2mb" }));
app.use(cookieParser());
app.use(apiLimiter);

// ✅ CORS (dev + production)
const allowedOrigins = [
  process.env.FRONTEND_URL, // set this in Railway
  "http://localhost:5173",
  "http://127.0.0.1:5173",
].filter(Boolean);

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (allowedOrigins.includes(origin)) return cb(null, true);
      return cb(null, false);
    },
    credentials: true,
  })
);

// routes
app.use("/api/auth", authRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/admin-logs", adminLogRoutes);

app.get("/api/health", (req, res) => res.json({ ok: true }));

// error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(400).json({ ok: false, error: err.message || "Error" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`API running on :${PORT}`));
