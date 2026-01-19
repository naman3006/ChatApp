import React, { useContext, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import assets from "../chat-assets/assets";
import { formatMessageTime } from "../lib/utils";
import { ChatContext } from "../context/ChatContext";
import { AuthContext } from "../context/authContext";
import toast from "react-hot-toast";
import EmojiPicker from 'emoji-picker-react';
import { CallContext } from "../context/CallContext";
import { Phone, Video, Palette, Link, Copy, RefreshCw, Trash2 } from "lucide-react";
import MessageSkeleton from "./skeletons/MessageSkeleton";
import ThemeSelector from "./ThemeSelector";
import CreatePollModal from "./CreatePollModal";
import MessageBubble from "./MessageBubble";
import ForwardModal from "./ForwardModal";
import AttachmentMenu from "./AttachmentMenu";
import FilePreview from "./FilePreview";
import { Paperclip, Send, X } from "lucide-react";

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
    isMessagesLoading,
    updateGroupTheme,
    updateUserTheme,
    createPoll,
    hasMore,
    isSelectionMode,
    selectedMessages,
    toggleMessageSelection,
    clearSelection,
    generateInvite,
    revokeInvite
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
  const [page, setPage] = useState(1);
  const containerRef = useRef(null);
  const oldScrollHeightRef = useRef(0);
  const touchTimer = useRef(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const [showThemeSelector, setShowThemeSelector] = useState(false);
  const [showPollModal, setShowPollModal] = useState(false);
  const [showForwardModal, setShowForwardModal] = useState(false);
  const [showShareOptions, setShowShareOptions] = useState(false);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null); // { file, data }
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);


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
    if (input.trim() === "" && !imagePreview && !selectedFile) {
      return null;
    }

    setIsUploading(true);
    try {
      if (imagePreview) {
        await sendMessage({ image: imagePreview, text: input.trim() });
        setImagePreview(null);
      } else if (selectedFile) {
        // Send file
        await sendMessage({
          file: {
            data: selectedFile.data,
            name: selectedFile.file.name,
            size: selectedFile.file.size,
            type: selectedFile.file.type
          },
          text: input.trim()
        });
        setSelectedFile(null);
      } else {
        await sendMessage({ text: input.trim() });
      }
      setInput("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (error) {
      console.error(error);
      toast.error("Failed to send message");
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Limit 10MB
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size too large (max 10MB)");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setSelectedFile({
        file: file,
        data: reader.result
      });
      setShowAttachmentMenu(false);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
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

  const handleDownloadImage = async (imageUrl, fileName) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      // If fileName provided, use it. Else default to image png.
      a.download = fileName || `chat-image-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      toast.error("Failed to download file");
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

  const handleThemeSelect = (theme) => {
    if (selectedGroup) {
      updateGroupTheme(selectedGroup._id, theme);
    } else if (selectedUser) {
      updateUserTheme(selectedUser._id, theme);
    }
  };

  const currentTheme = (() => {
    if (selectedGroup) {
      return selectedGroup.theme;
    } else if (selectedUser && authUser.chatThemes) {
      // AuthUser chatThemes is a Map, but serialized from JSON it might be an object if not carefully revived. 
      // Mongoose Map becomes Object in JSON usually.
      // Let's check safely. 
      if (typeof authUser.chatThemes.get === 'function') {
        return authUser.chatThemes.get(selectedUser._id);
      } else {
        return authUser.chatThemes[selectedUser._id];
      }
    }
    return null;
  })();

  const getBackgroundStyle = () => {
    if (!currentTheme) return {};
    if (currentTheme.type === 'solid') return { backgroundColor: currentTheme.value };
    if (currentTheme.type === 'gradient') return { backgroundImage: currentTheme.value };
    if (currentTheme.type === 'image') return { backgroundImage: `url(${currentTheme.value})`, backgroundSize: 'cover', backgroundPosition: 'center' };
    return {};
  };


  useEffect(() => {
    if (!selectedUser && !selectedGroup) return;

    setPage(1);
    const chatId = selectedGroup ? selectedGroup._id : selectedUser._id;
    const isGroup = !!selectedGroup;
    getMessages(chatId, isGroup, 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedUser, selectedGroup]);

  // Handle scroll position maintenance when older messages load
  useEffect(() => {
    if (messages.length > 0) {
      if (page === 1) {
        // New chat loaded or message received (roughly) - scroll to bottom
        setTimeout(() => {
          if (firstUnseenMsgRef.current) {
            firstUnseenMsgRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
          } else if (scrollEnd.current) {
            scrollEnd.current.scrollIntoView({ behavior: "smooth" });
          }
        }, 100);
      } else {
        // Pagination load - restore scroll position
        if (containerRef.current) {
          const newScrollHeight = containerRef.current.scrollHeight;
          const diff = newScrollHeight - oldScrollHeightRef.current;
          if (diff > 0) {
            containerRef.current.scrollTop = diff;
          }
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, selectedUser, selectedGroup]);

  const handleScroll = () => {
    if (containerRef.current && containerRef.current.scrollTop === 0 && hasMore && !isMessagesLoading) {
      oldScrollHeightRef.current = containerRef.current.scrollHeight;
      const nextPage = page + 1;
      setPage(nextPage);
      const chatId = selectedGroup ? selectedGroup._id : selectedUser._id;
      const isGroup = !!selectedGroup;
      getMessages(chatId, isGroup, nextPage);
    }
  };

  return (selectedUser || selectedGroup) ? (
    <div
      className="h-full w-full overflow-hidden relative flex flex-col backdrop-blur-lg transition-all duration-500 bg-background/50"
      style={getBackgroundStyle()}
      onClick={() => { setActiveMenuId(null); setActiveReactionId(null); }}
    >
      {/* Selection Header */}
      {
        isSelectionMode ? (
          <div className="flex items-center gap-3 py-3 px-4 border-b border-border/5 bg-violet-900/40 backdrop-blur-md z-20">
            <div className="flex items-center gap-4 flex-1">
              <button onClick={clearSelection} className="text-white/80 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
              <span className="font-semibold text-white text-lg">{selectedMessages.length} Selected</span>
            </div>
            <button
              disabled={selectedMessages.length === 0}
              onClick={() => setShowForwardModal(true)}
              className="text-white font-medium bg-violet-600 hover:bg-violet-700 px-4 py-1.5 rounded-full flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-violet-500/20"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 17 20 12 15 7" /><path d="M4 18v-2a4 4 0 0 1 4-4h12" /></svg>
              <span>Forward</span>
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3 py-3 px-4 border-b border-border/5 bg-background/50 backdrop-blur-md">

            {/* Mobile Back Button */}
            <button
              onClick={() => { setSelectedUser(null); setSelectedGroup(null); }}
              className="md:hidden text-muted-foreground hover:text-foreground mr-2 p-1 rounded-full hover:bg-secondary/50 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
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
            <div className="flex-1 flex flex-col justify-center ml-1 overflow-hidden">
              <p className={`text-base md:text-lg text-foreground flex items-center gap-2 font-semibold tracking-tight ${!selectedGroup && "cursor-pointer hover:underline"}`}
                onClick={() => !selectedGroup && navigate(`/user/${selectedUser._id}`)}
              >
                {selectedGroup ? selectedGroup.name : selectedUser.fullName}
                {!selectedGroup && onlineUsers.includes(selectedUser._id) &&
                  <span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></span>}
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
                      typingText = `${typer ? typer.fullName.split(' ')[0] : "Someone"} is typing...`;
                    } else {
                      typingText = "Several people are typing...";
                    }
                  } else {
                    typingText = "typing...";
                  }

                  return (
                    <p className="text-[10px] md:text-xs text-green-500 font-medium animate-pulse truncate">
                      {typingText}
                    </p>
                  );
                }

                if (selectedGroup) {
                  return (
                    <p className="text-[10px] md:text-xs text-muted-foreground cursor-pointer hover:text-foreground truncate" onClick={() => setShowGroupInfo(true)}>
                      {selectedGroup.members.length} members
                    </p>
                  );
                }

                if (!onlineUsers.includes(selectedUser._id) && selectedUser.lastSeen) {
                  // Custom format to match screenshot: "Last seen at 21:02 on 12/01/2026"
                  const date = new Date(selectedUser.lastSeen);
                  const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
                  const day = date.toLocaleDateString([], { day: '2-digit', month: '2-digit', year: 'numeric' });
                  return (
                    <p className="text-[10px] text-muted-foreground truncate leading-tight">
                      Last seen at {time} on {day}
                    </p>
                  );
                } else if (onlineUsers.includes(selectedUser._id)) {
                  return <p className="text-[10px] text-green-500 font-medium">Online</p>;
                }

                return <p className="text-[10px] text-muted-foreground">Offline</p>;
              })()}
            </div>

            {!selectedGroup && (
              <>
                <button
                  onClick={() => startCall(selectedUser._id, selectedUser.fullName, false)}
                  className="p-2 rounded-full hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors mr-1"
                  title="Audio Call"
                >
                  <Phone size={20} />
                </button>
                <button
                  onClick={() => startCall(selectedUser._id, selectedUser.fullName, true)}
                  className="p-2 rounded-full hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors mr-2"
                  title="Video Call"
                >
                  <Video size={20} />
                </button>
                <button
                  onClick={() => setShowThemeSelector(true)}
                  className="p-2 rounded-full hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors mr-2"
                  title="Change Theme"
                >
                  <Palette size={20} />
                </button>
                {/* <div className="mr-2">
              <ThemeToggle />
            </div> */}
              </>
            )}

            {/* Group Theme Button - Only Admin? Or view only? Let's allow view, but only admin edit in selector */}
            {selectedGroup && selectedGroup.admins.some(adm => adm._id === authUser._id) && (
              <button
                onClick={() => setShowThemeSelector(true)}
                className="p-2 rounded-full hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors mr-2"
                title="Change Group Theme"
              >
                <Palette size={20} />
              </button>
            )}

            <button
              onClick={() => setShowPinnedMessages(!showPinnedMessages)}
              className={`p-2 rounded-full transition-colors mr-2 ${showPinnedMessages ? 'bg-violet-600 text-white' : 'hover:bg-secondary text-muted-foreground hover:text-foreground'}`}
              title="Pinned Messages"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" x2="12" y1="17" y2="22" /><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z" /></svg>
            </button>

            {/* <img
          onClick={() => { setSelectedUser(null); setSelectedGroup(null); }}
          src={assets.arrow_icon}
          alt=""
          className="md:hidden max-w-7 cursor-pointer hover:scale-110 transition-transform"
        /> */}
            {/* Info Icon for Group */}
            {selectedGroup && (
              <button onClick={() => setShowGroupInfo(true)} className="text-muted-foreground hover:text-foreground transition-colors p-2 rounded-full hover:bg-secondary">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" x2="12" y1="16" y2="12" /><line x1="12" x2="12.01" y1="8" y2="8" /></svg>
              </button>
            )}
          </div>
        )
      }

      {/* Sticky Pinned Message */}
      {
        messages.some(m => m.pinned) && (
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
        )
      }
      {/* Messages Area - Flex Grow to fill space */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 min-h-0 overflow-y-scroll p-4 pb-6 space-y-6 flex flex-col"
      >
        {isMessagesLoading ? (
          <MessageSkeleton />
        ) : (
          <>
            {(() => {
              // Calculate first unseen index once
              const firstUnseenIndex = messages.findIndex(m => !m.seen && (m.senderId?._id || m.senderId) !== authUser._id);

              return messages.map((msg, idx) => {
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
                  <MessageBubble
                    key={msg._id || idx}
                    msg={msg}
                    isMyMessage={isMyMessage}
                    isFirstUnseen={isFirstUnseen}
                    showDateSeparator={showDateSeparator}
                    senderProfilePic={senderProfilePic}
                    senderName={senderName}
                    selectedGroup={selectedGroup}
                    authUser={authUser}
                    handleTouchStart={handleTouchStart}
                    handleTouchEnd={handleTouchEnd}
                    handleDownloadImage={handleDownloadImage}
                    handleReaction={handleReaction}
                    activeReactionId={activeReactionId}
                    setActiveReactionId={setActiveReactionId}
                    toggleMenu={toggleMenu}
                    activeMenuId={activeMenuId}
                    setActiveMenuId={setActiveMenuId}
                    startEditing={startEditing}
                    handleDeleteMessage={handleDeleteMessage}
                    undoDeleteMessage={undoDeleteMessage}
                    pinMessage={pinMessage}
                    unpinMessage={unpinMessage}
                    editingMessageId={editingMessageId}
                    editText={editText}
                    setEditText={setEditText}
                    cancelEditing={cancelEditing}
                    handleUpdateMessage={handleUpdateMessage}
                    firstUnseenMsgRef={firstUnseenMsgRef}
                    isSelectionMode={isSelectionMode}
                    isSelected={selectedMessages.includes(msg._id)}
                    toggleSelection={toggleMessageSelection}
                  />
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
            <div className="relative bg-card p-2 rounded-lg max-w-sm w-full flex flex-col gap-2">
              <img src={imagePreview} alt="Preview" className="w-full rounded-md max-h-[60vh] object-contain" />

              <div className="flex justify-end gap-2 p-1">
                <button
                  onClick={removeImagePreview}
                  className="text-muted-foreground hover:text-foreground text-sm px-3 py-1"
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


      {/* Forward Modal */}
      {showForwardModal && (
        <ForwardModal onClose={() => setShowForwardModal(false)} />
      )}

      {/* Group Info Modal */}
      {
        showGroupInfo && selectedGroup && (
          <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-popover border border-border w-full max-w-md rounded-2xl p-5 flex flex-col gap-5 max-h-[85vh] shadow-2xl">
              <div className="flex justify-between items-center border-b border-border pb-4">
                <h2 className="text-xl font-bold text-foreground tracking-tight">Group Info</h2>
                <button onClick={() => setShowGroupInfo(false)} className="text-muted-foreground hover:text-foreground transition-colors bg-muted p-1.5 rounded-full hover:bg-muted/80">
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

              {/* Invite Link Section (Group Admins Only) */}
              {selectedGroup.admins.some(a => a._id === authUser._id) && (
                <div className="w-full">
                  <div className="bg-muted/40 rounded-xl p-3 border border-border/50">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                        <Link size={12} /> Invite Link
                      </h4>
                      {selectedGroup.inviteCode && (
                        <button
                          onClick={async () => {
                            if (window.confirm("Revoke this invite link? Users with the old link won't be able to join.")) {
                              const success = await revokeInvite(selectedGroup._id);
                              if (success) {
                                updateGroup(selectedGroup._id, { ...selectedGroup, inviteCode: undefined });
                              }
                            }
                          }}
                          className="text-xs flex items-center gap-1 text-red-500/80 hover:text-red-500 transition-colors font-medium hover:bg-red-500/10 rounded px-1.5 py-0.5"
                          title="Revoke Link"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>

                    {selectedGroup.inviteCode ? (
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2 bg-background/50 p-2 rounded-lg border border-border group hover:border-violet-500/50 transition-colors">
                          <p className="text-xs text-muted-foreground truncate flex-1 font-mono">
                            {window.location.host}/invite/{selectedGroup.inviteCode}
                          </p>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(`${window.location.origin}/invite/${selectedGroup.inviteCode}`);
                              toast.success("Link copied!");
                            }}
                            className="p-1.5 hover:bg-violet-500/10 rounded-md text-violet-500 transition-colors"
                            title="Copy Link"
                          >
                            <Copy size={14} />
                          </button>
                        </div>
                        {!showShareOptions ? (
                          <button
                            onClick={() => {
                              if (navigator.share) {
                                navigator.share({
                                  title: `Join ${selectedGroup.name}`,
                                  text: `Join my group "${selectedGroup.name}" on ChatApp!`,
                                  url: `${window.location.origin}/invite/${selectedGroup.inviteCode}`
                                }).catch(console.error);
                              } else {
                                setShowShareOptions(true);
                              }
                            }}
                            className="w-full py-1.5 bg-secondary/50 hover:bg-secondary text-foreground text-xs font-semibold rounded-lg transition-colors border border-border/50"
                          >
                            Share Link
                          </button>
                        ) : (
                          <div className="grid grid-cols-3 gap-2 animate-in fade-in slide-in-from-top-1">
                            <a
                              href={`https://wa.me/?text=${encodeURIComponent(`Join my group "${selectedGroup.name}" on ChatApp! ${window.location.origin}/invite/${selectedGroup.inviteCode}`)}`}
                              target="_blank"
                              rel="noreferrer"
                              className="flex flex-col items-center justify-center p-2 rounded-lg bg-[#25D366]/10 hover:bg-[#25D366]/20 transition-colors gap-1 border border-[#25D366]/20"
                              title="Share on WhatsApp"
                            >
                              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" className="text-[#25D366]"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" /></svg>
                              <span className="text-[10px] font-medium text-[#25D366]">WhatsApp</span>
                            </a>
                            <a
                              href={`https://t.me/share/url?url=${encodeURIComponent(`${window.location.origin}/invite/${selectedGroup.inviteCode}`)}&text=${encodeURIComponent(`Join my group "${selectedGroup.name}" on ChatApp!`)}`}
                              target="_blank"
                              rel="noreferrer"
                              className="flex flex-col items-center justify-center p-2 rounded-lg bg-[#0088cc]/10 hover:bg-[#0088cc]/20 transition-colors gap-1 border border-[#0088cc]/20"
                              title="Share on Telegram"
                            >
                              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" className="text-[#0088cc]"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 11.944 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" /></svg>
                              <span className="text-[10px] font-medium text-[#0088cc]">Telegram</span>
                            </a>
                            <a
                              href={`mailto:?subject=${encodeURIComponent(`Join ${selectedGroup.name}`)}&body=${encodeURIComponent(`Join my group "${selectedGroup.name}" on ChatApp! click the link below:\n\n${window.location.origin}/invite/${selectedGroup.inviteCode}`)}`}
                              className="flex flex-col items-center justify-center p-2 rounded-lg bg-yellow-500/10 hover:bg-yellow-500/20 transition-colors gap-1 border border-yellow-500/20"
                              title="Share via Email"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-yellow-500"><rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></svg>
                              <span className="text-[10px] font-medium text-yellow-500">Email</span>
                            </a>
                            <button
                              onClick={() => setShowShareOptions(false)}
                              className="col-span-3 text-[10px] text-muted-foreground hover:text-foreground mt-1"
                            >
                              Cancel
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <button
                        onClick={async () => {
                          const code = await generateInvite(selectedGroup._id);
                          if (code) {
                            updateGroup(selectedGroup._id, { ...selectedGroup, inviteCode: code });
                          }
                        }}
                        className="w-full py-2 flex items-center justify-center gap-2 text-xs font-semibold text-white bg-violet-600 hover:bg-violet-700 rounded-lg transition-all shadow-sm"
                      >
                        <RefreshCw size={14} /> Generate Link
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Members List */}
              <div className="flex-1 overflow-y-auto min-h-0 bg-muted/30 rounded-xl p-3 border border-border">
                <div className="flex justify-between items-center mb-3 px-1">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Members</h4>
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
                      <div key={member._id} className="flex items-center justify-between p-2.5 rounded-lg hover:bg-muted transition-colors group/member">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <img src={member.profilePic || assets.avatar_icon} className="w-10 h-10 rounded-full object-cover border border-border" alt="" />
                            {isMemberAdmin && (
                              <div className="absolute -bottom-1 -right-1 bg-yellow-500 text-black text-[8px] font-bold px-1.5 py-0.5 rounded-full border border-gray-900 shadow-sm">ADMIN</div>
                            )}
                          </div>
                          <div>
                            <p className="text-foreground text-sm font-medium">
                              {member.fullName} {member._id === authUser._id && <span className="text-muted-foreground font-normal">(You)</span>}
                            </p>
                            <p className="text-[10px] text-muted-foreground truncate max-w-[120px]">{member.email || "User"}</p>
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
                <div className="mt-4 pt-4 border-t border-border w-full">
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
            <div className="bg-popover border border-border w-full max-w-sm rounded-2xl p-5 flex flex-col gap-4 max-h-[60vh] shadow-2xl">
              <div className="flex justify-between items-center border-b border-border pb-3">
                <h2 className="text-lg font-bold text-foreground">Add Members</h2>
                <button onClick={() => setShowAddMemberModal(false)} className="text-muted-foreground hover:text-foreground hover:bg-muted p-1 rounded-full transition-all">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" x2="6" y1="6" y2="18" /><line x1="6" x2="18" y1="6" y2="18" /></svg>
                </button>
              </div>
              <div className="overflow-y-auto flex-1 pr-1 custom-scrollbar">
                {users
                  .filter(u => !selectedGroup.members.some(m => m._id === u._id) && u._id !== authUser._id)
                  .map(user => (
                    <div key={user._id} className="flex justify-between items-center p-3 hover:bg-muted rounded-xl mb-1 transition-colors group">
                      <div className="flex items-center gap-3">
                        <img src={user.profilePic || assets.avatar_icon} className="w-9 h-9 rounded-full object-cover" alt="" />
                        <span className="text-foreground text-sm font-medium">{user.fullName}</span>
                      </div>
                      <button onClick={() => handleAddMember(user._id)} className="text-xs bg-muted border border-border text-foreground px-3 py-1.5 rounded-lg group-hover:bg-violet-600 group-hover:text-white transition-colors">Add</button>
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
          <div className="absolute inset-y-0 right-0 w-80 bg-background border-l border-border z-50 transform transition-transform shadow-2xl flex flex-col backdrop-blur-3xl bg-opacity-95">
            <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" x2="12" y1="17" y2="22" /><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z" /></svg>
                Pinned Messages
              </h3>
              <button onClick={() => setShowPinnedMessages(false)} className="text-muted-foreground hover:text-foreground p-1 rounded-full hover:bg-muted transition-colors">
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
                  <div key={msg._id} className="bg-muted/50 p-3 rounded-xl border border-border hover:border-violet-500/30 transition-colors group relative">
                    <div className="flex items-center gap-2 mb-1.5">
                      <img src={msg.senderId.profilePic || assets.avatar_icon} className="w-5 h-5 rounded-full object-cover" alt="" />
                      <span className="text-xs font-semibold text-muted-foreground">{msg.senderId.fullName}</span>
                      <span className="text-[10px] text-muted-foreground ml-auto">{formatMessageTime(msg.createdAt)}</span>
                    </div>
                    {msg.text && <p className="text-sm text-foreground line-clamp-3">{msg.text}</p>}
                    {msg.image && <div className="text-xs text-blue-400 mt-1 flex items-center gap-1"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" /></svg> Image Attachment</div>}
                    {msg.audio && <div className="text-xs text-yellow-500 mt-1 flex items-center gap-1"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" x2="12" y1="19" y2="22" /><line x1="8" x2="16" y1="22" y2="22" /></svg> Voice Message</div>}

                    <button
                      onClick={() => unpinMessage(msg._id)}
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-500 transition-all p-1"
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

      {/* bottom area - Floating Mobile Style */}
      <div className="w-full p-2 md:p-4 z-10 bg-transparent">

        {/* Dynamic Input Area */}
        {isBlocked ? (
          <div className="flex items-center justify-center p-4 bg-muted/80 backdrop-blur-md rounded-lg mx-4 mb-2 border border-border">
            <p className="text-muted-foreground text-sm">You have blocked this user. <button className="text-red-500 font-medium hover:underline ml-1" onClick={() => unblockUser(selectedUser._id)}>Unblock</button> to send messages.</p>
          </div>
        ) : isRecording ? (
          <div className="flex items-center justify-between bg-muted/80 px-4 py-2 rounded-full border border-red-500/30 w-full animate-pulse-border transition-all">
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
              <button onClick={cancelRecording} className="text-muted-foreground hover:text-foreground text-sm font-medium">Cancel</button>
              <button onClick={stopRecording} className="bg-red-500 hover:bg-red-600 text-white p-2 rounded-full shadow-lg hover:scale-105 transition-transform">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" x2="2" y1="6" y2="6" /><polyline points="2 6 2 2 22 2 22 6" /><line x1="12" x2="12" y1="22" y2="10" /></svg>
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSendMessage} className="flex items-center gap-2 w-full relative">
            {/* Hidden Inputs */}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              ref={imageInputRef}
              onChange={handleImageSelect}
            />
            <input
              type="file" // Accept all files
              className="hidden"
              ref={fileInputRef}
              onChange={handleFileSelect}
            />

            {/* Attachment Menu Trigger */}
            <div className="relative">
              <button
                type="button"
                className={`p-3 rounded-full transition-all duration-200 shadow-sm ${showAttachmentMenu ? 'bg-violet-600 text-white rotate-45' : 'bg-secondary/80 backdrop-blur-md text-muted-foreground hover:bg-secondary hover:text-foreground'}`}
                onClick={() => setShowAttachmentMenu(!showAttachmentMenu)}
                title="Attach"
              >
                {showAttachmentMenu ? <X size={20} /> : <Paperclip size={20} />}
              </button>
              <AttachmentMenu
                isOpen={showAttachmentMenu}
                onClose={() => setShowAttachmentMenu(false)}
                onSelectImage={() => {
                  imageInputRef.current.click();
                  setShowAttachmentMenu(false);
                }}
                onSelectDocument={() => {
                  fileInputRef.current.click();
                  setShowAttachmentMenu(false);
                }}
                onSelectPoll={() => {
                  setShowPollModal(true);
                  setShowAttachmentMenu(false);
                }}
              />
            </div>

            {/* File Preview Over Input */}
            <FilePreview
              file={selectedFile?.file}
              onRemove={() => setSelectedFile(null)}
            />

            <div className="flex-1 flex items-center bg-secondary/80 backdrop-blur-md px-3 md:px-4 py-1.5 md:py-2 rounded-[24px] border border-border/50 shadow-lg focus-within:border-violet-500/50 focus-within:bg-secondary focus-within:shadow-violet-500/10 transition-all w-full relative group">
              <input
                onChange={handleInputChange}
                value={input}
                // onKeyDown={(e) => (e.key === "Enter" ? handleSendMessage(e) : null)} // Form handles submit
                type="text"
                placeholder={imagePreview ? "Add a caption..." : "Message..."}
                className="flex-1 text-[15px] md:text-base py-2.5 md:py-3 bg-transparent outline-none text-foreground placeholder:text-muted-foreground min-w-0"
                disabled={isUploading}
              />

              <div className="flex items-center gap-1 md:gap-2 shrink-0 ml-2">
                <button
                  type="button"
                  onClick={() => { setShowEmojiPicker(!showEmojiPicker); setShowStickerPicker(false); }}
                  className={`text-muted-foreground hover:text-yellow-400 transition-colors p-2 rounded-full hover:bg-muted ${showEmojiPicker ? 'text-yellow-400' : ''}`}
                  title="Emoji"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M8 14s1.5 2 4 2 4-2 4-2" /><line x1="9" x2="9.01" y1="9" y2="9" /><line x1="15" x2="15.01" y1="9" y2="9" /></svg>
                </button>
              </div>

              {/* Responsive Emoji Picker */}
              {showEmojiPicker && (
                <div className="absolute bottom-[60px] right-0 z-[100] shadow-2xl rounded-2xl overflow-hidden border border-border animate-in fade-in slide-in-from-bottom-5">
                  {/* Mobile close button */}
                  <div className="md:hidden bg-secondary p-2 flex justify-end">
                    <button onClick={() => setShowEmojiPicker(false)}>
                      <X size={20} />
                    </button>
                  </div>
                  <EmojiPicker
                    theme={currentTheme?.type === 'dark' ? 'dark' : 'auto'}
                    onEmojiClick={(emojiData) => {
                      setInput((prev) => prev + emojiData.emoji);
                    }}
                    width={320}
                    height={350}
                    lazyLoadEmojis={true}
                    searchDisabled={false}
                  />
                </div>
              )}
            </div>

            {/* Send / Mic Button */}
            {input.trim() || imagePreview || selectedFile ? (
              <button
                type="submit"
                disabled={isUploading}
                className="min-w-[48px] h-12 rounded-full bg-violet-600 hover:bg-violet-700 text-white flex items-center justify-center transition-all shadow-lg hover:shadow-violet-500/25 disabled:opacity-70 disabled:cursor-not-allowed transform hover:scale-105 active:scale-95"
              >
                {isUploading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Send size={20} className="ml-0.5" />
                )}
              </button>
            ) : (
              <button
                type="button"
                onMouseDown={startRecording}
                onMouseUp={stopRecording}
                onMouseLeave={cancelRecording}
                onTouchStart={startRecording}
                onTouchEnd={stopRecording}
                className={`min-w-[48px] h-12 rounded-full flex items-center justify-center transition-all shadow-lg transform hover:scale-110 active:scale-95 ${isRecording ? "bg-red-500 text-white animate-pulse scale-110" : "bg-secondary text-foreground hover:bg-secondary/80 hover:text-violet-500"}`}
              >
                {isRecording ? <div className="w-3 h-3 bg-white rounded-sm" /> : <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="22" /></svg>}
              </button>
            )}

          </form>
        )}
      </div>

      {
        showThemeSelector && (
          <ThemeSelector
            onClose={() => setShowThemeSelector(false)}
            onSelect={handleThemeSelect}
            currentTheme={currentTheme}
          />
        )
      }

      {
        showPollModal && (
          <CreatePollModal
            isOpen={showPollModal}
            onClose={() => setShowPollModal(false)}
            onCreate={(pollData) => createPoll({ ...pollData, groupId: selectedGroup._id })}
          />
        )
      }
    </div >
  ) : (
    <div className="hidden md:flex flex-col flex-1 items-center justify-center p-4 text-center">
      <div className="bg-card/50 p-6 rounded-3xl flex flex-col items-center max-w-md text-center border border-border shadow-2xl backdrop-blur-sm">
        <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mb-4 animate-bounce">
          <img src={assets.logo_icon} className="w-10 h-10 opacity-70" alt="" />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Welcome to QuickChat</h2>
        <p className="text-muted-foreground mb-0">Select a chat to start messaging</p>
      </div>
    </div>
  );
};
