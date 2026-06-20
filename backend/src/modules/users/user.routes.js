import express from "express";
import { updateProfile, updatePassword, uploadAvatar } from "./user.controller.js";
import { protect } from "../auth/auth.middleware.js";
import { uploadAvatarMiddleware } from "../../middleware/upload.middleware.js";

const router = express.Router();

// All user settings routes are protected
router.patch("/me/profile", protect, updateProfile);
router.patch("/me/password", protect, updatePassword);
router.patch("/avatar", protect, uploadAvatarMiddleware, uploadAvatar);
router.patch("/me/avatar", protect, uploadAvatarMiddleware, uploadAvatar);

export default router;
