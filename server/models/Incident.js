const mongoose = require("mongoose");

const incidentSchema = new mongoose.Schema({
  serviceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Service",
    required: true,
    index: true,
  },
  status: {
    type: String,
    enum: ["investigating", "resolved"],
    required: true,
    default: "investigating",
  },
  startedAt: {
    type: Date,
    required: true,
  },
  resolvedAt: {
    type: Date,
    default: null,
  },
  consecutiveFailures: {
    type: Number,
    default: 3,
  },
  downtimeSeconds: {
    type: Number,
    default: null,
  },
});

module.exports = mongoose.model("Incident", incidentSchema);
