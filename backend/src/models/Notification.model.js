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
      enum: [
        "split_request_pending",
        "split_request_rejected",
        "settlement_request",
        "friend_rejected",
        "friend_request_received",
        "friend_request_accepted",
        "friend_removed",
        "expense_created",
        "expense_updated",
        "expense_deleted",
        "expense_involving",
        "group_added",
        "group_removed",
        "group_updated",
        "group_expense_created",
        "group_expense_updated",
        "group_expense_deleted",
        "settlement_created",
        "balance_updated"
      ],
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

// Post-save hook to emit real-time updates via Socket.IO
notificationSchema.post("save", async function (doc, next) {
  try {
    const { socketManager } = await import("../socket/socketManager.js");
    
    // Populate sender, expense, settlement before emitting
    const populated = await doc.populate([
      { path: "sender", select: "name username" },
      { path: "expense", select: "totalAmount description category" },
      { path: "settlement", select: "amount status from to" },
    ]);
    
    socketManager.sendToUser(doc.recipient.toString(), "notification_created", populated);
  } catch (error) {
    console.error("[NotificationModel] Error in post-save hook:", error);
  }
  if (typeof next === "function") next();
});

export default mongoose.model("Notification", notificationSchema);
