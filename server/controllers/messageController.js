import Message from "../models/Message.js";
import User from "../models/User.js";
import cloudinary from "../lib/cloudinary.js";
import { io, userSocketMap } from "../lib/socket.js";

//Get all users except the logged in user
export const getUserForSidebar = async (req, res) => {
  try {
    const loggedInUserId = req.user._id;

    // Use aggregation to fetch users and count unseen messages in one go
    const filteredUsers = await User.aggregate([
      { $match: { _id: { $ne: loggedInUserId } } }, // Exclude current user
      {
        $project: {
          password: 0,
          // Conditionally project timestamps based on privacy.lastSeen
          // Logic: If privacy.lastSeen is false, set updatedAt to null or exclude it.
          // Since aggregation is complex for conditional field exclusion based on its own field value without $cond, we will process this in JS or use $cond
        }
      },
    ]);

    // Apply privacy filter in application layer for simplicity 
    // (or use complex $project with $cond if preferred, but JS is fine for 50-100 users)
    const usersWithPrivacy = filteredUsers.map(user => {
      if (user.privacy && user.privacy.lastSeen === false) {
        user.lastSeen = null; // Hide timestamp
      }
      return user;
    });

    // Fetch unseen message counts for these users efficiently
    const unseenCounts = await Message.aggregate([
      {
        $match: {
          receiverId: loggedInUserId,
          seen: false,
        },
      },
      {
        $group: {
          _id: "$senderId",
          count: { $sum: 1 },
        },
      },
    ]);

    // Convert array to object for O(1) lookup
    const unseenMessages = unseenCounts.reduce((acc, curr) => {
      acc[curr._id.toString()] = curr.count;
      return acc;
    }, {});

    res.json({ success: true, users: usersWithPrivacy, unseenMessages });
  } catch (err) {
    console.log(err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

//Get all messages for selected user
export const getMessages = async (req, res) => {
  try {
    const { id: chatId } = req.params; // This could be userId OR groupId
    const myId = req.user._id;

    // Check if chatId is a Group or User (simple heuristic or passed query param)
    // For now, let's assume we might need a separate route or check DB
    // To keep it simple and compatible:
    // If we call /messages/:id, check if 'id' is a group first? Or use query param ?type=group

    // Better strategy for this existing API:
    // We modify the query to check if it matches a group logic if simple user find fails?
    // Actually, explicit is better. Let's look for a query param or handle logic.
    const isGroup = req.query.isGroup === "true";

    let messages;
    if (isGroup) {
      messages = await Message.find({ groupId: chatId })
        .populate("senderId", "fullName profilePic"); // We need sender info for groups
    } else {
      messages = await Message.find({
        $or: [
          { senderId: myId, receiverId: chatId },
          { senderId: chatId, receiverId: myId },
        ],
      });
    }

    const user = await User.findById(myId);
    const undoWindow = user?.privacy?.undoWindow ?? 5; // Default 5 mins

    const visibleMessages = messages.filter(msg => {
      // If not deleted, show it
      if (!msg.deletedAt) return true;

      // Group logic update for deletion:
      // If deleted in group, who sees it? 
      // Usually "Deleted Message" for everyone. 
      // For now, let's apply same logic: Sender sees "Undo", others see nothing (or we implement "This message was deleted" text later)
      // Current logic: Receiver(s) don't see it.

      if (isGroup) {
        if (msg.senderId._id.toString() !== myId.toString()) return false;
      } else {
        if (msg.receiverId && msg.receiverId.toString() === myId.toString()) return false;
      }

      // Sender: See it ONLY if within undo window
      if ((isGroup ? msg.senderId._id.toString() : msg.senderId.toString()) === myId.toString()) {
        const diffMinutes = (Date.now() - new Date(msg.deletedAt).getTime()) / 1000 / 60;
        return diffMinutes <= undoWindow;
      }

      return false;
    });

    if (!isGroup) {
      await Message.updateMany(
        { senderId: chatId, receiverId: myId, seen: false },
        { seen: true }
      );
    }

    // Lazy Expiration Check
    const now = new Date();
    const expiredMessages = visibleMessages.filter(m => m.pinned && m.pinnedAt && (now - new Date(m.pinnedAt) > 24 * 60 * 60 * 1000));

    if (expiredMessages.length > 0) {
      await Promise.all(expiredMessages.map(async (msg) => {
        await Message.findByIdAndUpdate(msg._id, { pinned: false, pinnedBy: null, pinnedAt: null });
      }));
      // Update local list for response
      visibleMessages.forEach(m => {
        if (expiredMessages.some(em => em._id.equals(m._id))) {
          m.pinned = false;
          m.pinnedBy = null;
          m.pinnedAt = null;
        }
      });
    }

    res.json({ success: true, messages: visibleMessages });
  } catch (err) {
    console.log(err.message);
    res.json({ success: false, message: err.message });
  }
};

export const markMessageAsSeen = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    // Check if user has read receipts enabled
    const user = await User.findById(userId);
    if (user.privacy && user.privacy.readReceipts === false) {
      return res.json({ success: true, message: "Read receipts disabled" });
    }

    await Message.findByIdAndUpdate(id, { seen: true });
    res.json({ success: true });
  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
};

//send message to selected user
export const sendMessage = async (req, res) => {
  try {
    const { text, image, audio, groupId } = req.body; // Added groupId
    const receiverId = req.params.id; // Still used for DM
    const senderId = req.user._id;

    if (!groupId) {
      const sender = await User.findById(senderId);
      const receiver = await User.findById(receiverId);
      if (sender.blockedUsers.includes(receiverId) || receiver.blockedUsers.includes(senderId)) {
        return res.status(403).json({ success: false, message: "You cannot send messages to this user." });
      }
    }

    let imageUrl;
    if (image) {
      const uploadResponse = await cloudinary.uploader.upload(image);
      imageUrl = uploadResponse.secure_url;
    }

    let audioUrl;
    if (audio) {
      // Upload audio (resource_type: "video" is often used for audio in Cloudinary, or "auto")
      const uploadResponse = await cloudinary.uploader.upload(audio, { resource_type: "video" });
      audioUrl = uploadResponse.secure_url;
    }

    let newMessage;
    if (groupId) {
      // Group Message
      newMessage = await Message.create({
        senderId,
        groupId,
        text,
        image: imageUrl,
        audio: audioUrl,
      });

      // Populate sender info for immediate display
      await newMessage.populate('senderId', 'fullName profilePic');

      // Emit to Group Room
      // Assuming clients join room "group_{groupId}"
      io.to(`group_${groupId}`).emit("newGroupMessage", newMessage);
    } else {
      // DM
      newMessage = await Message.create({
        senderId,
        receiverId,
        text,
        image: imageUrl,
        audio: audioUrl,
      });

      // Emit to Receiver's Room (all their tabs)
      io.to(receiverId).emit("newMessage", newMessage);

      // Emit to Sender's Room (all their OTHER tabs)
      io.to(senderId).emit("newMessage", newMessage);
    }

    res.json({ success: true, newMessage });
  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
};

export const updateMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { text } = req.body;
    const userId = req.user._id;

    const message = await Message.findById(id);

    if (!message) {
      return res.status(404).json({ success: false, message: "Message not found" });
    }

    if (message.senderId.toString() !== userId.toString()) {
      return res.status(403).json({ success: false, message: "Unauthorized to edit this message" });
    }

    message.text = text;
    // Optional: Add an edited flag or timestamp if schema permits, for now just text
    // message.isEdited = true; 
    await message.save();

    if (message.groupId) {
      io.to(`group_${message.groupId}`).emit("messageUpdated", message);
    } else {
      // Emit to Receiver
      io.to(message.receiverId.toString()).emit("messageUpdated", message);
      // Emit to Sender
      io.to(message.senderId.toString()).emit("messageUpdated", message);
    }

    res.json({ success: true, message });
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const message = await Message.findById(id);

    if (!message) {
      return res.status(404).json({ success: false, message: "Message not found" });
    }

    if (message.senderId.toString() !== userId.toString()) {
      return res.status(403).json({ success: false, message: "Unauthorized to delete this message" });
    }

    message.deletedAt = new Date();
    await message.save();

    if (message.groupId) {
      io.to(`group_${message.groupId}`).emit("messageDeleted", id);
    } else {
      // Emit deletion to Receiver
      io.to(message.receiverId.toString()).emit("messageDeleted", id);
      // Emit deletion to Sender (sync other tabs)
      io.to(message.senderId.toString()).emit("messageDeleted", id);
    }

    res.json({ success: true, messageId: id });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const undoDeleteMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    const message = await Message.findById(id);
    const user = await User.findById(userId);

    if (!message) return res.status(404).json({ success: false, message: "Message not found" });
    if (message.senderId.toString() !== userId.toString()) return res.status(403).json({ success: false, message: "Unauthorized" });

    const undoWindowMinutes = user.privacy?.undoWindow || 5;
    const deletedTime = new Date(message.deletedAt).getTime();
    const now = new Date().getTime();
    const diffMinutes = (now - deletedTime) / 1000 / 60;

    if (diffMinutes > undoWindowMinutes) {
      return res.status(400).json({ success: false, message: "Undo window expired" });
    }

    message.deletedAt = null;
    await message.save();

    if (message.groupId) {
      io.to(`group_${message.groupId}`).emit("messageRestored", message);
    } else {
      // Emit to Receiver
      io.to(message.receiverId.toString()).emit("messageRestored", message);
      // Emit to Sender
      io.to(message.senderId.toString()).emit("messageRestored", message);
    }

    res.json({ success: true, message });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const addReaction = async (req, res) => {
  try {
    const { id } = req.params;
    const { emoji } = req.body;
    const userId = req.user._id;

    const message = await Message.findById(id);
    if (!message) return res.status(404).json({ success: false, message: "Message not found" });

    // Check if user already reacted with THIS emoji? Or any emoji?
    // Usually one reaction per user per message, or multiple?
    // Let's allow one reaction per user for simplicity (like WhatsApp/Telegram usually replace)
    // OR allow toggling.

    // Strategy: If user already reacted, update it. If same emoji, remove it (toggle).
    const existingReactionIndex = message.reactions.findIndex(r => r.userId.toString() === userId.toString());

    if (existingReactionIndex !== -1) {
      if (message.reactions[existingReactionIndex].emoji === emoji) {
        // Toggle off
        message.reactions.splice(existingReactionIndex, 1);
      } else {
        // Update emoji
        message.reactions[existingReactionIndex].emoji = emoji;
      }
    } else {
      // Add new
      message.reactions.push({ userId, emoji });
    }

    await message.save();

    // Populate user info for the reaction if needed by frontend, or just send raw
    // Usually we need at least the uerId, which is there.

    // Emit event
    if (message.groupId) {
      io.to(`group_${message.groupId}`).emit("messageReaction", { messageId: id, reactions: message.reactions });
    } else {
      io.to(message.receiverId.toString()).emit("messageReaction", { messageId: id, reactions: message.reactions });
      io.to(message.senderId.toString()).emit("messageReaction", { messageId: id, reactions: message.reactions });
    }

    res.json({ success: true, reactions: message.reactions });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const pinMessage = async (req, res) => {
  try {
    const { id: messageId } = req.params;
    const userId = req.user._id;

    const message = await Message.findById(messageId);
    if (!message) return res.status(404).json({ success: false, message: "Message not found" });

    message.pinned = true;
    message.pinnedBy = userId;
    message.pinnedAt = new Date();
    await message.save();

    const updatedMessage = await Message.findById(messageId)
      .populate("senderId", "fullName profilePic")
      .populate("pinnedBy", "fullName");

    const io = req.app.get("io");
    if (io) {
      const room = message.groupId ? `group_${message.groupId}` : null;
      if (room) {
        io.to(room).emit("messageUpdated", updatedMessage);
        // Also emit specific event for pinned message list updates if necessary
        io.to(room).emit("messagePinned", updatedMessage);
      } else {
        const { getReceiverSocketId } = await import("../lib/socket.js");
        const receiverSocketId = getReceiverSocketId(message.receiverId);
        const senderSocketId = getReceiverSocketId(message.senderId);
        if (receiverSocketId) {
          io.to(receiverSocketId).emit("messageUpdated", updatedMessage);
          io.to(receiverSocketId).emit("messagePinned", updatedMessage);
        }
        if (senderSocketId) {
          io.to(senderSocketId).emit("messageUpdated", updatedMessage);
          io.to(senderSocketId).emit("messagePinned", updatedMessage);
        }
      }
    }

    res.status(200).json({ success: true, message: updatedMessage });
  } catch (error) {
    console.log("Error in pinMessage:", error.message);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const unpinMessage = async (req, res) => {
  try {
    const { id: messageId } = req.params;
    const message = await Message.findById(messageId);
    if (!message) return res.status(404).json({ success: false, message: "Message not found" });

    if (!message.pinned) return res.status(400).json({ success: false, message: "Message is not pinned" });

    // Permission Check: User can only unpin if they pinned it
    if (message.pinnedBy && message.pinnedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: "You can only unpin messages you pinned" });
    }

    message.pinned = false;
    message.pinnedBy = null;
    message.pinnedAt = null;
    await message.save();

    const updatedMessage = await Message.findById(messageId).populate("senderId", "fullName profilePic");

    const io = req.app.get("io");
    if (io) {
      const room = message.groupId ? `group_${message.groupId}` : null;
      if (room) {
        io.to(room).emit("messageUpdated", updatedMessage);
        io.to(room).emit("messageUnpinned", messageId);
      } else {
        const { getReceiverSocketId } = await import("../lib/socket.js");
        const receiverSocketId = getReceiverSocketId(message.receiverId);
        const senderSocketId = getReceiverSocketId(message.senderId);
        if (receiverSocketId) {
          io.to(receiverSocketId).emit("messageUpdated", updatedMessage);
          io.to(receiverSocketId).emit("messageUnpinned", messageId);
        }
        if (senderSocketId) {
          io.to(senderSocketId).emit("messageUpdated", updatedMessage);
          io.to(senderSocketId).emit("messageUnpinned", messageId);
        }
      }
    }

    res.status(200).json({ success: true, message: updatedMessage });
  } catch (error) {
    console.log("Error in unpinMessage:", error.message);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
