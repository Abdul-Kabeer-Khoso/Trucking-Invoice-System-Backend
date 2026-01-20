// test-mongo.js
const mongoose = require("mongoose");

const uri =
  "mongodb://mongo:yYORuKjMeDqAwyIfhYMvdvdQJmdnCmjQ@shinkansen.proxy.rlwy.net:17884/invoicesystem?authSource=admin";

console.log("Testing connection to:", uri);

mongoose
  .connect(uri)
  .then(() => {
    console.log("✅ MongoDB Connected!");
    process.exit(0);
  })
  .catch((err) => {
    console.log("❌ Connection failed:", err.message);
    process.exit(1);
  });
