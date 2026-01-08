/* eslint-disable react-hooks/exhaustive-deps */
import React, { useContext, useEffect, useRef, useState } from "react";
import assets from "../chat-assets/assets";
import { formatMessageTime } from "../lib/utils";
import { ChatContext } from "../context/ChatContext";
import { AuthContext } from "../context/authContext";
import toast from "react-hot-toast";

export const ChatContainer = () => {
  const { messages, selectedUser, setSelectedUser, sendMessage, getMessages, updateMessage, deleteMessage } =
    useContext(ChatContext);
  const { authUser, onlineUsers } = useContext(AuthContext);

  const scrollEnd = useRef();

  const [input, setInput] = useState("");
  const [imagePreview, setImagePreview] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editText, setEditText] = useState("");
  const [activeMenuId, setActiveMenuId] = useState(null); // To track which message's menu is open

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

  const handleUpdateMessage = async () => {
    if (editText.trim() === "") return;
    await updateMessage(editingMessageId, editText);
    setEditingMessageId(null);
    setEditText("");
  };

  const handleDeleteMessage = async (id) => {
    if (window.confirm("Are you sure you want to delete this message?")) {
      await deleteMessage(id);
    }
    setActiveMenuId(null);
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
    e.target.value = ""; // Reset input so same file can be selected again
  };

  const removeImagePreview = () => {
    setImagePreview(null);
  };

  const handleDownloadImage = async (imageUrl) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `chat-image-${Date.now()}.png`; // Set default filename
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      toast.error("Failed to download image");
    }
  };

  useEffect(() => {
    if (selectedUser) {
      getMessages(selectedUser._id);
    }
  }, [selectedUser]);

  useEffect(() => {
    if (scrollEnd.current && messages) {
      scrollEnd.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  return selectedUser ? (
    <div className="h-full overflow-scroll relative backdrop-blur-lg" onClick={() => setActiveMenuId(null)}>
      <div className="flex items-center gap-3 py-3 mx-4 border-b border-stone-500">
        <img
          src={selectedUser.profilePic || assets.avatar_icon}
          alt=""
          className="w-8 rounded-full "
        />
        <p className="flex-1 text-lg text-white flex items-center gap-2">
          {selectedUser.fullName}
          {onlineUsers.includes(selectedUser._id) &&
            <span className="w-2 h-2 rounded-full bg-green-500"></span>}
        </p>
        <img
          onClick={() => setSelectedUser(null)}
          src={assets.arrow_icon}
          alt=""
          className="md:hidden max-w-7"
        />
        <img src={assets.help_icon} alt="" className="max-md:hidden max-w-5" />
      </div>
      <div className="flex flex-col h-[calc(100%-120px)] overflow-y-scroll p-3 pb-6">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex items-end gap-2 justify-end group ${msg.senderId !== authUser._id && "flex-row-reverse"
              }`}
          >
            {/* Action Menu (Only for own messages) */}
            {msg.senderId === authUser._id && !msg.image && (
              <div className="relative self-center opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleMenu(msg._id);
                  }}
                  className="p-1 hover:bg-gray-700 rounded-full text-gray-400 hover:text-white"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1" /><circle cx="12" cy="5" r="1" /><circle cx="12" cy="19" r="1" /></svg>
                </button>
                {activeMenuId === msg._id && (
                  <div className="absolute top-0 right-full mr-2 w-24 bg-gray-800 rounded shadow-lg z-10 overflow-hidden border border-gray-700">
                    <button
                      onClick={() => startEditing(msg)}
                      className="block w-full text-left px-3 py-2 text-sm text-gray-200 hover:bg-gray-700"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteMessage(msg._id)}
                      className="block w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-gray-700"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Delete button for own images & audio */}
            {msg.senderId === authUser._id && (msg.image || msg.audio) && (
              <div className="relative self-center opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => handleDeleteMessage(msg._id)}
                  className="p-1 hover:bg-red-500/20 rounded-full text-red-400 hover:text-red-500"
                  title="Delete"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>
                </button>
              </div>
            )}

            {msg.image && (
              <div className="flex flex-col">
                <div className="relative group/image">
                  <img
                    className="max-w-[230px] border border-gray-700 rounded-lg overflow-hidden"
                    src={msg.image}
                    alt=""
                  />
                  <button
                    onClick={() => handleDownloadImage(msg.image)}
                    className="absolute bottom-2 right-2 bg-black/50 hover:bg-black/70 text-white p-1.5 rounded-full opacity-0 group-hover/image:opacity-100 transition-opacity"
                    title="Download"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" x2="12" y1="15" y2="3" /></svg>
                  </button>
                </div>
                {msg.text && (
                  <p
                    className={`p-2 max-w-[230px] md:text-sm font-light rounded-lg mt-1 break-all bg-violet-500/30 text-white ${msg.senderId !== authUser._id
                      ? "rounded-tr-none"
                      : "rounded-tl-none"
                      } `}
                  >
                    {msg.text}
                  </p>
                )}
                <p className="text-xs text-gray-500 mt-1 text-right">{formatMessageTime(msg.createdAt)}</p>
              </div>
            )}

            {msg.audio && (
              <div className="flex flex-col min-w-[200px]">
                <div className={`p-3 rounded-lg bg-violet-500/30 flex items-center gap-2 ${msg.senderId !== authUser._id ? "rounded-bl-none" : "rounded-br-none"}`}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white"><path d="M12 6v12" /><path d="M8 8v8" /><path d="M4 10v4" /><path d="M16 8v8" /><path d="M20 10v4" /></svg>
                  <audio controls src={msg.audio} className="h-8 w-48" />
                </div>
                <p className="text-xs text-gray-500 mt-1 text-right">{formatMessageTime(msg.createdAt)}</p>
              </div>
            )}

            {!msg.image && !msg.audio && (
              <div className="flex flex-col max-w-[200px]">
                {editingMessageId === msg._id ? (
                  <div className="flex flex-col gap-1 mb-8">
                    <input
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      className="bg-violet-900/50 text-white p-2 rounded text-sm outline-none border border-violet-500"
                      autoFocus
                    />
                    <div className="flex justify-end gap-1">
                      <button onClick={cancelEditing} className="text-xs text-gray-400 hover:text-white">Cancel</button>
                      <button onClick={handleUpdateMessage} className="text-xs text-green-400 hover:text-green-300">Save</button>
                    </div>
                  </div>
                ) : (
                  <p
                    className={`p-2 md:text-sm font-light rounded-lg mb-8 break-all bg-violet-500/30 text-white ${msg.senderId !== authUser._id
                      ? "rounded-br-none"
                      : "rounded-bl-none"
                      } `}
                  >
                    {msg.text}
                  </p>
                )}
              </div>
            )}

            {!msg.image && (
              <div className="text-center text-xs">
                <img
                  src={
                    msg.senderId === authUser._id
                      ? authUser?.profilePic || assets.avatar_icon
                      : selectedUser?.profilePic || assets.avatar_icon
                  }
                  alt=""
                  className="w-7 rounded-full"
                />
                <p className="text-gray-500 ">
                  {formatMessageTime(msg.createdAt)}
                </p>
              </div>
            )}

          </div>
        ))}
        <div ref={scrollEnd}></div>
      </div>

      {/* Image Preview Modal */}
      {imagePreview && (
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
      )}


      {/* bottom area  */}
      <div className="absolute bottom-0 left-0 right-0 gap-3 p-3 backdrop-blur-md bg-black/20">

        {/* Dynamic Input Area */}
        {isRecording ? (
          <div className="flex items-center justify-between bg-gray-800/80 px-4 py-2 rounded-full border border-red-500/30 w-full">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
              <span className="text-white font-mono">{formatDuration(recordingDuration)}</span>
            </div>
            <div className="flex items-center gap-4">
              <button onClick={cancelRecording} className="text-gray-400 hover:text-white text-sm">Cancel</button>
              <button onClick={stopRecording} className="bg-red-500 hover:bg-red-600 text-white p-2 rounded-full">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" x2="2" y1="6" y2="6" /><polyline points="2 6 2 2 22 2 22 6" /><line x1="12" x2="12" y1="22" y2="10" /></svg>
                <span className="sr-only">Send</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="flex-1 flex items-center bg-gray-100/12 px-3 rounded-full">
              <input
                onChange={(e) => setInput(e.target.value)}
                value={input}
                onKeyDown={(e) => (e.key === "Enter" ? handleSendMessage(e) : null)}
                type="text"
                placeholder={imagePreview ? "Add a caption..." : "Send a message"}
                className="flex-1 text-sm p-3 border-none rounded-lg outline-none text-black placeholder-gray-400 bg-transparent"
                disabled={isUploading}
              />
              <input
                onChange={handleImageSelect}
                type="file"
                id="image" // Fixed Typo here
                accept=".jpg, .jpeg, .png"
                hidden
                disabled={isUploading}
              />
              <label htmlFor="image" className={`cursor-pointer ${isUploading ? 'opacity-50 pointer-events-none' : 'hover:opacity-80'}`}>
                <img src={assets.gallery_icon} alt="" className="w-5 mr-2" />
              </label>
            </div>

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
                className="bg-violet-600 hover:bg-violet-700 text-white p-2.5 rounded-full transition-colors flex items-center justify-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" x2="12" y1="19" y2="22" /></svg>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  ) : (
    <div className="flex flex-col items-center justify-center gap-2 text-gray-500 bg-white/10 max-md:hidden">
      <img src={assets.logo_icon} className="max-w-16" alt="" />
      <p className="text-lg font-medium text-white">Chat anytime, anywhere</p>
    </div>
  );
};
