import { socketManager } from "./socketManager.js";
import Group from "../models/Group.model.js";

/**
 * Registers connection and lifecycle event handlers for socket.io.
 * @param {object} io - The socket.io Server instance.
 */
export const registerSocketHandlers = (io) => {
  io.on("connection", async (socket) => {
    const userId = socket.user;
    if (!userId) {
      console.log(`[SocketHandlers] Socket ${socket.id} connected without authenticated user. Disconnecting.`);
      return socket.disconnect();
    }

    console.log(`[SocketHandlers] Socket connected: ${socket.id} (User: ${userId})`);

    // Register active user session in manager
    socketManager.addUser(userId, socket);

    // Join personal user room: user:{userId} (for targeted notifications / updates)
    const userRoomName = `user:${userId}`;
    socket.join(userRoomName);
    console.log(`[SocketHandlers] Socket ${socket.id} joined personal room: ${userRoomName}`);

    // Auto-join active group rooms for the user
    try {
      const groups = await Group.find({ isActive: true, members: userId }).select("_id");
      groups.forEach((group) => {
        const groupRoomName = `group:${group._id}`;
        socket.join(groupRoomName);
        console.log(`[SocketHandlers] Socket ${socket.id} (User: ${userId}) auto-joined group room: ${groupRoomName}`);
      });
    } catch (err) {
      console.error(`[SocketHandlers] Failed to auto-join group rooms for user ${userId}:`, err);
    }

    // Verification Ping/Pong handler for health/connectivity checks
    socket.on("ping", (data) => {
      console.log(`[SocketHandlers] Received 'ping' from user ${userId} on socket ${socket.id}`);
      socket.emit("pong", { 
        message: "pong", 
        timestamp: Date.now() 
      });
    });

    // Handle client disconnects
    socket.on("disconnect", (reason) => {
      console.log(`[SocketHandlers] Socket disconnected: ${socket.id} (User: ${userId}, Reason: ${reason})`);
      socketManager.removeUser(userId, socket);
    });
  });
};
