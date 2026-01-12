import crypto from "crypto";
import ApiKey from "../models/ApiKey.js";
import Message from "../models/Message.js";
import User from "../models/User.js";
import { io, getReceiverSocketId } from "../lib/socket.js";

// Helper to hash key
const hashKey = (key) => {
    return crypto.createHash("sha256").update(key).digest("hex");
};

// Generate a new API Key for the user
export const generateApiKey = async (req, res) => {
    try {
        const { name } = req.body;
        const userId = req.user._id;

        if (!name) {
            return res.status(400).json({ success: false, message: "Key name is required" });
        }

        // Generate a random key (prefix for easy ID)
        const rawKey = "sk_chat_" + crypto.randomBytes(32).toString("hex");
        const keyHash = hashKey(rawKey);

        const newApiKey = await ApiKey.create({
            userId,
            name,
            keyHash
        });

        // Return the RAW key only once
        res.status(201).json({
            success: true,
            data: {
                _id: newApiKey._id,
                name: newApiKey.name,
                apiKey: rawKey, // Show this only now
                createdAt: newApiKey.createdAt
            }
        });
    } catch (error) {
        console.log("Error generating API key:", error);
        res.status(500).json({ success: false, message: "Failed to generate API Key" });
    }
};

// List user's API keys
export const listApiKeys = async (req, res) => {
    try {
        const userId = req.user._id;
        const keys = await ApiKey.find({ userId }).select("-keyHash").sort({ createdAt: -1 });

        res.json({ success: true, keys });
    } catch (error) {
        console.log("Error listing API keys:", error);
        res.status(500).json({ success: false, message: "Failed to list API Keys" });
    }
};

// Revoke (Delete) an API Key
export const revokeApiKey = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user._id;

        await ApiKey.findOneAndDelete({ _id: id, userId });

        res.json({ success: true, message: "API Key revoked successfully" });
    } catch (error) {
        console.log("Error revoking API key:", error);
        res.status(500).json({ success: false, message: "Failed to revoke API Key" });
    }
};

// Handle Incoming External Message
export const handleExternalMessage = async (req, res) => {
    try {
        const apiKey = req.headers["x-api-key"];

        if (!apiKey) {
            return res.status(401).json({ success: false, message: "Missing x-api-key header" });
        }

        // Validate Key
        const hashed = hashKey(apiKey);
        const validKey = await ApiKey.findOne({ keyHash: hashed }).populate("userId");

        if (!validKey) {
            return res.status(401).json({ success: false, message: "Invalid API Key" });
        }

        // Update usage
        validKey.lastUsed = new Date();
        await validKey.save();

        const sender = validKey.userId;
        const { toUserId, text, image, groupId } = req.body;

        if (!text && !image) {
            return res.status(400).json({ success: false, message: "Message must contain text or image" });
        }

        let newMessage;

        if (groupId) {
            // Group Msg Logic (Simplified for external)
            newMessage = await Message.create({
                senderId: sender._id,
                groupId,
                text,
                image
            });
            await newMessage.populate("senderId", "fullName profilePic");
            io.to(`group_${groupId}`).emit("newGroupMessage", newMessage);

        } else if (toUserId) {
            // DM Logic
            const receiver = await User.findById(toUserId);
            if (!receiver) {
                return res.status(404).json({ success: false, message: "Receiver not found" });
            }

            newMessage = await Message.create({
                senderId: sender._id,
                receiverId: toUserId,
                text,
                image
            });

            await newMessage.populate("senderId", "fullName profilePic");

            // Real-time emission
            const receiverSocketId = getReceiverSocketId(toUserId);
            if (receiverSocketId) {
                io.to(receiverSocketId).emit("newMessage", newMessage);
            }

            // Also emit to sender (developer's account sessions)
            const senderSocketId = getReceiverSocketId(sender._id);
            if (senderSocketId) {
                io.to(senderSocketId).emit("newMessage", newMessage);
            }
        } else {
            return res.status(400).json({ success: false, message: "Must provide toUserId or groupId" });
        }

        res.json({ success: true, message: "Message sent", data: newMessage });

    } catch (error) {
        console.log("Error handling external message:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};
