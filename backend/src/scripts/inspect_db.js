import dotenv from "dotenv";
import mongoose from "mongoose";
import Settlement from "../models/Settlement.model.js";
import Expense from "../models/Expense.model.js";

dotenv.config({ path: "./.env" });

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("CONNECTED TO DB");

    const settlements = await Settlement.find({}).populate("expenses");
    console.log("\nALL SETTLEMENTS IN DB:");
    settlements.forEach((s) => {
      console.log(`\nSettlement ID: ${s._id}`);
      console.log(`From: ${s.from}`);
      console.log(`To: ${s.to}`);
      console.log(`Amount: ${s.amount}`);
      console.log(`Status: ${s.status}`);
      console.log(`Expenses linked:`, s.expenses.map(e => ({ id: e._id, description: e.description, totalAmount: e.totalAmount })));
    });

    const expenses = await Expense.find({});
    console.log("\nALL EXPENSES IN DB:");
    expenses.forEach((e) => {
      console.log(`Expense ID: ${e._id}, Description: ${e.description}, Amount: ${e.totalAmount}`);
    });

  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}

run();
