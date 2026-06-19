import { useContext } from "react";
import { SocketContext } from "./SocketProvider";

/**
 * Hook to consume the socket singleton and connection state.
 * Must be used within a SocketProvider.
 * @returns {{ socket: object, isConnected: boolean }} The socket instance and connection state.
 */
export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error("useSocket must be used within a SocketProvider");
  }
  return context;
};
