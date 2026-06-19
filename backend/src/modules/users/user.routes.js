import express from "express";
import { updateProfile, updatePassword } from "./user.controller.js";
import { protect } from "../auth/auth.middleware.js";

const router = express.Router();

// All user settings routes are protected
router.patch("/me/profile", protect, updateProfile);
router.patch("/me/password", protect, updatePassword);

export default router;
