const express = require("express");
const mongoose = require("mongoose");
const invoiceRoutes = require("./routes/InvoiceRoutes");
const cors = require("cors");
const path = require("path");
require("dotenv").config(); // Load .env file

const app = express();

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

// ✅ SIMPLIFIED CONNECTION - NO OPTIONS NEEDED
mongoose
  .connect(MONGODB_URI)
  .then(async () => {
    console.log("✅ MongoDB Connected to Railway!");
    console.log(`📊 Database: ${mongoose.connection.name}`);

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
  })
  .catch((err) => {
    console.log("❌ Connection Error:", err.message);
    console.log("\n🔧 Troubleshooting:");
    console.log(
      "1. Check Railway MongoDB connection string in Vercel env vars",
    );
    console.log("2. Check Railway MongoDB service is running");
    console.log("3. Verify MONGODB_URI format");
  });

// ✅ REMOVED: app.options() handler - cors() handles it automatically

// API Routes
app.use("/api/invoices", invoiceRoutes);

// ✅ Health check endpoint (Vercel compatible)
app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    database:
      mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    environment: process.env.NODE_ENV || "development",
    port: PORT,
    service: "Invoice API",
    host: "Vercel Serverless",
    database_provider: "Railway MongoDB",
    timestamp: new Date().toISOString(),
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
  res.json({
    message: "Invoice Management API",
    version: "1.0.0",
    status: "running",
    environment: process.env.NODE_ENV || "development",
    deployed_on: "Vercel",
    database: "Railway MongoDB",
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
