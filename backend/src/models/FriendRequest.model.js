import mongoose from "mongoose";

const friendRequestSchema = new mongoose.Schema(
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
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected"],
      default: "pending",
    },
  },
  { timestamps: true }
);

// Indexes to speed up listing pending requests and checking active invitation existence
friendRequestSchema.index({ from: 1, to: 1, status: 1 });
friendRequestSchema.index({ to: 1, status: 1 });

export default mongoose.model("FriendRequest", friendRequestSchema);
