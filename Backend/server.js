require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const Project = require("./models/Project");
const DataSetup = require("./models/DataSetup");
const DataReading = require("./models/DataReading");

const http = require("http");
const { Server } = require("socket.io");
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

const isLocalDevOrigin = (origin = "") => {
  return (
    /^http:\/\/localhost:\d+$/.test(origin) ||
    /^http:\/\/127\.0\.0\.1:\d+$/.test(origin)
  );
};

// CORS configuration
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow non-browser requests that have no origin header.
      if (
        !origin ||
        allowedOrigins.includes(origin) ||
        isLocalDevOrigin(origin)
      ) {
        return callback(null, true);
      }
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

app.use(express.json({ limit: "10mb" })); // Increase payload limit
app.use(express.urlencoded({ limit: "10mb", extended: true }));

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin) || isLocalDevOrigin(origin)) {
        return callback(null, true);
      }
      return callback(new Error("Not allowed by CORS"));
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    credentials: true
  }
});

io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  socket.on("join_room", (setupKey) => {
    socket.join(setupKey);
  });

  socket.on("disconnect", () => {
  });
});

const crypto = require("crypto");

const normalizeDataFields = (fields) => {
  if (!Array.isArray(fields)) {
    return [];
  }

  return fields
    .map((value) => String(value ?? "").trim())
    .filter(Boolean)
    .slice(0, 8);
};

const toNullableNumber = (value) => {
  if (value === "" || value === null || value === undefined) {
    return null;
  }

  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
};

const toPositiveInt = (value, fallback) => {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) {
    return fallback;
  }

  const intValue = Math.floor(numberValue);
  return intValue >= 1 ? intValue : fallback;
};

const buildDataSetupPayload = (body = {}) => ({
  name: String(body.name ?? "").trim(),
  description: String(body.description ?? "").trim(),
  githubLink: String(body.githubLink ?? "").trim(),
  deviceApiUrl: String(body.deviceApiUrl ?? "").trim(),
  deviceApiKey: String(body.deviceApiKey ?? "").trim(),
  location: {
    latitude: toNullableNumber(body.location?.latitude),
    longitude: toNullableNumber(body.location?.longitude),
  },
  samplePeriodSec: toPositiveInt(body.samplePeriodSec, 10),
  fields: normalizeDataFields(body.fields),
});

// Connect to MongoDB
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err);
    process.exit(1);
  });

const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "default_fallback_secret_123";
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "duyetbai123";

const authenticateJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (authHeader) {
    const token = authHeader.split(" ")[1];

    jwt.verify(token, JWT_SECRET, (err, user) => {
      if (err) {
        return res.status(403).json({ error: "Token is invalid or expired" });
      }
      req.user = user;
      next();
    });
  } else {
    res.status(401).json({ error: "Authorization header is missing" });
  }
};

