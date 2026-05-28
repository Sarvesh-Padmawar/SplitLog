import * as friendService from "./friend.service.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import {
  validateSendRequestInput,
  validateActionRequestInput,
} from "./friend.validators.js";

/**
 * Controller endpoint to search a user profile by username.
 */
export const searchUserByUsername = asyncHandler(async (req, res) => {
  const currentUserId = req.user;
  const { username } = req.params;

  if (!username) {
    return res.status(400).json({ message: "Username is required" });
  }

  const user = await friendService.findUserByUsername({
    currentUserId,
    username,
  });

  return res.status(200).json(user);
});

/**
 * Controller endpoint to send/initiate a friend request.
 */
export const sendFriendRequest = asyncHandler(async (req, res) => {
  const fromUserId = req.user;
  const validation = validateSendRequestInput(req.body);
  if (validation.error) {
    return res.status(400).json({ message: validation.error });
  }

  const { toUserId } = req.body;

  await friendService.initiateFriendRequest({
    fromUserId,
    toUserId,
  });

  return res.status(201).json({ message: "Friend request sent" });
});

/**
 * Controller endpoint to retrieve paginated pending invitations.
 */
export const getPendingRequests = asyncHandler(async (req, res) => {
  const userId = req.user;

  const response = await friendService.fetchPendingInvitations({
    userId,
    queryParams: req.query,
  });

  return res.status(200).json(response);
});

/**
 * Controller endpoint to accept a pending friend invitation.
 */
export const acceptFriendRequest = asyncHandler(async (req, res) => {
  const userId = req.user;
  const validation = validateActionRequestInput(req.body);
  if (validation.error) {
    return res.status(400).json({ message: validation.error });
  }

  const { requestId } = req.body;

  await friendService.approveFriendship({
    userId,
    requestId,
  });

  return res.status(200).json({ message: "Friend request accepted" });
});

/**
 * Controller endpoint to reject a pending friend invitation.
 */
export const rejectFriendRequest = asyncHandler(async (req, res) => {
  const userId = req.user;
  const validation = validateActionRequestInput(req.body);
  if (validation.error) {
    return res.status(400).json({ message: validation.error });
  }

  const { requestId } = req.body;

  await friendService.declineFriendship({
    userId,
    requestId,
  });

  return res.status(200).json({ message: "Friend request rejected" });
});

/**
 * Controller endpoint to list paginated friends list.
 */
export const listFriends = asyncHandler(async (req, res) => {
  const userId = req.user;

  const response = await friendService.fetchFriendsList({
    userId,
    queryParams: req.query,
  });

  return res.status(200).json(response);
});
