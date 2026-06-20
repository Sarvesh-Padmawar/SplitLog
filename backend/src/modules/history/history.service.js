import Expense from "../../models/Expense.model.js";
import Friendship from "../../models/Friendship.model.js";
import Settlement from "../../models/Settlement.model.js";
import {
  getPaginationParams,
  buildPaginationMeta,
  buildPaginatedResponse,
} from "../../utils/pagination.js";
import { ApiError } from "../../utils/ApiError.js";

/**
 * Fetches unified chronological activity feed of expenses and settlements between me and a specific friend.
 */
export const fetchExpenseHistoryWithFriend = async ({ userId, friendId, queryParams }) => {
  const me = userId.toString();

  // 1️⃣ Verify friendship in a single lookup
  const isFriend = await Friendship.findOne({
    $or: [
      { user1: me, user2: friendId },
      { user1: friendId, user2: me },
    ],
  }).lean();

  if (!isFriend) {
    throw new ApiError(403, "You are not friends with this user");
  }

  // 2️⃣ Parse pagination parameters
  const { page, limit, skip } = getPaginationParams(queryParams);

  // 3️⃣ Define queries matching respective schemas
  const expenseQuery = {
    $or: [
      { paidBy: me, splits: { $elemMatch: { user: friendId, status: "accepted" } } },
      { paidBy: friendId, splits: { $elemMatch: { user: me, status: "accepted" } } },
    ],
  };

  const settlementQuery = {
    $or: [
      { from: me, to: friendId },
      { from: friendId, to: me },
    ],
    status: "accepted",
  };

  // 4️⃣ Run counts in parallel
  const [expenseCount, settlementCount] = await Promise.all([
    Expense.countDocuments(expenseQuery),
    Settlement.countDocuments(settlementQuery),
  ]);

  const totalItems = expenseCount + settlementCount;

  // 5️⃣ Batch fetch recent items up to required offset in parallel
  const fetchLimit = skip + limit;

  const [expenses, settlements] = await Promise.all([
    Expense.find(expenseQuery)
      .sort({ date: -1, createdAt: -1 })
      .limit(fetchLimit)
      .populate("paidBy", "name username avatar")
      .populate("splits.user", "name username avatar")
      .lean(),
    Settlement.find(settlementQuery)
      .sort({ createdAt: -1 })
      .limit(fetchLimit)
      .populate("from to", "name username avatar")
      .lean(),
  ]);

  // 6️⃣ Merge and format into single activity feed in memory
  const history = [];

  expenses.forEach((expense) => {
    history.push({
      _id: expense._id,
      date: expense.date || expense.createdAt,
      type: "expense",
      description: expense.description || "Expense",
      amount: expense.totalAmount,
      paidBy: expense.paidBy,
      splits: expense.splits,
      category: expense.category || "other",
      createdAt: expense.createdAt,
    });
  });

  settlements.forEach((settlement) => {
    history.push({
      _id: settlement._id,
      date: settlement.createdAt,
      type: "settlement",
      amount: settlement.amount,
      from: settlement.from,
      to: settlement.to,
      createdAt: settlement.createdAt,
    });
  });

  // 7️⃣ Sort unified feed descending by date
  history.sort((a, b) => new Date(b.date) - new Date(a.date));

  // 8️⃣ Extract pagination slice
  const paginatedData = history.slice(skip, skip + limit);
  const meta = buildPaginationMeta(totalItems, page, limit);

  return buildPaginatedResponse(paginatedData, meta);
};
