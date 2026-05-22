import dotenv from "dotenv";
import mongoose from "mongoose";
import Expense from "../models/Expense.model.js";
import Settlement from "../models/Settlement.model.js";
import Friendship from "../models/Friendship.model.js";
import User from "../models/User.model.js";
import { calculateFriendBalance, calculateDashboardSummary, calculateNetBalances } from "../utils/balanceUtils.js";

dotenv.config({ path: "./.env" });

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB for audit\n");

    const users = await User.find({});
    console.log("USERS:");
    users.forEach(u => console.log(`- ${u._id}: ${u.name} (${u.username})`));

    const auditUsers = users.filter(u => ["sar12345", "sar22345", "sar32345"].includes(u.username));
    
    for (const meUser of auditUsers) {
      const me = meUser._id.toString();
      console.log(`\n======================================================`);
      console.log(`Auditing from user perspective: ${meUser.name} (${meUser.username}) ID: ${me}`);
      console.log(`======================================================`);

    const expenses = await Expense.find({}).populate("paidBy splits.user", "name username");
    const settlements = await Settlement.find({}).populate("from to", "name username");
    const friendships = await Friendship.find({
      $or: [{ user1: me }, { user2: me }],
    }).populate("user1 user2", "name username");

    console.log(`\nFound ${expenses.length} total expenses, ${settlements.length} total settlements, ${friendships.length} friendships involving user.`);

    console.log("\nEXPENSES DETAILS:");
    expenses.forEach((e) => {
      const payerId = e.paidBy._id.toString();
      const payerName = e.paidBy.username;
      console.log(`- Expense "${e.description}" (${e._id}): paidBy=${payerName} (${payerId}), amount=${e.totalAmount}`);
      e.splits.forEach(s => {
        console.log(`  split: user=${s.user.username} (${s.user._id}), amount=${s.amount}, status=${s.status}`);
      });
    });

    console.log("\nSETTLEMENTS DETAILS:");
    settlements.forEach((s) => {
      console.log(`- Settlement (${s._id}): from=${s.from.username}, to=${s.to.username}, amount=${s.amount}, status=${s.status}`);
    });

    console.log("\n--- CALCULATING DASHBOARD SUMMARY ---");
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    
    // Filter expenses & settlements involving 'me'
    const myExpenses = expenses.filter((e) => {
      const payerId = e.paidBy._id.toString();
      const hasMe = e.splits.some((s) => s.user._id.toString() === me);
      return payerId === me || hasMe;
    });

    const mySettlements = settlements.filter((s) => {
      const fromId = s.from._id.toString();
      const toId = s.to._id.toString();
      return fromId === me || toId === me;
    });

    const summary = calculateDashboardSummary(me, myExpenses, mySettlements, monthStart);
    console.log("\nRESULTING SUMMARY CARD VALUES:");
    console.log(JSON.stringify(summary, null, 2));

    console.log("\n--- AGGREGATING FRIEND BY FRIEND BALANCES ---");
    const friendIds = new Set();
    myExpenses.forEach((e) => {
      const payerId = e.paidBy._id.toString();
      if (payerId !== me) friendIds.add(payerId);
      e.splits.forEach((s) => {
        const uid = s.user._id.toString();
        if (uid !== me) friendIds.add(uid);
      });
    });

    mySettlements.forEach((s) => {
      const fromId = s.from._id.toString();
      const toId = s.to._id.toString();
      if (fromId !== me) friendIds.add(fromId);
      if (toId !== me) friendIds.add(toId);
    });

    friendIds.forEach((friendId) => {
      const friendExpenses = myExpenses.filter((e) => {
        const payerId = e.paidBy._id.toString();
        const hasMe = e.splits.some((s) => s.user._id.toString() === me);
        const hasFriend = e.splits.some((s) => s.user._id.toString() === friendId);
        return (payerId === me && hasFriend) || (payerId === friendId && hasMe);
      });

      const friendSettlements = mySettlements.filter((s) => {
        const fromId = s.from._id.toString();
        const toId = s.to._id.toString();
        return (fromId === me && toId === friendId) || (fromId === friendId && toId === me);
      });

      const fUser = users.find(u => u._id.toString() === friendId);
      console.log(`\nFriend: ${fUser ? fUser.username : friendId}`);
      console.log(`Expenses Count: ${friendExpenses.length}`);
      console.log(`Settlements Count: ${friendSettlements.length}`);
      
      let expenseTheyOwe = 0;
      let expenseYouOwe = 0;
      friendExpenses.forEach((e) => {
        const payerId = e.paidBy._id.toString();
        const paidByMe = payerId === me;
        e.splits.forEach((split) => {
          if (split.status !== "accepted") return;
          const splitUserId = split.user._id.toString();
          if (paidByMe && splitUserId === friendId) {
            expenseTheyOwe += split.amount;
            console.log(`  Expense "${e.description}": ${split.user.username} owes me ${split.amount} (accepted)`);
          } else if (!paidByMe && splitUserId === me) {
            expenseYouOwe += split.amount;
            console.log(`  Expense "${e.description}": I owe ${e.paidBy.username} ${split.amount} (accepted)`);
          }
        });
      });

      let settledByMe = 0;
      let settledByFriend = 0;
      friendSettlements.forEach((s) => {
        if (s.status !== "accepted") return;
        const fromId = s.from._id.toString();
        const toId = s.to._id.toString();
        if (fromId === me && toId === friendId) {
          settledByMe += s.amount;
          console.log(`  Settlement paid by me: ${s.amount}`);
        } else if (fromId === friendId && toId === me) {
          settledByFriend += s.amount;
          console.log(`  Settlement paid by friend: ${s.amount}`);
        }
      });

      console.log(`  SUMS: expenseTheyOwe=${expenseTheyOwe}, settledByFriend=${settledByFriend}, expenseYouOwe=${expenseYouOwe}, settledByMe=${settledByMe}`);
      const { youOwe, theyOwe, netBalance } = calculateFriendBalance(me, friendId, friendExpenses, friendSettlements);
      console.log(`  FINAL UNCAPPED BALANCES (from balanceUtils): youOwe=${youOwe}, theyOwe=${theyOwe}, netBalance=${netBalance}`);
    });
    }

  } catch (err) {
    console.error("Error in audit script:", err);
  } finally {
    await mongoose.disconnect();
  }
}

run();
