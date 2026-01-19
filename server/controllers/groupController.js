import Group from "../models/Group.js";
import User from "../models/User.js";
import cloudinary from "../lib/cloudinary.js";
import { io, userSocketMap } from "../lib/socket.js";

export const createGroup = async (req, res) => {
    try {
        const { name, members } = req.body; // members is array of UserIds
        const adminId = req.user._id;

        if (!name || !members || members.length === 0) {
            return res.status(400).json({ success: false, message: "Group name and members are required" });
        }

        // Ensure admin is also a member
        const allMembers = [...new Set([...members, adminId.toString()])];

        const newGroup = await Group.create({
            name,
            admins: [adminId],
            members: allMembers
        });

        const populatedGroup = await Group.findById(newGroup._id)
            .populate("members", "-password")
            .populate("admins", "-password");

        // Add online members to the socket room immediately
        allMembers.forEach(memberId => {
            const socketIds = userSocketMap[memberId];
            if (socketIds) {
                socketIds.forEach(socketId => {
                    const socket = io.sockets.sockets.get(socketId);
                    if (socket) {
                        socket.join(`group_${newGroup._id}`);
                        // Notify them to refresh groups
                        io.to(socketId).emit("groupAdded", populatedGroup);
                    }
                });
            }
        });

        res.status(201).json({ success: true, group: populatedGroup });
    } catch (error) {
        console.log(error);
        res.status(500).json({ success: false, message: "Failed to create group" });
    }
};

export const getGroups = async (req, res) => {
    try {
        const userId = req.user._id;
        const groups = await Group.find({ members: userId })
            .populate("members", "-password")
            .populate("admins", "-password") // Populate admins instead of admin
            .sort({ updatedAt: -1 });

        res.json({ success: true, groups: groups });
    } catch (error) {
        console.log(error);
        res.status(500).json({ success: false, message: "Failed to fetch groups" });
    }
};

export const updateGroup = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, icon } = req.body;
        const userId = req.user._id;

        const group = await Group.findById(id);
        if (!group) return res.status(404).json({ success: false, message: "Group not found" });

        // Check if user is ONE OF the admins
        if (!group.admins.includes(userId)) {
            return res.status(403).json({ success: false, message: "Only admin can update group" });
        }

        let iconUrl = group.icon;
        if (icon === "") {
            iconUrl = "";
        } else if (icon) {
            const uploadResponse = await cloudinary.uploader.upload(icon);
            iconUrl = uploadResponse.secure_url;
        }


        const previousName = group.name;
        const previousIcon = group.icon;

        group.name = name || group.name;
        group.icon = iconUrl;
        await group.save();

        // Populate to return full object
        const updatedGroup = await Group.findById(id)
            .populate("members", "-password")
            .populate("admins", "-password");

        // System Message for Updates
        const updater = await User.findById(userId);
        if (updater) {
            const Message = (await import("../models/Message.js")).default;
            let systemText = "";
            if (name && name !== previousName) {
                systemText = `${updater.fullName} changed group name to "${name}"`;
            } else if (icon && icon !== previousIcon) {
                systemText = `${updater.fullName} changed group icon`;
            }

            if (systemText) {
                const systemMsg = await Message.create({
                    senderId: userId,
                    groupId: id,
                    text: systemText,
                    isSystemMessage: true,
                });
                await systemMsg.populate("senderId", "fullName profilePic");
                io.to(`group_${id}`).emit("newGroupMessage", systemMsg);
            }
        }

        res.json({ success: true, group: updatedGroup });
    } catch (error) {
        console.log(error);
        res.status(500).json({ success: false, message: "Failed to update group" });
    }
};

export const addMember = async (req, res) => {
    try {
        const { groupId, userId } = req.body;
        const requesterId = req.user._id;

        const group = await Group.findById(groupId);
        if (!group) return res.status(404).json({ success: false, message: "Group not found" });

        if (!group.admins.includes(requesterId)) {
            return res.status(403).json({ success: false, message: "Only admin can add members" });
        }

        if (group.members.includes(userId)) {
            return res.status(400).json({ success: false, message: "User already in group" });
        }

        group.members.push(userId);
        await group.save();

        const updatedGroup = await Group.findById(groupId)
            .populate("members", "-password")
            .populate("admins", "-password");

        // Join the new member to the socket room if online
        const socketIds = userSocketMap[userId];
        if (socketIds) {
            socketIds.forEach(socketId => {
                const socket = io.sockets.sockets.get(socketId);
                if (socket) {
                    socket.join(`group_${groupId}`);
                    io.to(socketId).emit("groupAdded", updatedGroup);
                }
            });
        }

        // Create System Message
        const adminUser = await User.findById(requesterId);
        const addedUser = await User.findById(userId);

        if (adminUser && addedUser) {
            // Import Message model dynamically or assume it's available?
            // It's not imported at the top. I need to add import or use lazy import.
            // Let's add top-level import in next step if needed, but for now I'll use lazy import to be safe or just assume I need to add it.
            // Wait, Message IS NOT imported in groupController.js based on previous `view_file`.
            // I will add the import in a separate step or try to use mongoose.model("Message") if preferred, but standard import is better.
            // I'll use lazy import for now to avoid messing up top of file.
            const Message = (await import("../models/Message.js")).default;

            const systemMsg = await Message.create({
                senderId: requesterId,
                groupId: groupId,
                text: `${adminUser.fullName} added ${addedUser.fullName}`,
                isSystemMessage: true,
            });
            await systemMsg.populate("senderId", "fullName profilePic");

            io.to(`group_${groupId}`).emit("newGroupMessage", systemMsg);
        }

        res.json({ success: true, group: updatedGroup });

    } catch (error) {
        console.log(error);
        res.status(500).json({ success: false, message: "Failed to add member" });
    }
};

