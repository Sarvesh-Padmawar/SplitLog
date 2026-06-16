import Group from "../../models/Group.model.js";
import User from "../../models/User.model.js";
import Expense from "../../models/Expense.model.js";
import Notification from "../../models/Notification.model.js";
import { ApiError } from "../../utils/ApiError.js";


export const createGroup = async (userId, groupData) => {
  const { name, description } = groupData;

  const group = await Group.create({
    name,
    description,
    createdBy: userId,
    members: [userId],
  });

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
  }).populate("members", "name username email");

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

  await group.populate("members", "name username email");
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

  await group.populate("members", "name username email");
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
    .populate("paidBy", "name username email")
    .populate("splits.user", "name username email");

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
    "name username email"
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