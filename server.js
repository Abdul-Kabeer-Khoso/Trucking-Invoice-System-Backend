const express = require("express");
const mongoose = require("mongoose");
const invoiceRoutes = require("./routes/InvoiceRoutes");
const cors = require("cors");
const path = require("path");
require("dotenv").config(); // Load .env file

const app = express();

// CORS Configuration for production
// const corsOptions = {
//   origin:
//     process.env.NODE_ENV === "production"
//       ? [
//           "https://your-frontend-domain.com", // Your actual frontend URL
//           "http://localhost:3000", // Allow localhost for testing
//         ]
//       : ["http://localhost:3000"], // Development
//   credentials: true,
//   methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
//   allowedHeaders: ["Content-Type", "Authorization", "Accept"],
// };

app.use(
  cors({
    origin: "*", // Allow all origins
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

// app.use(cors(corsOptions));
app.use(express.json());

// ✅ Get connection string from .env file
const MONGODB_URI = "mongodb://127.0.0.1:27017/invoicesystem";
// process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/invoicesystem";

const PORT = process.env.PORT || 5000;

console.log(`🌐 Environment: ${process.env.NODE_ENV || "development"}`);
console.log(`🔗 Connecting to MongoDB...`);

// ✅ SIMPLIFIED CONNECTION - NO OPTIONS NEEDED
mongoose
  .connect(MONGODB_URI)
  .then(async () => {
    console.log("✅ MongoDB Connected!");
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
    console.log("1. Check .env file exists with MONGODB_URI");
    console.log("2. Check your MongoDB is running");
    console.log("3. For Railway, ensure password is correct");
  });

// API Routes
app.use("/api/invoices", invoiceRoutes);

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    database:
      mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    environment: process.env.NODE_ENV || "development",
  });
});

// Serve frontend if in same project (for production)
if (process.env.NODE_ENV === "production") {
  // Serve static files from React/Vue build folder
  app.use(express.static(path.join(__dirname, "client/build")));

  // Handle React routing, return all requests to React app
  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "client/build", "index.html"));
  });

  console.log("🚀 Production mode: Serving frontend from client/build");
} else {
  // Development route
  app.get("/", (req, res) => {
    res.json({
      message: "Invoice API Server",
      status: "running",
      environment: "development",
      endpoints: {
        invoices: "/api/invoices",
        health: "/health",
      },
    });
  });
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
  });
});

// 404 handler for undefined routes
app.use((req, res) => {
  res.status(404).json({
    error: "Route not found",
    path: req.originalUrl,
    method: req.method,
  });
});

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  console.log(`📁 Environment: ${process.env.NODE_ENV || "development"}`);
});
