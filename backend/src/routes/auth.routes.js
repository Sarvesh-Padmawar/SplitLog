import express from "express";
import {
  registerUser,
  loginUser,
  logoutUser,
} from "../controllers/auth.controller.js";


const router=express.Router();
router.post("/register",registerUser);
router.post("/loginUser",loginUser);
router.post("/logoutUser",logoutUser);

export default router;