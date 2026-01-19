import mongoose from "mongoose";

const conversationSchema = new mongoose.Schema(
    {
        participants: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User",
                required: true,
            },
        ],
        ephemeralDuration: {
            type: Number,
            default: 0, // 0 means off (permanent)
            // Common constants: 24*60*60 (24h), 7*24*60*60 (7d), 90*24*60*60 (90d)
        },
    },
    { timestamps: true }
);

// Index for finding 1:1 conversation easily
conversationSchema.index({ participants: 1 });

const Conversation = mongoose.model("Conversation", conversationSchema);
export default Conversation;
