import * as dashboardService from "./dashboard.service.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

/**
 * Controller endpoint to retrieve dashboard overview card values.
 */
export const getSummary = asyncHandler(async (req, res) => {
  const userId = req.user;
  const summary = await dashboardService.fetchDashboardSummary({ userId });
  return res.status(200).json(summary);
});

/**
 * Controller endpoint to retrieve 10 recent transactions.
 */
export const getRecentTransactions = asyncHandler(async (req, res) => {
  const userId = req.user;
  const transactions = await dashboardService.fetchRecentTransactions({ userId });
  return res.status(200).json(transactions);
});

/**
 * Controller endpoint to retrieve top 5 net friend balances.
 */
export const getFriendBalances = asyncHandler(async (req, res) => {
  const userId = req.user;
  const balances = await dashboardService.fetchFriendBalances({ userId });
  return res.status(200).json(balances);
});

/**
 * Controller endpoint to retrieve chart category and trend data.
 */
export const getChartData = asyncHandler(async (req, res) => {
  const userId = req.user;
  const chartData = await dashboardService.fetchChartData({ userId });
  return res.status(200).json(chartData);
});
