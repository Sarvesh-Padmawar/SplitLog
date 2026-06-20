import jwt from "jsonwebtoken";

/**
 * Helper to parse cookie headers into key-value pairs.
 */
const parseCookies = (cookieHeader) => {
  if (!cookieHeader) return {};
  return cookieHeader.split(";").reduce((acc, cookie) => {
    const parts = cookie.split("=");
    const key = parts[0]?.trim();
    const value = parts.slice(1).join("=")?.trim();
    if (key && value) {
      acc[key] = decodeURIComponent(value);
    }
    return acc;
  }, {});
};

/**
 * Socket.io middleware to authenticate incoming connections.
 * Extracts the HTTP-only 'jwt' cookie, verifies it, and attaches the userId to the socket.
 */
export const socketAuth = (socket, next) => {
  try {
    const cookieHeader = socket.handshake.headers.cookie;
    const cookies = parseCookies(cookieHeader);
    const token = cookies.jwt;

    if (!token) {
      console.log(`[SocketAuth] Connection rejected: No JWT token found in cookies.`);
      return next(new Error("Authentication error: Not authorized"));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Attach user ID to socket instance
    socket.user = decoded.userId;
    console.log(`[SocketAuth] User ${decoded.userId} authenticated successfully for socket ${socket.id}`);
    next();
  } catch (error) {
    console.log(`[SocketAuth] Connection rejected: Invalid JWT token.`, error.message);
    return next(new Error("Authentication error: Invalid token"));
  }
};
