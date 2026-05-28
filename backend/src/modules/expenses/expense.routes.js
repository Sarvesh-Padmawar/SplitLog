import express from "express";
import { protect } from "../auth/auth.middleware.js";
import {
  addExpense,
  respondToSplit,
  editExpense,
  deleteExpense,
  getExpenseById,
} from "./expense.controller.js";

const router = express.Router();

router.post("/", protect, addExpense);
router.get("/:expenseId", protect, getExpenseById);
router.patch("/:expenseId/respond", protect, respondToSplit);
router.patch("/:expenseId/editExpense", protect, editExpense);
router.delete("/:expenseId", protect, deleteExpense);

export default router;
