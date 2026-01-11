import Status from "../models/Status.js";
import cloudinary from "../lib/cloudinary.js";

// Create a new status
export const createStatus = async (req, res) => {
    try {
        const { media, type, caption, music } = req.body;
        const userId = req.user._id;

        if (!media) {
            return res.status(400).json({ success: false, message: "Media is required" });
        }

        let mediaUrl;
        // Default to image if not specified
        let resourceType = type === 'video' ? 'video' : 'image';

        try {
            const uploadResponse = await cloudinary.uploader.upload(media, {
                resource_type: resourceType
            });
            mediaUrl = uploadResponse.secure_url;
        } catch (uploadError) {
            console.error("Cloudinary upload error:", uploadError);
            return res.status(500).json({ success: false, message: "Image upload failed" });
        }

        const newStatus = new Status({
            userId,
            mediaUrl,
            mediaType: resourceType,
            mediaType: resourceType,
            caption,
            music
        });

        await newStatus.save();
        await newStatus.populate("userId", "fullName profilePic");

        res.status(201).json({ success: true, status: newStatus });
    } catch (error) {
        console.error("Error creating status:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// Get all statuses suitable for display (grouped by user)
export const getStatuses = async (req, res) => {
    try {
        // Fetch statuses created in the last 24 hours
        const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);

        const statuses = await Status.find({ createdAt: { $gt: cutoff } })
            .populate("userId", "fullName profilePic")
            .sort({ createdAt: 1 }); // Ascending order (oldest first) for story playback

        // Group by user
        const groupedMap = {};

        statuses.forEach(status => {
            const userId = status.userId._id.toString();

            if (!groupedMap[userId]) {
                groupedMap[userId] = {
                    _id: userId,
                    user: status.userId,
                    statuses: []
                };
            }
            groupedMap[userId].statuses.push(status);
        });

        const groupedStatuses = Object.values(groupedMap);

        res.json({ success: true, statuses: groupedStatuses });
    } catch (error) {
        console.error("Error fetching statuses:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// Mark status as viewed
export const viewStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user._id;

        const status = await Status.findById(id);
        if (!status) {
            return res.status(404).json({ success: false, message: "Status not found" });
        }

        // Check if already viewed
        const alreadyViewed = status.viewers.some(v => v.userId.toString() === userId.toString());
        if (!alreadyViewed) {
            status.viewers.push({ userId });
            await status.save();
        }

        res.json({ success: true });
    } catch (error) {
        console.error("Error viewing status:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// Delete status
export const deleteStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user._id;

        const status = await Status.findById(id);
        if (!status) return res.status(404).json({ success: false, message: "Status not found" });

        if (status.userId.toString() !== userId.toString()) {
            return res.status(403).json({ success: false, message: "Unauthorized" });
        }

        await Status.findByIdAndDelete(id);
        res.json({ success: true, message: "Status deleted" });
    } catch (error) {
        console.error("Error deleting status:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};
