import Expense from "../../models/Expense.model.js";
import Notification from "../../models/Notification.model.js";
import User from "../../models/User.model.js";
import { buildSplits } from "./expense.utils.js";
import { deriveExpenseStatus } from "../../utils/balanceUtils.js";

/**
 * Creates a new expense, generates splits, and dispatches notifications.
 */
export const createExpense = async ({
  paidBy,
  totalAmount,
  splits = [],
  description,
  location,
  category,
  date,
}) => {
  if (!totalAmount || totalAmount <= 0) {
    const error = new Error("Invalid total amount");
    error.status = 400;
    throw error;
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
  try {
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
  } catch (emailErr) {
    console.error("Failed to send expense notifications:", emailErr.message);
  }

  return expense;
};

/**
 * Responds to an expense split (accept or reject).
 */
export const respondToExpenseSplit = async ({ userId, expenseId, status }) => {
  if (!["accepted", "rejected"].includes(status)) {
    const error = new Error("Status must be either accepted or rejected");
    error.status = 400;
    throw error;
  }

  const expense = await Expense.findById(expenseId);
  if (!expense) {
    const error = new Error("Expense not found");
    error.status = 404;
    throw error;
  }

  // find user's split
  const split = expense.splits.find(
    (s) => s.user.toString() === userId.toString()
  );

  if (!split) {
    const error = new Error("You are not part of this expense");
    error.status = 403;
    throw error;
  }

  // prevent re-updating
  if (split.status !== "pending") {
    const error = new Error(`Split already ${split.status}`);
    error.status = 400;
    throw error;
  }

  // update status
  split.status = status;
  await expense.save();

  // Send notification to payer when split is rejected
  if (status === "rejected") {
    try {
      const rejecter = await User.findById(userId).select("name");
      const rejecterName = rejecter?.name || "Someone";

      await Notification.create({
        recipient: expense.paidBy,
        sender: userId,
        expense: expense._id,
        type: "split_request_rejected",
        message: `${rejecterName} rejected your expense split${expense.description ? ` for "${expense.description}"` : ""}`,
      });
    } catch (notifErr) {
      console.error("Failed to send split rejection notification:", notifErr.message);
    }
  }

  return expense;
};

/**
 * Edits an existing expense. Blocks updates if a settlement is already linked.
 */
export const updateExpense = async ({
  userId,
  expenseId,
  totalAmount,
  splits = [],
  description,
  location,
  category,
  date,
}) => {
  const expense = await Expense.findById(expenseId);
  if (!expense) {
    const error = new Error("Expense not found");
    error.status = 404;
    throw error;
  }

  const paidBy = expense.paidBy.toString();
  if (paidBy !== userId.toString()) {
    const error = new Error("Only the payer can edit this expense");
    error.status = 403;
    throw error;
  }

  // Dynamic import to prevent circular dependency lookup chains
  const { default: Settlement } = await import("../../models/Settlement.model.js");
  const hasSettlement = await Settlement.exists({
    expenses: expenseId,
    status: { $in: ["accepted", "pending"] },
  });

  if (hasSettlement) {
    const error = new Error("Cannot edit expense after a settlement has been made");
    error.status = 409;
    throw error;
  }

  if (!totalAmount || totalAmount <= 0) {
    const error = new Error("Invalid total amount");
    error.status = 400;
    throw error;
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
  return expense;
};

/**
 * Deletes an expense. Cleans up references in Settlements.
 */
export const removeExpense = async ({ userId, expenseId }) => {
  const expense = await Expense.findById(expenseId);
  if (!expense) {
    const error = new Error("Expense not found");
    error.status = 404;
    throw error;
  }

  const paidBy = expense.paidBy.toString();
  if (paidBy !== userId.toString()) {
    const error = new Error("Only the payer can delete this expense");
    error.status = 403;
    throw error;
  }

  // Dynamic import to prevent circular dependency lookup chains
  const { default: Settlement } = await import("../../models/Settlement.model.js");
  const hasSettlement = await Settlement.exists({
    expenses: expenseId,
    status: { $in: ["accepted", "pending"] },
  });

  if (hasSettlement) {
    const error = new Error("Cannot delete expense after a settlement has been made");
    error.status = 409;
    throw error;
  }

  await Expense.findByIdAndDelete(expenseId);

  // Clean up references to this expense from all settlements
  await Settlement.updateMany(
    { expenses: expenseId },
    { $pull: { expenses: expenseId } }
  );

  return { success: true };
};

/**
 * Fetches the detail view of a single expense with full dynamic settlement context.
 */
export const fetchExpenseDetails = async ({ userId, expenseId }) => {
  const expense = await Expense.findById(expenseId)
    .populate("paidBy", "name username _id")
    .populate("splits.user", "name username _id");

  if (!expense) {
    const error = new Error("Expense not found");
    error.status = 404;
    throw error;
  }

  const me = userId.toString();
  const payerId = expense.paidBy._id.toString();

  // Only payer or split participants can view
  const involved =
    payerId === me ||
    expense.splits.some((s) => s.user._id.toString() === me);

  if (!involved) {
    const error = new Error("Access denied");
    error.status = 403;
    throw error;
  }

  const paidByMe = payerId === me;

  // Self-expense flag
  const isSelfExpense =
    expense.splits.length === 1 &&
    expense.splits[0].user._id.toString() === payerId;

  // Fetch accepted settlements to know which friends settled this expense
  const { default: Settlement } = await import("../../models/Settlement.model.js");
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

  // Derive overall status and progress metrics
  const { status, acceptedCount, totalFriends, settledFriends } = deriveExpenseStatus(me, expense, settledFriendIds);

  return {
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
  };
};
