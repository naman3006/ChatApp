import Poll from "../models/Poll.js";
import Message from "../models/Message.js";
import { io, getReceiverSocketId } from "../lib/socket.js";

export const createPoll = async (req, res) => {
    try {
        const { question, options, groupId, allowMultipleAnswers } = req.body;
        const senderId = req.user._id;

        if (!question || !options || options.length < 2) {
            return res.status(400).json({ success: false, message: "Invalid poll data" });
        }

        const formattedOptions = options.map((opt) => ({ text: opt, votes: [] }));

        const newPoll = new Poll({
            question,
            options: formattedOptions,
            creatorId: senderId,
            groupId,
            allowMultipleAnswers,
        });

        await newPoll.save();

        // Create a system message for the poll
        const newMessage = new Message({
            senderId,
            groupId,
            pollId: newPoll._id,
        });

        await newMessage.save();

        const populatedMessage = await Message.findById(newMessage._id).populate("pollId");

        // Emit to group
        io.to(`group_${groupId}`).emit("newGroupMessage", populatedMessage);

        res.status(201).json({ success: true, poll: newPoll, message: populatedMessage });
    } catch (error) {
        console.log("Error in createPoll:", error.message);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};

export const votePoll = async (req, res) => {
    try {
        const { id: pollId } = req.params;
        const { optionIndex } = req.body;
        const userId = req.user._id;

        const poll = await Poll.findById(pollId);
        if (!poll) return res.status(404).json({ success: false, message: "Poll not found" });

        const option = poll.options[optionIndex];
        if (!option) return res.status(400).json({ success: false, message: "Invalid option" });

        const hasVoted = option.votes.includes(userId);

        if (hasVoted) {
            // Remove vote
            option.votes = option.votes.filter((id) => id.toString() !== userId.toString());
        } else {
            // Add vote
            if (!poll.allowMultipleAnswers) {
                // Remove from other options if single answer
                poll.options.forEach((opt) => {
                    opt.votes = opt.votes.filter((id) => id.toString() !== userId.toString());
                });
            }
            option.votes.push(userId);
        }

        await poll.save();

        // Emit update
        io.to(`group_${poll.groupId}`).emit("pollUpdated", poll);

        res.json({ success: true, poll });
    } catch (error) {
        console.log("Error in votePoll:", error.message);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};
