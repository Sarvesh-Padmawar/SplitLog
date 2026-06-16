import express from "express";
import { protect } from "../auth/auth.middleware.js";


import {
  createGroup,
  getMyGroups,
  getGroupDetails,
  addMember,
  removeMember,
  updateGroup,
  deleteGroup,
  createGroupExpense,
  getGroupExpenses,
  getGroupBalances,
} from "./group.controller.js";

const router = express.Router();
router.use(protect);

router.post("/",createGroup);
router.get("/",getMyGroups);
router.get("/:groupId",getGroupDetails);
router.put("/:groupId",updateGroup);
router.delete("/:groupId",deleteGroup);
router.post("/:groupId/members", addMember);
router.delete("/:groupId/members/:userId", removeMember);
router.post("/:groupId/expenses", createGroupExpense);
router.get("/:groupId/expenses", getGroupExpenses);
router.get("/:groupId/balances", getGroupBalances);


export default router;