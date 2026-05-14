import Expense from "../models/Expense.model.js";
import Friendship from "../models/Friendship.model.js";

export const getExpenseHistoryWithFriend = async (req, res) => {
  try {
    const me = req.user.toString();
    const { friendId } = req.params;

    // 1️⃣ verify friendship
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

    // 2️⃣ fetch expense history
    const expenses = await Expense.find({
      $or: [
        { paidBy: me, "splits.user": friendId },
        { paidBy: friendId, "splits.user": me },
      ],
      status: "accepted",
    });

    const settlements = await Settlement.find({
      $or: [
        { payer: me, receiver: friendId },
        { payer: friendId, receiver: me },
      ],
      status: "accepted",
    });

    const history = [];

    expenses.forEach((expense) => {
      history.push({
        _id: expense._id,
        date: expense.date || expense.createdAt,
        type: "expense",
        description: expense.description,
        amount: expense.amount,
        paidBy: expense.paidBy,
        splits: expense.splits,
        category: expense.category,
        createdAt: expense.createdAt,
      });
    });

    settlements.forEach((settlement) => {
      history.push({
        _id: settlement._id,
        date: settlement.date || settlement.createdAt,
        type: "settlement",
        amount: settlement.amount,
        payer: settlement.payer,
        receiver: settlement.receiver,
        createdAt: settlement.createdAt,
      });
    });

    // Sort all history items by date (or createdAt if date is not available)
    history.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Populate necessary fields after sorting
    const populatedHistory = await Promise.all(
      history.map(async (item) => {
        if (item.type === "expense") {
          const populatedExpense = await Expense.findById(item._id)
            .populate("paidBy", "name username")
            .populate("splits.user", "name username");
          return {
            ...item,
            paidBy: populatedExpense.paidBy,
            splits: populatedExpense.splits,
          };
        } else if (item.type === "settlement") {
          const populatedSettlement = await Settlement.findById(item._id)
            .populate("payer", "name username")
            .populate("receiver", "name username");
          return {
            ...item,
            payer: populatedSettlement.payer,
            receiver: populatedSettlement.receiver,
          };
        }
        return item;
      })
    );

    res.status(200).json(populatedHistory);
  } catch (error) {
    console.error("History error:", error);
    res.status(500).json({ message: error.message });
  }
};


