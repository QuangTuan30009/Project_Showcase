require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("node:dns");
const Project = require("./models/Project");
const fs = require("fs").promises;
const path = require("path");

// Cấu hình DNS servers
dns.setServers(["8.8.8.8", "1.1.1.1"]);

// Script để migrate data từ JSON file sang MongoDB
async function migrateData() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    // Read JSON file
    const dataPath = path.join(__dirname, "data", "projects.json");
    const jsonData = await fs.readFile(dataPath, "utf8");
    const { projects } = JSON.parse(jsonData);

    // Clear existing data (optional - comment out if you want to keep existing)
    await Project.deleteMany({});
    console.log("🗑️  Cleared existing projects");

    // Insert projects
    const result = await Project.insertMany(projects);
    console.log(`✅ Migrated ${result.length} projects to MongoDB`);

    // Display migrated projects
    result.forEach((project) => {
      console.log(`  - ${project.title} (ID: ${project._id})`);
    });

    console.log("\n🎉 Migration completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

migrateData();
