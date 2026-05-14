import express from "express";
import { protect } from "../modules/auth/auth.middleware.js";
import {
  getSummary,
  getRecentTransactions,
  getFriendBalances,
  getChartData,
} from "../controllers/dashboard.controller.js";

const router = express.Router();

router.get("/summary", protect, getSummary);
router.get("/recent-transactions", protect, getRecentTransactions);
router.get("/friend-balances", protect, getFriendBalances);
router.get("/chart-data", protect, getChartData);

export default router;
