/* eslint-disable react-hooks/exhaustive-deps */
import { createContext, useContext, useEffect, useState } from "react";
import { AuthContext } from "../context/authContext";
import toast from "react-hot-toast";

export const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [unseenMessages, setUnseenMessages] = useState(null);

  const { socket, axios } = useContext(AuthContext);

  const getUsers = async () => {
    try {
      const { data } = await axios.get("/messages/users");
      if (data.success) {
        setUsers(data.users);
        setUnseenMessages(data.unseenMessages);
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  //fun to get messages for selected user
  const getMessages = async (userId) => {
    try {
      const { data } = await axios.get(`/messages/${userId}`);
      if (data.success) {
        setMessages(data.messages);
      }
    } catch (error) {
      toast.error(error.message);
    }
  };
  //fun to send messages for selected user
  const sendMessage = async (messageData) => {
    try {
      const { data } = await axios.post(
        `/messages/send/${selectedUser._id}`,
        messageData
      );
      if (data.success) {
        setMessages((prevMessages) => [...prevMessages, data.newMessage]);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  //fun to subscribe messages for selected user
  const subscribeMessages = async () => {
    if (!socket) return;

    socket.on("newMessage", (newMessage) => {
      // Case 1: Chat is open with the sender
      if (selectedUser && newMessage.senderId === selectedUser._id) {
        newMessage.seen = true;
        setMessages((prevMessages) => [...prevMessages, newMessage]);
        axios.put(`/messages/mark/${newMessage._id}`);
      }
      // Case 2: Chat is NOT open with sender (Show Popup)
      else {
        // Find sender details from users list
        const sender = users.find(u => u._id === newMessage.senderId);

        toast.custom((t) => (
          <div
            className={`${t.visible ? 'animate-enter' : 'animate-leave'
              } max-w-md w-full bg-white shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5 cursor-pointer hover:bg-gray-50 transition-colors`}
            onClick={() => {
              if (sender) setSelectedUser(sender);
              toast.dismiss(t.id);
            }}
          >
            <div className="flex-1 w-0 p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0 pt-0.5">
                  <img
                    className="h-10 w-10 rounded-full object-cover"
                    src={sender?.profilePic || "/avatar.png"}
                    alt=""
                  />
                </div>
                <div className="ml-3 flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    {sender?.fullName || "New Message"}
                  </p>
                  <p className="mt-1 text-sm text-gray-500 truncate">
                    {newMessage.image ? "Sent an image" : newMessage.text}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ), { duration: 5000 });

        setUnseenMessages((prevUnseenMessages) => ({
          ...prevUnseenMessages,
          [newMessage.senderId]: prevUnseenMessages?.[newMessage.senderId]
            ? prevUnseenMessages[newMessage.senderId] + 1
            : 1,
        }));
      }
    });

    socket.on("messageUpdated", (updatedMessage) => {
      setMessages((prevMessages) => prevMessages.map(msg => msg._id === updatedMessage._id ? updatedMessage : msg));
    });

    socket.on("messageDeleted", (messageId) => {
      setMessages((prevMessages) => prevMessages.filter(msg => msg._id !== messageId));
    });
  };

  const unsubscribeFromMessages = () => {
    if (socket) {
      socket.off("newMessage");
      socket.off("messageUpdated");
      socket.off("messageDeleted");
    }
  };

  //fun to update message
  const updateMessage = async (messageId, newText) => {
    try {
      const { data } = await axios.put(`/messages/update/${messageId}`, { text: newText });
      if (data.success) {
        setMessages((prevMessages) => prevMessages.map(msg => msg._id === messageId ? data.message : msg));
        toast.success("Message updated");
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update message");
    }
  };

  //fun to delete message
  const deleteMessage = async (messageId) => {
    try {
      const { data } = await axios.delete(`/messages/delete/${messageId}`);
      if (data.success) {
        setMessages((prevMessages) => prevMessages.filter(msg => msg._id !== messageId));
        toast.success("Message deleted");
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete message");
    }
  };

  // Re-subscribe when dependencies change to ensure closure has latest state
  useEffect(() => {
    subscribeMessages();
    return () => unsubscribeFromMessages();
  }, [socket, selectedUser, users]);

  const value = {
    users,
    selectedUser,
    setSelectedUser,
    messages,
    getMessages,
    sendMessage,
    subscribeMessages,
    unseenMessages,
    setUnseenMessages,
    socket,
    getUsers,
    updateMessage,
    deleteMessage,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};
