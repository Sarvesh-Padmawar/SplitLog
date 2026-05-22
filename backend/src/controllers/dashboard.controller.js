import Expense from "../models/Expense.model.js";
import Friendship from "../models/Friendship.model.js";
import Settlement from "../models/Settlement.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { calculateDashboardSummary, calculateNetBalances, deriveExpenseStatus, allocateSettlementsFIFO } from "../utils/balanceUtils.js";

/* ─── helpers ─────────────────────────────────────────────────── */

/**
 * Build a Set of expense-IDs that are part of accepted settlements
 * involving the current user.
 */
const buildSettledIds = async (me) => {
  const settlements = await Settlement.find({
    status: "accepted",
    $or: [{ from: me }, { to: me }],
  }).populate("expenses", "_id");

  const ids = new Set();
  settlements.forEach((s) =>
    (s.expenses || []).forEach((e) =>
      ids.add(e._id ? e._id.toString() : e.toString())
    )
  );
  return ids;
};

/* ─── GET /api/dashboard/summary ─────────────────────────────── */
export const getSummary = asyncHandler(async (req, res) => {
    const me = req.user.toString();
    
    // Fetch accepted settlements
    const settlements = await Settlement.find({
      status: "accepted",
      $or: [{ from: me }, { to: me }],
    });

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const expenses = await Expense.find({
      $or: [
        { paidBy: me },
        { splits: { $elemMatch: { user: me } } },
      ],
    }).populate("paidBy", "_id");

    const summary = calculateDashboardSummary(me, expenses, settlements, monthStart);

    res.status(200).json(summary);
});

