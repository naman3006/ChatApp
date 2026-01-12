import mongoose from "mongoose";

const apiKeySchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    keyHash: {
        type: String,
        required: true
    },
    permissions: {
        type: [String],
        enum: ["send_message"],
        default: ["send_message"]
    },
    lastUsed: {
        type: Date
    }
}, { timestamps: true });

// Index for faster lookups
apiKeySchema.index({ userId: 1 });

const ApiKey = mongoose.model("ApiKey", apiKeySchema);
export default ApiKey;
