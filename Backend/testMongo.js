const mongoose = require("mongoose");
const dns = require("node:dns");
require("dotenv").config();

// Cấu hình DNS servers
dns.setServers(["8.8.8.8", "1.1.1.1"]);

async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ MongoDB connected");
    process.exit();
  } catch (error) {
    console.error("❌ MongoDB error:", error);
    process.exit(1);
  }
}

connectDB();
