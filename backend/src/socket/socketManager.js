/**
 * SocketManager tracks active Socket.io connections per user.
 * Since a user may connect via multiple browser tabs or devices,
 * we map each userId to a Set of active socket instances.
 */
class SocketManager {
  constructor() {
    this.userSockets = new Map(); // userId -> Set of socket instances
    this.io = null;
  }

  /**
   * Sets the global Socket.io server instance.
   * @param {object} io - The socket.io Server instance.
   */
  setIO(io) {
    this.io = io;
  }

  /**
   * Registers a socket connection for a user.
   * @param {string} userId - The authenticated user ID.
   * @param {object} socket - The connected socket instance.
   */
  addUser(userId, socket) {
    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set());
    }
    this.userSockets.get(userId).add(socket);
    console.log(`[SocketManager] Socket registered. User: ${userId}. Total sockets: ${this.userSockets.get(userId).size}`);
  }

  /**
   * Removes a socket connection for a user.
   * @param {string} userId - The authenticated user ID.
   * @param {object} socket - The disconnected socket instance.
   */
  removeUser(userId, socket) {
    if (this.userSockets.has(userId)) {
      const sockets = this.userSockets.get(userId);
      sockets.delete(socket);
      if (sockets.size === 0) {
        this.userSockets.delete(userId);
        console.log(`[SocketManager] User offline: ${userId}.`);
      } else {
        console.log(`[SocketManager] Socket removed. User: ${userId}. Remaining sockets: ${sockets.size}`);
      }
    }
  }

  /**
   * Retrieves all active socket connections for a user.
   * @param {string} userId - The user ID.
   * @returns {Array} List of socket instances.
   */
  getSockets(userId) {
    const sockets = this.userSockets.get(userId);
    return sockets ? Array.from(sockets) : [];
  }

  /**
   * Sends an event to all active sockets of a specific user.
   * @param {string} userId - The user ID.
   * @param {string} event - The socket event name.
   * @param {any} data - The event payload.
   * @returns {boolean} True if the user was online and event was sent, false otherwise.
   */
  sendToUser(userId, event, data) {
    const sockets = this.getSockets(userId);
    if (sockets.length > 0) {
      sockets.forEach((socket) => {
        socket.emit(event, data);
      });
      return true;
    }
    return false;
  }

  /**
   * Sends an event to all sockets in a specific room.
   * @param {string} room - The room name.
   * @param {string} event - The socket event name.
   * @param {any} data - The event payload.
   * @returns {boolean} True if io is initialized and event was sent.
   */
  sendToRoom(room, event, data) {
    if (this.io) {
      this.io.to(room).emit(event, data);
      return true;
    }
    return false;
  }

  /**
   * Joins all active sockets of a user to a specific room.
   * @param {string} userId - The user ID.
   * @param {string} room - The room name.
   * @returns {boolean} True if user had active sockets joined.
   */
  joinRoom(userId, room) {
    const sockets = this.getSockets(userId);
    if (sockets.length > 0) {
      sockets.forEach((socket) => {
        socket.join(room);
        console.log(`[SocketManager] Socket ${socket.id} (User: ${userId}) joined room: ${room}`);
      });
      return true;
    }
    return false;
  }

  /**
   * Leaves all active sockets of a user from a specific room.
   * @param {string} userId - The user ID.
   * @param {string} room - The room name.
   * @returns {boolean} True if user had active sockets left.
   */
  leaveRoom(userId, room) {
    const sockets = this.getSockets(userId);
    if (sockets.length > 0) {
      sockets.forEach((socket) => {
        socket.leave(room);
        console.log(`[SocketManager] Socket ${socket.id} (User: ${userId}) left room: ${room}`);
      });
      return true;
    }
    return false;
  }
}

export const socketManager = new SocketManager();
