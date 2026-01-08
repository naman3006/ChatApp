import express from "express";
import "dotenv/config";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { connectDB } from "./lib/db.js";
import userRouter from "./routes/userRoutes.js";
import messageRouter from "./routes/messageRoutes.js";
import groupRouter from "./routes/groupRoutes.js";
import { errorHandler } from "./middleware/error.middleware.js";

import { app, server } from "./lib/socket.js";

const PORT = process.env.PORT || 5001; // Ensure 5001 is default if env missing

// Middleware
app.use(helmet()); // Security headers
app.use(express.json({ limit: "50mb" }));
app.use(
    cors({
        origin: ["http://localhost:3000", "http://localhost:5173"],
        credentials: true,
    })
);

// Rate Limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 3000, // limit each IP to 3000 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
});
app.use("/api", limiter);

app.use("/api/status", (req, res) => {
    res.send("Server is live");
});
app.use("/api/auth", userRouter);
app.use("/api/messages", messageRouter);
app.use("/api/groups", groupRouter);

// Global Error Handler
app.use(errorHandler);

await connectDB();

server.listen(PORT, () => {
    console.log(`Server is running on port : ${PORT}`);
});