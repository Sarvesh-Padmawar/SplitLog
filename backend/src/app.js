import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/auth.routes.js";
import friendRoutes from "./routes/friend.routes.js";

const app = express();

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,              
  })
);

app.use(express.json());
app.use(cookieParser()); 

app.use("/api/auth", authRoutes);
app.use("/api/friends", friendRoutes);


app.get("/", (req, res) => {
  res.send("API running...");
});

export default app;
