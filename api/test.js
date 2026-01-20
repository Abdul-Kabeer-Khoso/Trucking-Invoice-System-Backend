// api/test.js - Minimal test
const express = require("express");
const app = express();

console.log("=== TEST SERVER STARTING ===");
console.log("NODE_ENV:", process.env.NODE_ENV);
console.log("VERCEL:", !!process.env.VERCEL);

app.get("/", (req, res) => {
  console.log("GET / request received");
  res.json({ message: "Test API", timestamp: new Date().toISOString() });
});

app.get("/health", (req, res) => {
  console.log("GET /health request received");
  res.json({ status: "OK", environment: process.env.NODE_ENV });
});

console.log("=== TEST SERVER READY ===");

module.exports = app;
