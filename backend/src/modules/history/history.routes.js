import express from "express";
import { protect } from "../auth/auth.middleware.js";
import { getExpenseHistoryWithFriend } from "./history.controller.js";

const router = express.Router();

router.get("/:friendId", protect, getExpenseHistoryWithFriend);

export default router;
