const express = require("express");
const mongoose = require("mongoose");
const invoiceRoutes = require("./routes/InvoiceRoutes");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const app = express();

// ========== ALL SERVER SETUP CODE HERE (ALWAYS RUNS) ==========

// Debug logging
console.log("=== SERVER STARTING ===");
console.log("NODE_ENV:", process.env.NODE_ENV);
console.log("VERCEL:", !!process.env.VERCEL);
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
let isConnected = false;

const connectDB = async () => {
  if (isConnected) {
    console.log("Using existing MongoDB connection");
    return;
  }

  try {
    console.log("Creating new MongoDB connection...");
    const conn = await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      maxPoolSize: 1,
      minPoolSize: 0,
      maxIdleTimeMS: 10000,
    });

    isConnected = conn.connections[0].readyState === 1;
    console.log(`✅ MongoDB Connected: ${isConnected}`);
  } catch (error) {
    console.log("❌ MongoDB Connection Error:", error.message);
    isConnected = false;
  }
};

// Connect to DB
connectDB();

// Routes
app.use("/api/invoices", invoiceRoutes);

// Health endpoint
app.get("/api/health", (req, res) => {
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

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: "Route not found",
    path: req.originalUrl,
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error("Error:", err.stack);
  res.status(500).json({ error: "Internal server error" });
});

// ========== EXPORT FOR VERCEL ==========
// This MUST be at the end, after all setup

console.log("=== SERVER SETUP COMPLETE ===");
console.log("Routes configured");
console.log("MongoDB connection initialized");

// Export the app for Vercel
module.exports = app;

// ========== LOCAL DEVELOPMENT ==========
// This only runs when NOT on Vercel
if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`🌐 Accessible at: http://localhost:${PORT}`);
  });
}
