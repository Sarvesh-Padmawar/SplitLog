import mongoose from "mongoose";
import Group from "../../models/Group.model.js";
import User from "../../models/User.model.js";
import Expense from "../../models/Expense.model.js";
import Notification from "../../models/Notification.model.js";
import { ApiError } from "../../utils/ApiError.js";
import { socketManager } from "../../socket/socketManager.js";


export const createGroup = async (userId, groupData) => {
  const { name, description } = groupData;

  const group = await Group.create({
    name,
    description,
    createdBy: userId,
    members: [userId],
  });

  // Emit real-time socket event
  socketManager.sendToUser(userId.toString(), "group_created", group);

  return group;
};


export const getMyGroups = async (userId) => {
  const groups = await Group.find({
    isActive: true,
    members: userId,
  })
    .populate("createdBy", "name username email")
    .sort({ createdAt: -1 });

  return groups;
};


export const getGroupDetails = async (userId, groupId) => {
  const group = await Group.findOne({
    _id: groupId,
    isActive: true,
  }).populate("members", "name username email avatar");

  if (!group) {
    throw new ApiError(404, "Group not found or has been deleted");
  }

  const isMember = group.members.some(
    (member) => member._id.toString() === userId.toString()
  );

  if (!isMember) {
    throw new ApiError(403, "Access denied. You are not a member of this group");
  }

  return group;
};

export const updateGroup = async (userId, groupId, updateData) => {
  const group = await Group.findOne({ _id: groupId, isActive: true });

  if (!group) {
    throw new ApiError(404, "Group not found or has been deleted");
  }

  if (group.createdBy.toString() !== userId.toString()) {
    throw new ApiError(403, "Access denied. Only the group creator can update details");
  }

  if (updateData.name !== undefined) group.name = updateData.name;
  if (updateData.description !== undefined) group.description = updateData.description;

  await group.save();

  // Dispatch notification for group updated
  try {
    const updater = await User.findById(userId).select("name");
    const updaterName = updater?.name || "Someone";
    const notificationPromises = group.members
      .filter((m) => m.toString() !== userId.toString())
      .map((memberId) =>
        Notification.create({
          recipient: memberId,
          sender: userId,
          type: "group_updated",
          message: `The group "${group.name}" was updated by ${updaterName}.`,
        })
      );
    await Promise.all(notificationPromises);
  } catch (notifErr) {
    console.error("Failed to send group update notifications:", notifErr.message);
  }

  // Emit real-time socket events
  socketManager.sendToRoom(`group:${group._id}`, "group_updated", group);

  return group;
};


export const deleteGroup = async (userId, groupId) => {
  const group = await Group.findOne({ _id: groupId, isActive: true });

  if (!group) {
    throw new ApiError(404, "Group not found or has already been deleted");
  }

  if (group.createdBy.toString() !== userId.toString()) {
    throw new ApiError(403, "Access denied. Only the group creator can delete the group");
  }

  group.isActive = false;
  await group.save();

  return group;
};


export const addMember = async (creatorId, groupId, targetUserId) => {
  const group = await Group.findOne({ _id: groupId, isActive: true });

  if (!group) {
    throw new ApiError(404, "Group not found or has been deleted");
  }

  if (group.createdBy.toString() !== creatorId.toString()) {
    throw new ApiError(403, "Access denied. Only the group creator can add members");
  }

  const userExists = await User.findById(targetUserId);
  if (!userExists) {
    throw new ApiError(404, "User to add not found");
  }

  const alreadyMember = group.members.some(
    (memberId) => memberId.toString() === targetUserId.toString()
  );

  if (alreadyMember) {
    throw new ApiError(400, "User is already a member of this group");
  }

  group.members.push(targetUserId);
  await group.save();

  // Dispatch notification for group added
  try {
    const creator = await User.findById(creatorId).select("name");
    await Notification.create({
      recipient: targetUserId,
      sender: creatorId,
      type: "group_added",
      message: `${creator?.name || "Someone"} added you to the group "${group.name}".`,
    });
  } catch (notifErr) {
    console.error("Failed to send group added notification:", notifErr.message);
  }

  await group.populate("members", "name username email avatar");

  // Emit real-time socket events
  // 1. Join the new user's active sockets to the group room in real time
  socketManager.joinRoom(targetUserId.toString(), `group:${group._id}`);

  // 2. Notify the new user directly that they were added
  socketManager.sendToUser(targetUserId.toString(), "group_added", group);

  // 3. Notify the room that the group was updated (new member added)
  socketManager.sendToRoom(`group:${group._id}`, "group_updated", group);

  return group;
};