/* ─── GET /api/dashboard/recent-transactions ─────────────────── */
export const getRecentTransactions = asyncHandler(async (req, res) => {
    const me = req.user.toString();

    const expenses = await Expense.find({
      $or: [
        { paidBy: me },
        { splits: { $elemMatch: { user: me } } },
      ],
    })
      .populate("paidBy", "name _id")
      .populate("splits.user", "name _id");

    // ── Build per-expense per-friend settlement map ──────────────
    // settledByFriend[expenseId] = Set of friendIds who settled that expense with me
    const allSettlements = await Settlement.find({
      status: "accepted",
      $or: [{ from: me }, { to: me }],
    }).populate("expenses", "_id");

    const settledByFriend = {}; // { expenseId: Set<friendId> }
    allSettlements.forEach((s) => {
      const friendId =
        s.from.toString() === me ? s.to.toString() : s.from.toString();
      (s.expenses || []).forEach((e) => {
        const eid = e._id ? e._id.toString() : e.toString();
        if (!settledByFriend[eid]) settledByFriend[eid] = new Set();
        settledByFriend[eid].add(friendId);
      });
    });

    // Cache to store FIFO allocations per friend to avoid redundant calls
    const fifoCache = {};
    const getFifoAllocation = (friendId) => {
      if (fifoCache[friendId]) return fifoCache[friendId];

      const friendExpenses = expenses.filter((e) => {
        const payerId = e.paidBy?._id ? e.paidBy._id.toString() : e.paidBy?.toString();
        const hasMe = e.splits.some((s) => (s.user?._id ? s.user._id.toString() : s.user?.toString()) === me);
        const hasFriend = e.splits.some((s) => (s.user?._id ? s.user._id.toString() : s.user?.toString()) === friendId);
        return (payerId === me && hasFriend) || (payerId === friendId && hasMe);
      });

      const friendSettlements = allSettlements.filter((s) => {
        const fromId = s.from?._id ? s.from._id.toString() : s.from?.toString();
        const toId = s.to?._id ? s.to._id.toString() : s.to?.toString();
        return (fromId === me && toId === friendId) || (fromId === friendId && toId === me);
      });

      const allocationMap = allocateSettlementsFIFO(me, friendId, friendExpenses, friendSettlements);
      fifoCache[friendId] = allocationMap;
      return allocationMap;
    };

    const transactions = expenses.map((expense) => {
      const paidByMe = expense.paidBy?._id?.toString() === me;
      const eid = expense._id.toString();

      // Helper to resolve user id from populated or plain ObjectId
      const uid = (s) => {
        if (!s || !s.user) return null;
        return s.user._id ? s.user._id.toString() : s.user.toString();
      };

      // Self-expense: only one split belonging to payer (me)
      const isSelfExpense =
        expense.splits.length === 1 && uid(expense.splits[0]) === me;

      // ── Compute amounts using centralized FIFO engine ───────────
      let myShare = 0;

      if (isSelfExpense) {
        myShare = 0;
      } else if (paidByMe) {
        // Payer perspective: sum remaining active debts of other participants (outstanding receivables)
        let totalOthersRemaining = 0;
        expense.splits.forEach((split) => {
          const splitUserId = uid(split);
          if (splitUserId === me) return; // Skip self share
          if (split.status !== "accepted") return; // Only count accepted shares

          const allocationMap = getFifoAllocation(splitUserId);
          const allocation = allocationMap[eid];
          if (allocation) {
            totalOthersRemaining += allocation.remainingAmount;
          } else {
            totalOthersRemaining += split.amount; // Fallback if no allocation
          }
        });
        myShare = totalOthersRemaining;
      } else {
        // Participant perspective: my remaining unpaid debt (negative outstanding payable)
        const payerId = expense.paidBy?._id ? expense.paidBy._id.toString() : expense.paidBy.toString();
        const allocationMap = getFifoAllocation(payerId);
        const allocation = allocationMap[eid];
        let remainingDebt = 0;
        if (allocation) {
          remainingDebt = allocation.remainingAmount;
        } else {
          const mySplit = expense.splits.find((s) => uid(s) === me);
          remainingDebt = mySplit && mySplit.status === "accepted" ? mySplit.amount : 0;
        }
        myShare = -remainingDebt;
      }

      // ── Historical context amounts (original amounts before settlements) ─
      // These are used for settled transaction display, e.g. "You lent ₹200 – Settled ✓"
      // rather than the misleading "You get ₹0.00"
      let originalLent = 0;   // Total amount payer originally lent to accepted participants
      let originalOwed = 0;   // Amount this participant originally owed to payer

      if (!isSelfExpense) {
        if (paidByMe) {
          // Sum all accepted, non-self split amounts = what was lent to others
          originalLent = expense.splits.reduce((sum, split) => {
            const splitUserId = uid(split);
            if (splitUserId === me) return sum;
            if (split.status !== "accepted") return sum;
            return sum + split.amount;
          }, 0);
        } else {
          // My own split amount = what I originally owed
          const mySplit = expense.splits.find((s) => uid(s) === me);
          originalOwed = (mySplit && mySplit.status === "accepted") ? mySplit.amount : 0;
        }
      }

      // ── Progress counters & Derived overall status ───────────────
      const settledFriendIds = settledByFriend[eid] || new Set();
      const { status, acceptedCount, totalFriends, settledFriends } = deriveExpenseStatus(me, expense, settledFriendIds);

      const date = new Date(expense.date || expense.createdAt);

      return {
        id: expense._id,
        title: expense.description || "Expense",
        paidBy: paidByMe ? "You" : (expense.paidBy?.name || "Unknown"),
        date: date.toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
        time: date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
        rawTimestamp: date.getTime(), // Added for reliable sorting
        category: expense.category || "other",
        total: expense.totalAmount,
        myShare,
        originalLent: Number(originalLent.toFixed(2)),   // Historical: total lent to others
        originalOwed: Number(originalOwed.toFixed(2)),   // Historical: originally owed by me
        status,
        isSelfExpense,
        // Progress fields (payer-only; undefined for non-payer / self-expense)
        acceptedCount,
        totalFriends,
        settledFriends,
      };
    });

    // Sort by reliable raw timestamp
    transactions.sort((a, b) => b.rawTimestamp - a.rawTimestamp);

    res.status(200).json(transactions.slice(0, 10));
});

