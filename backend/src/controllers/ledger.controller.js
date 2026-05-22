import Expense from "../models/Expense.model.js";
import Friendship from "../models/Friendship.model.js";
import Settlement from "../models/Settlement.model.js";
import User from "../models/User.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { calculateNetBalances, calculateFriendBalance, allocateSettlementsFIFO } from "../utils/balanceUtils.js";

/* ─── GET /api/ledger ─────────────────────────────────────────── */
export const getLedger = asyncHandler(async (req, res) => {
    const me = req.user.toString();
    
    const friendships = await Friendship.find({
      $or: [{ user1: me }, { user2: me }],
    }).populate("user1 user2", "name username");

    if (friendships.length === 0) {
      return res.status(200).json([]);
    }

    const expenses = await Expense.find({
      $or: [
        { paidBy: me },
        { splits: { $elemMatch: { user: me } } },
      ],
    }).populate("paidBy splits.user", "name username");

    // Fetch all accepted settlements
    const settlements = await Settlement.find({
      status: "accepted",
      $or: [{ from: me }, { to: me }],
    });

    const ledger = calculateNetBalances(me, friendships, expenses, settlements);

    res.status(200).json(ledger);
});

/* ─── GET /api/ledger/:friendId ───────────────────────────────── */
export const getLedgerWithFriend = asyncHandler(async (req, res) => {
    const me = req.user.toString();
    const { friendId } = req.params;
    const friend = await User.findById(friendId).select("name username");
    
    if (!friend) {
      throw new ApiError(404, "Friend not found");
    }

    // 1️⃣ Verify friendship
    const isFriend = await Friendship.findOne({
      $or: [
        { user1: me, user2: friendId },
        { user1: friendId, user2: me },
      ],
    });

    if (!isFriend) {
      throw new ApiError(403, "You are not friends with this user");
    }

    // 2️⃣ Fetch expenses between both users
    const expenses = await Expense.find({
      $or: [
        { paidBy: me, "splits.user": friendId },
        { paidBy: friendId, "splits.user": me },
      ],
    }).populate("paidBy", "name username").sort({ createdAt: 1 });

    // 3️⃣ Fetch settlements (all statuses for display, accepted for balance)
    const settlements = await Settlement.find({
      $or: [
        { from: me, to: friendId },
        { from: friendId, to: me },
      ],
    })
      .populate("expenses", "description category totalAmount createdAt paidBy splits")
      .sort({ createdAt: -1 });

    // 4️⃣ Filter accepted settlements for balance calculations and FIFO allocation
    const acceptedSettlements = settlements.filter((s) => s.status === "accepted");

    // 5️⃣ Calculate exact net balance using gross math
    const { youOwe, theyOwe, netBalance } = calculateFriendBalance(me, friendId, expenses, acceptedSettlements);

    // 6️⃣ Allocate settlement funds chronologically (FIFO) to generate individual status tags and remaining amounts
    const allocationMap = allocateSettlementsFIFO(me, friendId, expenses, acceptedSettlements);

    // 7️⃣ Build all expenses with high precision FIFO statuses
    const allExpenses = expenses.map((expense) => {
      const payerId = expense.paidBy._id.toString();
      const paidByMe = payerId === me;
      const nonPayerId = paidByMe ? friendId : me;

      const nonPayerSplit = expense.splits.find((s) => {
        const uid = s.user._id ? s.user._id.toString() : s.user.toString();
        return uid === nonPayerId;
      });

      const splitAmount = nonPayerSplit ? nonPayerSplit.amount : 0;

      // Extract FIFO computed details
      const allocation = allocationMap[expense._id.toString()] || { paidAmount: 0, remainingAmount: splitAmount, status: "open" };

      // Map FIFO allocation to standard lifecycle statuses
      let finalStatus = allocation.status;

      // If split was rejected or pending, respect that first.
      if (!nonPayerSplit) {
        finalStatus = "none";
      } else if (nonPayerSplit.status === "rejected") {
        finalStatus = "rejected";
      } else if (nonPayerSplit.status === "pending") {
        finalStatus = "pending";
      }

      return {
        ...expense.toObject(),
        splitAmount,
        paidAmount: finalStatus === "settled" ? splitAmount : (finalStatus === "partially_settled" ? allocation.paidAmount : 0),
        remainingAmount: finalStatus === "settled" ? 0 : (finalStatus === "partially_settled" ? allocation.remainingAmount : splitAmount),
        amount: expense.totalAmount,
        status: finalStatus,
      };
    }).sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt));

    res.status(200).json({
      friend,
      youOwe: Number(youOwe.toFixed(2)),
      theyOwe: Number(theyOwe.toFixed(2)),
      netBalance: Number(netBalance.toFixed(2)),
      expenses: allExpenses,
      settlements: settlements.filter((s) => s.status === "accepted"),
    });
});
