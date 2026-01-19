const mongoose = require("mongoose");

const counterSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
  },
  value: {
    type: Number,
    default: 0,
  },
});

// Export the model - only define once
module.exports =
  mongoose.models.Counter || mongoose.model("Counter", counterSchema);
