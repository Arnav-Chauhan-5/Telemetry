require("dotenv").config();

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

const app = express();
app.use(cors());
const PORT = process.env.PORT || 4000;
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/telemetry";

// ── MongoDB connection ──────────────────────────────────────────────
mongoose
  .connect(MONGO_URI)
  .then(() => console.log("✓ MongoDB connected"))
  .catch((err) => console.error("✗ MongoDB connection error:", err.message));

// ── Routes ──────────────────────────────────────────────────────────
app.get("/health", (_req, res) => {
  const mongoConnected = mongoose.connection.readyState === 1;
  res.json({ status: "ok", mongoConnected });
});

// ── Start server ────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`Telemetry server listening on http://localhost:${PORT}`);
});
