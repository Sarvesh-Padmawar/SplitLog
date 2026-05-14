import express from "express";
import cookieParser from "cookie-parser";
import authRoutes from "./modules/auth/auth.routes.js";
import friendRoutes from "./routes/friend.routes.js";
import expenseRoutes from "./routes/expense.routes.js";
import ledgerRoutes from "./routes/ledger.routes.js";
import historyRoutes from "./routes/history.routes.js";
import myexpense from "./routes/myexpense.routes.js";
import settlementRoutes from "./routes/settlement.routes.js";
import notificationRoutes from "./routes/notification.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";



const app = express();

// Manual CORS middleware (cors v2.8.5 has Express 5 compatibility issues)
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "http://localhost:5173");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Credentials", "true");

  // Handle preflight
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }
  next();
});

app.use(express.json());
app.use(cookieParser()); 

app.use("/api/auth", authRoutes);
app.use("/api/friends", friendRoutes);
app.use("/api/expenses", expenseRoutes);
app.use("/api/ledger", ledgerRoutes);
app.use("/api/history", historyRoutes);
app.use("/api/myExpense",myexpense);
app.use("/api/settlements", settlementRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/dashboard", dashboardRoutes);


export default app;
