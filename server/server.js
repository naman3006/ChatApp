import express from "express";
import "dotenv/config";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { connectDB } from "./lib/db.js";
import userRouter from "./routes/userRoutes.js";
import messageRouter from "./routes/messageRoutes.js";
import groupRouter from "./routes/groupRoutes.js";
import pollRouter from "./routes/pollRoutes.js";
import statusRouter from "./routes/statusRoutes.js";
import developerRouter from "./routes/developerRoutes.js";
import conversationRouter from "./routes/conversationRoutes.js";
import { errorHandler } from "./middleware/error.middleware.js";

import { app, server } from "./lib/socket.js";

const PORT = process.env.PORT || 5001; // Ensure 5001 is default if env missing

console.log("-----------------------------------------");
console.log("Server Starting...");
console.log("PORT:", PORT);
console.log("JWT_SECRET check:", process.env.JWT_SECRET ? "OK" : "MISSING");
console.log("CLIENT_URL check:", process.env.CLIENT_URL || "Not Set");
console.log("-----------------------------------------");

// Middleware
app.use(helmet()); // Security headers
app.use(express.json({ limit: "50mb" }));
app.use(
    cors({
        origin: [
            "http://localhost:3000",
            "http://localhost:5173",
            "https://chat-app-topaz-phi-50.vercel.app",
            "https://chat-zzqxrm3l3-naman-patels-projects-b7bc3e39.vercel.app",
            // ...(process.env.CLIENT_URL ? [process.env.CLIENT_URL] : []),
        ],
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

app.get("/", (req, res) => {
    res.send("<h1>Server is running!</h1><p>Worker Process: " + process.pid + "</p>");
});

app.use("/api/status", statusRouter);
app.use("/api/auth", userRouter);
app.use("/api/messages", messageRouter);
app.use("/api/groups", groupRouter);
app.use("/api/polls", pollRouter);
app.use("/api/conversations", conversationRouter);
app.use("/api", developerRouter);

// Global Error Handler
app.use(errorHandler);

await connectDB();

server.listen(PORT, () => {
    console.log(`Server is running on port : ${PORT}`);
});