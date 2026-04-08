require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const Project = require("./models/Project");

const app = express();
const dns = require("node:dns");
dns.setServers(["8.8.8.8", "1.1.1.1"]);

const defaultOrigins = [
  "http://localhost:5173",
  "http://localhost:8080",
  "https://project-showcase-phi.vercel.app",
];
const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(",").map((origin) => origin.trim())
  : defaultOrigins;

// CORS configuration
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow non-browser requests that have no origin header.
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

app.use(express.json({ limit: "10mb" })); // Increase payload limit
app.use(express.urlencoded({ limit: "10mb", extended: true }));

// Connect to MongoDB
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err);
    process.exit(1);
  });

// GET all projects
app.get("/api/projects", async (req, res) => {
  try {
    const includeHidden = req.query.includeHidden === "true";
    const filter = includeHidden
      ? {}
      : {
          $or: [
            { moderationStatus: "approved" },
            { moderationStatus: { $exists: false } },
            { moderationStatus: null },
          ],
        };
    const projects = await Project.find(filter).sort({ createdAt: -1 });
    res.json(projects);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch projects" });
  }
});

// GET single project
app.get("/api/projects/:id", async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }
    res.json(project);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch project" });
  }
});

// POST new project
app.post("/api/projects", async (req, res) => {
  try {
    const payload = {
      ...req.body,
      moderationStatus: req.body.moderationStatus || "pending",
    };
    const project = new Project(payload);
    await project.save();
    res.status(201).json(project);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to create project" });
  }
});

// PUT update project
app.put("/api/projects/:id", async (req, res) => {
  try {
    const payload = { ...req.body };

    if (payload.moderationStatus) {
      payload.reviewedAt = new Date();
    }

    const project = await Project.findByIdAndUpdate(req.params.id, payload, {
      new: true,
      runValidators: true,
    });
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }
    res.json(project);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to update project" });
  }
});

// PATCH moderation status
app.patch("/api/projects/:id/moderation", async (req, res) => {
  try {
    const { moderationStatus, moderationNote } = req.body;
    const payload = {
      moderationStatus,
      moderationNote: moderationNote || "",
      reviewedAt: new Date(),
    };

    const project = await Project.findByIdAndUpdate(req.params.id, payload, {
      new: true,
      runValidators: true,
    });

    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    res.json(project);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to update moderation status" });
  }
});

// DELETE project
app.delete("/api/projects/:id", async (req, res) => {
  try {
    const project = await Project.findByIdAndDelete(req.params.id);
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }
    res.json({ message: "Project deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to delete project" });
  }
});

// Test endpoint
app.get("/api/test", (req, res) => {
  res.json({ message: "Backend chạy rồi!" });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
