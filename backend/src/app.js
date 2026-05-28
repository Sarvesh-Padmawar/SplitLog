import express from "express";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import authRoutes from "./modules/auth/auth.routes.js";
import friendRoutes from "./modules/friends/friend.routes.js";
import expenseRoutes from "./modules/expenses/expense.routes.js";
import ledgerRoutes from "./routes/ledger.routes.js";
import historyRoutes from "./modules/history/history.routes.js";
import myexpense from "./routes/myexpense.routes.js";
import settlementRoutes from "./modules/settlements/settlement.routes.js";
import notificationRoutes from "./modules/notifications/notification.routes.js";
import dashboardRoutes from "./modules/dashboard/dashboard.routes.js";
import { errorHandler } from "./middleware/error.middleware.js";
import { notFoundHandler } from "./middleware/notFound.middleware.js";



const app = express();

// Security headers
app.use(helmet());

// Global Rate Limiter for all /api routes
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Increased limit for development
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests from this IP. Please try again later." },
});
app.use("/api", globalLimiter);

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

// ── ERROR HANDLING MIDDLEWARE ──────────────────────────────────────────────
// 1. Catch 404 and forward to error handler
app.use(notFoundHandler);

// 2. Global Error Handler (must be the last middleware)
app.use(errorHandler);

export default app;