// Toggle Admin Role (Promote/Demote)
export const toggleAdmin = async (req, res) => {
    try {
        const { groupId, userId } = req.body;
        const requesterId = req.user._id;

        const group = await Group.findById(groupId);
        if (!group) return res.status(404).json({ success: false, message: "Group not found" });

        if (!group.admins.includes(requesterId)) {
            return res.status(403).json({ success: false, message: "Only admin can manage roles" });
        }

        if (!group.members.includes(userId)) {
            return res.status(400).json({ success: false, message: "User must be a member" });
        }

        const isAdmin = group.admins.includes(userId);

        if (isAdmin) {
            // Prevent removing self if last admin (optional check, but good for safety)
            if (group.admins.length === 1 && userId.toString() === requesterId.toString()) {
                return res.status(400).json({ success: false, message: "Cannot remove the only admin" });
            }
            // Demote
            group.admins = group.admins.filter(id => id.toString() !== userId.toString());
        } else {
            // Promote
            group.admins.push(userId);
        }

        await group.save();

        const updatedGroup = await Group.findById(groupId)
            .populate("members", "-password")
            .populate("admins", "-password");

        res.json({ success: true, group: updatedGroup });

    } catch (error) {
        console.log(error);
        res.status(500).json({ success: false, message: "Failed to update admin role" });
    }
};

export const removeMember = async (req, res) => {
    try {
        const { groupId, userId } = req.body;
        const requesterId = req.user._id;

        const group = await Group.findById(groupId);
        if (!group) return res.status(404).json({ success: false, message: "Group not found" });

        if (!group.admins.includes(requesterId)) {
            return res.status(403).json({ success: false, message: "Only admin can remove members" });
        }

        // If removing an admin, remove from admins list too
        if (group.admins.includes(userId)) {
            group.admins = group.admins.filter(id => id.toString() !== userId.toString());
        }

        group.members = group.members.filter(id => id.toString() !== userId.toString());
        await group.save();

        const updatedGroup = await Group.findById(groupId)
            .populate("members", "-password")
            .populate("admins", "-password");

        // Remove from socket room if online
        const socketIds = userSocketMap[userId];
        if (socketIds) {
            socketIds.forEach(socketId => {
                const socket = io.sockets.sockets.get(socketId);
                if (socket) {
                    socket.leave(`group_${groupId}`);
                    io.to(socketId).emit("groupRemoved", groupId);
                }
            });
        }

        // System Message
        const adminUser = await User.findById(requesterId);
        const removedUser = await User.findById(userId);

        if (adminUser && removedUser) {
            const Message = (await import("../models/Message.js")).default;
            const systemMsg = await Message.create({
                senderId: requesterId,
                groupId: groupId,
                text: `${adminUser.fullName} removed ${removedUser.fullName}`,
                isSystemMessage: true,
            });
            await systemMsg.populate("senderId", "fullName profilePic");
            io.to(`group_${groupId}`).emit("newGroupMessage", systemMsg);
        }

        res.json({ success: true, group: updatedGroup });

    } catch (error) {
        console.log(error);
        res.status(500).json({ success: false, message: "Failed to remove member" });
    }
};

export const deleteGroup = async (req, res) => {
    try {
        const { id } = req.params;
        const requesterId = req.user._id;

        const group = await Group.findById(id);
        if (!group) return res.status(404).json({ success: false, message: "Group not found" });

        if (!group.admins.includes(requesterId)) {
            return res.status(403).json({ success: false, message: "Only admin can delete group" });
        }

        // Notify all members to remove group from list
        group.members.forEach(memberId => {
            const socketIds = userSocketMap[memberId];
            if (socketIds) {
                socketIds.forEach(socketId => {
                    io.to(socketId).emit("groupRemoved", id); // Reusing groupRemoved event
                });
            }
        });

        await Group.findByIdAndDelete(id);

        res.json({ success: true, message: "Group deleted" });

    } catch (error) {
        console.log(error);
        res.status(500).json({ success: false, message: "Failed to delete group" });
    }
};

