import express from "express";
import { protect } from "../modules/auth/auth.middleware.js";
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  respondToSettlement,
} from "../controllers/notification.controller.js";

const router = express.Router();

router.get("/", protect, getNotifications);
router.patch("/:id/read", protect, markAsRead);
router.patch("/read-all", protect, markAllAsRead);
router.patch("/:id/respond-settlement", protect, respondToSettlement);

export default router;
