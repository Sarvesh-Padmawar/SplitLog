import express from "express";
import { protect } from "../modules/auth/auth.middleware.js";
import { getMyExpenses } from "../controllers/myexpense.controller.js";

const router = express.Router();

router.get("/", protect, getMyExpenses);

export default router;