export const leaveGroup = async (req, res) => {
    try {
        const { groupId } = req.body;
        const userId = req.user._id;

        const group = await Group.findById(groupId);
        if (!group) return res.status(404).json({ success: false, message: "Group not found" });

        if (!group.members.includes(userId)) {
            return res.status(400).json({ success: false, message: "You are not a member of this group" });
        }

        // Check if user is the ONLY admin
        if (group.admins.includes(userId) && group.admins.length === 1) {
            return res.status(400).json({ success: false, message: "You are the only admin. Assign another admin before leaving." });
        }

        // Remove from admins if present
        if (group.admins.includes(userId)) {
            group.admins = group.admins.filter(id => id.toString() !== userId.toString());
        }

        // Remove from members
        group.members = group.members.filter(id => id.toString() !== userId.toString());
        await group.save();

        const updatedGroup = await Group.findById(groupId)
            .populate("members", "-password")
            .populate("admins", "-password");


        // Notify user context they left (remove from list)
        // Also notify OTHER members that user left
        const socketIds = userSocketMap[userId];
        if (socketIds) {
            socketIds.forEach(socketId => {
                const socket = io.sockets.sockets.get(socketId);
                if (socket) {
                    socket.leave(`group_${groupId}`);
                    io.to(socketId).emit("groupRemoved", groupId);
                }
            });
        }

        // System Message
        const user = await User.findById(userId);
        if (user) {
            const Message = (await import("../models/Message.js")).default;
            const systemMsg = await Message.create({
                senderId: userId,
                groupId: groupId,
                text: `${user.fullName} left the group`,
                isSystemMessage: true,
            });
            await systemMsg.populate("senderId", "fullName profilePic");
            io.to(`group_${groupId}`).emit("newGroupMessage", systemMsg);
        }

        // Notify remaining members of update (member list change)
        // We can re-use groupAdded to just force an update if the group exists in their list?
        // Or specific event. Let's use groupUpdated for clarity if frontend listens to it.
        // Frontend listener in ChatContext: 
        // socket.on("groupAdded", ...)
        // socket.on("groupRemoved", ...)
        // It DOES NOT listen to `groupUpdated` yet?
        // Let's check ChatContext.js again in next steps.
        // For now, I'll emit it, and check context later.

        io.to(`group_${groupId}`).emit("groupUpdated", updatedGroup); // Frontend needs to handle this if not already

        res.json({ success: true, message: "Left group successfully" });

    } catch (error) {
        console.log(error);
        res.status(500).json({ success: false, message: "Failed to leave group" });
    }
};

export const updateGroupTheme = async (req, res) => {
    try {
        const { id } = req.params;
        const { theme } = req.body; // { type, value, id }
        const userId = req.user._id;

        const group = await Group.findById(id);
        if (!group) return res.status(404).json({ success: false, message: "Group not found" });

        if (!group.admins.includes(userId)) {
            return res.status(403).json({ success: false, message: "Only admin can update group theme" });
        }

        group.theme = theme;
        await group.save();

        const populatedGroup = await Group.findById(id)
            .populate("members", "-password")
            .populate("admins", "-password");

        io.to(`group_${id}`).emit("groupThemeUpdated", { groupId: id, theme });

        res.json({ success: true, group: populatedGroup });
    } catch (error) {
        console.log(error);
        res.status(500).json({ success: false, message: "Failed to update group theme" });
    }
};

export const updateGroupEphemeralMode = async (req, res) => {
    try {
        const { id } = req.params;
        const { duration } = req.body;
        const userId = req.user._id;

        const group = await Group.findById(id);
        if (!group) return res.status(404).json({ success: false, message: "Group not found" });

        if (!group.admins.includes(userId)) {
            return res.status(403).json({ success: false, message: "Only admin can update ephemeral settings" });
        }

        group.ephemeralDuration = duration;
        await group.save();

        const populatedGroup = await Group.findById(id)
            .populate("members", "-password")
            .populate("admins", "-password");

        // Notify via socket
        io.to(`group_${id}`).emit("chatSettingsUpdated", {
            chatId: id,
            ephemeralDuration: duration,
            type: "group"
        });

        // Add System Message
        const updater = await User.findById(userId);
        if (updater) {
            const Message = (await import("../models/Message.js")).default;
            const durationText = duration > 0
                ? (duration === 86400 ? "24 hours" : duration === 604800 ? "7 days" : duration === 7776000 ? "90 days" : `${duration} seconds`)
                : "Off";

            const systemMsg = await Message.create({
                senderId: userId,
                groupId: id,
                text: `${updater.fullName} set Disappearing Messages to ${durationText}`,
                isSystemMessage: true,
            });
            await systemMsg.populate("senderId", "fullName profilePic");
            io.to(`group_${id}`).emit("newGroupMessage", systemMsg);
        }

        res.json({ success: true, group: populatedGroup });
    } catch (error) {
        console.log(error);
        res.status(500).json({ success: false, message: "Failed to update ephemeral settings" });
    }
};
