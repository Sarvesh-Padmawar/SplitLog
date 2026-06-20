import mongoose from "mongoose";
import dotenv from "dotenv";
import Group from "../models/Group.model.js";
import User from "../models/User.model.js";
import Expense from "../models/Expense.model.js";
import Notification from "../models/Notification.model.js";
import * as groupService from "../modules/group/group.service.js";

dotenv.config();

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB.");

    // Create test users
    const creator = await User.create({
      name: "Creator",
      username: `creator_${Date.now()}`,
      email: `creator_${Date.now()}@test.com`,
      isVerified: true,
    });

    const member1 = await User.create({
      name: "Member 1",
      username: `member1_${Date.now()}`,
      email: `member1_${Date.now()}@test.com`,
      isVerified: true,
    });

    const member2 = await User.create({
      name: "Member 2",
      username: `member2_${Date.now()}`,
      email: `member2_${Date.now()}@test.com`,
      isVerified: true,
    });

    // Create test group
    const group = await Group.create({
      name: "Test Leave Group",
      createdBy: creator._id,
      members: [creator._id, member1._id, member2._id],
    });

    console.log(`Created group: ${group.name} (${group._id})`);

    // 1. Creator attempts to leave
    try {
      await groupService.leaveGroup(creator._id, group._id);
      console.error("❌ Test Failed: Creator was allowed to leave.");
      process.exit(1);
    } catch (err) {
      if (err.message.includes("As the group creator, you cannot leave")) {
        console.log("✅ Test Passed: Creator leaving blocked correctly.");
      } else {
        console.error("❌ Test Failed with unexpected error: ", err.message);
        process.exit(1);
      }
    }

    // 2. Member 1 tries to leave with non-zero balance
    // Let's create an expense in the group where creator paid ₹300, split between creator, member1, member2 (₹100 each)
    const expense = await Expense.create({
      paidBy: creator._id,
      totalAmount: 300,
      group: group._id,
      description: "Test Pizza",
      splits: [
        { user: creator._id, amount: 100, status: "accepted" },
        { user: member1._id, amount: 100, status: "accepted" },
        { user: member2._id, amount: 100, status: "accepted" },
      ],
    });

    try {
      await groupService.leaveGroup(member1._id, group._id);
      console.error("❌ Test Failed: Member with non-zero balance was allowed to leave.");
      process.exit(1);
    } catch (err) {
      if (err.message.includes("You cannot leave the group because you have an outstanding balance")) {
        console.log("✅ Test Passed: Member leaving with non-zero balance blocked correctly.");
      } else {
        console.error("❌ Test Failed with unexpected error: ", err.message);
        process.exit(1);
      }
    }

    // 3. Member 1 gets settled up (net balance 0)
    // Delete the expense so that the balance goes back to 0
    await Expense.deleteOne({ _id: expense._id });

    // Try leaving now
    const leaveResult = await groupService.leaveGroup(member1._id, group._id);
    if (leaveResult.success) {
      console.log("✅ Test Passed: Member with zero balance successfully left the group.");

      // Check Group document
      const updatedGroup = await Group.findById(group._id);
      const isStillMember = updatedGroup.members.some(m => m.toString() === member1._id.toString());
      if (!isStillMember) {
        console.log("✅ Test Passed: Member was removed from the database members array.");
      } else {
        console.error("❌ Test Failed: Member is still in the members array.");
        process.exit(1);
      }

      // Check Notification
      const notif = await Notification.findOne({
        recipient: creator._id,
        sender: member1._id,
        type: "group_removed",
      });
      if (notif && notif.message.includes("voluntarily left the group")) {
        console.log("✅ Test Passed: Notification created for the group creator.");
      } else {
        console.error("❌ Test Failed: Notification not found or has incorrect format.");
        process.exit(1);
      }
    } else {
      console.error("❌ Test Failed: Member with zero balance could not leave.");
      process.exit(1);
    }

    // Cleanup
    await Group.deleteOne({ _id: group._id });
    await User.deleteMany({ _id: { $in: [creator._id, member1._id, member2._id] } });
    await Notification.deleteMany({ sender: member1._id });

    console.log("Database cleaned. All tests passed successfully!");
    process.exit(0);
  } catch (err) {
    console.error("❌ Unexpected test crash:", err);
    process.exit(1);
  }
};

run();
