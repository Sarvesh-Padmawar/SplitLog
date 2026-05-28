import Settlement from "../../models/Settlement.model.js";
import Expense from "../../models/Expense.model.js";
import Friendship from "../../models/Friendship.model.js";
import Notification from "../../models/Notification.model.js";
import User from "../../models/User.model.js";
import { calculateFriendBalance, allocateSettlementsFIFO } from "../../utils/balanceUtils.js";
import { ApiError } from "../../utils/ApiError.js";

/**
 * Initiates a new settlement request.
 * Performs deep ledger math check to block overpayments.
 */
export const initiateSettlement = async ({ from, friendId, amount }) => {
  if (!friendId || !amount || amount <= 0) {
    throw new ApiError(400, "Invalid settlement data");
  }

  // 1️⃣ Verify friendship
  const isFriend = await Friendship.findOne({
    $or: [
      { user1: from, user2: friendId },
      { user1: friendId, user2: from },
    ],
  });

  if (!isFriend) {
    throw new ApiError(403, "You are not friends with this user");
  }

  // Check for existing pending settlement from me to this friend
  const existingPending = await Settlement.findOne({
    from,
    to: friendId,
    status: "pending",
  });
  if (existingPending) {
    throw new ApiError(400, "You already have a pending settlement with this friend");
  }

  // 2️⃣ Fetch historical records to compute outstanding balance
  const expenses = await Expense.find({
    $or: [
      { paidBy: friendId, "splits.user": from },
      { paidBy: from, "splits.user": friendId },
    ],
  });

  const acceptedSettlements = await Settlement.find({
    status: "accepted",
    $or: [
      { from, to: friendId },
      { from: friendId, to: from },
    ],
  });

  // Calculate net balances using the uncapped offset formula
  const { youOwe, theyOwe } = calculateFriendBalance(from, friendId, expenses, acceptedSettlements);
  const outstandingBalance = Number(Math.abs(youOwe - theyOwe).toFixed(2));

  // 3️⃣ Overpayment validations
  if (outstandingBalance === 0) {
    throw new ApiError(400, "No outstanding balance to settle");
  }

  if (amount > outstandingBalance) {
    throw new ApiError(400, `Settlement amount exceeds outstanding balance of ₹${outstandingBalance.toFixed(2)}`);
  }

  // 4️⃣ Run chronological FIFO matching to find linked unsettled expenses
  const allocationMap = allocateSettlementsFIFO(from, friendId, expenses, acceptedSettlements);

  const settlementExpenseIds = expenses
    .filter((expense) => {
      const allocation = allocationMap[expense._id.toString()];
      return (
        allocation &&
        allocation.status !== "settled" &&
        expense.splits.some(
          (s) =>
            s.status === "accepted" &&
            (s.user.toString() === from || s.user.toString() === friendId)
        )
      );
    })
    .map((e) => e._id);

  // 5️⃣ Create settlement record in DB (pending verification)
  const settlement = await Settlement.create({
    from,
    to: friendId,
    amount,
    status: "pending",
    expenses: settlementExpenseIds,
  });

  // 6️⃣ Send in-app notification to the creditor
  try {
    const sender = await User.findById(from).select("name");
    const senderName = sender?.name || "Someone";

    await Notification.create({
      recipient: friendId,
      sender: from,
      settlement: settlement._id,
      type: "settlement_request",
      message: `${senderName} sent you a settlement request of ₹${amount}`,
    });
  } catch (notifErr) {
    console.error("Failed to send settlement notification:", notifErr.message);
  }

  return settlement;
};

/**
 * Approves a pending settlement request (updates status to accepted).
 */
export const approveSettlement = async ({ userId, settlementId }) => {
  if (!settlementId) {
    throw new ApiError(400, "Settlement ID is required");
  }

  const settlement = await Settlement.findById(settlementId);
  if (!settlement) {
    throw new ApiError(404, "Settlement not found");
  }

  // Only the creditor (to) can accept the settlement
  if (settlement.to.toString() !== userId.toString()) {
    throw new ApiError(403, "Unauthorized action");
  }

  if (settlement.status !== "pending") {
    throw new ApiError(400, `Settlement already ${settlement.status}`);
  }

  settlement.status = "accepted";
  await settlement.save();

  return settlement;
};

/**
 * Declines a pending settlement request.
 */
export const declineSettlement = async ({ userId, settlementId, reason }) => {
  if (!settlementId) {
    throw new ApiError(400, "Settlement ID is required");
  }

  const settlement = await Settlement.findById(settlementId);
  if (!settlement) {
    throw new ApiError(404, "Settlement not found");
  }

  // Only the creditor (to) can reject
  if (settlement.to.toString() !== userId.toString()) {
    throw new ApiError(403, "Unauthorized action");
  }

  if (settlement.status !== "pending") {
    throw new ApiError(400, `Settlement already ${settlement.status}`);
  }

  settlement.status = "rejected";
  settlement.rejectionReason = reason?.trim() || "No reason provided";
  await settlement.save();

  return settlement;
};
