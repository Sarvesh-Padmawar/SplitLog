import dotenv from "dotenv";
import mongoose from "mongoose";
import * as friendService from "../modules/friends/friend.service.js";
import * as expenseService from "../modules/expenses/expense.service.js";
import * as groupService from "../modules/group/group.service.js";
import * as notificationService from "../modules/notifications/notification.service.js";
import Group from "../models/Group.model.js";
import User from "../models/User.model.js";
import Expense from "../models/Expense.model.js";
import Notification from "../models/Notification.model.js";
import FriendRequest from "../models/FriendRequest.model.js";
import Friendship from "../models/Friendship.model.js";

dotenv.config();

const runTests = async () => {
  const notificationsToCleanup = [];
  let tempFriendship = null;
  let tempGroup = null;
  let tempExpense = null;

  try {
    console.log("[TestNotifications] Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGO_URI);
    console.log("[TestNotifications] Connected to MongoDB.");

    // Retrieve two active users
    const users = await User.find({}).limit(2);
    if (users.length < 2) {
      console.error("[TestNotifications] Error: Need at least 2 users in the database to run tests.");
      process.exit(1);
    }
    const userA = users[0];
    const userB = users[1];
    console.log(`User A: ${userA.name} (${userA._id})`);
    console.log(`User B: ${userB.name} (${userB._id})`);

    // Clean up any existing pending friend requests or friendships between them
    await FriendRequest.deleteMany({
      $or: [
        { from: userA._id, to: userB._id },
        { from: userB._id, to: userA._id }
      ]
    });
    await Friendship.deleteMany({
      $or: [
        { user1: userA._id, user2: userB._id },
        { user1: userB._id, user2: userA._id }
      ]
    });

    // 1. Friend Request Received
    console.log("\n--- TEST 1: Send Friend Request (received notification) ---");
    const freq = await friendService.initiateFriendRequest({
      fromUserId: userA._id,
      toUserId: userB._id
    });
    
    // Find created notification
    const notifReceived = await Notification.findOne({
      recipient: userB._id,
      sender: userA._id,
      type: "friend_request_received"
    });
    if (!notifReceived) throw new Error("friend_request_received notification not generated");
    console.log(`[SUCCESS] Notification generated: "${notifReceived.message}" (type: ${notifReceived.type})`);
    notificationsToCleanup.push(notifReceived._id);

    // 2. Friend Request Accepted
    console.log("\n--- TEST 2: Accept Friend Request (accepted notification) ---");
    tempFriendship = await friendService.approveFriendship({
      userId: userB._id,
      requestId: freq._id
    });
    const notifAccepted = await Notification.findOne({
      recipient: userA._id,
      sender: userB._id,
      type: "friend_request_accepted"
    });
    if (!notifAccepted) throw new Error("friend_request_accepted notification not generated");
    console.log(`[SUCCESS] Notification generated: "${notifAccepted.message}" (type: ${notifAccepted.type})`);
    notificationsToCleanup.push(notifAccepted._id);

    // 3. Add to Group
    console.log("\n--- TEST 3: Add Member to Group (group_added notification) ---");
    tempGroup = await Group.create({
      name: "Notification Test Group",
      createdBy: userA._id,
      members: [userA._id]
    });
    await groupService.addMember(userA._id, tempGroup._id, userB._id);
    const notifAdded = await Notification.findOne({
      recipient: userB._id,
      sender: userA._id,
      type: "group_added"
    });
    if (!notifAdded) throw new Error("group_added notification not generated");
    console.log(`[SUCCESS] Notification generated: "${notifAdded.message}" (type: ${notifAdded.type})`);
    notificationsToCleanup.push(notifAdded._id);

    // 4. Update Group Details
    console.log("\n--- TEST 4: Update Group (group_updated notification) ---");
    await groupService.updateGroup(userA._id, tempGroup._id, {
      name: "Notification Test Group V2"
    });
    const notifUpdated = await Notification.findOne({
      recipient: userB._id,
      sender: userA._id,
      type: "group_updated"
    });
    if (!notifUpdated) throw new Error("group_updated notification not generated");
    console.log(`[SUCCESS] Notification generated: "${notifUpdated.message}" (type: ${notifUpdated.type})`);
    notificationsToCleanup.push(notifUpdated._id);

    // 5. Remove Member from Group
    console.log("\n--- TEST 5: Remove Member from Group (group_removed notification) ---");
    await groupService.removeMember(userA._id, tempGroup._id, userB._id);
    const notifRemoved = await Notification.findOne({
      recipient: userB._id,
      sender: userA._id,
      type: "group_removed"
    });
    if (!notifRemoved) throw new Error("group_removed notification not generated");
    console.log(`[SUCCESS] Notification generated: "${notifRemoved.message}" (type: ${notifRemoved.type})`);
    notificationsToCleanup.push(notifRemoved._id);

    // Re-add userB to group to create a group expense
    await Group.updateOne({ _id: tempGroup._id }, { $push: { members: userB._id } });

    // 6. Expense Updated & Deleted
    console.log("\n--- TEST 6: Update & Delete Expense (expense_updated & expense_deleted notifications) ---");
    tempExpense = await groupService.createGroupExpense(userA._id, tempGroup._id, {
      totalAmount: 150,
      description: "Group Dinner",
      category: "food",
      splits: [
        { user: userA._id.toString(), amount: 50 },
        { user: userB._id.toString(), amount: 100 }
      ]
    });
    // Find split_request_pending notification
    const splitNotif = await Notification.findOne({ expense: tempExpense._id, type: "split_request_pending" });
    if (splitNotif) notificationsToCleanup.push(splitNotif._id);

    // Edit the expense
    await expenseService.updateExpense({
      userId: userA._id,
      expenseId: tempExpense._id,
      totalAmount: 180,
      description: "Group Dinner & Dessert",
      splits: [
        { user: userB._id.toString(), amount: 120 }
      ]
    });
    const notifExpUpdated = await Notification.findOne({
      recipient: userB._id,
      sender: userA._id,
      type: "expense_updated"
    });
    if (!notifExpUpdated) throw new Error("expense_updated notification not generated");
    console.log(`[SUCCESS] Notification generated: "${notifExpUpdated.message}" (type: ${notifExpUpdated.type})`);
    notificationsToCleanup.push(notifExpUpdated._id);

    // Delete the expense
    await expenseService.removeExpense({
      userId: userA._id,
      expenseId: tempExpense._id
    });
    const notifExpDeleted = await Notification.findOne({
      recipient: userB._id,
      sender: userA._id,
      type: "expense_deleted"
    });
    if (!notifExpDeleted) throw new Error("expense_deleted notification not generated");
    console.log(`[SUCCESS] Notification generated: "${notifExpDeleted.message}" (type: ${notifExpDeleted.type})`);
    notificationsToCleanup.push(notifExpDeleted._id);

    // 7. Notification Read Status Mutations
    console.log("\n--- TEST 7: Notification Read/Unread State & Pagination ---");
    const listRes = await notificationService.fetchNotificationsList({
      userId: userB._id,
      queryParams: { page: 1, limit: 10 }
    });
    console.log(`[SUCCESS] Fetched notifications for User B. Count: ${listRes.items.length}, Unread Count: ${listRes.unreadCount}`);

    // Mark single as read
    const testNotifId = notifReceived._id;
    const readNotif = await notificationService.updateNotificationRead({
      userId: userB._id,
      notificationId: testNotifId
    });
    if (!readNotif.read) throw new Error("Failed to mark individual notification as read");
    console.log(`[SUCCESS] Marked notification ${testNotifId} as read.`);

    // Mark all as read
    await notificationService.updateAllNotificationsRead({ userId: userB._id });
    const listRes2 = await notificationService.fetchNotificationsList({
      userId: userB._id,
      queryParams: { page: 1, limit: 10 }
    });
    if (listRes2.unreadCount !== 0) throw new Error("Failed to mark all notifications as read");
    console.log(`[SUCCESS] Marked all notifications for User B as read. Unread Count: ${listRes2.unreadCount}`);

    console.log("\nAll programmatic notification tests passed successfully!");
    
  } catch (error) {
    console.error("[TestNotifications] Unexpected error during tests:", error);
  } finally {
    // CLEANUP
    console.log("\n--- Cleaning up test records ---");
    if (notificationsToCleanup.length > 0) {
      await Notification.deleteMany({ _id: { $in: notificationsToCleanup } });
      console.log(`Removed ${notificationsToCleanup.length} test notifications.`);
    }
    if (tempFriendship) {
      await Friendship.findByIdAndDelete(tempFriendship._id);
      console.log("Removed test friendship.");
    }
    if (tempGroup) {
      await Group.findByIdAndDelete(tempGroup._id);
      console.log("Removed test group.");
    }
    if (tempExpense) {
      // Clean up if not deleted
      await Expense.findByIdAndDelete(tempExpense._id);
    }
    await mongoose.disconnect();
    console.log("MongoDB disconnected.");
    process.exit(0);
  }
};

runTests();
