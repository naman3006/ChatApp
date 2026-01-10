/* eslint-disable react-hooks/exhaustive-deps */
import { createContext, useContext, useEffect, useState } from "react";
import { AuthContext } from "../context/authContext";
import toast from "react-hot-toast";

export const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState([]);
  const [groups, setGroups] = useState([]); // New Group State
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState(null); // New Group State
  const [unseenMessages, setUnseenMessages] = useState(null);
  const [typingData, setTypingData] = useState({}); // { [chatId]: Set<userId> }

  const { socket, axios, authUser, checkAuth } = useContext(AuthContext);

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

  const getGroups = async () => {
    try {
      const { data } = await axios.get("/groups");
      if (data.success) {
        setGroups(data.groups);
      }
    } catch (error) {
      toast.error("Failed to fetch groups");
    }
  };

  const createGroup = async (name, members) => {
    try {
      const { data } = await axios.post("/groups/create", { name, members });
      if (data.success) {
        setGroups([data.group, ...groups]);
        toast.success("Group created");
        return true;
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to create group");
      return false;
    }
  };

  //fun to get messages for selected user or group
  const getMessages = async (id, isGroup = false) => {
    try {
      const url = isGroup ? `/messages/${id}?isGroup=true` : `/messages/${id}`;
      const { data } = await axios.get(url);
      if (data.success) {
        setMessages(data.messages);
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  //fun to send messages
  const sendMessage = async (messageData) => {
    try {
      let res;
      if (selectedGroup) {
        res = await axios.post(`/messages/send/${selectedGroup._id}`, { ...messageData, groupId: selectedGroup._id });
      } else {
        res = await axios.post(`/messages/send/${selectedUser._id}`, messageData);
      }

      if (res.data.success) {
        setMessages((prevMessages) => {
          if (prevMessages.some(m => m._id === res.data.newMessage._id)) return prevMessages;
          return [...prevMessages, res.data.newMessage];
        });

        // Move recipient to top of user list
        setUsers((prevUsers) => {
          if (!selectedUser) return prevUsers;
          const userIndex = prevUsers.findIndex(u => u._id === selectedUser._id);
          if (userIndex > 0) {
            const newUsers = [...prevUsers];
            const [user] = newUsers.splice(userIndex, 1);
            newUsers.unshift(user);
            return newUsers;
          }
          return prevUsers;
        });
      } else {
        toast.error(res.data.message);
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  //fun to subscribe messages
  const subscribeMessages = async () => {
    if (!socket) return;

    socket.on("newMessage", (newMessage) => {
      // Check if message already exists to prevent duplicates (from API response)
      const isDuplicate = messages.some(m => m._id === newMessage._id);
      if (isDuplicate) return;

      if (!newMessage.groupId) {
        // DM Logic
        if (selectedUser && newMessage.senderId === selectedUser._id) {
          newMessage.seen = true;
          setMessages((prevMessages) => {
            if (prevMessages.some(m => m._id === newMessage._id)) return prevMessages;
            return [...prevMessages, newMessage];
          });
          axios.put(`/messages/mark/${newMessage._id}`);

          // Move sender to top
          setUsers((prevUsers) => {
            const userIndex = prevUsers.findIndex(u => u._id === newMessage.senderId);
            if (userIndex > 0) {
              const newUsers = [...prevUsers];
              const [user] = newUsers.splice(userIndex, 1);
              newUsers.unshift(user);
              return newUsers;
            }
            return prevUsers;
          });
        } else if (selectedUser && newMessage.receiverId === selectedUser._id && newMessage.senderId === authUser._id) {
          // Correctly handle own messages sent from another tab/device
          setMessages((prevMessages) => {
            if (prevMessages.some(m => m._id === newMessage._id)) return prevMessages;
            return [...prevMessages, newMessage];
          });

          // Move recipient to top (handled by self sync)
          setUsers((prevUsers) => {
            const userIndex = prevUsers.findIndex(u => u._id === newMessage.receiverId);
            if (userIndex > 0) {
              const newUsers = [...prevUsers];
              const [user] = newUsers.splice(userIndex, 1);
              newUsers.unshift(user);
              return newUsers;
            }
            return prevUsers;
          });
        } else {
          // Toast logic for DM (incoming from others)
          toast.custom((t) => (
            <div
              className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-md w-full bg-white shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5 cursor-pointer hover:bg-gray-50 transition-colors`}
              onClick={() => {
                const sender = users.find(u => u._id === newMessage.senderId);
                if (sender) {
                  setSelectedUser(sender);
                  setSelectedGroup(null);
                }
                toast.dismiss(t.id);
              }}
            >
              {/* Toast Trigger Content */}
              <div className="flex-1 w-0 p-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0 pt-0.5">
                    <img className="h-10 w-10 rounded-full object-cover" src={users.find(u => u._id === newMessage.senderId)?.profilePic || "/avatar.png"} alt="" />
                  </div>
                  <div className="ml-3 flex-1">
                    <p className="text-sm font-medium text-gray-900">{users.find(u => u._id === newMessage.senderId)?.fullName || "New Message"}</p>
                    <p className="mt-1 text-sm text-gray-500 truncate">{newMessage.text}</p>
                  </div>
                </div>
              </div>
            </div>
          ), { duration: 5000 });

          setUnseenMessages((prev) => ({
            ...prev,
            [newMessage.senderId]: (prev?.[newMessage.senderId] || 0) + 1,
          }));

          // Move sender to top
          setUsers((prevUsers) => {
            const userIndex = prevUsers.findIndex(u => u._id === newMessage.senderId);
            if (userIndex > 0) {
              const newUsers = [...prevUsers];
              const [user] = newUsers.splice(userIndex, 1);
              newUsers.unshift(user);
              return newUsers;
            }
            return prevUsers;
          });
        }
      }
    });

    socket.on("newGroupMessage", (newMessage) => {
      if (selectedGroup && newMessage.groupId === selectedGroup._id) {
        setMessages((prev) => {
          if (prev.some(m => m._id === newMessage._id)) return prev;
          return [...prev, newMessage];
        });
      }
      // Else: Could show toast for group message
    });

    socket.on("messageUpdated", (updatedMessage) => {
      setMessages((prevMessages) => prevMessages.map(msg => msg._id === updatedMessage._id ? updatedMessage : msg));
    });

    socket.on("messageDeleted", (messageId) => {
      setMessages((prevMessages) => prevMessages.map(msg => {
        if (msg._id === messageId) {
          return { ...msg, deletedAt: new Date().toISOString() };
        }
        return msg;
      }));
    });

    socket.on("messageRestored", (restoredMessage) => {
      setMessages((prevMessages) => {
        if (prevMessages.some(m => m._id === restoredMessage._id)) return prevMessages;
        const newMsgs = [...prevMessages, restoredMessage];
        return newMsgs.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      });
    });

    socket.on("messageReaction", ({ messageId, reactions }) => {
      setMessages((prev) => prev.map(msg => {
        if (msg._id === messageId) {
          return { ...msg, reactions };
        }
        return msg;
      }));
    });

    socket.on("messagePinned", (updatedMessage) => {
      setMessages((prev) => prev.map(msg => msg._id === updatedMessage._id ? updatedMessage : msg));
    });

    socket.on("messageUnpinned", (messageId) => {
      setMessages((prev) => prev.map(msg => msg._id === messageId ? { ...msg, pinned: false, pinnedBy: null } : msg));
    });

    socket.on("groupUpdated", (updatedGroup) => {
      setGroups((prev) => prev.map(g => g._id === updatedGroup._id ? updatedGroup : g));
      if (selectedGroup && selectedGroup._id === updatedGroup._id) {
        setSelectedGroup(updatedGroup);
      }
    });

    socket.on("groupAdded", (newGroup) => {
      setGroups((prev) => [newGroup, ...prev]);
      toast.success(`You were added to group: ${newGroup.name}`);
    });

    socket.on("groupRemoved", (groupId) => {
      setGroups((prev) => prev.filter(g => g._id !== groupId));
      if (selectedGroup && selectedGroup._id === groupId) {
        setSelectedGroup(null);
        toast("You were removed from the group");
      }
    });

    socket.on("typing", ({ from, isGroup, groupId }) => {
      const chatId = isGroup ? groupId : from;
      setTypingData((prev) => {
        const currentTypers = new Set(prev[chatId] || []);
        currentTypers.add(from);
        return { ...prev, [chatId]: currentTypers };
      });
    });

    socket.on("stopTyping", ({ from, isGroup, groupId }) => {
      const chatId = isGroup ? groupId : from;
      setTypingData((prev) => {
        const currentTypers = new Set(prev[chatId] || []);
        currentTypers.delete(from);
        return { ...prev, [chatId]: new Set(currentTypers) };
      });
    });
  };

  const sendTyping = (chatId, isGroup) => {
    if (!socket) return;
    socket.emit("typing", { to: chatId, from: authUser._id, isGroup });
  };

  const sendStopTyping = (chatId, isGroup) => {
    if (!socket) return;
    socket.emit("stopTyping", { to: chatId, from: authUser._id, isGroup });
  };

  const unsubscribeFromMessages = () => {
    if (socket) {
      socket.off("newMessage");
      socket.off("newGroupMessage");
      socket.off("messageUpdated");
      socket.off("messageDeleted");
      socket.off("messageRestored");
      socket.off("messageReaction");
      socket.off("messagePinned");
      socket.off("messageUnpinned");
      socket.off("groupUpdated");
      socket.off("groupAdded");
      socket.off("groupRemoved");
      socket.off("typing");
      socket.off("stopTyping");
    }
  };

  const updateMessage = async (messageId, newText) => {
    try {
      const { data } = await axios.put(`/messages/${messageId}`, { text: newText });
      if (data.success) {
        setMessages((prevMessages) => prevMessages.map(msg => msg._id === messageId ? data.message : msg));
        toast.success("Message updated");
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update message");
    }
  };

  const deleteMessage = async (messageId) => {
    try {
      const { data } = await axios.delete(`/messages/${messageId}`);
      if (data.success) {
        setMessages((prevMessages) => prevMessages.map(msg => {
          if (msg._id === messageId) return { ...msg, deletedAt: new Date().toISOString() };
          return msg;
        }));
        return true;
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete message");
      return false;
    }
  };

  const undoDeleteMessage = async (messageId) => {
    try {
      const { data } = await axios.put(`/messages/undo/${messageId}`);
      if (data.success) {
        setMessages((prevMessages) => {
          const newMsgs = [...prevMessages, data.message];
          return newMsgs.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        });
        toast.success("Message Restored");
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to undo delete");
    }
  };

  const addGroupMember = async (groupId, userId) => {
    try {
      const { data } = await axios.put("/groups/add-member", { groupId, userId });
      if (data.success) {
        setGroups((prevGroups) => prevGroups.map(g => g._id === groupId ? data.group : g));
        if (selectedGroup?._id === groupId) {
          setSelectedGroup(data.group);
        }
        toast.success("Member added successfully");
        return true;
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to add member");
      return false;
    }
  };

  const removeGroupMember = async (groupId, userId) => {
    try {
      const { data } = await axios.put("/groups/remove-member", { groupId, userId });
      if (data.success) {
        setGroups((prevGroups) => prevGroups.map(g => g._id === groupId ? data.group : g));
        if (selectedGroup?._id === groupId) {
          setSelectedGroup(data.group);
        }
        toast.success("Member removed successfully");
        return true;
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to remove member");
      return false;
    }
  };

  const toggleGroupAdmin = async (groupId, userId) => {
    try {
      const { data } = await axios.put("/groups/toggle-admin", { groupId, userId });
      if (data.success) {
        setGroups((prevGroups) => prevGroups.map(g => g._id === groupId ? data.group : g));
        if (selectedGroup?._id === groupId) {
          setSelectedGroup(data.group);
        }
        toast.success("Admin role updated");
        return true;
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update admin role");
      return false;
    }
  };

  const updateGroup = async (groupId, updateData) => {
    try {
      const { data } = await axios.put(`/groups/update/${groupId}`, updateData);
      if (data.success) {
        setGroups((prevGroups) => prevGroups.map(g => g._id === groupId ? data.group : g));
        if (selectedGroup?._id === groupId) {
          setSelectedGroup(data.group);
        }
        toast.success("Group updated successfully");
        return true;
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update group");
      return false;
    }
  };

  const deleteGroup = async (groupId) => {
    try {
      const { data } = await axios.delete(`/groups/delete/${groupId}`);
      if (data.success) {
        setGroups((prev) => prev.filter(g => g._id !== groupId));
        if (selectedGroup?._id === groupId) setSelectedGroup(null);
        toast.success("Group deleted");
        return true;
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete group");
      return false;
    }
  };



  const leaveGroup = async (groupId) => {
    try {
      const { data } = await axios.put("/groups/leave", { groupId });
      if (data.success) {
        setGroups((prev) => prev.filter(g => g._id !== groupId));
        if (selectedGroup?._id === groupId) setSelectedGroup(null);
        toast.success("Left group successfully");
        return true;
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to leave group");
      return false;
    }
  };

  const addReaction = async (messageId, emoji) => {
    try {
      const { data } = await axios.post(`/messages/${messageId}/react`, { emoji });
      if (data.success) {
        return true;
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to add reaction");
      return false;
    }
  };

  const pinMessage = async (messageId) => {
    try {
      const { data } = await axios.post(`/messages/${messageId}/pin`);
      if (data.success) {
        setMessages((prev) => prev.map(m => m._id === messageId ? { ...m, pinned: true, pinnedBy: authUser._id } : m));
        toast.success("Message pinned");
        return true;
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to pin message");
      return false;
    }
  };

  const unpinMessage = async (messageId) => {
    try {
      const { data } = await axios.post(`/messages/${messageId}/unpin`);
      if (data.success) {
        setMessages((prev) => prev.map(m => m._id === messageId ? { ...m, pinned: false, pinnedBy: null } : m));
        toast.success("Message unpinned");
        return true;
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to unpin message");
      return false;
    }
  };

  const blockUser = async (userId) => {
    try {
      const { data } = await axios.put(`/auth/block/${userId}`);
      if (data.success) {
        toast.success("User blocked");
        // Refresh auth user to update blocked list
        checkAuth();
        return true;
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to block user");
      return false;
    }
  };

  const unblockUser = async (userId) => {
    try {
      const { data } = await axios.put(`/auth/unblock/${userId}`);
      if (data.success) {
        toast.success("User unblocked");
        checkAuth();
        return true;
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to unblock user");
      return false;
    }
  };

  const reportUser = async (userId, reason, description) => {
    try {
      const { data } = await axios.post(`/auth/report/${userId}`, { reason, description });
      if (data.success) {
        toast.success("Report submitted successfully");
        return true;
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to submit report");
      return false;
    }
  };

  useEffect(() => {
    subscribeMessages();
    return () => unsubscribeFromMessages();
  }, [socket, selectedUser, selectedGroup, users]);

  const value = {
    users,
    groups,
    selectedUser,
    selectedGroup,
    setSelectedUser: (user) => { setSelectedUser(user); setSelectedGroup(null); },
    setSelectedGroup: (group) => { setSelectedGroup(group); setSelectedUser(null); },
    messages,
    getMessages,
    sendMessage,
    subscribeMessages,
    unseenMessages,
    setUnseenMessages,
    socket,
    getUsers,
    getGroups,
    createGroup,
    updateMessage,
    deleteMessage,
    undoDeleteMessage,
    addGroupMember,
    removeGroupMember,
    toggleGroupAdmin,
    deleteGroup,
    updateGroup,
    leaveGroup,
    addReaction,
    pinMessage,
    unpinMessage,
    blockUser,
    unblockUser,
    reportUser,
    typingData,
    sendTyping,
    sendStopTyping
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};
