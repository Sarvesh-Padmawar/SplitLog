import dotenv from "dotenv";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import { io } from "socket.io-client";
import User from "../models/User.model.js";

dotenv.config();

const testSocketConnection = async () => {
  try {
    // 1. Connect to MongoDB to retrieve a user
    console.log("[TestSocket] Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGO_URI);
    console.log("[TestSocket] MongoDB connected.");

    const user = await User.findOne({});
    if (!user) {
      console.error("[TestSocket] No users found in database to simulate socket auth.");
      process.exit(1);
    }

    console.log(`[TestSocket] Selected test user: ${user.name} (${user._id})`);

    // 2. Generate a valid JWT token
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: "1h" });
    console.log("[TestSocket] JWT token signed successfully.");

    // 3. Connect to the Socket.io server
    console.log("[TestSocket] Connecting to Socket.io server at http://localhost:5000 ...");
    const socket = io("http://localhost:5000", {
      autoConnect: false,
      extraHeaders: {
        cookie: `jwt=${token}`,
      },
    });

    socket.connect();

    socket.on("connect", () => {
      console.log(`[TestSocket] Connection established successfully! Socket ID: ${socket.id}`);
      
      // 4. Emit ping test
      console.log("[TestSocket] Emitting 'ping' event to backend...");
      socket.emit("ping");
    });

    socket.on("pong", (data) => {
      console.log("[TestSocket] SUCCESS! Received 'pong' from backend:", data);
      
      // Disconnect and exit
      socket.disconnect();
      mongoose.disconnect();
      console.log("[TestSocket] Test finished successfully. Exiting.");
      process.exit(0);
    });

    socket.on("connect_error", (error) => {
      console.error("[TestSocket] Socket connection error:", error.message);
      socket.disconnect();
      mongoose.disconnect();
      process.exit(1);
    });

    // Timeout safety
    setTimeout(() => {
      console.error("[TestSocket] Test timed out after 10 seconds without 'pong' response.");
      socket.disconnect();
      mongoose.disconnect();
      process.exit(1);
    }, 10000);

  } catch (error) {
    console.error("[TestSocket] Unexpected error running test:", error);
    process.exit(1);
  }
};

testSocketConnection();
