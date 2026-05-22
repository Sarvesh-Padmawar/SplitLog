import Expense from "../models/Expense.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { getPaginationParams, buildPaginationMeta, buildPaginatedResponse } from "../utils/pagination.js";

export const getMyExpenses = asyncHandler(async (req, res) => {
  const me = req.user.toString();

  const { page, limit, skip } = getPaginationParams(req.query);

  const query = {
    $or: [
      { paidBy: me },
      { splits: { $elemMatch: { user: me } } },
    ],
  };

  const totalItems = await Expense.countDocuments(query);

  const expenses = await Expense.find(query)
    .populate("paidBy", "name username")
    .populate("splits.user", "name username")
    .sort({ date: -1, createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const meta = buildPaginationMeta(totalItems, page, limit);

  res.status(200).json(buildPaginatedResponse(expenses, meta));
});