export const removeMember = async (creatorId, groupId, targetUserId) => {
  const group = await Group.findOne({ _id: groupId, isActive: true });

  if (!group) {
    throw new ApiError(404, "Group not found or has been deleted");
  }

  if (group.createdBy.toString() !== creatorId.toString()) {
    throw new ApiError(403, "Access denied. Only the group creator can remove members");
  }

  if (targetUserId.toString() === creatorId.toString()) {
    throw new ApiError(400, "Creator cannot be removed from the group");
  }

  const isMember = group.members.some(
    (memberId) => memberId.toString() === targetUserId.toString()
  );

  if (!isMember) {
    throw new ApiError(400, "User is not a member of this group");
  }

  group.members = group.members.filter(
    (memberId) => memberId.toString() !== targetUserId.toString()
  );
  await group.save();

  // Dispatch notification for group removed
  try {
    const creator = await User.findById(creatorId).select("name");
    await Notification.create({
      recipient: targetUserId,
      sender: creatorId,
      type: "group_removed",
      message: `${creator?.name || "Someone"} removed you from the group "${group.name}".`,
    });
  } catch (notifErr) {
    console.error("Failed to send group removed notification:", notifErr.message);
  }

  await group.populate("members", "name username email avatar");

  // Emit real-time socket events
  // 1. Notify the removed user directly that they were removed
  socketManager.sendToUser(targetUserId.toString(), "group_removed", { groupId: group._id });

  // 2. Notify the remaining members in the room that the group was updated
  socketManager.sendToRoom(`group:${group._id}`, "group_updated", group);

  // 3. Remove the target user's active sockets from the group room
  socketManager.leaveRoom(targetUserId.toString(), `group:${group._id}`);

  return group;
};

/**
 * Creates a new expense inside a group.
 * Validates group membership of creator and split users, and verifies splits sum.
 */
export const createGroupExpense = async (paidById, groupId, expenseData) => {
  const { totalAmount, description, category, splits } = expenseData;

  // 1. Verify group exists
  const group = await Group.findOne({ _id: groupId, isActive: true });
  if (!group) {
    throw new ApiError(404, "Group not found or has been deleted");
  }

  // 2. Verify requester belongs to group
  const requesterInGroup = group.members.some(
    (memberId) => memberId.toString() === paidById.toString()
  );
  if (!requesterInGroup) {
    throw new ApiError(403, "Access denied. You are not a member of this group");
  }

  // 3. Verify all split users belong to group
  for (const split of splits) {
    const splitUserInGroup = group.members.some(
      (memberId) => memberId.toString() === split.user.toString()
    );
    if (!splitUserInGroup) {
      throw new ApiError(400, `User ${split.user} is not a member of this group`);
    }
  }

  // 4. Verify sum of splits equals totalAmount
  const splitSum = splits.reduce((sum, split) => sum + Number(split.amount), 0);
  if (Math.abs(splitSum - totalAmount) > 0.01) {
    throw new ApiError(400, `Sum of splits (₹${splitSum}) must equal total amount (₹${totalAmount})`);
  }

  // 5. Construct splits array with correct status
  const finalSplits = splits.map((split) => {
    const isPayer = split.user.toString() === paidById.toString();
    return {
      user: split.user,
      amount: split.amount,
      status: isPayer ? "accepted" : "pending",
    };
  });

  // 6. Save expense with group reference
  const expense = await Expense.create({
    paidBy: paidById,
    totalAmount,
    splits: finalSplits,
    description,
    category: category || "other",
    group: groupId,
  });

  // 7. Dispatch notifications for split members
  try {
    const sender = await User.findById(paidById).select("name");
    const senderName = sender?.name || "Someone";

    const notificationPromises = finalSplits
      .filter((s) => s.user.toString() !== paidById.toString())
      .map((s) =>
        Notification.create({
          recipient: s.user,
          sender: paidById,
          expense: expense._id,
          type: "split_request_pending",
          message: `${senderName} split ₹${s.amount} with you${description ? ` for "${description}"` : ""}`,
        })
      );

    await Promise.all(notificationPromises);
  } catch (notifErr) {
    console.error("Failed to send group expense notifications:", notifErr.message);
  }

  // Emit real-time socket events to all group members via the room
  socketManager.sendToRoom(`group:${groupId}`, "expense_created", expense);

  return expense;
};

/**
 * Gets all expenses belonging to a group, sorted newest first.
 */
