import React, { createContext, useEffect, useState } from "react";
import { socket } from "./socket";
import { useAuth } from "../../modules/auth/hooks/useAuth";

export const SocketContext = createContext(null);

/**
 * SocketProvider manages the connection state and lifecycle of the global socket singleton.
 * It automatically connects when the user is authenticated, and disconnects on logout.
 */
export const SocketProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [isConnected, setIsConnected] = useState(socket.connected);

  useEffect(() => {
    // Connection management based on auth state
    if (isAuthenticated) {
      console.log("[SocketProvider] Authenticated. Connecting socket...");
      socket.connect();
    } else {
      console.log("[SocketProvider] Unauthenticated. Disconnecting socket...");
      socket.disconnect();
    }

    // Event listeners
    const onConnect = () => {
      console.log(`[SocketProvider] Socket connected successfully. Socket ID: ${socket.id}`);
      setIsConnected(true);

      // Trigger verification ping to the server
      console.log("[SocketProvider] Emitting 'ping' test event to server...");
      socket.emit("ping");
    };

    const onDisconnect = (reason) => {
      console.log(`[SocketProvider] Socket disconnected. Reason: ${reason}`);
      setIsConnected(false);
    };

    const onConnectError = (error) => {
      console.error("[SocketProvider] Socket connection error:", error.message);
      setIsConnected(false);
    };

    const onPong = (data) => {
      console.log("[SocketProvider] Received 'pong' response from server:", data);
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("connect_error", onConnectError);
    socket.on("pong", onPong);

    // Initial connection state alignment
    setIsConnected(socket.connected);

    // Cleanup: remove listeners and close connection if component unmounts
    return () => {
      console.log("[SocketProvider] Cleaning up listeners and disconnecting...");
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("connect_error", onConnectError);
      socket.off("pong", onPong);
      socket.disconnect();
    };
  }, [isAuthenticated]);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};
