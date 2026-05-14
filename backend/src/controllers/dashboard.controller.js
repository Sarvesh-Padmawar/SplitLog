import Expense from "../models/Expense.model.js";
import Friendship from "../models/Friendship.model.js";
import Settlement from "../models/Settlement.model.js";

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
export const getSummary = async (req, res) => {
  try {
    const me = req.user.toString();
    const settledIds = await buildSettledIds(me);

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const expenses = await Expense.find({
      $or: [
        { paidBy: me },
        { splits: { $elemMatch: { user: me } } },
      ],
    }).populate("paidBy", "_id");

    let youOwe = 0;
    let youGet = 0;
    let thisMonth = 0;
    let youPaid = 0;

    expenses.forEach((expense) => {
      const isSettled = settledIds.has(expense._id.toString());
      const paidByMe = expense.paidBy._id.toString() === me;
      const createdAt = new Date(expense.date || expense.createdAt);
      const isThisMonth = createdAt >= monthStart;

      // Determine if ALL non-payer splits are rejected (fully rejected expense)
      const nonPayerSplits = expense.splits.filter(
        (s) => s.user.toString() !== me || !paidByMe
      );
      const isSelfExpense =
        expense.splits.length === 1 &&
        expense.splits[0].user.toString() === me;

      // My own share in this expense (the split belonging to me)
      const mySplit = expense.splits.find((s) => s.user.toString() === me);

      // For youOwe/youGet calculations, skip settled and rejected splits
      if (!isSettled) {
        expense.splits.forEach((split) => {
          const uid = split.user.toString();
          if (split.status !== "accepted") return;

          if (paidByMe && uid !== me) {
            youGet += split.amount;
          } else if (!paidByMe && uid === me) {
            youOwe += split.amount;
          }
        });
      }

      // Whether ALL non-payer splits are rejected (expense is fully rejected from my POV as payer)
      const allFriendSplitsRejectedOrPending =
        !isSelfExpense &&
        paidByMe &&
        expense.splits
          .filter((s) => s.user.toString() !== me)
          .every((s) => s.status === "rejected" || s.status === "pending");

      // ── THIS MONTH (myNetShare) ──────────────────────────────────
      // My actual cost after splits, for every non-rejected expense this month
      if (isThisMonth) {
        if (isSelfExpense) {
          // Self-only: I bear the full amount
          thisMonth += expense.totalAmount;
        } else if (paidByMe && !allFriendSplitsRejectedOrPending) {
          // I paid for a group: my share = what I paid minus accepted non-rejected friends' portions
          const othersShare = expense.splits
            .filter((s) => s.user.toString() !== me && s.status === "accepted")
            .reduce((sum, s) => sum + s.amount, 0);
          thisMonth += expense.totalAmount - othersShare;
        } else if (!paidByMe && mySplit && mySplit.status === "accepted") {
          // Someone else paid: my cost = my split amount (only if I accepted it)
          thisMonth += mySplit.amount;
        }

        // ── YOU PAID (out-of-pocket) ─────────────────────────────
        // Total I actually fronted as payer, excluding expenses where everyone rejected/pending
        if (paidByMe && (isSelfExpense || !allFriendSplitsRejectedOrPending)) {
          youPaid += expense.totalAmount;
        }
      }
    });

    res.status(200).json({
      netBalance: Number((youGet - youOwe).toFixed(2)),
      youOwe: Number(youOwe.toFixed(2)),
      youGet: Number(youGet.toFixed(2)),
      thisMonth: Number(thisMonth.toFixed(2)),
      youPaid: Number(youPaid.toFixed(2)),
    });
  } catch (err) {
    console.error("Dashboard summary error:", err);
    res.status(500).json({ message: err.message });
  }
};

