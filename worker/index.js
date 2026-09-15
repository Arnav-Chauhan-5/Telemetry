const { Worker } = require("bullmq");
const IORedis = require("ioredis");
const mongoose = require("mongoose");

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
const MONGO_URI =
  process.env.MONGO_URI || "mongodb://localhost:27017/telemetry";

// ── Models ────────────────────────────────────────────────────────
// Redefining just what we need for the worker to avoid sharing files
// between Docker build contexts for now.
const serviceSchema = new mongoose.Schema({
  url: String,
});
const Service = mongoose.model("Service", serviceSchema);

const monitoringResultSchema = new mongoose.Schema(
  {
    serviceId: { type: mongoose.Schema.Types.ObjectId, required: true },
    status: { type: String, enum: ["up", "down"], required: true },
    statusCode: { type: Number, default: null },
    responseTime: { type: Number, required: true },
    checkedAt: { type: Date, default: Date.now },
  },
  {
    timeseries: {
      timeField: "checkedAt",
      metaField: "serviceId",
      granularity: "seconds",
    },
    collection: "monitoring_results",
  },
);
const MonitoringResult = mongoose.model(
  "MonitoringResult",
  monitoringResultSchema,
);

// ── Database Connection ───────────────────────────────────────────
mongoose
  .connect(MONGO_URI)
  .then(() => console.log("✓ Worker connected to MongoDB"))
  .catch((err) =>
    console.error("✗ Worker MongoDB connection error:", err.message),
  );

// ── Redis Connection & Worker ─────────────────────────────────────
const connection = new IORedis(REDIS_URL, { maxRetriesPerRequest: null });

const worker = new Worker(
  "health-checks",
  async (job) => {
    const { serviceId } = job.data;
    
    // 1. Look up the service
    const service = await Service.findById(serviceId);
    if (!service) {
      console.warn(`Service ${serviceId} not found, skipping check.`);
      return;
    }

    const start = performance.now();
    let status = "down";
    let statusCode = null;

    try {
      // 2. Perform HTTP GET with 5 second timeout
      const response = await fetch(service.url, {
        method: "GET",
        signal: AbortSignal.timeout(5000),
      });

      statusCode = response.status;
      // 3. Status is up if 200-299
      if (response.ok) {
        status = "up";
      }
    } catch (err) {
      // Network failure, timeout, DNS failure, etc.
      // status remains "down", statusCode remains null
    }

    const responseTime = Math.round(performance.now() - start);

    // 4. Save result
    await MonitoringResult.create({
      serviceId,
      status,
      statusCode,
      responseTime,
    });

    console.log(
      `[health-check] serviceId=${serviceId} url=${service.url} status=${status} statusCode=${statusCode} time=${responseTime}ms`,
    );
  },
  { connection },
);

worker.on("completed", (job) => {
  // console.log(`  ✓ job ${job.id} completed`);
});

worker.on("failed", (job, err) => {
  console.error(`  ✗ job ${job?.id} failed:`, err.message);
});

worker.on("ready", () => {
  console.log("Worker connected to Redis, waiting for jobs…");
});

console.log("Telemetry worker starting…");
