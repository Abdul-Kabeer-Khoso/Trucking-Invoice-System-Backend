const express = require("express");
const mongoose = require("mongoose");
const invoiceRoutes = require("./routes/InvoiceRoutes");
const cors = require("cors");
const path = require("path");
require("dotenv").config(); // Load .env file

const app = express();

// Add this early in server.js
console.log("=== VERCEL ENV DEBUG ===");
console.log("MONGODB_URI exists:", !!process.env.MONGODB_URI);
console.log("MONGODB_URI length:", process.env.MONGODB_URI?.length);
console.log(
  "MONGODB_URI first 50 chars:",
  process.env.MONGODB_URI?.substring(0, 50),
);
console.log(
  "MONGODB_URI last 50 chars:",
  process.env.MONGODB_URI?.substring(process.env.MONGODB_URI?.length - 50),
);
console.log("NODE_ENV:", process.env.NODE_ENV);
console.log("=== END DEBUG ===");

// ✅ UPDATED: Simplified CORS for Vercel + Railway
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    // List of allowed origins
    const allowedOrigins = [
      "http://localhost:5173",
      "http://localhost:3000",
      "http://localhost:5000",
      /\.vercel\.app$/, // All Vercel apps
    ];

    // Check if origin matches any allowed pattern
    if (
      allowedOrigins.some((pattern) => {
        if (pattern instanceof RegExp) {
          return pattern.test(origin);
        }
        return pattern === origin;
      })
    ) {
      return callback(null, true);
    }

    callback(new Error(`CORS blocked: ${origin} not allowed`));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Accept"],
  optionsSuccessStatus: 200, // For legacy browser support
};

// Apply CORS middleware
app.use(cors(corsOptions));

app.use(express.json());

// ✅ Get connection string from .env file (Railway MongoDB)
const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/invoicesystem";
const PORT = process.env.PORT || 5000;

console.log(`🌐 Environment: ${process.env.NODE_ENV || "development"}`);
console.log(`🔗 Connecting to MongoDB...`);
console.log(`📊 MongoDB Host: Railway`);
console.log(`🔑 MongoDB URI: ${MONGODB_URI ? "Set" : "Not set"}`);

// ✅ VERCEL-OPTIMIZED MONGODB CONNECTION
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

    // Initialize counter
    try {
      const Counter = require("./models/Counter");
      const counter = await Counter.findOne({ name: "invoiceNumber" });

      if (!counter) {
        await Counter.create({ name: "invoiceNumber", value: 0 });
        console.log("✅ Invoice counter initialized");
      }
    } catch (error) {
      console.log("⚠️ Counter init error:", error.message);
    }
  } catch (error) {
    console.log("❌ MongoDB Connection Error:", error.message);
    isConnected = false;
  }
};

// Call connectDB
connectDB();

// Handle connection events
mongoose.connection.on("connected", () => {
  console.log("✅ MongoDB event: connected");
  isConnected = true;
});

mongoose.connection.on("disconnected", () => {
  console.log("⚠️ MongoDB event: disconnected");
  isConnected = false;
});

mongoose.connection.on("error", (err) => {
  console.log("❌ MongoDB event: error", err.message);
  isConnected = false;
});

// Add timeout middleware for Vercel
app.use((req, res, next) => {
  // Set timeout for Vercel (9 seconds to be safe)
  req.setTimeout(9000);
  res.setTimeout(9000);
  next();
});

