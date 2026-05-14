import express from "express";
import {
  registerUser,
  loginUser,
  googleLogin,
  logoutUser,
  getMe,
  completeProfile,
  verifyEmail,
  resendVerificationEmail,
  forgotPassword,
  resetPassword,
} from "./auth.controller.js";

import { protect } from "./auth.middleware.js";

import {
  authLimiter,
  resendLimiter,
  forgotPasswordLimiter,
} from "../../middleware/rateLimit.middleware.js";

const router = express.Router();

// ── PUBLIC ROUTES ──────────────────────────────────────────────────────────
router.post("/register", authLimiter, registerUser);
router.post("/loginUser", authLimiter, loginUser);
router.post("/logoutUser", logoutUser);
router.post("/google", authLimiter, googleLogin);

// ── EMAIL VERIFICATION ─────────────────────────────────────────────────────
router.get("/verify-email", verifyEmail);
router.post("/resend-verification", resendLimiter, resendVerificationEmail);

// ── PASSWORD RESET ─────────────────────────────────────────────────────────
router.post("/forgot-password", forgotPasswordLimiter, forgotPassword);
router.post("/reset-password", resetPassword);

// ── PROTECTED ROUTES ───────────────────────────────────────────────────────
router.get("/me", protect, getMe);
router.post("/complete-profile", protect, completeProfile);

export default router;
