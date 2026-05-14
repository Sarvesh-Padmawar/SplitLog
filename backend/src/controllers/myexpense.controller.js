import Expense from "../models/Expense.model.js";

export const getMyExpenses = async (req, res) => {
  try {
    const me = req.user.toString();

    const expenses = await Expense.find({
      $or: [
        { paidBy: me },
        { splits: { $elemMatch: { user: me } } },
      ],
    })
      .populate("paidBy", "name username")
      .populate("splits.user", "name username");

    // Sort by Date manually to support fallback
    expenses.sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt));

    res.status(200).json(expenses);
  } catch (error) {
    console.error("My expenses error:", error);
    res.status(500).json({ message: error.message });
  }
};
