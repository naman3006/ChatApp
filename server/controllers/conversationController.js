import Conversation from "../models/Conversation.js";
import User from "../models/User.js";
import { io } from "../lib/socket.js";

// Toggle or Set Ephemeral Duration for 1:1 Chat
export const toggleEphemeralMode = async (req, res) => {
    try {
        const { id: partnerId } = req.params;
        const { duration } = req.body; // Duration in seconds (0 = off)
        const userId = req.user._id;

        // 1. Find existing conversation or create new one
        let conversation = await Conversation.findOne({
            participants: { $all: [userId, partnerId] },
        });

        if (!conversation) {
            conversation = await Conversation.create({
                participants: [userId, partnerId],
                ephemeralDuration: duration,
            });
        } else {
            conversation.ephemeralDuration = duration;
            await conversation.save();
        }

        // 2. Notify both users via Socket
        // Receiver
        io.to(partnerId).emit("chatSettingsUpdated", {
            chatId: userId, // From perspective of receiver, chat ID is the sender
            ephemeralDuration: duration,
            type: "user"
        });
        // Sender (other tabs)
        io.to(userId.toString()).emit("chatSettingsUpdated", {
            chatId: partnerId,
            ephemeralDuration: duration,
            type: "user"
        });

        res.json({ success: true, conversation });
    } catch (error) {
        console.log("Error in toggleEphemeralMode:", error.message);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// Get Conversation Settings (called when opening a chat)
export const getConversationSettings = async (req, res) => {
    try {
        const { id: partnerId } = req.params;
        const userId = req.user._id;

        const conversation = await Conversation.findOne({
            participants: { $all: [userId, partnerId] },
        });

        res.json({
            success: true,
            ephemeralDuration: conversation ? conversation.ephemeralDuration : 0,
        });
    } catch (error) {
        console.log("Error in getConversationSettings:", error.message);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};
