const mongoose = require("mongoose");
const Counter = require("./Counter");

const invoiceSchema = new mongoose.Schema({
  invoiceNumber: {
    type: String,
    required: true,
    unique: true,
  },
  customerName: {
    type: String,
    required: true,
  },
  customerContact: {
    type: String,
  },
  customerAddress: {
    type: String,
  },
  discountPercent: { type: Number, default: 0 }, // Overall discount percentage
  subTotal: { type: Number, default: 0 },
  totalAmount: { type: Number, required: true },
  entries: [
    {
      from: String,
      to: String,
      vehicleNo: String,
      challanNo: String,
      chWeight: Number,
      weight: Number,
      rate: Number,
      freight: Number,
      whCharges: Number,
      loadingCharges: Number,
      loadingDate: Date,
      billDate: Date,
      subTotal: Number,
    },
  ],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Pre-save middleware - FIXED: Only increment counter when actually saving a new invoice
invoiceSchema.pre("save", async function () {
  try {
    // For NEW invoices only
    if (this.isNew) {
      // If invoiceNumber is empty or not provided, generate a new one
      if (!this.invoiceNumber || this.invoiceNumber.trim() === "") {
        // Find and increment the counter
        const counter = await Counter.findOneAndUpdate(
          { name: "invoiceNumber" },
          { $inc: { value: 1 } },
          {
            new: true,
            upsert: true,
            setDefaultsOnInsert: true,
          },
        );

        // Start invoice numbers from 3100
        const nextInvoiceNumber = 3100 + counter.value;
        this.invoiceNumber = nextInvoiceNumber.toString();
        console.log(`Generated new invoice number: ${this.invoiceNumber}`);
      } else {
        // Invoice number was provided
        // Check if we need to update the counter to match this number
        const providedNum = parseInt(this.invoiceNumber);
        if (providedNum >= 3100) {
          const currentCounterValue = providedNum - 3100;

          // Get current counter
          const counter = await Counter.findOne({ name: "invoiceNumber" });

          // Only update counter if provided number is higher than current counter
          if (!counter || currentCounterValue > counter.value) {
            await Counter.findOneAndUpdate(
              { name: "invoiceNumber" },
              { $set: { value: currentCounterValue } },
              { upsert: true },
            );
          }
        }
        console.log(`Using provided invoice number: ${this.invoiceNumber}`);
      }
    }

    // Update the updatedAt timestamp
    if (this.isModified()) {
      this.updatedAt = Date.now();
    }
  } catch (error) {
    console.error("Error in pre-save middleware:", error);
    throw error;
  }
});

module.exports = mongoose.model("Invoice", invoiceSchema);
