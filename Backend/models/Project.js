const mongoose = require("mongoose");

const projectSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      required: true,
      enum: ["AI", "Technical", "Role", "Personal"],
    },
    techStack: {
      type: [String],
      default: [],
    },
    image: {
      type: String,
      default: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800",
    },
    githubLink: {
      type: String,
      default: "",
    },
    liveDemoLink: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true, // Tự động thêm createdAt, updatedAt
  }
);

module.exports = mongoose.model("Project", projectSchema);
