import mongoose from "mongoose";

const friendshipSchema = new mongoose.Schema(
  {
    user1: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    user2: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

// Unique compound index: prevents duplicate friendships and speeds up bidirectional queries
friendshipSchema.index({ user1: 1, user2: 1 }, { unique: true });
friendshipSchema.index({ user2: 1, user1: 1 });

export default mongoose.model("Friendship", friendshipSchema);