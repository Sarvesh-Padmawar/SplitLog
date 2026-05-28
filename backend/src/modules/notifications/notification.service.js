import Notification from "../../models/Notification.model.js";
import Settlement from "../../models/Settlement.model.js";
import {
  getPaginationParams,
  buildPaginationMeta,
  buildPaginatedResponse,
} from "../../utils/pagination.js";
import { ApiError } from "../../utils/ApiError.js";

/**
 * Fetches the paginated list of notifications and aggregates total unread badge counts.
 */
export const fetchNotificationsList = async ({ userId, queryParams }) => {
  const { page, limit, skip } = getPaginationParams(queryParams);

  const query = { recipient: userId };

  const totalItems = await Notification.countDocuments(query);

  const notifications = await Notification.find(query)
    .populate("sender", "name username")
    .populate("expense", "totalAmount description category")
    .populate("settlement", "amount status from to")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const unreadCount = await Notification.countDocuments({
    recipient: userId,
    read: false,
  });

  const meta = buildPaginationMeta(totalItems, page, limit);
  const response = buildPaginatedResponse(notifications, meta);

  return {
    ...response,
    unreadCount,
  };
};

/**
 * Marks a single notification as read.
 */
export const updateNotificationRead = async ({ userId, notificationId }) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: notificationId, recipient: userId },
    { read: true },
    { new: true }
  );

  if (!notification) {
    throw new ApiError(404, "Notification not found");
  }

  return notification;
};

/**
 * Marks all unread notifications of the user as read.
 */
export const updateAllNotificationsRead = async ({ userId }) => {
  await Notification.updateMany(
    { recipient: userId, read: false },
    { read: true }
  );

  return { success: true };
};

/**
 * Atomically responds to a settlement request from within a notification.
 * Mutates both Settlement status and Notification read state.
 */
export const processSettlementResponse = async ({ userId, notificationId, status }) => {
  if (!["accepted", "rejected"].includes(status)) {
    throw new ApiError(400, "Status must be either accepted or rejected");
  }

  // Find the pending notification
  const notification = await Notification.findOne({
    _id: notificationId,
    recipient: userId,
    type: "settlement_request",
  });

  if (!notification) {
    throw new ApiError(404, "Notification not found");
  }

  if (notification.read) {
    throw new ApiError(400, "Already responded");
  }

  // Find and update the settlement
  const settlement = await Settlement.findById(notification.settlement);
  if (!settlement) {
    throw new ApiError(404, "Settlement not found");
  }

  if (settlement.status !== "pending") {
    throw new ApiError(400, `Settlement already ${settlement.status}`);
  }

  // Update settlement status
  settlement.status = status;
  await settlement.save();

  // Mark notification as read
  notification.read = true;
  await notification.save();

  return settlement;
};
