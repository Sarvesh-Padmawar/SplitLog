import Settlement from "../models/Settlement.model.js";
import Expense from "../models/Expense.model.js";
import Friendship from "../models/Friendship.model.js";
import Notification from "../models/Notification.model.js";
import User from "../models/User.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { calculateFriendBalance, allocateSettlementsFIFO } from "../utils/balanceUtils.js";

export const createSettlement = asyncHandler(async (req, res) => {
    const from = req.user.toString();
    const { friendId, amount } = req.body;

    if (!friendId || !amount || amount <= 0) {
      throw new ApiError(400, "Invalid settlement data");
    }

    // 1️⃣ verify friendship
    const isFriend = await Friendship.findOne({
      $or: [
        { user1: from, user2: friendId },
        { user1: friendId, user2: from },
      ],
    });

    if (!isFriend) {
      throw new ApiError(403, "You are not friends with this user");
    }

    // Check for existing pending settlement
    const existingPending = await Settlement.findOne({
      from,
      to: friendId,
      status: "pending",
    });
    if (existingPending) {
      throw new ApiError(400, "You already have a pending settlement with this friend");
    }

    // 2️⃣ calculate outstanding balance — same logic as ledger controller
    const expenses = await Expense.find({
      $or: [
        { paidBy: friendId, "splits.user": from },
        { paidBy: from, "splits.user": friendId },
      ],
    });

    // Get accepted settlements between both users
    const acceptedSettlements = await Settlement.find({
      status: "accepted",
      $or: [
        { from, to: friendId },
        { from: friendId, to: from },
      ],
    });

    // Sum accepted splits and subtract accepted settlements
    const { youOwe, theyOwe } = calculateFriendBalance(from, friendId, expenses, acceptedSettlements);

    const outstandingBalance = Number(Math.abs(youOwe - theyOwe).toFixed(2));

    // 4️⃣ block overpayment
    if (outstandingBalance === 0) {
      throw new ApiError(400, "No outstanding balance to settle");
    }

    if (amount > outstandingBalance) {
      throw new ApiError(400, `Settlement amount exceeds outstanding balance of ₹${outstandingBalance.toFixed(2)}`);
    }

    // Get FIFO allocation to find which expenses are still unsettled
    const allocationMap = allocateSettlementsFIFO(from, friendId, expenses, acceptedSettlements);

    const settlementExpenseIds = expenses
      .filter((expense) => {
        const allocation = allocationMap[expense._id.toString()];
        return allocation && allocation.status !== "settled" && expense.splits.some(
          (s) => s.status === "accepted" &&
            (s.user.toString() === from || s.user.toString() === friendId)
        );
      })
      .map((e) => e._id);

    // 5️⃣ create settlement event
    const settlement = await Settlement.create({
      from,
      to: friendId,
      amount,
      status: "pending",
      expenses: settlementExpenseIds,
    });

    // 6️⃣ send notification to the receiver
    const sender = await User.findById(from).select("name");
    const senderName = sender?.name || "Someone";

    await Notification.create({
      recipient: friendId,
      sender: from,
      settlement: settlement._id,
      type: "settlement_request",
      message: `${senderName} sent you a settlement request of ₹${amount}`,
    });

    res.status(201).json({
      message: "Settlement request sent",
      settlement,
    });
});

export const acceptSettlement = async (req, res) => {
  try {
    const me = req.user.toString();
    const { settlementId } = req.body;

    if (!settlementId) {
      return res.status(400).json({ message: "Settlement ID is required" });
    }

    // ✅ MUST await
    const settlement = await Settlement.findById(settlementId);

    if (!settlement) {
      return res.status(404).json({ message: "Settlement not found" });
    }

    // Only receiver can accept
    if (settlement.to.toString() !== me) {
      return res.status(403).json({ message: "Unauthorized action" });
    }

    // Must be pending
    if (settlement.status !== "pending") {
      return res.status(400).json({
        message: `Settlement already ${settlement.status}`,
      });
    }

    // Accept settlement (immutable event)
    settlement.status = "accepted";
    await settlement.save();

    res.status(200).json({
      message: "Settlement accepted successfully",
      settlement,
    });
  } catch (error) {
    console.error("Accept settlement error:", error);
    res.status(500).json({ message: "Server error. Please try again." });
  }
};

export const rejectSettlement = async (req, res) => {
  try {
    const userId = req.user.toString();
    const { settlementId, reason } = req.body;

    if (!settlementId) {
      return res.status(400).json({ message: "Settlement ID is required" });
    }

    const settlement = await Settlement.findById(settlementId);

    if (!settlement) {
      return res.status(404).json({ message: "Settlement not found" });
    }

    // Only receiver can reject
    if (settlement.to.toString() !== userId) {
      return res.status(403).json({ message: "Unauthorized action" });
    }

    // Settlement must be pending
    if (settlement.status !== "pending") {
      return res.status(400).json({
        message: `Settlement already ${settlement.status}`,
      });
    }

    // Reject settlement (immutable event)
    settlement.status = "rejected";
    settlement.rejectionReason = reason?.trim() || "No reason provided";

    await settlement.save();

    res.status(200).json({
      message: "Settlement rejected successfully",
      settlement,
    });
  } catch (error) {
    console.error("Reject settlement error:", error);
    res.status(500).json({ message: "Server error. Please try again." });
  }
};
