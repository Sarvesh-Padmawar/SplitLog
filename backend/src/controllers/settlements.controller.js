import Settlement from "../models/Settlement.model.js";
import Expense from "../models/Expense.model.js";
import Friendship from "../models/Friendship.model.js";
import Notification from "../models/Notification.model.js";
import User from "../models/User.model.js";

export const createSettlement = async (req, res) => {
  try {
    const from = req.user.toString();
    const { friendId, amount } = req.body;

    if (!friendId || !amount || amount <= 0) {
      return res.status(400).json({ message: "Invalid settlement data" });
    }

    // 1️⃣ verify friendship
    const isFriend = await Friendship.findOne({
      $or: [
        { user1: from, user2: friendId },
        { user1: friendId, user2: from },
      ],
    });

    if (!isFriend) {
      return res.status(403).json({
        message: "You are not friends with this user",
      });
    }

    // Check for existing pending settlement
    const existingPending = await Settlement.findOne({
      from,
      to: friendId,
      status: "pending",
    });
    if (existingPending) {
      return res.status(400).json({
        message: "You already have a pending settlement with this friend",
      });
    }

    // 2️⃣ calculate outstanding balance — same logic as ledger controller
    const expenses = await Expense.find({
      $or: [
        { paidBy: friendId, "splits.user": from },
        { paidBy: from, "splits.user": friendId },
      ],
    });

    // Build settled expense IDs from accepted settlements (skip those entirely)
    const acceptedSettlements = await Settlement.find({
      status: "accepted",
      $or: [
        { from, to: friendId },
        { from: friendId, to: from },
      ],
    }).populate("expenses", "_id");

    const settledExpenseIds = new Set();
    acceptedSettlements.forEach((s) => {
      (s.expenses || []).forEach((e) => {
        settledExpenseIds.add(e._id ? e._id.toString() : e.toString());
      });
    });

    // Sum accepted splits on unsettled expenses only
    let youOwe = 0;
    let theyOwe = 0;

    expenses.forEach((expense) => {
      if (settledExpenseIds.has(expense._id.toString())) return;
      const paidByFriend = expense.paidBy.toString() === friendId;

      expense.splits.forEach((split) => {
        if (split.status !== "accepted") return;

        if (paidByFriend && split.user.toString() === from) {
          youOwe += split.amount;   // friend paid → I owe them
        } else if (!paidByFriend && split.user.toString() === friendId) {
          theyOwe += split.amount;  // I paid → they owe me
        }
      });
    });

    const outstandingBalance = Number(Math.abs(youOwe - theyOwe).toFixed(2));

    // 4️⃣ block overpayment
    if (outstandingBalance === 0) {
      return res.status(400).json({ message: "No outstanding balance to settle" });
    }

    if (amount > outstandingBalance) {
      return res.status(400).json({
        message: `Settlement amount exceeds outstanding balance of ₹${outstandingBalance.toFixed(2)}`,
      });
    }

    // Collect expense IDs to attach to the new settlement (unsettled + accepted)
    const alreadySettledIds = settledExpenseIds; // reuse the set already built above

    const settlementExpenseIds = expenses
      .filter((expense) => {
        if (alreadySettledIds.has(expense._id.toString())) return false;
        return expense.splits.some(
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
  } catch (error) {
    console.error("Create settlement error:", error);
    res.status(500).json({ message: error.message });
  }
};



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
    res.status(500).json({ message: error.message });
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
    res.status(500).json({ message: error.message });
  }
};
