import dotenv from "dotenv";
import http from "http";
import app from "./app.js";
import connectDB from "./config/db.js";
import { initSocket } from "./socket/index.js";

dotenv.config();

await connectDB(); // 🔥 VERY IMPORTANT (await)

const PORT = process.env.PORT || 5000;

// Wrap Express app with native HTTP server for Socket.io support
const server = http.createServer(app);

// Initialize Socket.io
initSocket(server);

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
