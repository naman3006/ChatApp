import Message from "../models/Message.js";
import User from "../models/User.js";
import Group from "../models/Group.js";
import Conversation from "../models/Conversation.js";
import cloudinary from "../lib/cloudinary.js";
import { io, userSocketMap } from "../lib/socket.js";
// import translate from 'google-translate-api-x'; // dynamic import in function
import ogs from 'open-graph-scraper';

//Get all users except the logged in user
export const getUserForSidebar = async (req, res) => {
  try {
    const loggedInUserId = req.user._id;

    // 1. Fetch all users except logged in user
    const filteredUsers = await User.aggregate([
      { $match: { _id: { $ne: loggedInUserId } } },
      {
        $project: {
          password: 0,
        }
      },
    ]);

    // 2. Get last message timestamp for each conversation to sort sidebar
    const lastMessages = await Message.aggregate([
      {
        $match: {
          $or: [{ senderId: loggedInUserId }, { receiverId: loggedInUserId }],
          groupId: { $exists: false } // Ignore group messages for DM sorting
        },
      },
      {
        $sort: { createdAt: -1 },
      },
      {
        $group: {
          _id: {
            $cond: {
              if: { $eq: ["$senderId", loggedInUserId] },
              then: "$receiverId",
              else: "$senderId",
            },
          },
          lastMessageTime: { $first: "$createdAt" },
        },
      },
    ]);

    // Create Map for O(1) lookup
    const lastMessageMap = new Map();
    lastMessages.forEach(msg => {
      if (msg._id) { // Safety check
        lastMessageMap.set(msg._id.toString(), new Date(msg.lastMessageTime).getTime());
      }
    });

    // 3. Process users: Apply privacy & sorting
    const usersWithMetadata = filteredUsers.map(user => {
      if (user.privacy && user.privacy.lastSeen === false) {
        user.lastSeen = null;
      }
      // Attach timestamp (default to 0 to put at bottom if no chat)
      user.lastMessageTime = lastMessageMap.get(user._id.toString()) || 0;
      return user;
    });

    // Sort: Newest message first
    usersWithMetadata.sort((a, b) => b.lastMessageTime - a.lastMessageTime);

    // 4. Fetch unseen message counts
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

    const unseenMessages = unseenCounts.reduce((acc, curr) => {
      acc[curr._id.toString()] = curr.count;
      return acc;
    }, {});

    res.json({ success: true, users: usersWithMetadata, unseenMessages });
  } catch (err) {
    console.log(err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

export const searchMessages = async (req, res) => {
  try {
    const { query } = req.query;
    if (!query || query.trim() === "") {
      return res.json({ success: true, messages: [] });
    }

    const userId = req.user._id;

    // Find all groups the user is a member of
    const userGroups = await Group.find({ members: userId }).select('_id');
    const groupIds = userGroups.map(g => g._id);

    // Search Messages
    const messages = await Message.find({
      $and: [
        { text: { $regex: query, $options: "i" } }, // Case-insensitive partial match
        {
          $or: [
            { senderId: userId },
            { receiverId: userId },
            { groupId: { $in: groupIds } }
          ]
        },
        { deletedAt: null } // Exclude deleted messages
      ]
    })
      .sort({ createdAt: -1 })
      .populate("senderId", "fullName profilePic")
      .populate("receiverId", "fullName profilePic")
      .populate("groupId", "name icon");

    res.json({ success: true, messages });

  } catch (error) {
    console.log("Error in searchMessages:", error.message);
    res.status(500).json({ success: false, message: "Internal server error" });
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
    const limitParam = parseInt(req.query.limit) || 50;
    const unreadCount = parseInt(req.query.unreadCount) || 0;
    const isFirstPage = (parseInt(req.query.page) || 1) === 1;

    // If it's the first page and we have unread messages, fetch enough to cover them + context
    const limit = (isFirstPage && unreadCount > 0) ? Math.max(limitParam, unreadCount + 10) : limitParam;

    const page = parseInt(req.query.page) || 1;
    const skip = (page - 1) * limit;

    let messages;
    if (isGroup) {
      messages = await Message.find({ groupId: chatId })
        .sort({ createdAt: -1 }) // Get newest first
        .skip(skip)
        .limit(limit)
        .populate("senderId", "fullName profilePic");

      // Reverse to chronological order for frontend
      messages = messages.reverse();
    } else {
      messages = await Message.find({
        $or: [
          { senderId: myId, receiverId: chatId },
          { senderId: chatId, receiverId: myId },
        ],
      })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      messages = messages.reverse();
    }

    // Check if there are more messages (approximate check)
    const hasMore = messages.length === limit;

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

    res.json({ success: true, messages: visibleMessages, hasMore: messages.length === limit });
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
    const { text, image, audio, file, groupId } = req.body; // Added file
    const receiverId = req.params.id; // Still used for DM
    const senderId = req.user._id;

    if (!groupId) {
      const sender = await User.findById(senderId);
      const receiver = await User.findById(receiverId);
      if (sender.blockedUsers.includes(receiverId) || receiver.blockedUsers.includes(senderId)) {
        return res.status(403).json({ success: false, message: "You cannot send messages to this user." });
      }
    }

    let expiresAt = null;
    let duration = 0;

    if (groupId) {
      const group = await Group.findById(groupId);
      if (group && group.ephemeralDuration > 0) {
        duration = group.ephemeralDuration;
      }
    } else {
      const conversation = await Conversation.findOne({
        participants: { $all: [senderId, receiverId] }
      });
      if (conversation && conversation.ephemeralDuration > 0) {
        duration = conversation.ephemeralDuration;
      }
    }

    if (duration > 0) {
      expiresAt = new Date(Date.now() + duration * 1000);
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

    let fileData = null;
    if (file) {
      // file object expected to have { data, name, type, size }
      // Upload raw file
      try {
        const uploadResponse = await cloudinary.uploader.upload(file.data, {
          resource_type: "auto", // "auto" detects if it's a pdf/image/raw
          // For generic files, "raw" might be safer to avoid transformation errors, but "auto" is flexible
          // Let's stick to "auto" but if it fails for specific types we might need "raw"
          // actually standard practice for non-media is "raw" usually. 
          // However, if we want PDF previews later, "image" or "auto" is better.
          // Let's use "auto" for now.
          folder: "chat_files"
        });

        fileData = {
          url: uploadResponse.secure_url,
          publicId: uploadResponse.public_id,
          name: file.name,
          size: file.size,
          mimeType: file.type
        };
      } catch (err) {
        console.error("File upload error:", err);
        // Continue without file or throw? Let's throw to notify user
        throw new Error("File upload failed");
      }
    }

    let linkMetadata = null;
    if (text) {
      // Simple regex to find the first URL
      const urlRegex = /(https?:\/\/[^\s]+)/g;
      const match = text.match(urlRegex);
      if (match && match[0]) {
        try {
          const { result } = await ogs({ url: match[0] });
          if (result && result.success) {
            linkMetadata = {
              title: result.ogTitle,
              description: result.ogDescription,
              image: result.ogImage?.length > 0 ? result.ogImage[0].url : (result.ogImage?.url || null),
              url: match[0]
            };
          }
        } catch (err) {
          console.error("OGS Error:", err);
          // Proceed without metadata
        }
      }
    }

    let newMessage;
    const messageData = {
      senderId,
      text,
      image: imageUrl,
      audio: audioUrl,
      file: fileData,
      linkMetadata,
      expiresAt,
    };

    if (groupId) {
      // Group Message
      messageData.groupId = groupId;
      newMessage = await Message.create(messageData);

      // Populate sender info for immediate display
      await newMessage.populate('senderId', 'fullName profilePic');

      // Emit to Group Room
      io.to(`group_${groupId}`).emit("newGroupMessage", newMessage);
    } else {
      // DM
      messageData.receiverId = receiverId;
      newMessage = await Message.create(messageData);

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

export const forwardMessages = async (req, res) => {
  try {
    const { messageIds, recipientIds } = req.body;
    const senderId = req.user._id;

    if (!messageIds || !Array.isArray(messageIds) || messageIds.length === 0) {
      return res.status(400).json({ success: false, message: "No messages selected" });
    }
    if (!recipientIds || !Array.isArray(recipientIds) || recipientIds.length === 0) {
      return res.status(400).json({ success: false, message: "No recipients selected" });
    }

    const messagesToForward = await Message.find({ _id: { $in: messageIds } });

    // Iterate through each recipient (User or Group)
    for (const recipientId of recipientIds) {
      // Determine if recipient is a Group or User (naive check: look for group, if not assume user)
      const groupValidator = await Group.findById(recipientId);
      const isGroup = !!groupValidator;

      let duration = 0;
      let expiresAt = null;

      if (isGroup) {
        if (groupValidator.ephemeralDuration > 0) duration = groupValidator.ephemeralDuration;
      } else {
        const conversation = await Conversation.findOne({
          participants: { $all: [senderId, recipientId] }
        });
        if (conversation && conversation.ephemeralDuration > 0) duration = conversation.ephemeralDuration;
      }

      if (duration > 0) expiresAt = new Date(Date.now() + duration * 1000);

      // Create new messages for this recipient
      const newMessages = await Promise.all(messagesToForward.map(async (originalMsg) => {
        const msgData = {
          senderId,
          text: originalMsg.text,
          image: originalMsg.image,
          audio: originalMsg.audio,
          isForwarded: true,
          expiresAt
        };

        if (isGroup) {
          msgData.groupId = recipientId;
        } else {
          msgData.receiverId = recipientId;
        }

        const newMsg = await Message.create(msgData);
        // Populate for minimal display requirement if needed immediately
        return newMsg.populate('senderId', 'fullName profilePic');
      }));

      // Emit events
      for (const newMsg of newMessages) {
        if (isGroup) {
          io.to(`group_${recipientId}`).emit("newGroupMessage", newMsg);
        } else {
          io.to(recipientId).emit("newMessage", newMsg);
          io.to(senderId).emit("newMessage", newMsg);
        }
      }
    }

    res.json({ success: true, message: "Messages forwarded successfully" });

  } catch (error) {
    console.log("Error in forwardMessages:", error.message);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const translateMessage = async (req, res) => {
  try {
    const { id: messageId } = req.params;
    const { targetLang } = req.body;

    if (!targetLang) {
      return res.status(400).json({ success: false, message: "Target language required" });
    }

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ success: false, message: "Message not found" });
    }

    // Check if translation exists
    if (message.translations && message.translations.get(targetLang)) {
      return res.json({ success: true, translation: message.translations.get(targetLang) });
    }

    // Translate
    const { translate } = await import('google-translate-api-x');
    const result = await translate(message.text, { to: targetLang });

    // Save to cache
    if (!message.translations) {
      message.translations = new Map();
    }
    message.translations.set(targetLang, result.text);
    await message.save();

    res.json({ success: true, translation: result.text });

  } catch (error) {
    console.error("Translation error:", error);
    res.status(500).json({ success: false, message: "Translation failed" });
  }
};

export const toggleStarMessage = async (req, res) => {
  try {
    const { id: messageId } = req.params;
    const userId = req.user._id;

    const user = await User.findById(userId);
    const isStarred = user.starredMessages.includes(messageId);

    if (isStarred) {
      await User.findByIdAndUpdate(userId, { $pull: { starredMessages: messageId } });
      res.json({ success: true, message: "Message unstarred", isStarred: false });
    } else {
      await User.findByIdAndUpdate(userId, { $push: { starredMessages: messageId } });
      res.json({ success: true, message: "Message starred", isStarred: true });
    }
  } catch (error) {
    console.error("Error in toggleStarMessage:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const getStarredMessages = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId).populate({
      path: "starredMessages",
      populate: { path: "senderId", select: "fullName profilePic" }
    });

    res.json({ success: true, starredMessages: user.starredMessages });
  } catch (error) {
    console.error("Error in getStarredMessages:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
