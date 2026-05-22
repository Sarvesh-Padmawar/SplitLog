import User from "../models/User.model.js";
import FriendRequest from "../models/FriendRequest.model.js";
import Friendship from "../models/Friendship.model.js";
import Notification from "../models/Notification.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { getPaginationParams, buildPaginationMeta, buildPaginatedResponse } from "../utils/pagination.js";

/* ================= SEARCH USER ================= */
export const searchUserByUsername = async (req, res) => {
  try {
    const currentUserId = req.user; // from auth middleware
    const { username } = req.params;

    // 1️⃣ find user by username
    const user = await User.findOne({ username }).select(
      "_id name username email"
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // ❌ cannot search yourself
    if (user._id.toString() === currentUserId) {
      return res.status(400).json({ message: "You cannot add yourself" });
    }

    // 2️⃣ check if already friends
    const isFriend = await Friendship.findOne({
      $or: [
        { user1: currentUserId, user2: user._id },
        { user1: user._id, user2: currentUserId },
      ],
    });

    if (isFriend) {
      return res.status(400).json({ message: "Already friends" });
    }

    // 3️⃣ check if request already exists
    const requestExists = await FriendRequest.findOne({
      $or: [
        { from: currentUserId, to: user._id }
      ],
      status: "pending",
    });

    if (requestExists) {
      return res
        .status(400)
        .json({ message: "Friend request already exists" });
    }

    // 4️⃣ return user if all checks pass
    res.status(200).json(user);
  } catch (error) {
    console.error("Error searching user:", error);
    res.status(500).json({ message: error.message });
  }
};


/* ================= SEND FRIEND REQUEST ================= */
export const sendFriendRequest = async (req, res) => {
  try {
    const fromUserId = req.user; // logged-in user
    const { toUserId } = req.body;

    if (!toUserId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    // ❌ cannot send request to yourself
    if (fromUserId === toUserId) {
      return res.status(400).json({ message: "Cannot send request to yourself" });
    }

    // 1️⃣ check if already friends
    const alreadyFriends = await Friendship.findOne({
      $or: [
        { user1: fromUserId, user2: toUserId },
        { user1: toUserId, user2: fromUserId },
      ],
    });

    if (alreadyFriends) {
      return res.status(400).json({ message: "Already friends" });
    }

    // 2️⃣ check if request already exists
    const requestExists = await FriendRequest.findOne({
      $or: [
        { from: fromUserId, to: toUserId },
        { from: toUserId, to: fromUserId },
      ],
      status: "pending",
    });

    if (requestExists) {
      return res
        .status(400)
        .json({ message: "Friend request already exists" });
    }

    // 3️⃣ create request
    await FriendRequest.create({
      from: fromUserId,
      to: toUserId,
    });

    res.status(201).json({ message: "Friend request sent" });
  } catch (error) {
    console.error("Error sending request:", error);
    res.status(500).json({ message: error.message });
  }
};


/* ================= GET PENDING REQUESTS ================= */
export const getPendingRequests = asyncHandler(async (req, res) => {
  const userId = req.user;
  const { page, limit, skip } = getPaginationParams(req.query);

  const query = {
    to: userId,
    status: "pending",
  };

  const totalItems = await FriendRequest.countDocuments(query);

  const requests = await FriendRequest.find(query)
    .populate("from", "name username") // 🔴 IMPORTANT
    .select("_id from")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  // map to frontend-friendly shape
  const formatted = requests.map((req) => ({
    _id: req._id,
    name: req.from.name,
    username: req.from.username,
  }));

  const meta = buildPaginationMeta(totalItems, page, limit);

  res.status(200).json(buildPaginatedResponse(formatted, meta));
});


/* ================= ACCEPT FRIEND REQUEST ================= */
export const acceptFriendRequest = async (req, res) => {
  try {
    const userId = req.user;
    const { requestId } = req.body;

    const request = await FriendRequest.findOne({
      _id: requestId,
      to: userId,
      status: "pending",
    });

    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }

    // create friendship
    await Friendship.create({
      user1: request.from,
      user2: userId,
    });

    // delete request
    await FriendRequest.findByIdAndDelete(requestId);

    res.status(200).json({ message: "Friend request accepted" });
  } catch (error) {
    console.error("Error accepting request:", error);
    res.status(500).json({ message: error.message });
  }
};


/* ================= REJECT FRIEND REQUEST ================= */
export const rejectFriendRequest = async (req, res) => {
  try {
    const userId = req.user;
    const { requestId } = req.body;

    const request = await FriendRequest.findOne({
      _id: requestId,
      to: userId,
      status: "pending",
    });

    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }

    await FriendRequest.findByIdAndDelete(requestId);

    // Notify the person who sent the friend request that it was rejected
    const rejecter = await User.findById(userId).select("name");
    await Notification.create({
      recipient: request.from,
      sender: userId,
      type: "friend_rejected",
      message: `${rejecter?.name || "Someone"} rejected your friend request.`,
    });

    res.status(200).json({ message: "Friend request rejected" });
  } catch (error) {
    console.error("Error rejecting request:", error);
    res.status(500).json({ message: error.message });
  }
};


export const listFriends = asyncHandler(async (req, res) => {
  const userId = req.user;
  const { page, limit, skip } = getPaginationParams(req.query);

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
    if (friendship.user1._id.toString() === userId) {
      return friendship.user2;
    }
    return friendship.user1;
  });

  const meta = buildPaginationMeta(totalItems, page, limit);

  res.status(200).json(buildPaginatedResponse(friends, meta));
});