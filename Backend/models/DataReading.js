const mongoose = require("mongoose");

const dataReadingSchema = new mongoose.Schema(
  {
    setupKey: {
      type: String,
      required: true,
      trim: true,
      index: true,
      default: "default",
    },
    timestamp: {
      type: Date,
      required: true,
      index: true,
      default: Date.now,
    },
    values: {
      type: Map,
      of: Number,
      default: {},
    },
    source: {
      type: String,
      default: "device",
    },
    rawPayload: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

dataReadingSchema.index({ setupKey: 1, timestamp: -1 });

module.exports = mongoose.model("DataReading", dataReadingSchema);
