import express from "express";
import { protect } from "../modules/auth/auth.middleware.js";
import { searchUserByUsername ,sendFriendRequest,getPendingRequests,
  acceptFriendRequest,
  rejectFriendRequest,listFriends} from "../controllers/friend.controller.js";

const router = express.Router();
router.use(protect);
router.get("/",listFriends)
router.get("/search/:username", searchUserByUsername);
router.post("/sendrequest", sendFriendRequest);
router.get("/getrequests", getPendingRequests);
router.post("/accept", acceptFriendRequest);
router.post("/reject", rejectFriendRequest);


export default router;
