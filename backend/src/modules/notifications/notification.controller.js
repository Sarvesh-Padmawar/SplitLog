import * as notificationService from "./notification.service.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { validateSettlementResponseInput } from "./notification.validators.js";

/**
 * Controller endpoint to retrieve paginated user notifications.
 */
export const getNotifications = asyncHandler(async (req, res) => {
  const userId = req.user;

  const result = await notificationService.fetchNotificationsList({
    userId,
    queryParams: req.query,
  });

  return res.status(200).json(result);
});

/**
 * Controller endpoint to mark a single notification as read.
 */
export const markAsRead = asyncHandler(async (req, res) => {
  const userId = req.user;
  const { id } = req.params;

  const notification = await notificationService.updateNotificationRead({
    userId,
    notificationId: id,
  });

  return res.status(200).json({
    message: "Marked as read",
    notification,
  });
});

/**
 * Controller endpoint to mark all user notifications as read.
 */
export const markAllAsRead = asyncHandler(async (req, res) => {
  const userId = req.user;

  await notificationService.updateAllNotificationsRead({
    userId,
  });

  return res.status(200).json({
    message: "All notifications marked as read",
  });
});

/**
 * Controller endpoint to respond to a settlement request via notification.
 */
export const respondToSettlement = asyncHandler(async (req, res) => {
  const userId = req.user.toString();
  const { id } = req.params;

  const validation = validateSettlementResponseInput(req.body);
  if (validation.error) {
    return res.status(400).json({ message: validation.error });
  }

  const { status } = req.body;

  const settlement = await notificationService.processSettlementResponse({
    userId,
    notificationId: id,
    status,
  });

  return res.status(200).json({
    message: `Settlement ${status} successfully`,
    settlement,
  });
});
