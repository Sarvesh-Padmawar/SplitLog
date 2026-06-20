import dotenv from "dotenv";
import mongoose from "mongoose";
import * as groupService from "../modules/group/group.service.js";
import * as expenseService from "../modules/expenses/expense.service.js";
import Group from "../models/Group.model.js";
import User from "../models/User.model.js";
import Expense from "../models/Expense.model.js";

dotenv.config();

const runTests = async () => {
  try {
    console.log("[TestGroupExpenses] Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGO_URI);
    console.log("[TestGroupExpenses] Connected to MongoDB.");

    // 1. Find a group with at least 2 members
    const group = await Group.findOne({ isActive: true }).populate("members");
    if (!group || group.members.length < 2) {
      console.error("[TestGroupExpenses] Error: Need an active group with at least 2 members to run tests.");
      process.exit(1);
    }

    const payer = group.members[0];
    const debtor = group.members[1];
    console.log(`[TestGroupExpenses] Using Group: "${group.name}" (${group._id})`);
    console.log(`[TestGroupExpenses] Payer: "${payer.name}" (${payer._id})`);
    console.log(`[TestGroupExpenses] Debtor: "${debtor.name}" (${debtor._id})`);

    // 2. Create a group expense
    console.log("\n--- TEST 1: Create Group Expense ---");
    const expensePayload = {
      totalAmount: 100,
      description: "Test Group Expense - Pizza",
      category: "food",
      splits: [
        { user: payer._id.toString(), amount: 40 },
        { user: debtor._id.toString(), amount: 60 }
      ]
    };

    const newExpense = await groupService.createGroupExpense(payer._id, group._id, expensePayload);
    console.log(`[SUCCESS] Group expense created successfully. ID: ${newExpense._id}`);
    console.log(`Total amount: ₹${newExpense.totalAmount}`);
    console.log("Splits:", newExpense.splits);

    // 3. Edit the group expense
    console.log("\n--- TEST 2: Edit Group Expense (payer editing) ---");
    const editPayload = {
      userId: payer._id,
      expenseId: newExpense._id,
      totalAmount: 120,
      description: "Test Group Expense - Pizza & Drinks",
      category: "food",
      splits: [
        { user: debtor._id.toString(), amount: 80 } // Payer share will be calculated as 120 - 80 = 40
      ]
    };

    const updatedExpense = await expenseService.updateExpense(editPayload);
    console.log(`[SUCCESS] Group expense updated successfully.`);
    console.log(`Updated amount: ₹${updatedExpense.totalAmount}`);
    console.log(`Updated description: "${updatedExpense.description}"`);
    console.log("Updated Splits (payer share automatically recalculated):", updatedExpense.splits);

    // 4. Unauthorized Edit (non-member editing)
    console.log("\n--- TEST 3: Unauthorized Edit (non-member) ---");
    // Create a temporary user not in the group
    const tempUser = await User.create({
      name: "Non Member",
      email: `temp_${Date.now()}@example.com`,
      username: `temp_${Date.now()}`,
      passwordHash: "dummy"
    });

    try {
      await expenseService.updateExpense({
        userId: tempUser._id,
        expenseId: newExpense._id,
        totalAmount: 150,
        splits: [{ user: debtor._id.toString(), amount: 50 }]
      });
      console.error("[FAIL] Unauthorized edit allowed!");
      process.exit(1);
    } catch (err) {
      console.log(`[SUCCESS] Unauthorized edit rejected correctly. Error: "${err.message}" (Status: ${err.status})`);
    }

    // 5. Unauthorized Delete (non-member)
    console.log("\n--- TEST 4: Unauthorized Delete (non-member) ---");
    try {
      await expenseService.removeExpense({
        userId: tempUser._id,
        expenseId: newExpense._id
      });
      console.error("[FAIL] Unauthorized delete allowed!");
      process.exit(1);
    } catch (err) {
      console.log(`[SUCCESS] Unauthorized delete rejected correctly. Error: "${err.message}" (Status: ${err.status})`);
    }

    // 6. Delete the group expense (payer deleting)
    console.log("\n--- TEST 5: Delete Group Expense (payer deleting) ---");
    const deleteResult = await expenseService.removeExpense({
      userId: payer._id,
      expenseId: newExpense._id
    });
    console.log(`[SUCCESS] Group expense deleted. Result:`, deleteResult);

    // Clean up temporary user
    await User.findByIdAndDelete(tempUser._id);
    console.log("[TestGroupExpenses] Cleanup complete.");

    console.log("\nAll programmatic tests passed successfully!");
    process.exit(0);

  } catch (error) {
    console.error("[TestGroupExpenses] Unexpected error during tests:", error);
    process.exit(1);
  }
};

runTests();
