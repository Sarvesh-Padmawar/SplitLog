import express from "express";
import { protect } from "../auth/auth.middleware.js";
import {
  createSettlement,
  acceptSettlement,
  rejectSettlement,
} from "./settlement.controller.js";

const router = express.Router();

// Create settlement request (from -> to)
router.post("/", protect, createSettlement);

// Accept settlement (only receiver)
router.post("/accept", protect, acceptSettlement);

// Reject settlement (only receiver)
router.post("/reject", protect, rejectSettlement);

export default router;