// Add request logging
app.use((req, res, next) => {
  const start = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.originalUrl} - ${duration}ms`);

    // Warn if request is too slow for Vercel
    if (duration > 8000) {
      console.warn(`⚠️ Slow request: ${duration}ms - might timeout on Vercel`);
    }
  });

  next();
});

// DEBUG: Check routes loading
console.log("=== ROUTES DEBUG ===");
console.log("invoiceRoutes type:", typeof invoiceRoutes);

if (invoiceRoutes && typeof invoiceRoutes === "function") {
  console.log("✅ Routes loaded as function");
} else {
  console.log("❌ Routes not loaded properly, using fallback...");

  // Fallback test route
  app.get("/api/invoices", (req, res) => {
    res.json({
      message: "Test invoices route",
      database: isConnected ? "connected" : "disconnected",
      timestamp: new Date().toISOString(),
    });
  });
}

// API Routes
app.use("/api/invoices", invoiceRoutes);

// ✅ Updated Health check endpoint (Vercel compatible)
app.get("/api/health", (req, res) => {
  const dbState = mongoose.connection.readyState;
  const dbStatus = dbState === 1 ? "connected" : "disconnected";

  res.status(200).json({
    status: "OK",
    database: dbStatus,
    readyState: dbState,
    isConnected: isConnected,
    environment: process.env.NODE_ENV || "development",
    port: PORT,
    service: "Invoice API",
    host: "Vercel Serverless",
    database_provider: "Railway MongoDB",
    timestamp: new Date().toISOString(),
    vercel: !!process.env.VERCEL,
    region: process.env.VERCEL_REGION || "local",
  });
});

// Route to get API URL for frontend
app.get("/api/config", (req, res) => {
  const protocol = req.headers["x-forwarded-proto"] || req.protocol;
  const host = req.headers["x-forwarded-host"] || req.get("host");
  const apiUrl = `${protocol}://${host}`;

  res.json({
    apiUrl,
    frontendUrl: process.env.FRONTEND_URL || "http://localhost:3000",
    environment: process.env.NODE_ENV || "development",
    deployed_on: "Vercel",
    database: "Railway MongoDB",
  });
});

// ✅ Root endpoint for Vercel
app.get("/", (req, res) => {
  const dbState = mongoose.connection.readyState;

  res.json({
    message: "Invoice Management API",
    version: "1.0.0",
    status: "running",
    environment: process.env.NODE_ENV || "development",
    deployed_on: "Vercel",
    database: "Railway MongoDB",
    database_status: dbState === 1 ? "connected" : "disconnected",
    endpoints: {
      invoices: "/api/invoices",
      health: "/api/health",
      config: "/api/config",
    },
    usage: {
      create_invoice: "POST /api/invoices",
      get_invoices: "GET /api/invoices",
      update_invoice: "PUT /api/invoices/:id",
      delete_invoice: "DELETE /api/invoices/:id",
    },
  });
});

// Serve frontend if in same project (for production)
// ✅ NOTE: For Vercel, we'll deploy frontend separately
// Remove or keep this if you want combined deployment
if (process.env.NODE_ENV === "production" && !process.env.VERCEL) {
  // Serve static files from React/Vue build folder
  app.use(express.static(path.join(__dirname, "client/build")));

  // Handle React routing, return all requests to React app
  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "client/build", "index.html"));
  });

  console.log("🚀 Production mode: Serving frontend from client/build");
}

// Error handling middleware (must be after routes)
app.use((err, req, res, next) => {
  console.error("🔥 Error:", err.stack);
  res.status(500).json({
    error: "Something went wrong!",
    message:
      process.env.NODE_ENV === "production"
        ? "Internal server error"
        : err.message,
    timestamp: new Date().toISOString(),
  });
});

// 404 handler for undefined routes
app.use((req, res) => {
  res.status(404).json({
    error: "Route not found",
    path: req.originalUrl,
    method: req.method,
    available_endpoints: {
      api: "/api/invoices",
      health: "/api/health",
      config: "/api/config",
    },
    timestamp: new Date().toISOString(),
  });
});

// ✅ VERCEL COMPATIBILITY: Export the app for serverless
if (process.env.VERCEL) {
  // For Vercel serverless deployment
  console.log(
    "🚀 Detected Vercel environment - Exporting as serverless function",
  );
  module.exports = app;
} else {
  // For local development
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`🌐 Accessible at: http://0.0.0.0:${PORT}`);
    console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
    console.log(`📁 Environment: ${process.env.NODE_ENV || "development"}`);
    console.log(`🏗️  Deployment: Local (Vercel-ready)`);
    console.log(`🗄️  Database: Railway MongoDB`);
  });
}