export const getGroupExpenses = async (userId, groupId) => {
  // 1. Verify requester belongs to group
  const group = await Group.findOne({ _id: groupId, isActive: true });
  if (!group) {
    throw new ApiError(404, "Group not found or has been deleted");
  }

  const requesterInGroup = group.members.some(
    (memberId) => memberId.toString() === userId.toString()
  );
  if (!requesterInGroup) {
    throw new ApiError(403, "Access denied. You are not a member of this group");
  }

  // 2. Return populated group expenses
  const expenses = await Expense.find({ group: groupId, isActive: { $ne: false } })
    .sort({ date: -1, createdAt: -1 })
    .populate("paidBy", "name username email avatar")
    .populate("splits.user", "name username email avatar");

  // Map to plain objects and inject currentUserShare and currentUserRole
  const expensesWithPerspective = expenses.map((expense) => {
    const expObj = expense.toObject();
    
    // Find the split corresponding to the current user
    const mySplit = expObj.splits.find(
      (s) => (s.user._id || s.user).toString() === userId.toString()
    );
    
    const currentUserShare = mySplit ? mySplit.amount : 0;
    
    // Determine the user's role (payer vs. participant)
    const isPayer = (expObj.paidBy._id || expObj.paidBy).toString() === userId.toString();
    const currentUserRole = isPayer ? "payer" : "participant";

    return {
      ...expObj,
      currentUserShare,
      currentUserRole,
    };
  });

  return expensesWithPerspective;
};

/**
 * Calculates net balances, total expenses, and resolves optimized debt settlements for a group.
 */
export const calculateGroupBalances = async (userId, groupId) => {
  // 1. Validate groupId format
  if (!groupId || !groupId.toString().match(/^[0-9a-fA-F]{24}$/)) {
    throw new ApiError(400, "Invalid group ID format");
  }

  // 2. Fetch group details populated with members
  const group = await Group.findOne({ _id: groupId, isActive: true }).populate(
    "members",
    "name username email avatar"
  );
  if (!group) {
    throw new ApiError(404, "Group not found or has been deleted");
  }

  // 3. Verify requesting user belongs to group
  const requesterInGroup = group.members.some(
    (member) => member._id.toString() === userId.toString()
  );
  if (!requesterInGroup) {
    throw new ApiError(403, "Access denied. You are not a member of this group");
  }

  // 4. Fetch all group expenses (non-deleted ones)
  const expenses = await Expense.find({ group: groupId, isActive: { $ne: false } });

  // 5. Calculate total expenses and net balances
  let totalExpenses = 0;
  const balances = {};

  // Initialize all group members with zero balance
  for (const member of group.members) {
    balances[member._id.toString()] = 0;
  }

  for (const expense of expenses) {
    totalExpenses += expense.totalAmount;

    const payerId = expense.paidBy.toString();
    // Credit the payer
    if (balances[payerId] !== undefined) {
      balances[payerId] += expense.totalAmount;
    }

    // Debit the split participants
    for (const split of expense.splits) {
      const participantId = split.user.toString();
      if (balances[participantId] !== undefined) {
        balances[participantId] -= split.amount;
      }
    }
  }

  // Fetch and incorporate all accepted group-scoped settlements to adjust balances
  const { default: Settlement } = await import("../../models/Settlement.model.js");
  const groupSettlements = await Settlement.find({ group: groupId, status: "accepted" });

  for (const settlement of groupSettlements) {
    const fromId = settlement.from.toString();
    const toId = settlement.to.toString();

    if (balances[fromId] !== undefined) {
      balances[fromId] += settlement.amount;
    }
    if (balances[toId] !== undefined) {
      balances[toId] -= settlement.amount;
    }
  }

  // 6. Split users into creditors and debtors
  const creditors = [];
  const debtors = [];

  const memberBalances = group.members.map((member) => {
    const memberIdStr = member._id.toString();
    const balance = balances[memberIdStr] || 0;
    const roundedBalance = Math.round(balance * 100) / 100;

    if (roundedBalance > 0.01) {
      creditors.push({
        userId: member._id,
        name: member.name,
        amount: roundedBalance,
      });
    } else if (roundedBalance < -0.01) {
      debtors.push({
        userId: member._id,
        name: member.name,
        amount: Math.abs(roundedBalance),
      });
    }

    return {
      user: {
        _id: member._id,
        name: member.name,
        email: member.email,
      },
      balance: roundedBalance,
    };
  });

  // 7. Greedy two-pointer settlement algorithm
  // Sort descending by amount so that we resolve large debts first
  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  let i = 0; // index for debtors
  let j = 0; // index for creditors
  const settlements = [];

  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];

    const settleAmount = Math.min(debtor.amount, creditor.amount);

    if (settleAmount > 0.01) {
      settlements.push({
        from: {
          _id: debtor.userId,
          name: debtor.name,
        },
        to: {
          _id: creditor.userId,
          name: creditor.name,
        },
        amount: Math.round(settleAmount * 100) / 100,
      });
    }

    debtor.amount -= settleAmount;
    creditor.amount -= settleAmount;

    if (debtor.amount < 0.01) {
      i++;
    }
    if (creditor.amount < 0.01) {
      j++;
    }
  }

  return {
    totalExpenses: Math.round(totalExpenses * 100) / 100,
    memberBalances,
    settlements,
  };
};

