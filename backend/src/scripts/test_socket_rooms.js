import dotenv from "dotenv";
import mongoose from "mongoose";
import http from "http";
import jwt from "jsonwebtoken";
import { io as clientIO } from "socket.io-client";
import app from "../app.js";
import { initSocket, getIO } from "../socket/index.js";
import { socketManager } from "../socket/socketManager.js";
import User from "../models/User.model.js";
import Group from "../models/Group.model.js";
import Expense from "../models/Expense.model.js";
import Settlement from "../models/Settlement.model.js";
import Notification from "../models/Notification.model.js";
import * as groupService from "../modules/group/group.service.js";

dotenv.config();

const run = async () => {
  let server;
  let clientSocket1, clientSocket2, clientSocket3;
  let user1, user2, user3;
  let group;
  let expense;

  try {
    // 1. Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB.");

    // 2. Start HTTP + Socket.IO Server on Port 5001
    server = http.createServer(app);
    const ioServer = initSocket(server);
    await new Promise((resolve) => server.listen(5001, resolve));
    console.log("Test server listening on port 5001.");

    // 3. Create test users
    user1 = await User.create({
      name: "Socket User 1",
      username: `user1_${Date.now()}`,
      email: `user1_${Date.now()}@test.com`,
      isVerified: true,
    });

    user2 = await User.create({
      name: "Socket User 2",
      username: `user2_${Date.now()}`,
      email: `user2_${Date.now()}@test.com`,
      isVerified: true,
    });

    user3 = await User.create({
      name: "Socket User 3",
      username: `user3_${Date.now()}`,
      email: `user3_${Date.now()}@test.com`,
      isVerified: true,
    });

    // 4. Create Group (members: User1, User2)
    group = await Group.create({
      name: "Room Test Group",
      createdBy: user1._id,
      members: [user1._id, user2._id],
    });
    console.log(`Created group: ${group.name} (${group._id})`);

    // 5. Connect client sockets
    const token1 = jwt.sign({ userId: user1._id }, process.env.JWT_SECRET);
    const token2 = jwt.sign({ userId: user2._id }, process.env.JWT_SECRET);
    const token3 = jwt.sign({ userId: user3._id }, process.env.JWT_SECRET);

    clientSocket1 = clientIO("http://localhost:5001", {
      autoConnect: false,
      extraHeaders: { cookie: `jwt=${token1}` },
    });

    clientSocket2 = clientIO("http://localhost:5001", {
      autoConnect: false,
      extraHeaders: { cookie: `jwt=${token2}` },
    });

    clientSocket3 = clientIO("http://localhost:5001", {
      autoConnect: false,
      extraHeaders: { cookie: `jwt=${token3}` },
    });

    clientSocket1.connect();
    clientSocket2.connect();

    await new Promise((resolve) => {
      let count = 0;
      const checkResolve = () => {
        count++;
        if (count === 2) resolve();
      };
      clientSocket1.on("connect", checkResolve);
      clientSocket2.on("connect", checkResolve);
    });

    console.log("Client socket 1 and socket 2 connected.");

    // Allow some time for room auto-joining logic to complete
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Verify rooms on server
    const roomName = `group:${group._id}`;
    const room = ioServer.sockets.adapter.rooms.get(roomName);

    if (room && room.size === 2) {
      console.log("✅ Auto-joining verified: Both users automatically joined the group room on connection.");
    } else {
      console.error("❌ Auto-joining failed. Room size:", room ? room.size : "undefined");
      process.exit(1);
    }

    // Set up listeners for events
    let user1Events = [];
    let user2Events = [];
    let user3Events = [];

    clientSocket1.on("expense_created", (data) => user1Events.push({ event: "expense_created", data }));
    clientSocket1.on("group_updated", (data) => user1Events.push({ event: "group_updated", data }));

    clientSocket2.on("expense_created", (data) => user2Events.push({ event: "expense_created", data }));
    clientSocket2.on("group_updated", (data) => user2Events.push({ event: "group_updated", data }));
    clientSocket2.on("group_removed", (data) => user2Events.push({ event: "group_removed", data }));

    // 6. Test Broadcast: Create Group Expense
    console.log("Creating group expense...");
    expense = await groupService.createGroupExpense(user1._id, group._id, {
      totalAmount: 100,
      description: "Room Test Dinner",
      splits: [
        { user: user1._id, amount: 50 },
        { user: user2._id, amount: 50 },
      ],
    });

    await new Promise((resolve) => setTimeout(resolve, 500));

    const u1Created = user1Events.find((e) => e.event === "expense_created");
    const u2Created = user2Events.find((e) => e.event === "expense_created");

    if (u1Created && u2Created && u1Created.data.description === "Room Test Dinner") {
      console.log("✅ Room broadcast verified: Both members received 'expense_created' via group room emit.");
    } else {
      console.error("❌ Room broadcast failed. Events received:", { u1Created, u2Created });
      process.exit(1);
    }

    // 7. Test Real-time Room Join on Membership Change (addMember)
    clientSocket3.connect();
    await new Promise((resolve) => clientSocket3.on("connect", resolve));
    clientSocket3.on("group_updated", (data) => user3Events.push({ event: "group_updated", data }));
    console.log("Client socket 3 connected.");

    console.log("Adding member User 3 to group...");
    await groupService.addMember(user1._id, group._id, user3._id);

    await new Promise((resolve) => setTimeout(resolve, 500));

    // Verify room size is now 3
    const roomAfterAdd = ioServer.sockets.adapter.rooms.get(roomName);
    if (roomAfterAdd && roomAfterAdd.size === 3) {
      console.log("✅ Real-time room joining verified: Added user auto-joined the room in real time.");
    } else {
      console.error("❌ Real-time room joining failed. Room size:", roomAfterAdd ? roomAfterAdd.size : "undefined");
      process.exit(1);
    }

    const u3Updated = user3Events.find((e) => e.event === "group_updated");
    if (u3Updated && u3Updated.data.name === "Room Test Group") {
      console.log("✅ Real-time broadcast to new member verified: New user received 'group_updated' via group room emit.");
    } else {
      console.error("❌ Real-time broadcast to new member failed.");
      process.exit(1);
    }

    // Clear events list
    user3Events = [];

    // 8. Test Real-time Room Leave on Membership Change (removeMember)
    console.log("Removing member User 3 from group...");
    await groupService.removeMember(user1._id, group._id, user3._id);

    await new Promise((resolve) => setTimeout(resolve, 500));

    const roomAfterRemove = ioServer.sockets.adapter.rooms.get(roomName);
    if (roomAfterRemove && roomAfterRemove.size === 2) {
      console.log("✅ Real-time room leaving verified: Removed user auto-left the room.");
    } else {
      console.error("❌ Real-time room leaving failed. Room size:", roomAfterRemove ? roomAfterRemove.size : "undefined");
      process.exit(1);
    }

    // 9. Test Voluntary Leave Group (leaveGroup)
    // First, clear any expenses to ensure balance is exactly 0
    await Expense.deleteMany({ group: group._id });
    console.log("Deleted group expenses to allow voluntary exit.");

    console.log("User 2 leaving group...");
    await groupService.leaveGroup(user2._id, group._id);

    await new Promise((resolve) => setTimeout(resolve, 500));

    const roomAfterLeave = ioServer.sockets.adapter.rooms.get(roomName);
    if (roomAfterLeave && roomAfterLeave.size === 1) {
      console.log("✅ Real-time room leaving on voluntary leave verified: Leaver auto-left the room.");
    } else {
      console.error("❌ Real-time room leaving on voluntary leave failed. Room size:", roomAfterLeave ? roomAfterLeave.size : "undefined");
      process.exit(1);
    }

    const u2Removed = user2Events.find((e) => e.event === "group_removed");
    if (u2Removed && u2Removed.data.groupId.toString() === group._id.toString()) {
      console.log("✅ Leaver notified: Leaver received 'group_removed' directly.");
    } else {
      console.error("❌ Leaver notification failed.");
      process.exit(1);
    }

    // Cleanup and disconnect
    clientSocket1.disconnect();
    clientSocket2.disconnect();
    clientSocket3.disconnect();

    server.close();
    console.log("Server closed.");

    // DB cleanup
    await Group.deleteOne({ _id: group._id });
    await User.deleteMany({ _id: { $in: [user1._id, user2._id, user3._id] } });
    await Notification.deleteMany({ sender: { $in: [user1._id, user2._id, user3._id] } });
    console.log("DB cleaned up.");

    console.log("Database cleaned. All Socket.IO room tests passed successfully!");
    process.exit(0);
  } catch (err) {
    console.error("❌ Unexpected test crash:", err);
    if (clientSocket1) clientSocket1.disconnect();
    if (clientSocket2) clientSocket2.disconnect();
    if (clientSocket3) clientSocket3.disconnect();
    if (server) server.close();
    process.exit(1);
  }
};

run();
