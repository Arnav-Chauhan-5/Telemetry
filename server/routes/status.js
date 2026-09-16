const express = require("express");
const Service = require("../models/Service");
const MonitoringResult = require("../models/MonitoringResult");

const router = express.Router();

router.get("/public", async (req, res) => {
  try {
    const services = await Service.find().select("name _id");
    const results = [];
    
    for (const service of services) {
      const latestResult = await MonitoringResult.findOne({ serviceId: service._id })
        .sort({ checkedAt: -1 });
        
      results.push({
        name: service.name,
        status: latestResult ? latestResult.status : "unknown"
      });
    }
    
    res.json(results);
  } catch (err) {
    console.error("Public status error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