/* ─── GET /api/dashboard/recent-transactions ─────────────────── */
export const getRecentTransactions = async (req, res) => {
  try {
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

    const transactions = expenses.map((expense) => {
      const paidByMe = expense.paidBy._id.toString() === me;
      const eid = expense._id.toString();

      // Helper to resolve user id from populated or plain ObjectId
      const uid = (s) =>
        s.user._id ? s.user._id.toString() : s.user.toString();

      // Self-expense: only one split belonging to payer (me)
      const isSelfExpense =
        expense.splits.length === 1 && uid(expense.splits[0]) === me;

      // My own split entry
      const mySplit = expense.splits.find((s) => uid(s) === me);

      // ── Compute amounts ──────────────────────────────────────────
      let splitAmount, myShare;

      if (isSelfExpense) {
        splitAmount = expense.totalAmount;
        myShare = -expense.totalAmount;
      } else if (paidByMe) {
        // Use first friend split amount for the "my share" display column
        const firstFriendSplit = expense.splits.find((s) => uid(s) !== me);
        splitAmount = firstFriendSplit ? firstFriendSplit.amount : 0;
        myShare = -splitAmount;
      } else {
        splitAmount = mySplit ? mySplit.amount : 0;
        myShare = splitAmount;
      }

      // ── Progress counters (payer view) ───────────────────────────
      let status, acceptedCount, totalFriends, settledFriends;

      if (isSelfExpense) {
        // For self-expense, check if it's settled globally
        const isSettled = !!settledByFriend[eid];
        status = isSettled ? "settled" : "unsettled";
      } else if (paidByMe) {
        // All friend splits (exclude payer)
        const friendSplits = expense.splits.filter((s) => uid(s) !== me);
        // Non-rejected friend splits
        const activeFriendSplits = friendSplits.filter(
          (s) => s.status !== "rejected"
        );
        totalFriends = activeFriendSplits.length;
        acceptedCount = activeFriendSplits.filter(
          (s) => s.status === "accepted"
        ).length;

        // Count friends who settled: accepted split + settlement record covering this expense
        settledFriends = activeFriendSplits.filter((s) => {
          const fid = uid(s);
          return (
            s.status === "accepted" && settledByFriend[eid]?.has(fid)
          );
        }).length;

        if (acceptedCount < totalFriends) {
          // Some friends haven't responded yet
          status = "awaiting_response";
        } else if (settledFriends < totalFriends) {
          // All accepted but not everyone settled
          status = "pending";
        } else {
          status = "settled";
        }
      } else {
        // Non-payer: use own split status
        const splitStatus = mySplit ? mySplit.status : "pending";
        const mySettled = settledByFriend[eid]?.has(
          expense.paidBy._id.toString()
        );

        if (splitStatus === "rejected") status = "rejected";
        else if (splitStatus === "pending") status = "awaiting";
        else if (mySettled) status = "settled";
        else status = "unsettled";
      }

      const date = new Date(expense.date || expense.createdAt);

      return {
        id: expense._id,
        title: expense.description || "Expense",
        paidBy: paidByMe ? "You" : expense.paidBy.name,
        date: date.toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
        time: date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
        category: expense.category || "other",
        total: expense.totalAmount,
        myShare,
        status,
        // Progress fields (payer-only; undefined for non-payer / self-expense)
        acceptedCount,
        totalFriends,
        settledFriends,
      };
    });

    // Sort by date manually and then take the top 10
    transactions.sort((a, b) => {
      const dateA = new Date(a.date + " " + a.time);
      const dateB = new Date(b.date + " " + b.time);
      return dateB - dateA;
    });

    res.status(200).json(transactions.slice(0, 10));
  } catch (err) {
    console.error("Dashboard recent transactions error:", err);
    res.status(500).json({ message: err.message });
  }
};

/* ─── GET /api/dashboard/friend-balances ─────────────────────── */
export const getFriendBalances = async (req, res) => {
  try {
    const me = req.user.toString();

    const friendships = await Friendship.find({
      $or: [{ user1: me }, { user2: me }],
    }).populate("user1 user2", "name username");

    if (friendships.length === 0) return res.status(200).json([]);

    const friendsMap = {};
    friendships.forEach((f) => {
      const friend = f.user1._id.toString() === me ? f.user2 : f.user1;
      friendsMap[friend._id.toString()] = { friend, youOwe: 0, theyOwe: 0 };
    });

    const settledIds = await buildSettledIds(me);

    const expenses = await Expense.find({
      $or: [
        { paidBy: me },
        { splits: { $elemMatch: { user: me } } },
      ],
    }).populate("paidBy splits.user", "name _id");

    expenses.forEach((expense) => {
      if (settledIds.has(expense._id.toString())) return;
      const paidByMe = expense.paidBy._id.toString() === me;
      const payerId = expense.paidBy._id.toString();

      expense.splits.forEach((split) => {
        const uid = split.user._id ? split.user._id.toString() : split.user.toString();
        if (split.status !== "accepted") return;

        if (paidByMe && uid !== me && friendsMap[uid]) {
          friendsMap[uid].theyOwe += split.amount;
        } else if (!paidByMe && uid === me && friendsMap[payerId]) {
          friendsMap[payerId].youOwe += split.amount;
        }
      });
    });

    const balances = Object.values(friendsMap)
      .map(({ friend, youOwe, theyOwe }) => ({
        id: friend._id,
        name: friend.name,
        username: friend.username,
        // positive = they owe you, negative = you owe them
        balance: Number((theyOwe - youOwe).toFixed(2)),
      }))
      .filter((b) => b.balance !== 0) // only show non-zero
      .sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance)); // biggest first

    res.status(200).json(balances);
  } catch (err) {
    console.error("Dashboard friend balances error:", err);
    res.status(500).json({ message: err.message });
  }
};

/* ─── GET /api/dashboard/chart-data ─────────────────────────── */
export const getChartData = async (req, res) => {
  try {
    const me = req.user.toString();

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const expenses = await Expense.find({
      createdAt: { $gte: thirtyDaysAgo },
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

      // Date label: "D MMM"
      const d = new Date(expense.date || expense.createdAt);
      const label = d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });

      trendMap[label] = (trendMap[label] || 0) + myAmount;

      const cat = expense.category || "other";
      categoryMap[cat] = (categoryMap[cat] || 0) + myAmount;
    });

    // Build sorted trend array (chronological)
    const trendEntries = Object.entries(trendMap).sort(
      ([a], [b]) => new Date(`${a} 2025`) - new Date(`${b} 2025`)
    );
    const trend = trendEntries.map(([date, amount]) => ({
      date,
      amount: Number(amount.toFixed(2)),
    }));

    const categories = Object.entries(categoryMap).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value: Number(value.toFixed(2)),
      color: CATEGORY_COLORS[name] || CATEGORY_COLORS.other,
    }));

    res.status(200).json({ trend, categories });
  } catch (err) {
    console.error("Dashboard chart data error:", err);
    res.status(500).json({ message: err.message });
  }
};
