const mongoose = require("mongoose");

const dataSetupSchema = new mongoose.Schema(
  {
    setupKey: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      default: "default",
    },
    name: {
      type: String,
      default: "",
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    githubLink: {
      type: String,
      default: "",
    },
    deviceApiUrl: {
      type: String,
      default: "",
    },
    location: {
      latitude: {
        type: Number,
        default: null,
      },
      longitude: {
        type: Number,
        default: null,
      },
    },
    samplePeriodSec: {
      type: Number,
      default: 10,
      min: 1,
    },
    fields: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("DataSetup", dataSetupSchema);
