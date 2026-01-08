import mongoose from "mongoose";

const reportSchema = new mongoose.Schema({
    reporterId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    reportedId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    reason: {
        type: String,
        required: true,
        enum: ["spam", "harassment", "inappropriate", "other"],
    },
    description: {
        type: String,
    },
    status: {
        type: String,
        enum: ["pending", "reviewed", "resolved"],
        default: "pending",
    },
}, { timestamps: true });

const Report = mongoose.model("Report", reportSchema);
export default Report;
