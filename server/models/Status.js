import mongoose from "mongoose";

const statusSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    mediaUrl: { type: String, required: true },
    mediaType: { type: String, enum: ["image", "video"], required: true },
    caption: { type: String, default: "" },
    music: {
        url: { type: String }, // Preview URL
        title: { type: String },
        artist: { type: String },
        thumbnail: { type: String }
    },
    viewers: [{
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        viewedAt: { type: Date, default: Date.now }
    }],
    createdAt: { type: Date, default: Date.now },
}, { timestamps: true });

// TTL Index for 24 hours (86400 seconds)
statusSchema.index({ createdAt: 1 }, { expireAfterSeconds: 86400 });
statusSchema.index({ userId: 1 });

const Status = mongoose.model("Status", statusSchema);
export default Status;