export const leaveGroup = async (userId, groupId) => {
  // 1. Fetch group
  const group = await Group.findOne({ _id: groupId, isActive: true });
  if (!group) {
    throw new ApiError(404, "Group not found or has been deleted");
  }

  // 2. Check membership
  const isMember = group.members.some((m) => m.toString() === userId.toString());
  if (!isMember) {
    throw new ApiError(403, "Access denied. You are not a member of this group");
  }

  // 3. Creator check: Option A - block entirely
  if (group.createdBy.toString() === userId.toString()) {
    throw new ApiError(400, "As the group creator, you cannot leave the group. You must delete or archive it instead.");
  }

  // 4. Calculate user balance in this group
  const balancesSummary = await calculateGroupBalances(userId, groupId);
  const memberBalanceObj = balancesSummary.memberBalances.find(
    (mb) => mb.user._id.toString() === userId.toString()
  );

  const balance = memberBalanceObj ? memberBalanceObj.balance : 0;
  if (balance !== 0) {
    const direction = balance > 0 ? "are owed" : "owe";
    const absVal = Math.abs(balance).toFixed(2);
    throw new ApiError(400, `You cannot leave the group because you have an outstanding balance. You ${direction} ₹${absVal}.`);
  }

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      // 5. Remove user from group's members array
      group.members = group.members.filter((m) => m.toString() !== userId.toString());
      await group.save({ session });

      // 6. Create Notification
      const leaver = await User.findById(userId).select("name").session(session);
      const creator = group.createdBy;

      const notification = new Notification({
        recipient: creator,
        sender: userId,
        type: "group_removed",
        message: `${leaver?.name || "A member"} has voluntarily left the group "${group.name}".`,
      });
      await notification.save({ session });
    });

    // 7. Socket.IO emissions outside transaction
    // Notify the leaver that they left the group
    socketManager.sendToUser(userId.toString(), "group_removed", { groupId: group._id });

    // Notify remaining group members that the group was updated
    socketManager.sendToRoom(`group:${group._id}`, "group_updated", group);

    // Remove the leaver's active sockets from the group room
    socketManager.leaveRoom(userId.toString(), `group:${group._id}`);

    return { success: true };
  } finally {
    await session.endSession();
  }
};

export const settleUpGroup = async (fromUserId, groupId, { toUserId, amount }) => {
  if (!toUserId || !amount || amount <= 0) {
    throw new ApiError(400, "Invalid settlement data");
  }

  // 1. Fetch group
  const group = await Group.findOne({ _id: groupId, isActive: true });
  if (!group) {
    throw new ApiError(404, "Group not found or has been deleted");
  }

  // 2. Check membership
  const fromMember = group.members.some((m) => m.toString() === fromUserId.toString());
  const toMember = group.members.some((m) => m.toString() === toUserId.toString());
  if (!fromMember || !toMember) {
    throw new ApiError(403, "Access denied. Both users must be members of the group");
  }

  // 3. Recalculate group recommendations to verify debt
  const balancesSummary = await calculateGroupBalances(fromUserId, groupId);

  // Find outstanding recommendation from fromUserId to toUserId
  const recommendation = balancesSummary.settlements.find(
    (s) => s.from._id.toString() === fromUserId.toString() && s.to._id.toString() === toUserId.toString()
  );

  if (!recommendation) {
    throw new ApiError(400, "You do not owe this user according to current group balances");
  }

  // Float-drift-safe validation: allow partial settlements, but block overpayment
  const outstandingAmount = recommendation.amount;
  if (amount > outstandingAmount + 0.01) {
    throw new ApiError(400, `Settlement amount ₹${amount} exceeds outstanding debt of ₹${outstandingAmount.toFixed(2)}`);
  }

  const { default: Settlement } = await import("../../models/Settlement.model.js");

  const session = await mongoose.startSession();
  try {
    let settlement;
    await session.withTransaction(async () => {
      // 4. Create Settlement document (pending verification)
      settlement = new Settlement({
        from: fromUserId,
        to: toUserId,
        amount,
        status: "pending",
        group: groupId,
      });
      await settlement.save({ session });

      // 5. Create Notification
      const sender = await User.findById(fromUserId).select("name").session(session);
      const senderName = sender?.name || "Someone";

      const notification = new Notification({
        recipient: toUserId,
        sender: fromUserId,
        settlement: settlement._id,
        type: "settlement_request",
        message: `${senderName} sent you a group settlement request of ₹${amount} for "${group.name}"`,
      });
      await notification.save({ session });
    });

    // 6. Socket.IO emissions outside transaction
    if (settlement) {
      socketManager.sendToUser(toUserId.toString(), "settlement_request", settlement);
    }

    return settlement;
  } finally {
    await session.endSession();
  }
};