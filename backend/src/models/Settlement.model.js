import mongoose from "mongoose";

const settlementSchema = new mongoose.Schema(
  {
    from: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    to: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0.01,
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected"],
      default: "pending",
    },
    expenses: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Expense",
      },
    ],
  },
  { timestamps: true }
);

// Compound and single-field indexes to optimize bidirectional ledger calculations and history queries
settlementSchema.index({ from: 1, to: 1, status: 1 });
settlementSchema.index({ to: 1, from: 1, status: 1 });
settlementSchema.index({ createdAt: -1 });

export default mongoose.model("Settlement", settlementSchema);