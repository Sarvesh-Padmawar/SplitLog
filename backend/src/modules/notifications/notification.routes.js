import express from "express";
import { protect } from "../auth/auth.middleware.js";
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  respondToSettlement,
} from "./notification.controller.js";

const router = express.Router();

router.get("/", protect, getNotifications);
router.patch("/:id/read", protect, markAsRead);
router.patch("/read-all", protect, markAllAsRead);
router.patch("/:id/respond-settlement", protect, respondToSettlement);

export default router;
