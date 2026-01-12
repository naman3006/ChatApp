/* eslint-disable react-hooks/exhaustive-deps */
import React, { useContext, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import assets from "../chat-assets/assets";
import { formatMessageTime, formatLastSeen, formatDateSeparator } from "../lib/utils";
import { ChatContext } from "../context/ChatContext";
import { AuthContext } from "../context/authContext";
import VoiceMessage from "./VoiceMessage";
import toast from "react-hot-toast";
import EmojiPicker from 'emoji-picker-react';
import { CallContext } from "../context/CallContext";
import { Phone, Video } from "lucide-react";
import MessageSkeleton from "./skeletons/MessageSkeleton";

export const ChatContainer = () => {
  const navigate = useNavigate();
  const {
    messages,
    selectedUser,
    setSelectedUser,
    selectedGroup,
    setSelectedGroup,
    sendMessage,
    getMessages,
    updateMessage,
    deleteMessage,
    undoDeleteMessage,
    users,
    addGroupMember,
    removeGroupMember,
    toggleGroupAdmin,
    deleteGroup,
    updateGroup,
    addReaction,
    leaveGroup,
    pinMessage,
    unpinMessage,
    unblockUser,
    typingData,
    sendTyping,
    sendStopTyping,
    isMessagesLoading
  } = useContext(ChatContext);
  const { startCall } = useContext(CallContext);
  const { authUser, onlineUsers } = useContext(AuthContext);

  const isBlocked = authUser?.blockedUsers?.includes(selectedUser?._id);

  const scrollEnd = useRef();
  const firstUnseenMsgRef = useRef();

  const [input, setInput] = useState("");
  const [imagePreview, setImagePreview] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editText, setEditText] = useState("");
  const [activeMenuId, setActiveMenuId] = useState(null); // To track which message's menu is open
  const [activeReactionId, setActiveReactionId] = useState(null);
  const touchTimer = useRef(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showStickerPicker, setShowStickerPicker] = useState(false);

  const typingTimeoutRef = useRef(null);

  // Long Press Logic for Mobile Reactions
  const handleTouchStart = (msgId) => {
    touchTimer.current = setTimeout(() => {
      setActiveReactionId(msgId);
      if (navigator.vibrate) navigator.vibrate(50);
    }, 500);
  };

  const handleTouchEnd = () => {
    if (touchTimer.current) {
      clearTimeout(touchTimer.current);
      touchTimer.current = null;
    }
  };

  const handleInputChange = (e) => {
    setInput(e.target.value);

    const chatId = selectedGroup ? selectedGroup._id : selectedUser._id;
    const isGroup = !!selectedGroup;

    if (e.target.value.trim().length > 0) {
      sendTyping(chatId, isGroup);

      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

      typingTimeoutRef.current = setTimeout(() => {
        sendStopTyping(chatId, isGroup);
      }, 3000);
    } else {
      sendStopTyping(chatId, isGroup);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    }
  };


  // Voice Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordingDuration(0);

      timerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);

    } catch (err) {
      toast.error("Could not access microphone");
      console.error("Mic Error:", err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await sendVoiceMessage(audioBlob);

        const tracks = mediaRecorderRef.current.stream.getTracks();
        tracks.forEach(track => track.stop());
      };

      clearInterval(timerRef.current);
      setIsRecording(false);
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      const tracks = mediaRecorderRef.current.stream.getTracks();
      tracks.forEach(track => track.stop());
      clearInterval(timerRef.current);
      setIsRecording(false);
      setRecordingDuration(0);
    }
  };

  const sendVoiceMessage = (audioBlob) => {
    setIsUploading(true);
    const reader = new FileReader();
    reader.readAsDataURL(audioBlob);
    reader.onloadend = async () => {
      const base64Audio = reader.result;
      try {
        await sendMessage({ audio: base64Audio });
      } catch (error) {
        toast.error("Failed to send voice message");
      } finally {
        setIsUploading(false);
      }
    };
  };

  const handleGroupIconChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size too large (max 5MB)");
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      const base64Image = reader.result;
      const success = await updateGroup(selectedGroup._id, { icon: base64Image });
      if (success) {
        // setShowGroupInfo(false); // Optional: close modal or logic to refresh
        // No need to refresh, context updates it.
      }
    };
  };

  const handleRemoveGroupIcon = async () => {
    if (!selectedGroup.icon) return;
    if (window.confirm("Remove group icon?")) {
      await updateGroup(selectedGroup._id, { icon: "" });
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (input.trim() === "" && !imagePreview) {
      return null;
    }

    setIsUploading(true);
    try {
      if (imagePreview) {
        await sendMessage({ image: imagePreview, text: input.trim() });
        setImagePreview(null);
      } else {
        await sendMessage({ text: input.trim() });
      }
      setInput("");
    } catch (error) {
      toast.error("Failed to send message");
    } finally {
      setIsUploading(false);
    }
  };

  const startEditing = (msg) => {
    setEditingMessageId(msg._id);
    setEditText(msg.text);
    setActiveMenuId(null);
  };

  const cancelEditing = () => {
    setEditingMessageId(null);
    setEditText("");
  };

  const handleReaction = async (messageId, emoji) => {
    await addReaction(messageId, emoji);
    setActiveMenuId(null);
  };

  const handleUpdateMessage = async () => {
    if (editText.trim() === "") return;
    await updateMessage(editingMessageId, editText);
    setEditingMessageId(null);
    setEditText("");
  };

  const handleDeleteMessage = async (id) => {
    if (window.confirm("Are you sure you want to delete this message?")) {
      const success = await deleteMessage(id);
      if (success) {
        handleUndoToast(id);
      }
    }
    setActiveMenuId(null);
  };

  const handleUndoToast = (id) => {
    toast((t) => (
      <div className="flex items-center gap-2">
        <span>Message deleted</span>
        <button
          onClick={() => {
            undoDeleteMessage(id);
            toast.dismiss(t.id);
          }}
          className="bg-zinc-700 hover:bg-zinc-600 text-white px-3 py-1 rounded text-sm transition-colors border border-zinc-600"
        >
          Undo
        </button>
      </div>
    ), {
      icon: '🗑️',
      duration: 4000,
      style: {
        background: '#333',
        color: '#fff',
      }
    });
  };

  const toggleMenu = (id) => {
    setActiveMenuId(activeMenuId === id ? null : id);
  };

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (!file || !file.type.startsWith("image/")) {
      toast.error("Select an image File");
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const removeImagePreview = () => {
    setImagePreview(null);
  };

  // Group Info State
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [showPinnedMessages, setShowPinnedMessages] = useState(false);



  const handleRemoveMember = async (userId) => {
    if (window.confirm("Remove this user from the group?")) {
      await removeGroupMember(selectedGroup._id, userId);
    }
  };

  const handleAddMember = async (userId) => {
    await addGroupMember(selectedGroup._id, userId);
    setShowAddMemberModal(false);
  };

  const handleToggleAdmin = async (userId) => {
    // If I am removing myself as admin, warn
    const isTargetAdmin = selectedGroup.admins.some(a => a._id === userId);
    if (isTargetAdmin && userId === authUser._id) {
      if (!window.confirm("Are you sure you want to remove YOURSELF as admin? You will lose admin privileges.")) return;
    }
    await toggleGroupAdmin(selectedGroup._id, userId);
  }

  const handleDeleteGroup = async () => {
    if (window.confirm("Are you NOT SURE? This will permanently delete the group for all members.")) {
      await deleteGroup(selectedGroup._id);
      setShowGroupInfo(false);
    }
  };

  const handleDownloadImage = async (imageUrl) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `chat-image-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      toast.error("Failed to download image");
    }
  };

  const handleScrollToMessage = (messageId) => {
    const element = document.getElementById(`msg-${messageId}`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
      element.classList.add("bg-violet-500/20");
      setTimeout(() => element.classList.remove("bg-violet-500/20"), 2000);
    } else {
      toast("Message might be older or not loaded");
    }
  };

  useEffect(() => {
    if (selectedUser) {
      getMessages(selectedUser._id);
    } else if (selectedGroup) {
      getMessages(selectedGroup._id, true);
    }
  }, [selectedUser, selectedGroup]);

  useEffect(() => {
    if (messages.length > 0) {
      // Small delay to ensure rendering is complete
      setTimeout(() => {
        if (firstUnseenMsgRef.current) {
          firstUnseenMsgRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
        } else if (scrollEnd.current) {
          scrollEnd.current.scrollIntoView({ behavior: "smooth" });
        }
      }, 100);
    }
  }, [messages, selectedUser, selectedGroup]);

  return (selectedUser || selectedGroup) ? (
    <div className="h-full w-full overflow-hidden relative flex flex-col backdrop-blur-lg" onClick={() => { setActiveMenuId(null); setActiveReactionId(null); }}>
      <div className="flex items-center gap-3 py-3 px-4 border-b border-stone-500 bg-gray-900/50 backdrop-blur-md">

        {/* Mobile Back Button */}
        <button
          onClick={() => { setSelectedUser(null); setSelectedGroup(null); }}
          className="md:hidden text-gray-400 hover:text-white mr-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
        </button>

        {selectedGroup ? (
          selectedGroup.icon ? (
            <img
              onClick={() => setShowGroupInfo(true)}
              src={selectedGroup.icon}
              alt={selectedGroup.name}
              className="w-10 h-10 rounded-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
            />
          ) : (
            <div
              onClick={() => setShowGroupInfo(true)}
              className="w-10 h-10 rounded-full bg-violet-600 flex items-center justify-center text-white font-bold text-sm cursor-pointer hover:opacity-90 transition-opacity"
            >
              {selectedGroup.name[0].toUpperCase()}
            </div>
          )
        ) : (
          <img
            src={selectedUser.profilePic || assets.avatar_icon}
            alt=""
            className="w-10 h-10 rounded-full object-cover cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => navigate(`/user/${selectedUser._id}`)}
          />
        )}
        <div className="flex-1 flex flex-col justify-center">
          <p className={`text-lg text-white flex items-center gap-2 font-medium ${!selectedGroup && "cursor-pointer hover:underline"}`}
            onClick={() => !selectedGroup && navigate(`/user/${selectedUser._id}`)}
          >
            {selectedGroup ? selectedGroup.name : selectedUser.fullName}
            {!selectedGroup && onlineUsers.includes(selectedUser._id) &&
              <span className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></span>}
          </p>
          {(() => {
            const chatId = selectedGroup ? selectedGroup._id : selectedUser._id;
            const typers = typingData[chatId] ? Array.from(typingData[chatId]) : [];
            const otherTypers = typers.filter(id => id !== authUser._id);

            if (otherTypers.length > 0) {
              let typingText = "";
              if (selectedGroup) {
                if (otherTypers.length === 1) {
                  const typer = users.find(u => u._id === otherTypers[0]);
                  typingText = `${typer ? typer.fullName : "Someone"} is typing...`;
                } else {
                  typingText = "Several people are typing...";
                }
              } else {
                typingText = "typing...";
              }

              return (
                <p className="text-xs text-green-400 font-medium animate-pulse">
                  {typingText}
                </p>
              );
            }

            if (selectedGroup) {
              return (
                <p className="text-xs text-gray-400 cursor-pointer hover:text-gray-300" onClick={() => setShowGroupInfo(true)}>
                  {selectedGroup.members.length} members
                </p>
              );
            }

            if (!onlineUsers.includes(selectedUser._id) && selectedUser.lastSeen) {
              return (
                <p className="text-xs text-gray-400">
                  {formatLastSeen(selectedUser.lastSeen)}
                </p>
              );
            }

            return null;
          })()}
        </div>

        {!selectedGroup && (
          <>
            <button
              onClick={() => startCall(selectedUser._id, selectedUser.fullName, false)}
              className="p-2 rounded-full hover:bg-gray-800 text-gray-400 hover:text-white transition-colors mr-1"
              title="Audio Call"
            >
              <Phone size={20} />
            </button>
            <button
              onClick={() => startCall(selectedUser._id, selectedUser.fullName, true)}
              className="p-2 rounded-full hover:bg-gray-800 text-gray-400 hover:text-white transition-colors mr-2"
              title="Video Call"
            >
              <Video size={20} />
            </button>
          </>
        )}

        <button
          onClick={() => setShowPinnedMessages(!showPinnedMessages)}
          className={`p-2 rounded-full transition-colors mr-2 ${showPinnedMessages ? 'bg-violet-600 text-white' : 'hover:bg-gray-800 text-gray-400'}`}
          title="Pinned Messages"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" x2="12" y1="17" y2="22" /><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z" /></svg>
        </button>

        <img
          onClick={() => { setSelectedUser(null); setSelectedGroup(null); }}
          src={assets.arrow_icon}
          alt=""
          className="md:hidden max-w-7 cursor-pointer hover:scale-110 transition-transform"
        />
        {/* Info Icon for Group */}
        {selectedGroup && (
          <button onClick={() => setShowGroupInfo(true)} className="text-gray-400 hover:text-white transition-colors p-2 rounded-full hover:bg-white/5">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" x2="12" y1="16" y2="12" /><line x1="12" x2="12.01" y1="8" y2="8" /></svg>
          </button>
        )}
      </div>

      {/* Sticky Pinned Message */}
      {messages.some(m => m.pinned) && (
        <div className="z-10 bg-gray-900/95 backdrop-blur-md border-b border-gray-800 px-4 py-2 flex items-center justify-between shadow-lg cursor-pointer hover:bg-gray-800/90 transition-colors"
          onClick={() => handleScrollToMessage(messages.filter(m => m.pinned).slice(-1)[0]._id)}
        >
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="bg-violet-600/20 p-1.5 rounded-full text-violet-400">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" x2="12" y1="17" y2="22" /><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z" /></svg>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-violet-400 font-semibold uppercase tracking-wider">Pinned Message</span>
              <p className="text-sm text-gray-200 truncate max-w-[200px] sm:max-w-md">
                {(() => {
                  const lastPinned = messages.filter(m => m.pinned).slice(-1)[0];
                  if (lastPinned.text) return lastPinned.text;
                  if (lastPinned.image) return "Image Attachment";
                  if (lastPinned.audio) return "Voice Message";
                  return "Message";
                })()}
              </p>
            </div>
          </div>
          <div className="text-gray-500">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
          </div>
        </div>
      )}
      {/* Messages Area - Flex Grow to fill space */}
      <div className="flex-1 min-h-0 overflow-y-scroll p-4 pb-6 space-y-6 flex flex-col">
        {isMessagesLoading ? (
          <MessageSkeleton />
        ) : (
          <>
            {(() => {
              // Calculate first unseen index once
              const firstUnseenIndex = messages.findIndex(m => !m.seen && (m.senderId?._id || m.senderId) !== authUser._id);

              return messages.map((msg, idx) => {
                if (msg.isSystemMessage) {
                  return (
                    <div key={idx} className="flex justify-center my-4">
                      <div className="bg-gray-800/50 text-gray-400 text-xs px-3 py-1 rounded-full border border-gray-700/50">
                        {msg.text}
                      </div>
                    </div>
                  )
                }

                if (msg.deletedAt) {
                  const undoWindow = authUser?.privacy?.undoWindow ?? 5;
                  const isExpired = (Date.now() - new Date(msg.deletedAt).getTime()) > (undoWindow * 60 * 1000);

                  if (isExpired || undoWindow === 0) return null;

                  return (
                    <div key={idx} className="flex justify-end my-2">
                      <div className="bg-gray-800/60 border border-gray-700/50 rounded-lg p-3 flex items-center gap-3">
                        <span className="text-gray-400 text-sm italic">You deleted this message</span>
                        <button
                          onClick={() => undoDeleteMessage(msg._id)}
                          className="text-violet-400 text-sm hover:underline font-medium"
                        >
                          Undo
                        </button>
                      </div>
                    </div>
                  )
                }

                // Robust sender check
                const isMyMessage = (msg.senderId?._id || msg.senderId) === authUser._id;
                const senderProfilePic = (msg.senderId?.profilePic) || selectedUser?.profilePic || assets.avatar_icon;
                const senderName = msg.senderId?.fullName || "User";
                const isFirstUnseen = idx === firstUnseenIndex;

                // Date Separator Logic
                const showDateSeparator = (() => {
                  if (idx === 0) return true;
                  const prevMsg = messages[idx - 1];
                  const prevDate = new Date(prevMsg.createdAt).toDateString();
                  const currDate = new Date(msg.createdAt).toDateString();
                  return prevDate !== currDate;
                })();

                return (
                  <React.Fragment key={idx}>
                    {showDateSeparator && (
                      <div className="w-full flex items-center justify-center my-4">
                        <div className="bg-gray-800/80 text-gray-400 text-[11px] font-medium px-3 py-1 rounded-full border border-gray-700/50 backdrop-blur-sm shadow-sm">
                          {formatDateSeparator(msg.createdAt)}
                        </div>
                      </div>
                    )}
                    {isFirstUnseen && (
                      <div className="w-full flex items-center justify-center my-6">
                        <div className="bg-violet-900/30 text-xs px-4 py-1.5 rounded-full text-violet-300 border border-violet-500/30 shadow-[0_0_10px_rgba(139,92,246,0.1)] backdrop-blur-sm">
                          Unread Messages
                        </div>
                      </div>
                    )}
                    <div
                      id={`msg-${msg._id}`}
                      ref={isFirstUnseen ? firstUnseenMsgRef : null}
                      className={`flex items-end gap-3 group ${isMyMessage ? "justify-end" : "justify-start"}`}
                    >
                      {/* Avatar (Left side for others) */}
                      {!isMyMessage && (
                        <div className="chat-avatar flex flex-col items-center mb-1">
                          <img
                            src={senderProfilePic}
                            className="w-8 h-8 rounded-full border border-gray-700 object-cover shadow-sm"
                            alt="avatar"
                            title={senderName}
                          />
                        </div>
                      )}

                      <div className={`flex flex-col ${isMyMessage ? "items-end" : "items-start"} max-w-[85%] sm:max-w-[75%] md:max-w-[70%]`}>

                        {/* Sender Name for Groups (Others only) */}
                        {selectedGroup && !isMyMessage && (
                          <span className="text-[10px] text-gray-400 ml-1 mb-1 font-medium tracking-wide">{senderName}</span>
                        )}

                        <div
                          className={`relative group/msg ${isMyMessage ? "flex-row-reverse" : "flex-row"} flex items-center gap-2`}
                          onTouchStart={() => handleTouchStart(msg._id)}
                          onTouchEnd={handleTouchEnd}
                        >
                          {/* Message Bubble / Content */}
                          {msg.image && (
                            <div className="flex flex-col">
                              <div className="relative group/image">
                                <img
                                  className="max-w-full sm:max-w-[320px] md:max-w-[360px] border-2 border-transparent rounded-2xl overflow-hidden shadow-md object-cover"
                                  src={msg.image}
                                  alt=""
                                />
                                <button
                                  onClick={() => handleDownloadImage(msg.image)}
                                  className="absolute bottom-2 right-2 bg-black/60 hover:bg-black/80 text-white p-2 rounded-full opacity-0 group-hover/image:opacity-100 transition-all transform hover:scale-110"
                                  title="Download"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" x2="12" y1="15" y2="3" /></svg>
                                </button>
                              </div>
                              {msg.text && (
                                <p
                                  className={`p-3 w-full sm:min-w-[120px] text-sm md:text-[15px] rounded-2xl mt-2 break-words shadow-sm leading-relaxed ${!isMyMessage
                                    ? "rounded-tl-none bg-gray-800 text-gray-100 border border-gray-700"
                                    : "rounded-tr-none bg-gradient-to-br from-violet-600 to-indigo-600 text-white border border-white/10"
                                    } `}
                                >
                                  {msg.text}
                                </p>
                              )}

                            </div>
                          )}

                          {msg.audio && (
                            <div className={`rounded-2xl p-2 flex items-center gap-2 text-white shadow-md ${!isMyMessage ? "bg-gray-800 rounded-tl-none border border-gray-700" : "bg-gradient-to-r from-violet-600 to-indigo-600 rounded-tr-none border border-white/10"}`}>
                              <VoiceMessage src={msg.audio} />
                            </div>
                          )}

                          {!msg.image && !msg.audio && (
                            editingMessageId === msg._id ? (
                              <div className="flex flex-col gap-2 min-w-[200px]">
                                <input
                                  value={editText}
                                  onChange={(e) => setEditText(e.target.value)}
                                  className="bg-gray-800 text-white p-3 rounded-lg text-sm outline-none border border-violet-500 ring-2 ring-violet-500/20"
                                  autoFocus
                                />
                                <div className="flex justify-end gap-2">
                                  <button onClick={cancelEditing} className="text-xs text-gray-400 hover:text-white px-2 py-1 rounded hover:bg-gray-700">Cancel</button>
                                  <button onClick={handleUpdateMessage} className="text-xs text-white bg-green-600 hover:bg-green-500 px-3 py-1 rounded transition-colors">Save</button>
                                </div>
                              </div>
                            ) : (
                              <div className={`relative px-4 py-2.5 rounded-2xl md:text-[15px] font-normal leading-relaxed break-words shadow-sm transition-all ${!isMyMessage
                                ? "bg-white/5 backdrop-blur-sm border border-white/10 text-gray-100 rounded-tl-none hover:bg-white/10"
                                : "bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-violet-500/20 rounded-tr-none border border-white/10"}`}>
                                <p className="break-all whitespace-pre-wrap min-w-[50px]">{msg.text}</p>
                                {/* Time & Read Status */}
                                <div className={`flex items-center gap-1.5 justify-end mt-1 ${isMyMessage ? "text-violet-200" : "text-gray-400"}`}>
                                  <span className="text-[10px] font-medium">{formatMessageTime(msg.createdAt)}</span>
                                  {isMyMessage && (
                                    <span>
                                      {msg.seen ? (
                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 7 17l-5-5" /><path d="m22 10-7.5 7.5L13 16" /></svg>
                                      ) : (
                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-70"><path d="M20 6 9 17l-5-5" /></svg>
                                      )}
                                    </span>
                                  )}
                                </div>
                              </div>
                            )
                          )}

                          {/* Reactions Display */}
                          {msg.reactions && msg.reactions.length > 0 && (
                            <div className={`absolute -bottom-3 ${isMyMessage ? "right-0" : "left-0"} flex items-center gap-1 bg-gray-800 rounded-full px-2 py-0.5 shadow-lg border border-gray-700 z-[5]`}>
                              {Object.entries(
                                msg.reactions.reduce((acc, curr) => {
                                  acc[curr.emoji] = (acc[curr.emoji] || 0) + 1;
                                  return acc;
                                }, {})
                              ).map(([emoji, count]) => (
                                <span key={emoji} className="text-xs flex items-center gap-0.5 text-gray-300 hover:scale-110 transition-transform cursor-pointer">
                                  <span>{emoji}</span>
                                  {count > 1 && <span className="font-bold text-[10px]">{count}</span>}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Actions (Edit/Delete/React) */}
                          <div className="opacity-0 group-hover/msg:opacity-100 transition-all duration-200 px-2 flex items-center gap-2">
                            {/* Reaction Button */}
                            <div className="relative group/reaction">
                              <button className="text-gray-500 hover:text-yellow-400 transition-colors p-1.5 rounded-full hover:bg-gray-800">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M8 14s1.5 2 4 2 4-2 4-2" /><line x1="9" x2="9.01" y1="9" y2="9" /><line x1="15" x2="15.01" y1="9" y2="9" /></svg>
                              </button>
                              {/* Hover Reaction Bar */}
                              <div className={`
                            bg-gray-900 rounded-full shadow-2xl border border-gray-700 p-2 items-center gap-1 md:gap-2 animate-in fade-in slide-in-from-bottom-2 z-[100] min-w-max backdrop-blur-md
                            ${activeReactionId === msg._id
                                  ? "fixed bottom-32 left-1/2 -translate-x-1/2 flex scale-110 origin-center"
                                  : "hidden md:group-hover/reaction:flex md:absolute md:bottom-full md:mb-2 " + (isMyMessage ? "md:right-0 md:origin-bottom-right" : "md:left-0 md:origin-bottom-left")
                                }
                          `}>
                                {["👍", "❤️", "😂", "😮", "😢", "🙏"].map(emoji => (
                                  <button
                                    key={emoji}
                                    onClick={(e) => { e.stopPropagation(); handleReaction(msg._id, emoji); setActiveReactionId(null); }}
                                    className="hover:scale-125 transition-transform text-3xl md:text-xl p-2 md:p-0.5 active:scale-95"
                                  >
                                    {emoji}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Menu Button (Only for own messages) */}
                            {isMyMessage && (
                              <div className="relative">
                                <button
                                  onClick={(e) => { e.stopPropagation(); toggleMenu(msg._id); }}
                                  className="text-gray-500 hover:text-white transition-colors p-1.5 rounded-full hover:bg-gray-800"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1" /><circle cx="12" cy="5" r="1" /><circle cx="12" cy="19" r="1" /></svg>
                                </button>
                                {activeMenuId === msg._id && (
                                  <>
                                    {/* Mobile Backdrop */}
                                    <div
                                      className="md:hidden fixed inset-0 z-[100] bg-black/60 backdrop-blur-[2px] animate-in fade-in duration-200"
                                      onClick={(e) => { e.stopPropagation(); setActiveMenuId(null); }}
                                    />
                                    {/* Menu Container - Responsive Styles */}
                                    <div className={`
                                  z-[101] bg-gray-900 rounded-2xl shadow-2xl border border-gray-700/50 overflow-hidden
                                  fixed bottom-4 left-4 right-4 w-auto origin-bottom animate-in slide-in-from-bottom-4 fade-in duration-200
                                  md:absolute md:bottom-full md:right-0 md:w-40 md:mb-2 md:left-auto md:top-auto md:inset-auto md:animate-in md:fade-in md:zoom-in-95 md:origin-bottom-right md:z-50
                                `}>
                                      <button
                                        onClick={() => { msg.pinned ? unpinMessage(msg._id) : pinMessage(msg._id); setActiveMenuId(null); }}
                                        className={`w-full text-left px-5 py-4 md:px-4 md:py-2.5 text-base md:text-sm text-gray-200 hover:bg-gray-800 flex items-center gap-3 md:gap-2 active:bg-gray-800 transition-colors ${msg.pinned && msg.pinnedBy && msg.pinnedBy._id !== authUser._id && 'hidden'}`}
                                      >
                                        <span className="md:hidden p-2 bg-gray-800 rounded-full text-violet-400">
                                          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" x2="12" y1="17" y2="22" /><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z" /></svg>
                                        </span>
                                        {msg.pinned ? "Unpin Message" : "Pin Message"}
                                      </button>

                                      {!msg.image && !msg.audio && !msg.text.match(/^(Audio|Video) Call ended •/) && (
                                        <button onClick={() => startEditing(msg)} className="w-full text-left px-5 py-4 md:px-4 md:py-2.5 text-base md:text-sm text-gray-200 hover:bg-gray-800 border-t border-gray-800/50 active:bg-gray-800 flex items-center gap-3 md:gap-2">
                                          <span className="md:hidden p-2 bg-gray-800 rounded-full text-blue-400">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                                          </span>
                                          Edit Message
                                        </button>
                                      )}

                                      <button onClick={() => handleDeleteMessage(msg._id)} className="w-full text-left px-5 py-4 md:px-4 md:py-2.5 text-base md:text-sm text-red-400 hover:bg-gray-800 border-t border-gray-800/50 active:bg-gray-800 flex items-center gap-3 md:gap-2">
                                        <span className="md:hidden p-2 bg-red-500/10 rounded-full text-red-400">
                                          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                                        </span>
                                        Delete Message
                                      </button>
                                    </div>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                      </div>
                    </div>
                  </React.Fragment>
                );
              })
            })()}
            <div ref={scrollEnd} className="h-1"></div>
          </>
        )}
      </div>

      {/* Image Preview Modal */}
      {
        imagePreview && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm p-4">
            <div className="relative bg-gray-800 p-2 rounded-lg max-w-sm w-full flex flex-col gap-2">
              <img src={imagePreview} alt="Preview" className="w-full rounded-md max-h-[60vh] object-contain" />

              <div className="flex justify-end gap-2 p-1">
                <button
                  onClick={removeImagePreview}
                  className="text-gray-400 hover:text-white text-sm px-3 py-1"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSendMessage}
                  disabled={isUploading}
                  className="bg-violet-600 hover:bg-violet-700 text-white px-4 py-1.5 rounded-lg text-sm transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {isUploading ? "Sending..." : "Send Image"}
                  {!isUploading && <img src={assets.send_button} alt="" className="w-4 invert brightness-0" />}
                </button>
              </div>

              <button
                onClick={removeImagePreview}
                className="absolute -top-3 -right-3 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
              </button>
            </div>
          </div>
        )
      }


      {/* Group Info Modal */}
      {
        showGroupInfo && selectedGroup && (
          <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-gray-900 border border-gray-700 w-full max-w-md rounded-2xl p-5 flex flex-col gap-5 max-h-[85vh] shadow-2xl">
              <div className="flex justify-between items-center border-b border-gray-800 pb-4">
                <h2 className="text-xl font-bold text-white tracking-tight">Group Info</h2>
                <button onClick={() => setShowGroupInfo(false)} className="text-gray-500 hover:text-white transition-colors bg-gray-800/50 p-1.5 rounded-full hover:bg-gray-800">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" x2="6" y1="6" y2="18" /><line x1="6" x2="18" y1="6" y2="18" /></svg>
                </button>
              </div>

              {/* Group Details */}
              <div className="flex flex-col items-center gap-3">
                <div className="relative group/icon">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-white font-bold text-3xl shadow-lg ring-4 ring-gray-800 overflow-hidden">
                    {selectedGroup.icon ? (
                      <img src={selectedGroup.icon} className="w-full h-full object-cover" alt="" />
                    ) : (
                      <span>{selectedGroup.name[0].toUpperCase()}</span>
                    )}
                  </div>
                  {/* Admin Edit Overlay */}
                  {selectedGroup.admins.some(admin => (admin._id || admin) === authUser._id) && (
                    <>
                      <label htmlFor="group-icon-upload" className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover/icon:opacity-100 cursor-pointer transition-opacity z-10">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" x2="12" y1="3" y2="15" /></svg>
                        <input
                          type="file"
                          id="group-icon-upload"
                          accept="image/*"
                          hidden
                          onChange={handleGroupIconChange}
                        />
                      </label>
                      {selectedGroup.icon && (
                        <button
                          onClick={handleRemoveGroupIcon}
                          className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-1.5 opacity-0 group-hover/icon:opacity-100 transition-opacity z-20 hover:bg-red-600 shadow-lg"
                          title="Remove Icon"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><line x1="10" x2="10" y1="11" y2="17" /><line x1="14" x2="14" y1="11" y2="17" /></svg>
                        </button>
                      )}
                    </>
                  )}
                </div>
                <h3 className="text-2xl font-bold text-white mb-1">{selectedGroup.name}</h3>
                <div className="text-center">
                  <h3 className="text-white font-bold text-xl">{selectedGroup.name}</h3>
                  <p className="text-gray-400 text-sm mt-0.5">{selectedGroup.members.length} Members</p>
                </div>
                {/* Delete Group Button (Admins only) */}
                {selectedGroup.admins.some(a => a._id === authUser._id) && (
                  <button onClick={handleDeleteGroup} className="text-xs bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white px-4 py-2 rounded-lg transition-all font-medium border border-red-500/20 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                    Delete Group
                  </button>
                )}
              </div>

              {/* Members List */}
              <div className="flex-1 overflow-y-auto min-h-0 bg-gray-950/30 rounded-xl p-3 border border-gray-800/50">
                <div className="flex justify-between items-center mb-3 px-1">
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Members</h4>
                  {/* Show Add Button Only if Admin */}
                  {selectedGroup.admins.some(a => a._id === authUser._id) && (
                    <button onClick={() => setShowAddMemberModal(true)} className="text-xs bg-violet-600 text-white px-3 py-1.5 rounded-lg hover:bg-violet-700 font-medium transition-colors flex items-center gap-1.5">
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                      Add Member
                    </button>
                  )}
                </div>

                <div className="flex flex-col gap-1.5">
                  {selectedGroup.members.map(member => {
                    const isMemberAdmin = selectedGroup.admins.some(a => a._id === member._id);
                    const amIAdmin = selectedGroup.admins.some(a => a._id === authUser._id);

                    return (
                      <div key={member._id} className="flex items-center justify-between p-2.5 rounded-lg hover:bg-gray-800/60 transition-colors group/member">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <img src={member.profilePic || assets.avatar_icon} className="w-10 h-10 rounded-full object-cover border border-gray-700" alt="" />
                            {isMemberAdmin && (
                              <div className="absolute -bottom-1 -right-1 bg-yellow-500 text-black text-[8px] font-bold px-1.5 py-0.5 rounded-full border border-gray-900 shadow-sm">ADMIN</div>
                            )}
                          </div>
                          <div>
                            <p className="text-white text-sm font-medium">
                              {member.fullName} {member._id === authUser._id && <span className="text-gray-500 font-normal">(You)</span>}
                            </p>
                            <p className="text-[10px] text-gray-500 truncate max-w-[120px]">{member.email || "User"}</p>
                          </div>
                        </div>

                        {/* Admin Actions (Only if I am Admin) */}
                        {amIAdmin && member._id !== authUser._id && (
                          <div className="flex items-center gap-1 opacity-0 group-hover/member:opacity-100 transition-opacity ml-auto">
                            <button
                              onClick={() => handleToggleAdmin(member._id)}
                              className={`text-[10px] px-2 py-1 rounded transition-colors ${isMemberAdmin
                                ? "bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20"
                                : "bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border border-blue-500/20"
                                }`}
                              title={isMemberAdmin ? "Remove Admin" : "Make Admin"}
                            >
                              {isMemberAdmin ? "Demote" : "Promote"}
                            </button>
                            <button
                              onClick={() => handleRemoveMember(member._id)}
                              className="text-[10px] bg-red-500/10 text-red-400 px-2 py-1 rounded hover:bg-red-500/20 border border-red-500/20"
                              title="Remove User"
                            >
                              Kick
                            </button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* Leave Group Button */}
                <div className="mt-4 pt-4 border-t border-gray-700 w-full">
                  <button
                    onClick={async () => {
                      if (window.confirm("Are you sure you want to leave this group?")) {
                        await leaveGroup(selectedGroup._id);
                        setShowGroupInfo(false);
                      }
                    }}
                    className="w-full flex items-center justify-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 py-2.5 rounded-xl transition-colors border border-red-500/20 font-medium"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" x2="9" y1="12" y2="12" /></svg>
                    Leave Group
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      }

      {/* Add Member Modal */}
      {
        showAddMemberModal && (
          <div className="absolute inset-0 z-[60] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-gray-900 border border-gray-700 w-full max-w-sm rounded-2xl p-5 flex flex-col gap-4 max-h-[60vh] shadow-2xl">
              <div className="flex justify-between items-center border-b border-gray-800 pb-3">
                <h2 className="text-lg font-bold text-white">Add Members</h2>
                <button onClick={() => setShowAddMemberModal(false)} className="text-gray-500 hover:text-white hover:bg-gray-800 p-1 rounded-full transition-all">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" x2="6" y1="6" y2="18" /><line x1="6" x2="18" y1="6" y2="18" /></svg>
                </button>
              </div>
              <div className="overflow-y-auto flex-1 pr-1 custom-scrollbar">
                {users
                  .filter(u => !selectedGroup.members.some(m => m._id === u._id) && u._id !== authUser._id)
                  .map(user => (
                    <div key={user._id} className="flex justify-between items-center p-3 hover:bg-gray-800/80 rounded-xl mb-1 transition-colors group">
                      <div className="flex items-center gap-3">
                        <img src={user.profilePic || assets.avatar_icon} className="w-9 h-9 rounded-full object-cover" alt="" />
                        <span className="text-white text-sm font-medium">{user.fullName}</span>
                      </div>
                      <button onClick={() => handleAddMember(user._id)} className="text-xs bg-slate-800 text-white px-3 py-1.5 rounded-lg group-hover:bg-violet-600 transition-colors">Add</button>
                    </div>
                  ))
                }
                {users.filter(u => !selectedGroup.members.some(m => m._id === u._id) && u._id !== authUser._id).length === 0 && (
                  <div className="flex flex-col items-center justify-center py-8 text-gray-500 gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="4.93" x2="19.07" y1="4.93" y2="19.07" /></svg>
                    <p className="text-sm">No new users to add</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      }


      {/* Pinned Messages Sidebar */}
      {
        showPinnedMessages && (
          <div className="absolute inset-y-0 right-0 w-80 bg-gray-900 border-l border-gray-800 z-50 transform transition-transform shadow-2xl flex flex-col backdrop-blur-3xl bg-opacity-95">
            <div className="flex items-center justify-between p-4 border-b border-gray-800 bg-gray-900/50">
              <h3 className="font-semibold text-white flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" x2="12" y1="17" y2="22" /><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z" /></svg>
                Pinned Messages
              </h3>
              <button onClick={() => setShowPinnedMessages(false)} className="text-gray-400 hover:text-white p-1 rounded-full hover:bg-gray-800 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" x2="6" y1="6" y2="18" /><line x1="6" x2="18" y1="6" y2="18" /></svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
              {messages.filter(m => m.pinned).length === 0 ? (
                <div className="text-center text-gray-500 py-10 flex flex-col items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-50"><line x1="12" x2="12" y1="17" y2="22" /><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z" /></svg>
                  <p className="text-sm">No pinned messages</p>
                </div>
              ) : (
                messages.filter(m => m.pinned).map(msg => (
                  <div key={msg._id} className="bg-gray-800/50 p-3 rounded-xl border border-gray-700/50 hover:border-violet-500/30 transition-colors group relative">
                    <div className="flex items-center gap-2 mb-1.5">
                      <img src={msg.senderId.profilePic || assets.avatar_icon} className="w-5 h-5 rounded-full object-cover" alt="" />
                      <span className="text-xs font-semibold text-gray-300">{msg.senderId.fullName}</span>
                      <span className="text-[10px] text-gray-500 ml-auto">{formatMessageTime(msg.createdAt)}</span>
                    </div>
                    {msg.text && <p className="text-sm text-gray-200 line-clamp-3">{msg.text}</p>}
                    {msg.image && <div className="text-xs text-blue-400 mt-1 flex items-center gap-1"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" /></svg> Image Attachment</div>}
                    {msg.audio && <div className="text-xs text-yellow-500 mt-1 flex items-center gap-1"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" x2="12" y1="19" y2="22" /><line x1="8" x2="16" y1="22" y2="22" /></svg> Voice Message</div>}

                    <button
                      onClick={() => unpinMessage(msg._id)}
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 transition-all p-1"
                      title="Unpin"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" x2="6" y1="6" y2="18" /><line x1="6" x2="18" y1="6" y2="18" /></svg>
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )
      }

      {/* bottom area  */}
      <div className="w-full gap-3 p-3 backdrop-blur-md bg-black/20 z-10">

        {/* Dynamic Input Area */}
        {isBlocked ? (
          <div className="flex items-center justify-center p-4 bg-gray-900/80 backdrop-blur-md rounded-lg mx-4 mb-2 border border-red-900/30">
            <p className="text-gray-400 text-sm">You have blocked this user. <button className="text-red-500 font-medium hover:underline ml-1" onClick={() => unblockUser(selectedUser._id)}>Unblock</button> to send messages.</p>
          </div>
        ) : isRecording ? (
          <div className="flex items-center justify-between bg-gray-800/80 px-4 py-2 rounded-full border border-red-500/30 w-full animate-pulse-border transition-all">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.6)]"></div>
              {/* Recording Visualizer */}
              <div className="flex items-center gap-1 h-4">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className={`w-1 bg-red-400 rounded-full animate-wave`} style={{ height: `${Math.random() * 100}%`, animationDelay: `${i * 0.1}s` }}></div>
                ))}
              </div>
              <span className="text-white font-mono min-w-[50px]">{formatDuration(recordingDuration)}</span>
            </div>
            <div className="flex items-center gap-4">
              <button onClick={cancelRecording} className="text-gray-400 hover:text-white text-sm font-medium">Cancel</button>
              <button onClick={stopRecording} className="bg-red-500 hover:bg-red-600 text-white p-2 rounded-full shadow-lg hover:scale-105 transition-transform">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" x2="2" y1="6" y2="6" /><polyline points="2 6 2 2 22 2 22 6" /><line x1="12" x2="12" y1="22" y2="10" /></svg>
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 md:gap-3 w-full">
            <div className="flex-1 flex items-center bg-gray-100/10 px-3 md:px-4 py-1 rounded-[24px] border border-white/5 focus-within:border-violet-500/30 focus-within:bg-gray-100/15 transition-all w-full relative">
              <input
                onChange={handleInputChange}
                value={input}
                onKeyDown={(e) => (e.key === "Enter" ? handleSendMessage(e) : null)}
                type="text"
                placeholder={imagePreview ? "Add a caption..." : "Message..."}
                className="flex-1 text-[15px] md:text-base py-2.5 md:py-3 bg-transparent outline-none text-white placeholder-gray-400 min-w-0"
                disabled={isUploading}
              />

              <div className="flex items-center gap-1 md:gap-2 shrink-0 ml-2">
                <input
                  onChange={handleImageSelect}
                  type="file"
                  id="image"
                  accept=".jpg, .jpeg, .png"
                  hidden
                  disabled={isUploading}
                />
                <label htmlFor="image" className={`cursor-pointer text-gray-400 hover:text-violet-400 p-2 rounded-full hover:bg-white/5 transition-colors ${isUploading ? 'opacity-50 pointer-events-none' : ''}`} title="Attach Image">
                  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" /></svg>
                </label>

                <button
                  onClick={() => { setShowEmojiPicker(!showEmojiPicker); setShowStickerPicker(false); }}
                  className={`text-gray-400 hover:text-yellow-400 transition-colors p-2 rounded-full hover:bg-white/5 ${showEmojiPicker ? 'text-yellow-400' : ''}`}
                  title="Emoji"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M8 14s1.5 2 4 2 4-2 4-2" /><line x1="9" x2="9.01" y1="9" y2="9" /><line x1="15" x2="15.01" y1="9" y2="9" /></svg>
                </button>
              </div>

              {/* Responsive Emoji Picker */}
              {showEmojiPicker && (
                <div className="fixed bottom-[80px] left-1/2 -translate-x-1/2 w-[95vw] max-w-[350px] z-[100] shadow-2xl rounded-2xl overflow-hidden border border-gray-700 animate-in fade-in slide-in-from-bottom-5 md:absolute md:bottom-14 md:left-0 md:translate-x-0 md:w-[350px]">
                  <div className="bg-gray-900 border-b border-gray-700 p-2 flex justify-end md:hidden">
                    <button onClick={() => setShowEmojiPicker(false)} className="text-gray-400 hover:text-white">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" x2="6" y1="6" y2="18" /><line x1="6" x2="18" y1="6" y2="18" /></svg>
                    </button>
                  </div>
                  <EmojiPicker
                    theme="dark"
                    onEmojiClick={(emojiData) => {
                      setInput((prev) => prev + emojiData.emoji);
                    }}
                    width="100%"
                    height={350} // Fixed height for consistency
                    lazyLoadEmojis={true}
                    searchDisabled={false}
                  />
                </div>
              )}
            </div>

            {showStickerPicker && (
              <div className="absolute bottom-16 left-4 z-50 shadow-2xl rounded-xl overflow-hidden border border-gray-700 bg-gray-900 p-2 w-72 h-64 overflow-y-auto">
                {/* Sticker content kept simple for now as user focused on Emoji */}
              </div>
            )}


            {input.trim() || imagePreview ? (
              <button
                onClick={handleSendMessage}
                disabled={isUploading}
                className="disabled:opacity-50 transition-all"
              >
                {isUploading ? (
                  <svg className="animate-spin h-7 w-7 text-violet-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <img
                    src={assets.send_button}
                    alt=""
                    className="w-7 cursor-pointer textwh hover:scale-105 transition-transform"
                  />
                )}
              </button>
            ) : (
              <button
                onClick={startRecording}
                disabled={isUploading}
                className="bg-violet-600 hover:bg-violet-700 text-white p-2.5 rounded-full shadow-lg hover:scale-105 transition-transform"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" x2="12" y1="19" y2="22" /><line x1="8" x2="16" y1="22" y2="22" /></svg>
              </button>
            )}

            {/* Emoji Picker Toggle Button - added along with the other buttons if space permits, or inside the input container? */}
            {/* Let's put it inside the input container for better UI */}
          </div>
        )}
      </div>
    </div >
  ) : (
    <div className="hidden md:flex flex-col flex-1 items-center justify-center p-4 text-center">
      <div className="bg-gray-900/50 p-6 rounded-3xl flex flex-col items-center max-w-md text-center border border-gray-800 shadow-2xl backdrop-blur-sm">
        <div className="w-16 h-16 bg-gray-800 rounded-2xl flex items-center justify-center mb-4 animate-bounce">
          <img src={assets.logo_icon} className="w-10 h-10 opacity-70" alt="" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Welcome to QuickChat</h2>
        <p className="text-gray-400 mb-0">Select a chat to start messaging</p>
      </div>
    </div>
  );
};
