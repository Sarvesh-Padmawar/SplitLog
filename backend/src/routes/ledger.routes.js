import express from "express";
import { protect } from "../modules/auth/auth.middleware.js";
import {
  getLedger,
  getLedgerWithFriend,
} from "../controllers/ledger.controller.js";

const router = express.Router();

router.get("/:friendId", protect, getLedgerWithFriend);
router.get("/", protect, getLedger);

export default router;
