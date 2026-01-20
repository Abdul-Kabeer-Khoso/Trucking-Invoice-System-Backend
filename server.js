const express = require("express");
const mongoose = require("mongoose");
const invoiceRoutes = require("./routes/InvoiceRoutes");
const cors = require("cors");
require("dotenv").config();

const app = express();

// ===== CRITICAL: Log to verify code is running =====
console.log("🚀 INVOICE SERVER STARTING ===");
console.log("Environment:", process.env.NODE_ENV || "development");
console.log("Vercel:", !!process.env.VERCEL);
console.log("MONGODB_URI exists:", !!process.env.MONGODB_URI);

// CORS
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:3000",
      /\.vercel\.app$/,
    ],
    credentials: true,
  }),
);

app.use(express.json());

// MongoDB Connection
const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/invoicesystem";

console.log("Attempting MongoDB connection to Railway...");
mongoose
  .connect(MONGODB_URI, {
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000,
  })
  .then(() => {
    console.log("✅ MongoDB Connected to Railway!");

    // Initialize counter
    const Counter = require("./models/Counter");
    Counter.findOne({ name: "invoiceNumber" })
      .then((counter) => {
        if (!counter) {
          return Counter.create({ name: "invoiceNumber", value: 0 });
        }
      })
      .then(() => console.log("✅ Counter ready"))
      .catch((err) => console.log("⚠️ Counter error:", err.message));
  })
  .catch((err) => {
    console.log("❌ MongoDB Connection Error:", err.message);
  });

// Routes
app.use("/api/invoices", invoiceRoutes);

// Health endpoint
app.get("/api/health", (req, res) => {
  console.log("GET /api/health");
  res.json({
    status: "OK",
    database:
      mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    environment: process.env.NODE_ENV || "development",
    timestamp: new Date().toISOString(),
  });
});

// Root endpoint
app.get("/", (req, res) => {
  console.log("GET /");
  res.json({
    message: "Invoice Management API",
    version: "1.0.0",
    database:
      mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    endpoints: {
      invoices: "/api/invoices",
      health: "/api/health",
    },
  });
});

// Error handlers
app.use((req, res) => {
  res.status(404).json({ error: "Route not found", path: req.originalUrl });
});

app.use((err, req, res, next) => {
  console.error("Error:", err.stack);
  res.status(500).json({ error: "Internal server error" });
});

console.log("✅ Server setup complete");

// Export for Vercel
module.exports = app;
