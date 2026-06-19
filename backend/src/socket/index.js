import { Server } from "socket.io";
import { socketAuth } from "./middleware/socketAuth.js";
import { socketManager } from "./socketManager.js";
import { registerSocketHandlers } from "./socketHandlers.js";

let io = null;

/**
 * Initializes the Socket.io Server and attaches it to the HTTP server.
 * @param {object} server - The HTTP server instance.
 * @returns {object} The Socket.io Server instance.
 */
export const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || "http://localhost:5173",
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    },
    // Heartbeat configuration
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Share server instance with socketManager
  socketManager.setIO(io);

  // Authenticate incoming connections
  io.use(socketAuth);

  // Set up connection event listeners
  registerSocketHandlers(io);

  console.log(`[Socket] Socket.io server initialized and attached to HTTP server.`);
  return io;
};

/**
 * Retrieves the initialized Socket.io Server instance.
 * Throws an error if socket server hasn't been initialized yet.
 * @returns {object} The Socket.io Server instance.
 */
export const getIO = () => {
  if (!io) {
    throw new Error("Socket.io has not been initialized. Call initSocket first.");
  }
  return io;
};