app.post("/api/auth/login", (req, res) => {
  const { username, password } = req.body;

  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    const token = jwt.sign({ username, role: "admin" }, JWT_SECRET, {
      expiresIn: "24h",
    });
    res.json({ token });
  } else {
    res.status(401).json({ error: "Invalid username or password" });
  }
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
app.post("/api/projects", authenticateJWT, async (req, res) => {
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
app.put("/api/projects/:id", authenticateJWT, async (req, res) => {
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
app.patch("/api/projects/:id/moderation", authenticateJWT, async (req, res) => {
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
app.delete("/api/projects/:id", authenticateJWT, async (req, res) => {
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

// GET all data setups
app.get("/api/data/setups", async (req, res) => {
  try {
    const setups = await DataSetup.find().sort({ createdAt: -1 });
    res.json(setups);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch data setups" });
  }
});

// GET data setup by key
app.get("/api/data/setup/:setupKey", async (req, res) => {
  try {
    const setup = await DataSetup.findOne({ setupKey: req.params.setupKey });

    if (!setup) {
      return res.status(404).json({ error: "Data setup not found" });
    }

    res.json(setup);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch data setup" });
  }
});

// POST data setup (Create new)
app.post("/api/data/setup", authenticateJWT, async (req, res) => {
  try {
    const payload = buildDataSetupPayload(req.body);
    payload.setupKey = req.body.setupKey || crypto.randomBytes(4).toString("hex");

    const setup = new DataSetup(payload);
    await setup.save();

    res.status(201).json(setup);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to create data setup" });
  }
});

// PUT data setup
app.put("/api/data/setup/:setupKey", authenticateJWT, async (req, res) => {
  try {
    const payload = buildDataSetupPayload(req.body);

    const setup = await DataSetup.findOneAndUpdate(
      { setupKey: req.params.setupKey },
      payload,
      {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      },
    );

    res.json(setup);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to save data setup" });
  }
});

// DELETE data setup and readings
app.delete("/api/data/setup/:setupKey", authenticateJWT, async (req, res) => {
  try {
    await DataReading.deleteMany({ setupKey: req.params.setupKey });
    await DataSetup.findOneAndDelete({ setupKey: req.params.setupKey });

    res.json({ message: "Data setup deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to delete data setup" });
  }
});

// DELETE readings only
app.delete("/api/data/readings/:setupKey", authenticateJWT, async (req, res) => {
  try {
    await DataReading.deleteMany({ setupKey: req.params.setupKey });
    res.json({ message: "Data readings cleared successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to clear data readings" });
  }
});

// GET recent readings
app.get("/api/data/readings/:setupKey", async (req, res) => {
  try {
    const limit = toPositiveInt(req.query.limit, 500);
    const readings = await DataReading.find({ setupKey: req.params.setupKey })
      .sort({ timestamp: -1 })
      .limit(limit);

    res.json([...readings].reverse());
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch data readings" });
  }
});

// POST a new reading (Used by Frontend Mock, protected by JWT)
app.post("/api/data/readings/:setupKey", authenticateJWT, async (req, res) => {
  try {
    const payload = {
      setupKey: req.params.setupKey,
      timestamp: req.body.timestamp ? new Date(req.body.timestamp) : new Date(),
      values: req.body.values ?? {},
      source: req.body.source || "device",
      rawPayload: req.body.rawPayload ?? null,
    };

    const reading = new DataReading(payload);
    await reading.save();

    // Emit real-time event to clients in the room
    io.to(req.params.setupKey).emit("new_reading", reading);

    res.status(201).json(reading);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to save data reading" });
  }
});

// POST data ingest endpoint for MCU
app.post("/api/data/ingest/:setupKey", async (req, res) => {
  try {
    const payload = req.body || {};

    const candidates = [];

    if (Array.isArray(payload)) {
      const lastItem = payload[payload.length - 1];
      if (lastItem && typeof lastItem === "object") {
        candidates.push(lastItem);
      }
    } else if (payload && typeof payload === "object") {
      candidates.push(payload);
      if (payload.data && typeof payload.data === "object") {
        candidates.push(payload.data);
      }
      if (payload.values && typeof payload.values === "object") {
        candidates.push(payload.values);
      }
    }

    const source =
      candidates.find((item) => item && typeof item === "object") || {};

    const timestampSource =
      source.timestamp ??
      source.time ??
      source.createdAt ??
      source.ts ??
      source.ts_ms;
    const timestampValue = timestampSource
      ? new Date(timestampSource).getTime()
      : NaN;
    const timestamp = Number.isFinite(timestampValue)
      ? timestampValue
      : Date.now();

    const setup = await DataSetup.findOne({ setupKey: req.params.setupKey });
    
    if (setup && setup.deviceApiKey) {
      const providedKey = req.headers["x-device-api-key"] || req.headers["x-api-key"];
      if (providedKey !== setup.deviceApiKey) {
        return res.status(401).json({ error: "Unauthorized: Invalid Device API Key" });
      }
    }

    const fieldNames = setup?.fields ?? [];

    const values = {};
    fieldNames.forEach((fieldName) => {
      const rawValue =
        source[fieldName] ??
        source.values?.[fieldName] ??
        source.data?.[fieldName] ??
        source.sensors?.[fieldName];
      const numericValue = Number(rawValue);
      values[fieldName] = Number.isFinite(numericValue) ? numericValue : null;
    });

    const reading = new DataReading({
      setupKey: req.params.setupKey,
      timestamp: new Date(timestamp),
      values,
      source: "mcu",
      rawPayload: payload,
    });

    await reading.save();

    // Emit real-time event to clients in the room
    io.to(req.params.setupKey).emit("new_reading", reading);

    res.status(201).json({
      success: true,
      message: "Data ingested successfully",
      reading,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to ingest data" });
  }
});

// Test endpoint
app.get("/api/test", (req, res) => {
  res.json({ message: "Backend chạy rồi!" });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
