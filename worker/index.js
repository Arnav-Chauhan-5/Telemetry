const { Worker } = require("bullmq");
const IORedis = require("ioredis");

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

const connection = new IORedis(REDIS_URL, { maxRetriesPerRequest: null });

const worker = new Worker(
  "health-checks",
  async (job) => {
    const { serviceId } = job.data;
    const timestamp = new Date().toISOString();
    console.log(
      `[health-check] serviceId=${serviceId}  time=${timestamp}  jobId=${job.id}`,
    );
    // TODO: perform actual HTTP health check here
  },
  { connection },
);

worker.on("completed", (job) => {
  console.log(`  ✓ job ${job.id} completed`);
});

worker.on("failed", (job, err) => {
  console.error(`  ✗ job ${job?.id} failed:`, err.message);
});

worker.on("ready", () => {
  console.log("Worker connected to Redis, waiting for jobs…");
});

console.log("Telemetry worker starting…");
