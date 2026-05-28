import * as historyService from "./history.service.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { validateGetHistoryInput } from "./history.validators.js";

/**
 * Controller endpoint to retrieve paginated unified expense and settlement history with a friend.
 */
export const getExpenseHistoryWithFriend = asyncHandler(async (req, res) => {
  const userId = req.user;
  const { friendId } = req.params;

  const validation = validateGetHistoryInput({ friendId });
  if (validation.error) {
    return res.status(400).json({ message: validation.error });
  }

  const response = await historyService.fetchExpenseHistoryWithFriend({
    userId,
    friendId,
    queryParams: req.query,
  });

  return res.status(200).json(response);
});
