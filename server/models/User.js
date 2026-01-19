import mongoose from "mongoose"

const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    fullName: { type: String, required: true },
    password: { type: String, required: true, minlength: 6 },
    profilePic: { type: String, default: "" },
    bio: { type: String },
    privacy: {
        ghostMode: { type: Boolean, default: false },
        lastSeen: { type: Boolean, default: true },
        readReceipts: { type: Boolean, default: true },
        undoWindow: { type: Number, default: 5 }, // Minutes
        defaultEphemeralDuration: { type: Number, default: 0 }, // 0 = Off
    },
    blockedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    chatThemes: {
        type: Map,
        of: new mongoose.Schema({
            type: { type: String, enum: ['solid', 'gradient', 'image'], default: 'solid' },
            value: { type: String, default: '' },
            id: { type: String, default: 'default' }
        }, { _id: false })
    },
    lastSeen: { type: Date, default: Date.now },
}, { timestamps: true })

const User = mongoose.model("User", userSchema)
export default User;