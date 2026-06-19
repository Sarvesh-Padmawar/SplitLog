import Expense from "../../models/Expense.model.js";
import Notification from "../../models/Notification.model.js";
import User from "../../models/User.model.js";
import { buildSplits } from "./expense.utils.js";
import { deriveExpenseStatus } from "../../utils/balanceUtils.js";
import { socketManager } from "../../socket/socketManager.js";

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

  // Emit real-time socket events
  const participants = new Set([paidBy.toString(), ...finalSplits.map((s) => s.user.toString())]);
  participants.forEach((uid) => {
    socketManager.sendToUser(uid, "expense_created", expense);
  });

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

  // Emit real-time socket events to all participants/members
  if (expense.group) {
    socketManager.sendToRoom(`group:${expense.group}`, "expense_updated", expense);
  } else {
    const participants = new Set([expense.paidBy.toString(), ...expense.splits.map((s) => s.user.toString())]);
    participants.forEach((uid) => {
      socketManager.sendToUser(uid, "expense_updated", expense);
    });
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

  let finalSplits = [];

  // Group expense edit logic
  if (expense.group) {
    const { default: Group } = await import("../../models/Group.model.js");
    const group = await Group.findOne({ _id: expense.group, isActive: true });
    if (!group) {
      const error = new Error("Group not found or has been deleted");
      error.status = 404;
      throw error;
    }

    // Verify editor belongs to the group
    const editorInGroup = group.members.some((m) => m.toString() === userId.toString());
    if (!editorInGroup) {
      const error = new Error("Access denied. You are not a member of this group");
      error.status = 403;
      throw error;
    }

    // Verify all split users belong to the group
    for (const split of splits) {
      const splitUserInGroup = group.members.some((m) => m.toString() === split.user.toString());
      if (!splitUserInGroup) {
        const error = new Error(`Split user ${split.user} is not a member of this group`);
        error.status = 400;
        throw error;
      }
    }

    // Check if the payer is explicitly included in the splits array
    const payerSplit = splits.find((s) => s.user.toString() === paidBy);
    if (payerSplit) {
      // Payer is included: verify that the sum of splits equals the total amount
      const splitSum = splits.reduce((sum, s) => sum + Number(s.amount), 0);
      if (Math.abs(splitSum - totalAmount) > 0.01) {
        const error = new Error(`Sum of splits (₹${splitSum.toFixed(2)}) must equal total amount (₹${totalAmount.toFixed(2)})`);
        error.status = 400;
        throw error;
      }
      finalSplits = splits.map((s) => {
        const isPayer = s.user.toString() === paidBy;
        return {
          user: s.user,
          amount: s.amount,
          status: isPayer ? "accepted" : "pending",
        };
      });
    } else {
      // Payer is not included: calculate the payer's share as the remainder
      const splitSum = splits.reduce((sum, s) => sum + Number(s.amount), 0);
      const payerShare = Number((totalAmount - splitSum).toFixed(2));
      if (payerShare < 0) {
        const error = new Error("Split amount exceeds total amount");
        error.status = 400;
        throw error;
      }
      finalSplits = splits.map((s) => ({
        user: s.user,
        amount: s.amount,
        status: "pending",
      }));
      if (payerShare > 0) {
        finalSplits.push({
          user: paidBy,
          amount: payerShare,
          status: "accepted",
        });
      }
    }
  } else {
    // Personal expense edit logic (friend-based validation)
    finalSplits = await buildSplits({
      paidBy,
      totalAmount,
      splits,
    });
  }

  expense.totalAmount = totalAmount;
  expense.splits = finalSplits;
  expense.description = description;
  expense.location = location;
  if (category) expense.category = category;
  if (date) expense.date = date;

  await expense.save();

  // Dispatch notifications for updated expense
  try {
    const editor = await User.findById(userId).select("name");
    const editorName = editor?.name || "Someone";
    const notificationPromises = finalSplits
      .filter((s) => s.user.toString() !== userId.toString())
      .map((s) =>
        Notification.create({
          recipient: s.user,
          sender: userId,
          expense: expense._id,
          type: "expense_updated",
          message: `${editorName} updated the expense split with you${expense.description ? ` for "${expense.description}"` : ""}`,
        })
      );
    await Promise.all(notificationPromises);
  } catch (notifErr) {
    console.error("Failed to send expense update notifications:", notifErr.message);
  }

  // Emit real-time socket events to all participants/members
  if (expense.group) {
    socketManager.sendToRoom(`group:${expense.group}`, "expense_updated", expense);
  } else {
    const participants = new Set([expense.paidBy.toString(), ...expense.splits.map((s) => s.user.toString())]);
    participants.forEach((uid) => {
      socketManager.sendToUser(uid, "expense_updated", expense);
    });
  }

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

  // If the expense belongs to a group, ensure the deleter is a group member
  if (expense.group) {
    const { default: Group } = await import("../../models/Group.model.js");
    const group = await Group.findOne({ _id: expense.group, isActive: true });
    if (!group) {
      const error = new Error("Group not found or has been deleted");
      error.status = 404;
      throw error;
    }
    const isMember = group.members.some((m) => m.toString() === userId.toString());
    if (!isMember) {
      const error = new Error("Access denied. You are not a member of this group");
      error.status = 403;
      throw error;
    }
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

  // Dispatch notifications for deleted expense
  try {
    const deleter = await User.findById(userId).select("name");
    const deleterName = deleter?.name || "Someone";
    const notificationPromises = expense.splits
      .filter((s) => s.user.toString() !== userId.toString())
      .map((s) =>
        Notification.create({
          recipient: s.user,
          sender: userId,
          type: "expense_deleted",
          message: `${deleterName} deleted the expense: "${expense.description || "Expense"}"`,
        })
      );
    await Promise.all(notificationPromises);
  } catch (notifErr) {
    console.error("Failed to send expense delete notifications:", notifErr.message);
  }

  // Emit real-time socket events to all participants/members before deletion
  if (expense.group) {
    socketManager.sendToRoom(`group:${expense.group}`, "expense_deleted", { expenseId: expense._id, group: expense.group });
  } else {
    const participants = new Set([expense.paidBy.toString(), ...expense.splits.map((s) => s.user.toString())]);
    participants.forEach((uid) => {
      socketManager.sendToUser(uid, "expense_deleted", { expenseId: expense._id, group: expense.group });
    });
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
    .populate("splits.user", "name username _id")
    .populate("group", "name _id");

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
    group: expense.group ? {
      _id: expense.group._id,
      name: expense.group.name,
    } : null,
  };
};
