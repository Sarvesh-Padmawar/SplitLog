import Expense from "../models/Expense.model.js";
import Friendship from "../models/Friendship.model.js";
import Settlement from "../models/Settlement.model.js"; // Fix: Added missing import
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { getPaginationParams, buildPaginationMeta, buildPaginatedResponse } from "../utils/pagination.js";

/**
 * GET /api/history/:friendId
 * 
 * @description
 * Returns a unified chronological activity feed of expenses and settlements shared
 * between the logged-in user and a specific friend. Optimized to eliminate N+1 queries,
 * resolve schema mismatches, and provide robust offset-based pagination.
 */
export const getExpenseHistoryWithFriend = asyncHandler(async (req, res) => {
  const me = req.user.toString();
  const { friendId } = req.params;

  // 1️⃣ Verify friend ID exists
  if (!friendId) {
    throw new ApiError(400, "Friend ID is required");
  }

  // 2️⃣ Verify friendship in a single optimized lookup
  const isFriend = await Friendship.findOne({
    $or: [
      { user1: me, user2: friendId },
      { user1: friendId, user2: me },
    ],
  }).lean();

  if (!isFriend) {
    throw new ApiError(403, "You are not friends with this user");
  }

  // 3️⃣ Parse and sanitize pagination parameters
  const { page, limit, skip } = getPaginationParams(req.query);

  // 4️⃣ Define precise database queries matching respective schemas
  // Expenses: only those that involve both users and have been accepted
  const expenseQuery = {
    $or: [
      { paidBy: me, splits: { $elemMatch: { user: friendId, status: "accepted" } } },
      { paidBy: friendId, splits: { $elemMatch: { user: me, status: "accepted" } } },
    ],
  };

  // Settlements: accepted settlements between both users (mapped to from/to schema fields)
  const settlementQuery = {
    $or: [
      { from: me, to: friendId },
      { from: friendId, to: me },
    ],
    status: "accepted",
  };

  // 5️⃣ Run document counts in parallel for optimal pagination metadata
  const [expenseCount, settlementCount] = await Promise.all([
    Expense.countDocuments(expenseQuery),
    Settlement.countDocuments(settlementQuery),
  ]);

  const totalItems = expenseCount + settlementCount;

  // 6️⃣ Batch fetch recent items up to the required offset limit in parallel
  // Incorporates pre-population and .lean() for superior read latency
  const fetchLimit = skip + limit;

  const [expenses, settlements] = await Promise.all([
    Expense.find(expenseQuery)
      .sort({ date: -1, createdAt: -1 })
      .limit(fetchLimit)
      .populate("paidBy", "name username")
      .populate("splits.user", "name username")
      .lean(),
    Settlement.find(settlementQuery)
      .sort({ createdAt: -1 })
      .limit(fetchLimit)
      .populate("from to", "name username")
      .lean(),
  ]);

  // 7️⃣ Merge into a single chronological activity stream in memory
  const history = [];

  expenses.forEach((expense) => {
    history.push({
      _id: expense._id,
      date: expense.date || expense.createdAt,
      type: "expense",
      description: expense.description || "Expense",
      amount: expense.totalAmount, // Fix: Use correct schema totalAmount field
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
      from: settlement.from, // Fix: Use correct from/to fields
      to: settlement.to,
      createdAt: settlement.createdAt,
    });
  });

  // 8️⃣ Sort the combined activities by date descending
  history.sort((a, b) => new Date(b.date) - new Date(a.date));

  // 9️⃣ Extract exact page slice and build paginated envelope
  const paginatedData = history.slice(skip, skip + limit);
  const meta = buildPaginationMeta(totalItems, page, limit);

  res.status(200).json(buildPaginatedResponse(paginatedData, meta));
});


