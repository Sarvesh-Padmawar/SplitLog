import express from "express";
import {protect} from "../modules/auth/auth.middleware.js";
import { getExpenseHistoryWithFriend } from "../controllers/history.controller.js";

const router=express.Router();

router.get("/:friendId",protect,getExpenseHistoryWithFriend);

export default router;