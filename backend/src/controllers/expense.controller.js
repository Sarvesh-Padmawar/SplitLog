import Expense from "../models/Expense.model.js";
import { buildSplits } from "../utils/expense.utils.js";
import Notification from "../models/Notification.model.js";
import User from "../models/User.model.js";

export const addExpense = async (req, res) => {
  try {
    const paidBy = req.user;
    const { totalAmount, splits = [], description, location, category, date } = req.body;

    if (!totalAmount || totalAmount <= 0) {
      return res.status(400).json({ message: "Invalid total amount" });
    }

    const finalSplits = await buildSplits({
      paidBy,
      totalAmount,
      splits,
    });

    const expense = await Expense.create({
      paidBy,
      totalAmount,
      splits: finalSplits,
      description,
      location,
      category,
      date,
    });

    /* ========= CREATE NOTIFICATIONS FOR SPLIT MEMBERS ========= */
    const sender = await User.findById(paidBy).select("name");
    const senderName = sender?.name || "Someone";

    const notificationPromises = finalSplits
      .filter((s) => s.user.toString() !== paidBy.toString())
      .map((s) =>
        Notification.create({
          recipient: s.user,
          sender: paidBy,
          expense: expense._id,
          type: "split_request_pending",
          message: `${senderName} split ₹${s.amount} with you${description ? ` for "${description}"` : ""}`,
        })
      );

    await Promise.all(notificationPromises);

    res.status(201).json({
      message: "Expense added successfully",
      expense,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};


export const respondToSplit = async (req, res) => {
  try {
    const userId = req.user; // logged-in user
    const { expenseId } = req.params;
    const { status } = req.body; // "accepted" | "rejected"

    if (!["accepted", "rejected"].includes(status)) {
      return res.status(400).json({
        message: "Status must be either accepted or rejected",
      });
    }

    const expense = await Expense.findById(expenseId);

    if (!expense) {
      return res.status(404).json({ message: "Expense not found" });
    }

    // find user's split
    const split = expense.splits.find(
      (s) => s.user.toString() === userId.toString()
    );

    if (!split) {
      return res.status(403).json({
        message: "You are not part of this expense",
      });
    }

    // prevent re-updating
    if (split.status !== "pending") {
      return res.status(400).json({
        message: `Split already ${split.status}`,
      });
    }

    // update status
    split.status = status;

    await expense.save();

    // Send notification to payer when split is rejected
    if (status === "rejected") {
      const rejecter = await User.findById(userId).select("name");
      const rejecterName = rejecter?.name || "Someone";

      await Notification.create({
        recipient: expense.paidBy,
        sender: userId,
        expense: expense._id,
        type: "split_request_rejected",
        message: `${rejecterName} rejected your expense split${expense.description ? ` for "${expense.description}"` : ""}`,
      });
    }

    res.status(200).json({
      message: `Split ${status} successfully`,
      expense,
    });
  } catch (error) {
    console.error("Respond split error:", error);
    res.status(500).json({ message: error.message });
  }
};

export const editExpense = async (req, res) => {
  try {
    const userId = req.user.toString();
    const { expenseId } = req.params;
    const { totalAmount, splits = [], description, location, category, date } = req.body;

    const expense = await Expense.findById(expenseId);
    if (!expense) {
      return res.status(404).json({ message: "Expense not found" });
    }

    const paidBy = expense.paidBy.toString();

    if (paidBy !== userId) {
      return res.status(403).json({
        message: "Only the payer can edit this expense",
      });
    }

    const { default: Settlement } = await import("../models/Settlement.model.js");
    const hasSettlement = await Settlement.exists({
      expenses: expenseId,
      status: "accepted",
    });

    if (hasSettlement) {
      return res.status(409).json({
        message: "Cannot edit expense after a settlement has been made",
      });
    }

    if (!totalAmount || totalAmount <= 0) {
      return res.status(400).json({ message: "Invalid total amount" });
    }

    const finalSplits = await buildSplits({
      paidBy,
      totalAmount,
      splits,
    });

    expense.totalAmount = totalAmount;
    expense.splits = finalSplits;
    expense.description = description;
    expense.location = location;
    if (category) expense.category = category;
    if (date) expense.date = date;

    await expense.save();

    res.status(200).json({
      message: "Expense edited successfully",
      expense,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const deleteExpense = async (req, res) => {
  try {
    const userId = req.user.toString();
    const { expenseId } = req.params;

    const expense = await Expense.findById(expenseId);

    /* ================= EXPENSE EXIST ================= */
    if (!expense) {
      return res.status(404).json({ message: "Expense not found" });
    }

    const paidBy = expense.paidBy.toString();

    /* ================= AUTH CHECK ================= */
    if (paidBy !== userId) {
      return res.status(403).json({
        message: "Only the payer can delete this expense",
      });
    }

    /* ================= ACCEPTED SETTLEMENT LOCK ================= */
    const { default: Settlement } = await import("../models/Settlement.model.js");
    const hasSettlement = await Settlement.exists({
      expenses: expenseId,
      status: "accepted",
    });

    if (hasSettlement) {
      return res.status(409).json({
        message: "Cannot delete expense after a settlement has been made",
      });
    }

    /* ================= DELETE ================= */
    await Expense.findByIdAndDelete(expenseId);

    res.status(200).json({
      message: "Expense deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting expense:", error);
    res.status(500).json({ message: error.message });
  }
};

/* ─── GET /api/expenses/:expenseId  ─────────────────────────── */
export const getExpenseById = async (req, res) => {
  try {
    const me = req.user.toString();
    const { expenseId } = req.params;

    const expense = await Expense.findById(expenseId)
      .populate("paidBy", "name username _id")
      .populate("splits.user", "name username _id");

    if (!expense) {
      return res.status(404).json({ message: "Expense not found" });
    }

    // Only payer or split participants can view
    const involved =
      expense.paidBy._id.toString() === me ||
      expense.splits.some((s) => s.user._id.toString() === me);
    if (!involved) {
      return res.status(403).json({ message: "Access denied" });
    }

    const payerId = expense.paidBy._id.toString();
    const paidByMe = payerId === me;

    // Self-expense flag
    const isSelfExpense =
      expense.splits.length === 1 &&
      expense.splits[0].user._id.toString() === payerId;

    // Fetch accepted settlements to know which friends settled this expense
    const { default: Settlement } = await import("../models/Settlement.model.js");

    const acceptedSettlements = await Settlement.find({
      status: "accepted",
      $or: [{ from: me }, { to: me }],
      expenses: expense._id,
    });

    // Map of friendId → settled (either from me or to me covering this expense)
    const settledFriendIds = new Set();
    acceptedSettlements.forEach((s) => {
      const other = s.from.toString() === me ? s.to.toString() : s.from.toString();
      settledFriendIds.add(other);
    });

    // Build participants list
    const participants = expense.splits.map((split) => {
      const uid = split.user._id.toString();
      const isPayer = uid === payerId;
      const isMe = uid === me;

      // Settlement status for this participant
      let settlementStatus = "unsettled";
      if (isPayer) {
        settlementStatus = "paid"; // payer already disbursed
      } else if (settledFriendIds.has(uid)) {
        settlementStatus = "paid";
      }

      return {
        userId: uid,
        name: split.user.name,
        username: split.user.username,
        amount: split.amount,
        isPayer,
        isMe,
        responseStatus: isPayer ? "accepted" : split.status, // payer auto-accepted
        settlementStatus,
      };
    });

    // Derived progress (for payer view)
    const friendSplits = participants.filter((p) => !p.isPayer);
    const activeFriends = friendSplits.filter((p) => p.responseStatus !== "rejected");
    const acceptedCount = activeFriends.filter((p) => p.responseStatus === "accepted").length;
    const totalFriends = activeFriends.length;
    const settledFriends = activeFriends.filter((p) => p.settlementStatus === "paid").length;

    // Derive overall status
    let status;
    if (isSelfExpense) {
      status = settledFriendIds.size > 0 ? "settled" : "unsettled";
    } else if (paidByMe) {
      if (acceptedCount < totalFriends) status = "awaiting_response";
      else if (settledFriends < totalFriends) status = "pending";
      else status = "settled";
    } else {
      const mySplit = expense.splits.find((s) => s.user._id.toString() === me);
      const myStatus = mySplit?.status ?? "pending";
      if (myStatus === "rejected") status = "rejected";
      else if (myStatus === "pending") status = "awaiting";
      else if (settledFriendIds.has(payerId)) status = "settled";
      else status = "unsettled";
    }

    res.status(200).json({
      id: expense._id,
      title: expense.description || "Expense",
      category: expense.category || "other",
      totalAmount: expense.totalAmount,
      date: expense.date || expense.createdAt,
      paidBy: {
        id: expense.paidBy._id,
        name: expense.paidBy.name,
        username: expense.paidBy.username,
      },
      paidByMe,
      isSelfExpense,
      notes: expense.location || null,
      createdAt: expense.createdAt,
      status,
      acceptedCount: paidByMe ? acceptedCount : undefined,
      totalFriends: paidByMe ? totalFriends : undefined,
      settledFriends: paidByMe ? settledFriends : undefined,
      participants,
    });
  } catch (error) {
    console.error("Get expense by ID error:", error);
    res.status(500).json({ message: error.message });
  }
};