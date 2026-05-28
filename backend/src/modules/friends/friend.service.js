import User from "../../models/User.model.js";
import FriendRequest from "../../models/FriendRequest.model.js";
import Friendship from "../../models/Friendship.model.js";
import Notification from "../../models/Notification.model.js";
import {
  getPaginationParams,
  buildPaginationMeta,
  buildPaginatedResponse,
} from "../../utils/pagination.js";
import { ApiError } from "../../utils/ApiError.js";

/**
 * Searches a user profile by username. Validates search conditions.
 */
export const findUserByUsername = async ({ currentUserId, username }) => {
  const user = await User.findOne({ username }).select("_id name username email");

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  if (user._id.toString() === currentUserId.toString()) {
    throw new ApiError(400, "You cannot add yourself");
  }

  // Check if already friends
  const isFriend = await Friendship.findOne({
    $or: [
      { user1: currentUserId, user2: user._id },
      { user1: user._id, user2: currentUserId },
    ],
  });

  if (isFriend) {
    throw new ApiError(400, "Already friends");
  }

  // Check if active pending request exists from searcher
  const requestExists = await FriendRequest.findOne({
    from: currentUserId,
    to: user._id,
    status: "pending",
  });

  if (requestExists) {
    throw new ApiError(400, "Friend request already exists");
  }

  return user;
};

/**
 * Initiates/Sends a new friend request.
 */
export const initiateFriendRequest = async ({ fromUserId, toUserId }) => {
  if (fromUserId.toString() === toUserId.toString()) {
    throw new ApiError(400, "Cannot send request to yourself");
  }

  // Check if already friends
  const alreadyFriends = await Friendship.findOne({
    $or: [
      { user1: fromUserId, user2: toUserId },
      { user1: toUserId, user2: fromUserId },
    ],
  });

  if (alreadyFriends) {
    throw new ApiError(400, "Already friends");
  }

  // Check if request already exists (either direction)
  const requestExists = await FriendRequest.findOne({
    $or: [
      { from: fromUserId, to: toUserId },
      { from: toUserId, to: fromUserId },
    ],
    status: "pending",
  });

  if (requestExists) {
    throw new ApiError(400, "Friend request already exists");
  }

  const request = await FriendRequest.create({
    from: fromUserId,
    to: toUserId,
  });

  return request;
};

/**
 * Fetches the paginated list of pending friend requests.
 */
export const fetchPendingInvitations = async ({ userId, queryParams }) => {
  const { page, limit, skip } = getPaginationParams(queryParams);

  const query = {
    to: userId,
    status: "pending",
  };

  const totalItems = await FriendRequest.countDocuments(query);

  const requests = await FriendRequest.find(query)
    .populate("from", "name username")
    .select("_id from")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  // Map to frontend shape
  const formatted = requests.map((req) => ({
    _id: req._id,
    name: req.from.name,
    username: req.from.username,
  }));

  const meta = buildPaginationMeta(totalItems, page, limit);
  return buildPaginatedResponse(formatted, meta);
};

/**
 * Approves a pending friend request and establishes a bidirectional friendship.
 */
export const approveFriendship = async ({ userId, requestId }) => {
  const request = await FriendRequest.findOne({
    _id: requestId,
    to: userId,
    status: "pending",
  });

  if (!request) {
    throw new ApiError(404, "Request not found");
  }

  // Create Friendship
  const friendship = await Friendship.create({
    user1: request.from,
    user2: userId,
  });

  // Delete Request
  await FriendRequest.findByIdAndDelete(requestId);

  return friendship;
};

/**
 * Declines a pending friend request and dispatches a rejection notification.
 */
export const declineFriendship = async ({ userId, requestId }) => {
  const request = await FriendRequest.findOne({
    _id: requestId,
    to: userId,
    status: "pending",
  });

  if (!request) {
    throw new ApiError(404, "Request not found");
  }

  // Delete Request
  await FriendRequest.findByIdAndDelete(requestId);

  // Dispatch rejection notification
  try {
    const rejecter = await User.findById(userId).select("name");
    await Notification.create({
      recipient: request.from,
      sender: userId,
      type: "friend_rejected",
      message: `${rejecter?.name || "Someone"} rejected your friend request.`,
    });
  } catch (notifErr) {
    console.error("Failed to send friend rejection notification:", notifErr.message);
  }

  return { success: true };
};

/**
 * Fetches the paginated list of friends.
 */
export const fetchFriendsList = async ({ userId, queryParams }) => {
  const { page, limit, skip } = getPaginationParams(queryParams);

  const query = {
    $or: [{ user1: userId }, { user2: userId }],
  };

  const totalItems = await Friendship.countDocuments(query);

  const friendships = await Friendship.find(query)
    .populate("user1", "name username email")
    .populate("user2", "name username email")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const friends = friendships.map((friendship) => {
    if (friendship.user1._id.toString() === userId.toString()) {
      return friendship.user2;
    }
    return friendship.user1;
  });

  const meta = buildPaginationMeta(totalItems, page, limit);
  return buildPaginatedResponse(friends, meta);
};