/* ─── GET /api/dashboard/friend-balances ─────────────────────── */
export const getFriendBalances = asyncHandler(async (req, res) => {
    const me = req.user.toString();

    const friendships = await Friendship.find({
      $or: [{ user1: me }, { user2: me }],
    }).populate("user1 user2", "name username");

    if (friendships.length === 0) return res.status(200).json([]);

    const expenses = await Expense.find({
      $or: [
        { paidBy: me },
        { splits: { $elemMatch: { user: me } } },
      ],
    }).populate("paidBy splits.user", "name _id");

    const settlements = await Settlement.find({
      status: "accepted",
      $or: [{ from: me }, { to: me }],
    });

    const ledger = calculateNetBalances(me, friendships, expenses, settlements);

    const balances = ledger
      .map(({ friend, netBalance }) => ({
        id: friend._id,
        name: friend.name,
        username: friend.username,
        balance: netBalance,
      }))
      .filter((b) => b.balance !== 0);
      
    balances.sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance)); // biggest first

    res.status(200).json(balances.slice(0, 5));
});

/* ─── GET /api/dashboard/chart-data ─────────────────────────── */
export const getChartData = asyncHandler(async (req, res) => {
    const me = req.user.toString();

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const expenses = await Expense.find({
      date: { $gte: thirtyDaysAgo },
      $or: [
        { paidBy: me },
        { splits: { $elemMatch: { user: me } } },
      ],
    }).populate("paidBy", "_id");

    // ── Trend: accumulate daily spending (amounts I'm involved in) ──
    const trendMap = {};
    // ── Categories: group by category ──────────────────────────────
    const CATEGORY_COLORS = {
      food: "#10b981",
      travel: "#3b82f6",
      rent: "#f59e0b",
      shopping: "#ec4899",
      other: "#6b7280",
    };
    const categoryMap = {};

    expenses.forEach((expense) => {
      const paidByMe = expense.paidBy._id.toString() === me;

      // Self-expense: only one split belonging to me
      const isSelfExpense =
        expense.splits.length === 1 &&
        expense.splits[0].user.toString() === me;

      // Skip expense entirely if ALL non-payer splits are rejected or pending
      const allFriendSplitsRejectedOrPending =
        !isSelfExpense &&
        paidByMe &&
        expense.splits
          .filter((s) => s.user.toString() !== me)
          .every((s) => s.status === "rejected" || s.status === "pending");

      if (allFriendSplitsRejectedOrPending) return;

      // My split entry (payer or participant)
      const mySplit = expense.splits.find((s) => s.user.toString() === me);

      // Amount for CHARTS: strictly what I am responsible for (my split amount)
      // This matches the "my cost" logic in summary cards.
      let myAmount = 0;
      if (mySplit && mySplit.status === "accepted") {
        myAmount = mySplit.amount;
      }

      if (myAmount === 0) return;

      // Date key: YYYY-MM-DD for reliable sorting
      const d = new Date(expense.date || expense.createdAt);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      const key = `${year}-${month}-${day}`;

      trendMap[key] = (trendMap[key] || 0) + myAmount;

      const cat = expense.category || "other";
      categoryMap[cat] = (categoryMap[cat] || 0) + myAmount;
    });

    // Build sorted trend array (chronological)
    const trendEntries = Object.entries(trendMap).sort(
      ([a], [b]) => new Date(a) - new Date(b)
    );
    const trend = trendEntries.map(([dateStr, amount]) => {
      const d = new Date(dateStr);
      const formattedDate = d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
      return {
        date: formattedDate,
        amount: Number(amount.toFixed(2)),
      };
    });

    const categories = Object.entries(categoryMap).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value: Number(value.toFixed(2)),
      color: CATEGORY_COLORS[name] || CATEGORY_COLORS.other,
    }));
    
    // Sort so chart starts from oldest in the last 30 days
    trend.sort((a, b) => new Date(a.date) - new Date(b.date));

    res.status(200).json({ trend, categories });
});
