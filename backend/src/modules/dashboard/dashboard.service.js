import Expense from "../../models/Expense.model.js";
import Friendship from "../../models/Friendship.model.js";
import Settlement from "../../models/Settlement.model.js";
import {
  calculateDashboardSummary,
  calculateNetBalances,
  deriveExpenseStatus,
  allocateSettlementsFIFO,
} from "../../utils/balanceUtils.js";

/**
 * Compiles aggregated dashboard summary values.
 */
export const fetchDashboardSummary = async ({ userId }) => {
  const me = userId.toString();

  // Fetch accepted settlements involving user
  const settlements = await Settlement.find({
    status: "accepted",
    $or: [{ from: me }, { to: me }],
  });

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  // Fetch expenses involving user
  const expenses = await Expense.find({
    $or: [
      { paidBy: me },
      { splits: { $elemMatch: { user: me } } },
    ],
  }).populate("paidBy", "_id");

  return calculateDashboardSummary(me, expenses, settlements, monthStart);
};

/**
 * Retrieves the user's recent transactions, fully optimized to prevent N+1 query loops.
 * Employs batch pre-fetching and local in-memory filters.
 */
export const fetchRecentTransactions = async ({ userId }) => {
  const me = userId.toString();

  // 1️⃣ Batch-fetch all relevant expenses upfront
  const expenses = await Expense.find({
    $or: [
      { paidBy: me },
      { splits: { $elemMatch: { user: me } } },
    ],
  })
    .populate("paidBy", "name _id")
    .populate("splits.user", "name _id");

  // 2️⃣ Batch-fetch all accepted settlements upfront in a single indexed query
  const allSettlements = await Settlement.find({
    status: "accepted",
    $or: [{ from: me }, { to: me }],
  }).populate("expenses", "_id");

  // 3️⃣ Compile in-memory settledByFriend lookup map
  const settledByFriend = {}; // { expenseId: Set<friendId> }
  allSettlements.forEach((s) => {
    const friendId = s.from.toString() === me ? s.to.toString() : s.from.toString();
    (s.expenses || []).forEach((e) => {
      const eid = e._id ? e._id.toString() : e.toString();
      if (!settledByFriend[eid]) settledByFriend[eid] = new Set();
      settledByFriend[eid].add(friendId);
    });
  });

  // 4️⃣ Sandboxed in-memory FIFO allocation cache to prevent N+1 DB loops
  const fifoCache = {};
  const getFifoAllocation = (friendId) => {
    if (fifoCache[friendId]) return fifoCache[friendId];

    // Local array filter (zero network database calls inside loop)
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

  // 5️⃣ Map transaction data in memory
  const transactions = expenses.map((expense) => {
    const paidByMe = expense.paidBy?._id?.toString() === me;
    const eid = expense._id.toString();

    const uid = (s) => {
      if (!s || !s.user) return null;
      return s.user._id ? s.user._id.toString() : s.user.toString();
    };

    // Self-expense check
    const isSelfExpense =
      expense.splits.length === 1 && uid(expense.splits[0]) === me;

    let myShare = 0;

    if (isSelfExpense) {
      myShare = 0;
    } else if (paidByMe) {
      let totalOthersRemaining = 0;
      expense.splits.forEach((split) => {
        const splitUserId = uid(split);
        if (splitUserId === me) return;
        if (split.status !== "accepted") return;

        const allocationMap = getFifoAllocation(splitUserId);
        const allocation = allocationMap[eid];
        if (allocation) {
          totalOthersRemaining += allocation.remainingAmount;
        } else {
          totalOthersRemaining += split.amount;
        }
      });
      myShare = totalOthersRemaining;
    } else {
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

    let originalLent = 0;
    let originalOwed = 0;

    if (!isSelfExpense) {
      if (paidByMe) {
        originalLent = expense.splits.reduce((sum, split) => {
          const splitUserId = uid(split);
          if (splitUserId === me) return sum;
          if (split.status !== "accepted") return sum;
          return sum + split.amount;
        }, 0);
      } else {
        const mySplit = expense.splits.find((s) => uid(s) === me);
        originalOwed = mySplit && mySplit.status === "accepted" ? mySplit.amount : 0;
      }
    }

    const settledFriendIds = settledByFriend[eid] || new Set();
    const { status, acceptedCount, totalFriends, settledFriends } = deriveExpenseStatus(me, expense, settledFriendIds);

    const date = new Date(expense.date || expense.createdAt);

    return {
      id: expense._id,
      title: expense.description || "Expense",
      paidBy: paidByMe ? "You" : (expense.paidBy?.name || "Unknown"),
      date: date.toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
      time: date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
      rawTimestamp: date.getTime(),
      category: expense.category || "other",
      total: expense.totalAmount,
      myShare,
      originalLent: Number(originalLent.toFixed(2)),
      originalOwed: Number(originalOwed.toFixed(2)),
      status,
      isSelfExpense,
      acceptedCount,
      totalFriends,
      settledFriends,
    };
  });

  // Sort by reliable raw timestamp descending
  transactions.sort((a, b) => b.rawTimestamp - a.rawTimestamp);

  return transactions.slice(0, 10);
};

/**
 * Fetches the top 5 friend balances.
 */
export const fetchFriendBalances = async ({ userId }) => {
  const me = userId.toString();

  const friendships = await Friendship.find({
    $or: [{ user1: me }, { user2: me }],
  }).populate("user1 user2", "name username");

  if (friendships.length === 0) return [];

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

  balances.sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance));

  return balances.slice(0, 5);
};

/**
 * Generates 30-day daily trend and category aggregates for charts.
 */
export const fetchChartData = async ({ userId }) => {
  const me = userId.toString();

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const expenses = await Expense.find({
    date: { $gte: thirtyDaysAgo },
    $or: [
      { paidBy: me },
      { splits: { $elemMatch: { user: me } } },
    ],
  }).populate("paidBy", "_id");

  const trendMap = {};
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

    const isSelfExpense =
      expense.splits.length === 1 &&
      expense.splits[0].user.toString() === me;

    const allFriendSplitsRejectedOrPending =
      !isSelfExpense &&
      paidByMe &&
      expense.splits
        .filter((s) => s.user.toString() !== me)
        .every((s) => s.status === "rejected" || s.status === "pending");

    if (allFriendSplitsRejectedOrPending) return;

    const mySplit = expense.splits.find((s) => s.user.toString() === me);

    let myAmount = 0;
    if (mySplit && mySplit.status === "accepted") {
      myAmount = mySplit.amount;
    }

    if (myAmount === 0) return;

    const d = new Date(expense.date || expense.createdAt);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const key = `${year}-${month}-${day}`;

    trendMap[key] = (trendMap[key] || 0) + myAmount;

    const cat = expense.category || "other";
    categoryMap[cat] = (categoryMap[cat] || 0) + myAmount;
  });

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

  trend.sort((a, b) => new Date(a.date) - new Date(b.date));

  return { trend, categories };
};
