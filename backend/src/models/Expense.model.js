import mongoose from "mongoose";

const splitSchema=new mongoose.Schema({
    user:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User",
        required:true,
    },
    amount:{
        type:Number,
        required:true,
        min:0,
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected"],
      default: "pending",
    },
    

},{_id:false});

const expenseSchema = new mongoose.Schema(
  {
    paidBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    splits: {
      type: [splitSchema],
      required: true,
    },

    description: {
      type: String,
      trim: true,
    },

    location: {
      type: String,
      trim: true,
    },
    date: {
      type: Date,
      default: Date.now,
    },
    category: {
  type: String,
  enum: ["food", "travel", "rent", "shopping", "other"],
  default: "other",
}

  },
  {
    timestamps: true, // adds createdAt & updatedAt
  }
);


// Compound indexes for optimized query performance and preventing in-memory sorts
expenseSchema.index({ paidBy: 1, date: -1 });
expenseSchema.index({ "splits.user": 1, date: -1 });

export default mongoose.model("Expense", expenseSchema);