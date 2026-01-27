import cron from 'node-cron';
import Message from '../models/Message.js';
// import { io } from '../server.js'; // Assuming io is exported from server.js
import { io } from '../lib/socket.js';


// Run every minute
const initScheduler = () => {
    cron.schedule('* * * * *', async () => {
        try {
            const now = new Date();

            // Find messages that are scheduled and due
            const pendingMessages = await Message.find({
                status: 'scheduled',
                scheduledFor: { $lte: now }
            }).populate('senderId', 'username profilePicture')
                .populate('receiverId', 'username profilePicture')
                .populate('groupId');

            for (const message of pendingMessages) {
                // Update status to sent
                message.status = 'sent';
                await message.save();

                // Emit to receiver
                if (message.receiverId) {
                    const receiverSocketId = message.receiverId._id.toString();
                    io.to(receiverSocketId).emit('newMessage', message);
                } else if (message.groupId) {
                    io.to(message.groupId._id.toString()).emit('newMessage', message);
                }

                // Emit to sender (so their UI updates from "Scheduled" to "Sent" if they are looking)
                // Also useful if we want to show a notification that it was sent
                const senderSocketId = message.senderId._id.toString();
                // We might want to emit a specific event like 'scheduledMessageSent' or just 'newMessage'
                // 'newMessage' might duplicate it in the chat if not handled carefully, 
                // but since it's a new message "arrival" in terms of time, it makes sense.
                // However, the sender usually already has it in their list. 
                // Let's emit a status update event.
                io.to(senderSocketId).emit('messageStatusUpdate', {
                    messageId: message._id,
                    status: 'sent'
                });

                // Also emit 'newMessage' to sender so it appears at the bottom if they are in the chat
                // (Optional: depending on how the frontend handles it. 
                // If frontend shows scheduled messages in a separate list, then this moves it to the main chat)
                io.to(senderSocketId).emit('newMessage', message);

                console.log(`Scheduled message ${message._id} sent.`);
            }
        } catch (error) {
            console.error('Error in cron scheduler:', error);
        }
    });
};

export default initScheduler;
