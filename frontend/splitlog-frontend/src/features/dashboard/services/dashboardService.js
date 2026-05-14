import api from "../../../shared/services/axios";

export const fetchSummary = () =>
  api.get("/dashboard/summary").then((r) => r.data);

export const fetchRecentTransactions = () =>
  api.get("/dashboard/recent-transactions").then((r) => r.data);

export const fetchFriendBalances = () =>
  api.get("/dashboard/friend-balances").then((r) => r.data);

export const fetchChartData = () =>
  api.get("/dashboard/chart-data").then((r) => r.data);
