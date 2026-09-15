const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const requireAuth = require("../middleware/requireAuth");

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRY = "7d";
const SALT_ROUNDS = 10;

/** Helper — create and return a signed JWT for a given user id */
function signToken(userId) {
  return jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: JWT_EXPIRY });
}

// ── POST /auth/signup ───────────────────────────────────────────────
router.post("/signup", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    if (password.length < 6) {
      return res
        .status(400)
        .json({ error: "Password must be at least 6 characters" });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ error: "Email already registered" });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const user = await User.create({ email, passwordHash });
    const token = signToken(user._id);

    res.status(201).json({ token });
  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── POST /auth/login ────────────────────────────────────────────────
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const token = signToken(user._id);
    res.json({ token });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── GET /auth/me (protected) ────────────────────────────────────────
router.get("/me", requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select("email createdAt");
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json({ email: user.email, createdAt: user.createdAt });
  } catch (err) {
    console.error("/auth/me error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
