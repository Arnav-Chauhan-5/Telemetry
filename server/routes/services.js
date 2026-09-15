const express = require("express");
const Service = require("../models/Service");
const MonitoringResult = require("../models/MonitoringResult");
const requireAuth = require("../middleware/requireAuth");
const { healthCheckQueue } = require("../lib/queue");

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

    // Schedule a repeatable health-check job via Job Scheduler (BullMQ v6+)
    await healthCheckQueue.upsertJobScheduler(
      service._id.toString(),
      { every: service.checkIntervalSeconds * 1000 },
      { data: { serviceId: service._id.toString() } },
    );

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

    // Remove the job scheduler before deleting the service (BullMQ v6+)
    await healthCheckQueue.removeJobScheduler(service._id.toString());

    await service.deleteOne();
    res.json({ deleted: true });
  } catch (err) {
    console.error("Delete service error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});
// ── GET /services/:id/results — list recent results ─────────────────
router.get("/:id/results", async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);

    if (!service) {
      return res.status(404).json({ error: "Service not found" });
    }

    if (service.userId.toString() !== req.userId) {
      return res.status(403).json({ error: "You do not own this service" });
    }

    const results = await MonitoringResult.find({ serviceId: service._id })
      .sort({ checkedAt: -1 })
      .limit(20);

    res.json(results);
  } catch (err) {
    console.error("List results error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});
// ── GET /services/:id/status — get live status and uptime ─────────────
router.get("/:id/status", async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);

    if (!service) {
      return res.status(404).json({ error: "Service not found" });
    }

    if (service.userId.toString() !== req.userId) {
      return res.status(403).json({ error: "You do not own this service" });
    }

    // 1. Get the single most recent result for current status
    const latestResult = await MonitoringResult.findOne({ serviceId: service._id })
      .sort({ checkedAt: -1 });

    // 2. Calculate uptime percentage over the last 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    // Use aggregation to count total and "up" results efficiently
    const stats = await MonitoringResult.aggregate([
      { 
        $match: { 
          serviceId: service._id,
          checkedAt: { $gte: oneDayAgo }
        } 
      },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          up: {
            $sum: { $cond: [{ $eq: ["$status", "up"] }, 1, 0] }
          }
        }
      }
    ]);

    let uptimePercentage = null;
    if (stats.length > 0 && stats[0].total > 0) {
      uptimePercentage = (stats[0].up / stats[0].total) * 100;
    }

    res.json({
      currentStatus: latestResult ? latestResult.status : "unknown",
      lastCheckedAt: latestResult ? latestResult.checkedAt : null,
      lastResponseTime: latestResult ? latestResult.responseTime : null,
      uptimePercentage
    });
  } catch (err) {
    console.error("Get status error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
