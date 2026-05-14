import Expense from "../models/Expense.model.js";
import Friendship from "../models/Friendship.model.js";
import Settlement from "../models/Settlement.model.js";
import User from "../models/User.model.js";


export const getLedger = async (req, res) => {
  try {
    const me = req.user.toString();
    

    const friendships = await Friendship.find({
      $or: [{ user1: me }, { user2: me }],
    }).populate("user1 user2", "name username")


    

    if (friendships.length === 0) {
      return res.status(200).json([]);
    }

    const friendsMap = {};

    friendships.forEach((f) => {
      const friend =
        f.user1._id.toString() === me ? f.user2 : f.user1;

      friendsMap[friend._id.toString()] = {
        friend,
        youOwe: 0,
        theyOwe: 0,
        pendingExpenses: 0,
      };
    });

    const expenses = await Expense.find({
      $or: [
        { paidBy: me },
        { splits: { $elemMatch: { user: me } } },
      ],
    }).populate("paidBy splits.user", "name username")

    // Fetch settlements and build settled expense IDs
    const settlements = await Settlement.find({
      status: "accepted",
      $or: [{ from: me }, { to: me }],
    }).populate("expenses", "_id");

    const settledExpenseIds = new Set();
    settlements.forEach((s) => {
      (s.expenses || []).forEach((e) => {
        const eId = e._id ? e._id.toString() : e.toString();
        settledExpenseIds.add(eId);
      });
    });

    // Accumulate youOwe/theyOwe from UNSETTLED accepted expenses only
    expenses.forEach((expense) => {
      if (settledExpenseIds.has(expense._id.toString())) return;

      const paidByMe = expense.paidBy._id.toString() === me;
      const payerId = expense.paidBy._id.toString();

      expense.splits.forEach((split) => {
        const userId = split.user._id.toString();

        // Count pending (unaccepted) splits for each friend
        if (split.status === "pending") {
          if (paidByMe && userId !== me && friendsMap[userId]) {
            friendsMap[userId].pendingExpenses += 1;
          } else if (!paidByMe && userId === me && friendsMap[payerId]) {
            friendsMap[payerId].pendingExpenses += 1;
          }
          return;
        }

        if (split.status !== "accepted") return;

        if (paidByMe && userId !== me && friendsMap[userId]) {
          friendsMap[userId].theyOwe += split.amount;
        } else if (!paidByMe && userId === me && friendsMap[payerId]) {
          friendsMap[payerId].youOwe += split.amount;
        }
      });
    });

    const ledger = Object.values(friendsMap).map((entry) => {
      const net = entry.theyOwe - entry.youOwe;
      return {
        friend: entry.friend,
        youOwe: Number(entry.youOwe.toFixed(2)),
        theyOwe: Number(entry.theyOwe.toFixed(2)),
        netBalance: Number(net.toFixed(2)),
        pendingExpenses: entry.pendingExpenses,
      };
    });

    res.status(200).json(ledger);
  } catch (error) {
    console.error("Ledger error:", error);
    res.status(500).json({ message: error.message });
  }
};

export const getLedgerWithFriend = async (req, res) => {
  try {
    const me = req.user.toString();
    const { friendId } = req.params;
    const friend = await User.findById(friendId).select("name username");
    
    

    // 1️⃣ Verify friendship
    const isFriend = await Friendship.findOne({
      $or: [
        { user1: me, user2: friendId },
        { user1: friendId, user2: me },
      ],
    });

    if (!isFriend) {
      return res
        .status(403)
        .json({ message: "You are not friends with this user" });
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

    // 4️⃣ Collect expense IDs that are part of accepted settlements
    const settledExpenseIds = new Set();
    settlements.forEach((s) => {
      if (s.status === "accepted") {
        s.expenses.forEach((e) => settledExpenseIds.add(e._id.toString()));
      }
    });

    // 5️⃣ Calculate youOwe/theyOwe from UNSETTLED accepted expenses only
    let youOwe = 0;
    let theyOwe = 0;

    expenses.forEach((expense) => {
      // Skip settled expenses — they don't contribute to outstanding balance
      if (settledExpenseIds.has(expense._id.toString())) return;

      expense.splits.forEach((split) => {
        if (split.user.toString() !== me && split.user.toString() !== friendId)
          return;
        if (split.status !== "accepted") return;

        if (expense.paidBy._id.toString() === me && split.user.toString() === friendId) {
          theyOwe += split.amount;
        }

        if (expense.paidBy._id.toString() === friendId && split.user.toString() === me) {
          youOwe += split.amount;
        }
      });
    });

    // 6️⃣ Build ALL expenses with original split amounts + remaining amounts
    const allExpenses = expenses.map((expense) => {
      const payerId = expense.paidBy._id.toString();
      const paidByMe = payerId === me;

      // The non-payer is always the one who needs to accept.
      // Determine who the non-payer is from THIS viewer's perspective.
      const nonPayerId = paidByMe ? friendId : me;

      // Find the non-payer's split — this is the only split that can be pending
      const nonPayerSplit = expense.splits.find((s) => {
        const uid = s.user._id ? s.user._id.toString() : s.user.toString();
        return uid === nonPayerId;
      });

      // Amount to display is always the non-payer's split amount
      const splitAmount = nonPayerSplit ? nonPayerSplit.amount : 0;

      // Derive status based purely on the non-payer's split
      let status;
      if (!nonPayerSplit) {
        status = "none";
      } else if (nonPayerSplit.status === "rejected") {
        status = "rejected";
      } else if (nonPayerSplit.status === "pending") {
        // Not yet accepted — unified status for BOTH sides
        status = "awaiting";
      } else {
        // accepted — check if settled
        const isSettled = settledExpenseIds.has(expense._id.toString());
        status = isSettled ? "paid" : "unsettled";
      }

      const isSettled = status === "paid";

      return {
        ...expense.toObject(),
        splitAmount,
        paidAmount: isSettled ? splitAmount : 0,
        remainingAmount: isSettled ? 0 : splitAmount,
        amount: expense.totalAmount,
        status,
      };
    }).sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt));

    const netBalance = theyOwe - youOwe;

    res.status(200).json({
      friend,
      youOwe: Number(youOwe.toFixed(2)),
      theyOwe: Number(theyOwe.toFixed(2)),
      netBalance: Number(netBalance.toFixed(2)),
      expenses: allExpenses,
      settlements: settlements.filter((s) => s.status === "accepted"),
    });


  } catch (error) {
    console.error("Ledger details error:", error);
    res.status(500).json({ message: error.message });
  }
};


const derivePartialSettlement = (expenses, settlements, friendId) => {
  let remainingSettlement = settlements.reduce(
    (sum, s) => sum + s.amount,
    0
  );

  return expenses.map((expense) => {
    const friendSplit = expense.splits.find(
      (s) => s.user.toString() === friendId
    );

    if (!friendSplit) {
      return {
        ...expense.toObject(),
        paidAmount: 0,
        remainingAmount: 0,
        status: "paid",
      };
    }

    const expenseAmount = friendSplit.amount;

    let paidAmount = 0;

    if (remainingSettlement > 0) {
      paidAmount = Math.min(expenseAmount, remainingSettlement);
      remainingSettlement -= paidAmount;
    }

    const remainingAmount = expenseAmount - paidAmount;

    let status = "pending";
    if (remainingAmount === 0) status = "paid";
    else if (paidAmount > 0) status = "partial";

    return {
      ...expense.toObject(),
      paidAmount,
      remainingAmount,
      status,
    };
  });
};

