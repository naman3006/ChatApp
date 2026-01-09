import { Server } from "socket.io";
import http from "http";
import express from "express";

import Group from "../models/Group.js";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: [
            "http://localhost:3000",
            "http://localhost:5173",
            ...(process.env.CLIENT_URL ? [process.env.CLIENT_URL] : []),
        ],
        methods: ["GET", "POST", "PUT", "DELETE"],
        credentials: true,
    },
});

export const userSocketMap = {}; //{userId: [socketId1, socketId2, ...]}

io.on("connection", async (socket) => {
    const userId = socket.handshake.query.userId;
    const isGhostMode = socket.handshake.query.isGhostMode === "true";

    // Join a room with the userId so we can broadcast to all tabs of this user
    if (userId) {
        socket.join(userId);

        // Auto-join group rooms
        try {
            const groups = await Group.find({ members: userId });
            groups.forEach(group => {
                socket.join(`group_${group._id}`);
            });
        } catch (error) {
            console.error("Error joining group rooms:", error);
        }
    }

    if (userId && !isGhostMode) {
        if (!userSocketMap[userId]) userSocketMap[userId] = [];
        userSocketMap[userId].push(socket.id);
    }

    // io.emit() is used to send events to all the connected clients
    io.emit("getOnlineUsers", Object.keys(userSocketMap));

    // Listen for manual join events (e.g. when added to a new group)
    socket.on("joinGroup", (groupId) => {
        socket.join(`group_${groupId}`);
    });

    // --- WebRTC Signaling Events ---

    socket.on("callUser", (data) => {
        // data: { userToCall: userId, signalData: offer, from: userId, name: callerName, isVideo: boolean }
        const { userToCall, signalData, from, name, isVideo } = data;
        // Emit to the specific user's room (handles multiple devices)
        io.to(userToCall).emit("callUser", {
            signal: signalData,
            from,
            name,
            isVideo
        });
    });

    socket.on("answerCall", (data) => {
        // data: { to: callerUserId, signal: answer }
        io.to(data.to).emit("callAccepted", data.signal);
    });

    socket.on("iceCandidate", (data) => {
        // data: { to: otherUserId, candidate: candidate }
        io.to(data.to).emit("iceCandidate", data.candidate);
    });

    socket.on("endCall", (data) => {
        // data: { to: otherUserId }
        io.to(data.to).emit("callEnded");
    });

    socket.on("rejectCall", (data) => {
        // data: { to: callerUserId }
        io.to(data.to).emit("callRejected");
    });

    // -------------------------------

    socket.on("disconnect", async () => {
        if (userId && userSocketMap[userId]) {
            userSocketMap[userId] = userSocketMap[userId].filter(id => id !== socket.id);
            if (userSocketMap[userId].length === 0) {
                delete userSocketMap[userId];
                // Update lastSeen in DB
                if (!isGhostMode) {
                    try {
                        // Lazy import to avoid circular dep issues if any, or just import at top?
                        // Top level import is fine.
                        await import("../models/User.js").then(({ default: User }) => {
                            User.findByIdAndUpdate(userId, { lastSeen: new Date() }).catch(err => console.error("Error updating lastSeen:", err));
                        });
                    } catch (e) { console.error(e); }
                }
            }
        }
        io.emit("getOnlineUsers", Object.keys(userSocketMap));
    });
});

export { io, app, server };
