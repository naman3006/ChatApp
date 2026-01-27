import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
    },
    pollId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Poll",
    },

    text: { type: String },
    image: { type: String },
    audio: { type: String },
    file: {
      url: { type: String },
      publicId: { type: String },
      name: { type: String },
      size: { type: String },
      mimeType: { type: String }
    },
    pinned: { type: Boolean, default: false },
    pinnedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    pinnedAt: { type: Date },
    seen: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
    isSystemMessage: { type: Boolean, default: false },
    isForwarded: { type: Boolean, default: false },
    expiresAt: { type: Date, default: null }, // For ephemeral messages
    reactions: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        emoji: { type: String, required: true },
      },
    ],

    translations: {
      type: Map,
      of: String,
      default: {},
    },
    linkMetadata: {
      title: { type: String },
      description: { type: String },
      image: { type: String },
      url: { type: String }
    },
  },
  { timestamps: true }
);

// Indexes for performance
messageSchema.index({ groupId: 1, createdAt: -1 });
messageSchema.index({ senderId: 1, receiverId: 1, createdAt: -1 });
messageSchema.index({ receiverId: 1, senderId: 1, createdAt: -1 });
// TTL Index for ephemeral messages
messageSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
// Duplicate index removed

const Message = mongoose.model("Message", messageSchema);
export default Message;
