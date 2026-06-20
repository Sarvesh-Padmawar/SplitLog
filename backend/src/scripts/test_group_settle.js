import mongoose from "mongoose";
import dotenv from "dotenv";
import Group from "../models/Group.model.js";
import User from "../models/User.model.js";
import Expense from "../models/Expense.model.js";
import Settlement from "../models/Settlement.model.js";
import Notification from "../models/Notification.model.js";
import * as groupService from "../modules/group/group.service.js";

dotenv.config();

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB.");

    // Create test users
    const creditor = await User.create({
      name: "Creditor User",
      username: `creditor_${Date.now()}`,
      email: `creditor_${Date.now()}@test.com`,
      isVerified: true,
    });

    const debtor = await User.create({
      name: "Debtor User",
      username: `debtor_${Date.now()}`,
      email: `debtor_${Date.now()}@test.com`,
      isVerified: true,
    });

    const stranger = await User.create({
      name: "Stranger User",
      username: `stranger_${Date.now()}`,
      email: `stranger_${Date.now()}@test.com`,
      isVerified: true,
    });

    // Create group
    const group = await Group.create({
      name: "Test Group Settle Up",
      createdBy: creditor._id,
      members: [creditor._id, debtor._id],
    });

    console.log(`Created group: ${group.name} (${group._id})`);

    // Create an expense where creditor paid ₹300, split 50/50.
    // So debtor owes creditor ₹150.
    const expense = await Expense.create({
      paidBy: creditor._id,
      totalAmount: 300,
      group: group._id,
      description: "Group Dinner",
      splits: [
        { user: creditor._id, amount: 150, status: "accepted" },
        { user: debtor._id, amount: 150, status: "accepted" },
      ],
    });

    // 1. Verify balances show debtor owes creditor ₹150
    let balances = await groupService.calculateGroupBalances(debtor._id, group._id);
    let recommendation = balances.settlements.find(
      (s) => s.from._id.toString() === debtor._id.toString() && s.to._id.toString() === creditor._id.toString()
    );

    if (recommendation && recommendation.amount === 150) {
      console.log("✅ Initial balance calculation correct: debtor owes ₹150.");
    } else {
      console.error("❌ Test Failed: Initial balance incorrect:", recommendation);
      process.exit(1);
    }

    // 2. Stranger tries to settle in this group
    try {
      await groupService.settleUpGroup(stranger._id, group._id, { toUserId: creditor._id, amount: 50 });
      console.error("❌ Test Failed: Stranger was allowed to settle in a group.");
      process.exit(1);
    } catch (err) {
      if (err.message.includes("Both users must be members of the group")) {
        console.log("✅ Test Passed: Stranger settlement blocked correctly.");
      } else {
        console.error("❌ Test Failed with unexpected error: ", err.message);
        process.exit(1);
      }
    }

    // 3. Debtor tries to settle with someone they don't owe (e.g. stranger)
    try {
      await groupService.settleUpGroup(debtor._id, group._id, { toUserId: stranger._id, amount: 50 });
      console.error("❌ Test Failed: Debtor was allowed to settle with someone they don't owe.");
      process.exit(1);
    } catch (err) {
      if (err.message.includes("Both users must be members of the group")) {
        console.log("✅ Test Passed: Debtor settlement with stranger blocked correctly.");
      } else {
        console.error("❌ Test Failed with unexpected error: ", err.message);
        process.exit(1);
      }
    }

    // 4. Debtor tries to settle MORE than they owe (₹151 when they owe ₹150)
    try {
      await groupService.settleUpGroup(debtor._id, group._id, { toUserId: creditor._id, amount: 151 });
      console.error("❌ Test Failed: Debtor was allowed to overpay.");
      process.exit(1);
    } catch (err) {
      if (err.message.includes("exceeds outstanding debt")) {
        console.log("✅ Test Passed: Overpayment blocked correctly.");
      } else {
        console.error("❌ Test Failed with unexpected error: ", err.message);
        process.exit(1);
      }
    }

    // 5. Debtor settles partial amount (₹100)
    const settlement = await groupService.settleUpGroup(debtor._id, group._id, { toUserId: creditor._id, amount: 100 });
    if (settlement && settlement.status === "pending" && settlement.group.toString() === group._id.toString()) {
      console.log("✅ Test Passed: Pending group settlement created correctly.");
    } else {
      console.error("❌ Test Failed: Pending group settlement creation failed:", settlement);
      process.exit(1);
    }

    // Check notification for creator
    const notif = await Notification.findOne({
      recipient: creditor._id,
      sender: debtor._id,
      settlement: settlement._id,
      type: "settlement_request",
    });
    if (notif && notif.message.includes("sent you a group settlement request")) {
      console.log("✅ Test Passed: Settlement request notification created.");
    } else {
      console.error("❌ Test Failed: Notification not found or incorrect.");
      process.exit(1);
    }

    // 6. Recalculate balances: since the settlement is still pending, balances/recommendations should NOT change.
    balances = await groupService.calculateGroupBalances(debtor._id, group._id);
    recommendation = balances.settlements.find(
      (s) => s.from._id.toString() === debtor._id.toString() && s.to._id.toString() === creditor._id.toString()
    );
    if (recommendation && recommendation.amount === 150) {
      console.log("✅ Test Passed: Pending settlement does not affect balance calculations.");
    } else {
      console.error("❌ Test Failed: Pending settlement affected balances:", recommendation);
      process.exit(1);
    }

    // 7. Accept the settlement
    settlement.status = "accepted";
    await settlement.save();
    console.log("Accepted settlement.");

    // 8. Recalculate balances: debtor should now owe ₹50 (₹150 - ₹100)
    balances = await groupService.calculateGroupBalances(debtor._id, group._id);
    recommendation = balances.settlements.find(
      (s) => s.from._id.toString() === debtor._id.toString() && s.to._id.toString() === creditor._id.toString()
    );
    if (recommendation && recommendation.amount === 50) {
      console.log("✅ Test Passed: Accepted settlement updated balances correctly. Debtor now owes ₹50.");
    } else {
      console.error("❌ Test Failed: Balance not updated correctly after acceptance:", recommendation);
      process.exit(1);
    }

    // 9. Debtor settles remaining ₹50
    const finalSettlement = await groupService.settleUpGroup(debtor._id, group._id, { toUserId: creditor._id, amount: 50 });
    finalSettlement.status = "accepted";
    await finalSettlement.save();
    console.log("Accepted final settlement.");

    // 10. Recalculate balances: debtor should owe ₹0 and recommendation should be empty
    balances = await groupService.calculateGroupBalances(debtor._id, group._id);
    recommendation = balances.settlements.find(
      (s) => s.from._id.toString() === debtor._id.toString() && s.to._id.toString() === creditor._id.toString()
    );
    if (!recommendation) {
      console.log("✅ Test Passed: Recommendation dropped after full settlement.");
    } else {
      console.error("❌ Test Failed: Recommendation list still contains settled pair:", recommendation);
      process.exit(1);
    }

    // Cleanup
    await Group.deleteOne({ _id: group._id });
    await Expense.deleteOne({ _id: expense._id });
    await Settlement.deleteMany({ _id: { $in: [settlement._id, finalSettlement._id] } });
    await Notification.deleteMany({ sender: debtor._id });
    await User.deleteMany({ _id: { $in: [creditor._id, debtor._id, stranger._id] } });

    console.log("Database cleaned. All tests passed successfully!");
    process.exit(0);
  } catch (err) {
    console.error("❌ Unexpected test crash:", err);
    process.exit(1);
  }
};

run();
