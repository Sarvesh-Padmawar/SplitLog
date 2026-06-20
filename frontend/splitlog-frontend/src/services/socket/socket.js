import { io } from "socket.io-client";

// Vite environment variables are prefixed with VITE_
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";

/**
 * Singleton Socket.io client instance.
 * autoConnect is disabled so that connection occurs only after successful user authentication.
 * withCredentials is enabled to automatically forward HTTP-only session cookies (JWT).
 */
export const socket = io(SOCKET_URL, {
  autoConnect: false,
  withCredentials: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});
