import dotenv from "dotenv";
import mongoose from "mongoose";
import Expense from "../models/Expense.model.js";
import Settlement from "../models/Settlement.model.js";
import Friendship from "../models/Friendship.model.js";
import User from "../models/User.model.js";

dotenv.config({ path: "./.env" });

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB");

    const users = await User.find({});
    console.log(`Total users in DB: ${users.length}`);
    users.forEach(u => console.log(`- ${u._id}: ${u.name} (${u.username})`));

    const friendships = await Friendship.find({});
    console.log(`\nTotal friendships in DB: ${friendships.length}`);
    friendships.forEach(f => console.log(`- ${f._id}: ${f.user1} <-> ${f.user2}`));

    const expenses = await Expense.find({});
    console.log(`\nTotal expenses in DB: ${expenses.length}`);
    expenses.forEach(e => {
      console.log(`- Expense ${e._id}: paidBy=${e.paidBy}, amount=${e.totalAmount}, desc="${e.description}"`);
      e.splits.forEach(s => console.log(`  split: user=${s.user}, amount=${s.amount}, status=${s.status}`));
    });

    const settlements = await Settlement.find({});
    console.log(`\nTotal settlements in DB: ${settlements.length}`);
    settlements.forEach(s => {
      console.log(`- Settlement ${s._id}: from=${s.from}, to=${s.to}, amount=${s.amount}, status=${s.status}`);
    });

    console.log("\nDiagnostics done!");
  } catch (err) {
    console.error("Error in diagnostic:", err);
  } finally {
    await mongoose.disconnect();
  }
}

run();
