import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    expense: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Expense",
    },
    settlement: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Settlement",
    },
    type: {
      type: String,
      enum: ["split_request_pending", "split_request_rejected", "settlement_request", "friend_rejected"],
      default: "split_request_pending",
    },
    message: {
      type: String,
      required: true,
    },
    read: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Indexes for fast fetching by recipient and fast unread badge calculations
notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, read: 1 });

export default mongoose.model("Notification", notificationSchema);
