const express = require("express");
const Service = require("../models/Service");
const requireAuth = require("../middleware/requireAuth");

const router = express.Router();

// All service routes require authentication
router.use(requireAuth);

// ── POST /services — create a new service ───────────────────────────
router.post("/", async (req, res) => {
  try {
    const { name, url, checkIntervalSeconds } = req.body;

    if (!name || !url) {
      return res.status(400).json({ error: "Name and URL are required" });
    }

    const service = await Service.create({
      userId: req.userId,
      name,
      url,
      ...(checkIntervalSeconds != null && { checkIntervalSeconds }),
    });

    res.status(201).json(service);
  } catch (err) {
    if (err.name === "ValidationError") {
      const messages = Object.values(err.errors).map((e) => e.message);
      return res.status(400).json({ error: messages.join(", ") });
    }
    console.error("Create service error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── GET /services — list the logged-in user's services ──────────────
router.get("/", async (req, res) => {
  try {
    const services = await Service.find({ userId: req.userId }).sort({
      createdAt: -1,
    });
    res.json(services);
  } catch (err) {
    console.error("List services error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── PUT /services/:id — update a service ────────────────────────────
router.put("/:id", async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);

    if (!service) {
      return res.status(404).json({ error: "Service not found" });
    }

    if (service.userId.toString() !== req.userId) {
      return res
        .status(403)
        .json({ error: "You do not own this service" });
    }

    const { name, url, checkIntervalSeconds } = req.body;
    if (name != null) service.name = name;
    if (url != null) service.url = url;
    if (checkIntervalSeconds != null)
      service.checkIntervalSeconds = checkIntervalSeconds;

    await service.save();
    res.json(service);
  } catch (err) {
    if (err.name === "ValidationError") {
      const messages = Object.values(err.errors).map((e) => e.message);
      return res.status(400).json({ error: messages.join(", ") });
    }
    console.error("Update service error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── DELETE /services/:id — delete a service ─────────────────────────
router.delete("/:id", async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);

    if (!service) {
      return res.status(404).json({ error: "Service not found" });
    }

    if (service.userId.toString() !== req.userId) {
      return res
        .status(403)
        .json({ error: "You do not own this service" });
    }

    await service.deleteOne();
    res.json({ deleted: true });
  } catch (err) {
    console.error("Delete service error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
