import mongoose from "mongoose";

const pollSchema = new mongoose.Schema(
    {
        question: {
            type: String,
            required: true,
        },
        options: [
            {
                text: { type: String, required: true },
                votes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
            },
        ],
        creatorId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        groupId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Group",
            required: true,
        },
        allowMultipleAnswers: {
            type: Boolean,
            default: false,
        },
    },
    { timestamps: true }
);

pollSchema.index({ groupId: 1 });

const Poll = mongoose.model("Poll", pollSchema);
export default Poll;
