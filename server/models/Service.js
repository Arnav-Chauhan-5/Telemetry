const mongoose = require("mongoose");

const serviceSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  url: {
    type: String,
    required: true,
    trim: true,
    validate: {
      validator(v) {
        try {
          new URL(v);
          return true;
        } catch {
          return false;
        }
      },
      message: "Must be a valid URL",
    },
  },
  checkIntervalSeconds: {
    type: Number,
    default: 60,
    min: 10,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Service", serviceSchema);
