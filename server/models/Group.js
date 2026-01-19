import mongoose from "mongoose";

const groupSchema = new mongoose.Schema(
    {
        name: { type: String, required: true },
        icon: { type: String, default: "" },
        admins: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User",
            },
        ],
        members: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User",
            },
        ],
        theme: {
            type: { type: String, enum: ['solid', 'gradient', 'image'], default: 'solid' },
            value: { type: String, default: '' }, // CSS Color or Image URL
            id: { type: String, default: 'default' } // 'default', 'custom', or preset ID
        },
        ephemeralDuration: {
            type: Number,
            default: 0, // 0 means off
        },
    },
    { timestamps: true }
);

const Group = mongoose.model("Group", groupSchema);
export default Group;
