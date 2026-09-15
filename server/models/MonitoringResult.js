const mongoose = require("mongoose");

const monitoringResultSchema = new mongoose.Schema(
  {
    serviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Service",
      required: true,
    },
    status: {
      type: String,
      enum: ["up", "down"],
      required: true,
    },
    statusCode: {
      type: Number,
      default: null,
    },
    responseTime: {
      type: Number,
      required: true,
    },
    checkedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
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

module.exports = mongoose.model("MonitoringResult", monitoringResultSchema);
