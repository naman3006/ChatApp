import React, { memo, useState } from "react";
import { formatDateSeparator } from "../lib/utils";
import VoiceMessage from "./VoiceMessage";
// import PollBubble from "./PollBubble";
import LinkPreview from "./LinkPreview";
import { FileText, File, FileArchive, Film, Image as ImageIcon, Download } from "lucide-react";

const renderTextWithMentions = (text, mentions, authUser) => {
    if (!text) return null;
    if (!mentions || mentions.length === 0) return text;

    const regex = /@(\w+)/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
        if (match.index > lastIndex) {
            parts.push(text.substring(lastIndex, match.index));
        }

        const username = match[1];
        const isMention = mentions.some(u => u.username === username);
        const isMe = isMention && authUser?.username === username;

        if (isMention) {
            parts.push(
                <span key={match.index} className={`font-semibold rounded px-0.5 transition-colors ${isMe ? "bg-yellow-500/30 text-yellow-200 ring-1 ring-yellow-500/50" : "text-violet-300 hover:underline cursor-pointer"}`}>
                    {match[0]}
                </span>
            );
        } else {
            parts.push(match[0]);
        }

        lastIndex = regex.lastIndex;
    }

    if (lastIndex < text.length) {
        parts.push(text.substring(lastIndex));
    }

    return parts;
};

const MessageBubble = ({
    msg,
    isMyMessage,
    isFirstUnseen,
    showDateSeparator,
    senderProfilePic,
    senderName,
    selectedGroup,
    handleTouchStart,
    handleTouchEnd,
    handleDownloadImage,
    handleReaction,
    activeReactionId,
    setActiveReactionId,
    toggleMenu,
    activeMenuId,
    setActiveMenuId,
    startEditing,
    handleDeleteMessage,
    undoDeleteMessage,
    pinMessage,
    unpinMessage,
    authUser,
    editingMessageId,
    editText,
    setEditText,
    cancelEditing,
    handleUpdateMessage,

    firstUnseenMsgRef,
    isSelectionMode,
    isSelected,
    toggleSelection,
    translateMessage,
    starMessage,
    starredMessages
}) => {
    const [translatedText, setTranslatedText] = useState(null);
    const [isTranslating, setIsTranslating] = useState(false);
    const [showLanguageModal, setShowLanguageModal] = useState(false);

    // ... rest of component starts ...

    const languages = [
        { code: 'en', name: 'English' },
        { code: 'hi', name: 'Hindi' },
        { code: 'gu', name: 'Gujarati' },
        { code: 'es', name: 'Spanish' },
        { code: 'fr', name: 'French' },
        { code: 'de', name: 'German' },
        { code: 'it', name: 'Italian' },
        { code: 'pt', name: 'Portuguese' },
        { code: 'ru', name: 'Russian' },
        { code: 'zh-CN', name: 'Chinese (Simplified)' },
        { code: 'ja', name: 'Japanese' },
        { code: 'ko', name: 'Korean' },
        { code: 'ar', name: 'Arabic' },
        { code: 'bn', name: 'Bengali' },
        { code: 'mr', name: 'Marathi' },
        { code: 'ta', name: 'Tamil' },
        { code: 'te', name: 'Telugu' },
        { code: 'ur', name: 'Urdu' }
    ];

    const handleTranslate = async (langCode = null) => {
        if (translatedText && !langCode) {
            setTranslatedText(null); // Toggle off if already translated and no new lang
            return;
        }

        // If no langCode provided and no previous translation, show modal
        // Or if user wants to change language (implied by UI design choice later, but for now let's say clicking translate opens modal if not set)
        // Actually, let's make "Translate" button open modal ALWAYS if we want manual selection, 
        // OR better: "Translate" defaults to preferred, but Long Press or separate Icon opens menu?
        // User asked for "Option to convert in any language".
        // Let's Open Modal when they click "Translate".

        if (!langCode) {
            setShowLanguageModal(true);
            return;
        }

        setIsTranslating(true);
        const text = await translateMessage(msg._id, langCode);
        if (text) {
            setTranslatedText(text);
        }
        setIsTranslating(false);
        setShowLanguageModal(false);
    };

    if (msg.isSystemMessage) {
        return (
            <div className="flex justify-center my-6">
                <div className="bg-[#1f2937]/90 backdrop-blur-sm text-gray-300 text-xs font-medium px-4 py-1.5 rounded-full border border-gray-700/50 shadow-sm flex items-center gap-2">
                    {/* Optional Icon if it's a call */}
                    {(msg.text.includes("Call")) && <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /></svg>}
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
            <div className="flex justify-end my-2">
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

    return (
        <React.Fragment>
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
                className={`flex items-end gap-3 group ${isMyMessage ? "justify-end" : "justify-start"} ${isSelectionMode ? "cursor-pointer" : ""}`}
                onClick={(e) => {
                    if (isSelectionMode) {
                        e.stopPropagation();
                        toggleSelection(msg._id);
                    }
                }}
            >
                {/* Selection Checkbox */}
                {isSelectionMode && (
                    <div className={`flex items-center justify-center p-2 order-first`}>
                        <div className={`w-5 h-5 rounded border flex items-center justify-center ${isSelected ? "bg-violet-500 border-violet-500" : "border-gray-500 bg-transparent"}`}>
                            {isSelected && <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-white"><polyline points="20 6 9 17 4 12" /></svg>}
                        </div>
                    </div>
                )}
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

                <div className={`flex flex-col ${isMyMessage ? "items-end" : "items-start"} max-w-[90%] sm:max-w-[80%] md:max-w-[70%]`}>

                    {/* Sender Name for Groups (Others only) */}
                    {selectedGroup && !isMyMessage && (
                        <span className="text-[10px] text-gray-400 ml-1 mb-1 font-medium tracking-wide">{senderName}</span>
                    )}

                    <div
                        className={`relative group/msg ${isMyMessage ? "flex-row-reverse" : "flex-row"} flex items-center gap-2`}
                        onTouchStart={() => handleTouchStart(msg._id)}
                        onTouchEnd={handleTouchEnd}
                    >
                        {/* Forwarded Label */}
                        {msg.isForwarded && (
                            <div className={`flex items-center gap-1 mb-1 text-[10px] text-gray-400 italic ${!isMyMessage ? "ml-1" : "mr-1 self-end"}`}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 17 20 12 15 7" /><path d="M4 18v-2a4 4 0 0 1 4-4h12" /></svg>
                                Forwarded
                            </div>
                        )}

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
                                        className={`px-4 py-2.5 w-full sm:min-w-[120px] text-[15px] rounded-3xl mt-1 break-words shadow-sm leading-relaxed ${!isMyMessage
                                            ? "rounded-tl-none bg-[#1e1e24] text-gray-100 border border-gray-800/50" /* Dark aesthetic for received */
                                            : "rounded-tr-none bg-gradient-to-br from-[#6366f1] to-[#8b5cf6] text-white border border-white/10" /* Vibrant purple/indigo for sent */
                                            } `}
                                    >
                                        {translatedText || msg.text}
                                        {translatedText && (
                                            <span className="block text-[10px] opacity-70 mt-1 flex items-center gap-1">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m5 8 6 6" /><path d="m4 14 6-6 2-3" /><path d="M2 5h12" /><path d="M7 2h1" /><path d="m22 22-5-10-5 10" /><path d="M14 18h6" /></svg>
                                                Translated
                                            </span>
                                        )}
                                        {/* Time & Read inside bubble like screenshot */}
                                        <div className={`flex items-center gap-1 justify-end mt-1 text-[10px] ${!isMyMessage ? "text-gray-400" : "text-white/70"}`}>
                                            <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}</span>
                                            {isMyMessage && (
                                                <span>
                                                    {msg.seen ? (
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 7 17l-5-5" /><path d="m22 10-7.5 7.5L13 16" /></svg>
                                                    ) : (
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-70"><path d="M20 6 9 17l-5-5" /></svg>
                                                    )}
                                                </span>
                                            )}
                                        </div>
                                    </p>
                                )}

                            </div>
                        )}

                        {msg.audio && (
                            <div className={`rounded-2xl p-2 flex items-center gap-2 text-white shadow-md ${!isMyMessage ? "bg-gray-800 rounded-tl-none border border-gray-700" : "bg-gradient-to-r from-violet-600 to-indigo-600 rounded-tr-none border border-white/10"}`}>
                                <VoiceMessage src={msg.audio} />
                            </div>
                        )}

                        {msg.file && (
                            <div className={`rounded-xl p-3 flex items-center gap-3 min-w-[200px] max-w-[280px] shadow-sm border transaction-all ${!isMyMessage ? "bg-[#1f2937] border-gray-700/50 rounded-tl-none text-gray-200" : "bg-[#6366f1] border-white/10 rounded-tr-none text-white"}`}>
                                <div className={`p-2.5 rounded-lg shrink-0 ${!isMyMessage ? "bg-gray-800" : "bg-white/20"}`}>
                                    {(() => {
                                        const type = msg.file.mimeType || "application/octet-stream";
                                        if (type.includes('pdf')) return <FileText size={20} />;
                                        if (type.includes('zip') || type.includes('rar')) return <FileArchive size={20} />;
                                        if (type.includes('image')) return <ImageIcon size={20} />;
                                        if (type.includes('video')) return <Film size={20} />;
                                        return <File size={20} />;
                                    })()}
                                </div>
                                <div className="flex-1 min-w-0 overflow-hidden">
                                    <p className="text-sm font-medium truncate" title={msg.file.name}>{msg.file.name}</p>
                                    <p className={`text-[10px] ${!isMyMessage ? "text-gray-400" : "text-white/70"}`}>
                                        {(() => {
                                            const bytes = msg.file.size;
                                            if (!bytes) return "File";
                                            const k = 1024;
                                            const sizes = ['B', 'KB', 'MB', 'GB'];
                                            const i = Math.floor(Math.log(bytes) / Math.log(k));
                                            return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
                                        })()}
                                        {/* • {msg.file.mimeType?.split('/')[1]?.toUpperCase()} */}
                                    </p>
                                </div>
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleDownloadImage(msg.file.url, msg.file.name); }}
                                    className={`p-2 rounded-full transition-colors shrink-0 ${!isMyMessage ? "hover:bg-gray-700 text-gray-400 hover:text-white" : "hover:bg-white/20 text-white/80 hover:text-white"}`}
                                    title="Download"
                                >
                                    <Download size={18} />
                                </button>
                            </div>
                        )}

                        {msg.pollId && (
                            // <PollBubble message={msg} />
                            <span>Poll (Disabled for debug)</span>
                        )}

                        {!msg.image && !msg.audio && !msg.pollId && !msg.file && (
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
                                <div className={`relative px-4 py-2 rounded-3xl md:text-[15px] font-normal leading-relaxed break-words shadow-sm transition-all max-w-full md:max-w-md ${!isMyMessage
                                    ? "bg-[#1f2937] text-gray-100 border border-gray-800/50 rounded-tl-none"
                                    : "bg-gradient-to-br from-[#6366f1] to-[#8b5cf6] text-white shadow-violet-500/20 rounded-tr-none border border-white/10"}`}>
                                    <p className="break-words whitespace-pre-wrap min-w-[60px]">
                                        {translatedText || renderTextWithMentions(msg.text, msg.mentions, authUser)}
                                        {translatedText && (
                                            <span className="block text-[10px] opacity-70 mt-1 flex items-center gap-1">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m5 8 6 6" /><path d="m4 14 6-6 2-3" /><path d="M2 5h12" /><path d="M7 2h1" /><path d="m22 22-5-10-5 10" /><path d="M14 18h6" /></svg>
                                                Translated
                                            </span>
                                        )}

                                    </p>

                                    {/* Link Preview */}
                                    {msg.linkMetadata && (
                                        <div className="mt-1 px-1 pb-1">
                                            <LinkPreview metadata={msg.linkMetadata} />
                                        </div>
                                    )}

                                    {/* Time & Read Status - Integrated */}
                                    <div className={`flex items-center gap-1 justify-end mt-1 select-none ${!isMyMessage ? "text-gray-400" : "text-white/70"}`}>
                                        <span className="text-[10px] font-medium tracking-wide">
                                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                                        </span>
                                        {isMyMessage && (
                                            <span>
                                                {msg.seen ? (
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 7 17l-5-5" /><path d="m22 10-7.5 7.5L13 16" /></svg>
                                                ) : (
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-80"><path d="M20 6 9 17l-5-5" /></svg>
                                                )}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            )
                        )}

                        {/* Reactions Display */}
                        {msg.reactions && msg.reactions.length > 0 && (
                            <div className={`absolute -bottom-3 ${isMyMessage ? "right-0" : "left-0"} flex items-center gap-1 bg-muted rounded-full px-2 py-0.5 shadow-lg border border-border z-[5]`}>
                                {Object.entries(
                                    msg.reactions.reduce((acc, curr) => {
                                        acc[curr.emoji] = (acc[curr.emoji] || 0) + 1;
                                        return acc;
                                    }, {})
                                ).map(([emoji, count]) => (
                                    <span key={emoji} className="text-xs flex items-center gap-0.5 text-muted-foreground hover:scale-110 transition-transform cursor-pointer">
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
                                <button className="text-muted-foreground hover:text-yellow-400 transition-colors p-1.5 rounded-full hover:bg-muted">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M8 14s1.5 2 4 2 4-2 4-2" /><line x1="9" x2="9.01" y1="9" y2="9" /><line x1="15" x2="15.01" y1="9" y2="9" /></svg>
                                </button>
                                {/* Hover Reaction Bar */}
                                <div className={`
              bg-popover rounded-full shadow-xl border border-border p-2 items-center gap-1 md:gap-2 animate-in fade-in slide-in-from-bottom-2 z-[100] min-w-max backdrop-blur-md
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

                            {/* Menu Button */}
                            {!isSelectionMode && (
                                <div className="relative">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); toggleMenu(msg._id); }}
                                        className="text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-full hover:bg-muted"
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
                    z-[101] bg-popover rounded-2xl shadow-xl border border-border overflow-hidden
                    fixed bottom-4 left-4 right-4 w-auto origin-bottom animate-in slide-in-from-bottom-4 fade-in duration-200
                    md:absolute md:bottom-full md:right-0 md:w-40 md:mb-2 md:left-auto md:top-auto md:inset-auto md:animate-in md:fade-in md:zoom-in-95 md:origin-bottom-right md:z-50
                  `}>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); toggleSelection(msg._id); setActiveMenuId(null); }}
                                                    className="w-full text-left px-5 py-4 md:px-4 md:py-2.5 text-base md:text-sm text-foreground hover:bg-muted flex items-center gap-3 md:gap-2 active:bg-muted transition-colors"
                                                >
                                                    <span className="md:hidden p-2 bg-muted rounded-full text-violet-400">
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 17 20 12 15 7" /><path d="M4 18v-2a4 4 0 0 1 4-4h12" /></svg>
                                                    </span>
                                                    Forward
                                                </button>

                                                {msg.text && !msg.isSystemMessage && (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); if (translatedText) setTranslatedText(null); else handleTranslate(); setActiveMenuId(null); }}
                                                        className="w-full text-left px-5 py-4 md:px-4 md:py-2.5 text-base md:text-sm text-foreground hover:bg-muted flex items-center gap-3 md:gap-2 active:bg-muted transition-colors border-t border-border"
                                                    >
                                                        <span className="md:hidden p-2 bg-muted rounded-full text-blue-400">
                                                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m5 8 6 6" /><path d="m4 14 6-6 2-3" /><path d="M2 5h12" /><path d="M7 2h1" /><path d="m22 22-5-10-5 10" /><path d="M14 18h6" /></svg>
                                                        </span>
                                                        {translatedText ? "Show Original" : (isTranslating ? "Translating..." : "Translate")}
                                                    </button>
                                                )}

                                                <button
                                                    onClick={(e) => { e.stopPropagation(); starMessage(msg._id); setActiveMenuId(null); }}
                                                    className="w-full text-left px-5 py-4 md:px-4 md:py-2.5 text-base md:text-sm text-foreground hover:bg-muted flex items-center gap-3 md:gap-2 active:bg-muted transition-colors border-t border-border"
                                                >
                                                    <span className="md:hidden p-2 bg-muted rounded-full text-yellow-400">
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill={starredMessages.some(m => m._id === msg._id) ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                                                    </span>
                                                    {starredMessages.some(m => m._id === msg._id) ? "Unstar Message" : "Star Message"}
                                                </button>

                                                {isMyMessage && (
                                                    <button
                                                        onClick={() => { msg.pinned ? unpinMessage(msg._id) : pinMessage(msg._id); setActiveMenuId(null); }}
                                                        className={`w-full text-left px-5 py-4 md:px-4 md:py-2.5 text-base md:text-sm text-foreground hover:bg-muted flex items-center gap-3 md:gap-2 active:bg-muted transition-colors ${msg.pinned && msg.pinnedBy && msg.pinnedBy._id !== authUser._id && 'hidden'}`}
                                                    >
                                                        <span className="md:hidden p-2 bg-muted rounded-full text-violet-400">
                                                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" x2="12" y1="17" y2="22" /><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z" /></svg>
                                                        </span>
                                                        {msg.pinned ? "Unpin Method" : "Pin Message"}
                                                    </button>
                                                )}

                                                {isMyMessage && !msg.image && !msg.audio && !msg.file && (!msg.text || !msg.text.match(/^(Audio|Video) Call ended •/)) && (
                                                    <button onClick={() => startEditing(msg)} className="w-full text-left px-5 py-4 md:px-4 md:py-2.5 text-base md:text-sm text-foreground hover:bg-muted border-t border-border active:bg-muted flex items-center gap-3 md:gap-2">
                                                        <span className="md:hidden p-2 bg-gray-800 rounded-full text-blue-400">
                                                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                                                        </span>
                                                        Edit Message
                                                    </button>
                                                )}

                                                {isMyMessage && (
                                                    <button onClick={() => handleDeleteMessage(msg._id)} className="w-full text-left px-5 py-4 md:px-4 md:py-2.5 text-base md:text-sm text-red-500 hover:bg-muted border-t border-border active:bg-muted flex items-center gap-3 md:gap-2">
                                                        <span className="md:hidden p-2 bg-red-500/10 rounded-full text-red-400">
                                                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                                                        </span>
                                                        Delete Message
                                                    </button>
                                                )}
                                            </div>
                                        </>
                                    )}
                                </div>

                            )}
                        </div>
                    </div >

                </div >
            </div >

            {/* Language Selection Modal */}
            {
                showLanguageModal && (
                    <div
                        className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
                        onClick={() => setShowLanguageModal(false)}
                    >
                        <div
                            className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-sm max-h-[80vh] flex flex-col shadow-2xl overflow-hidden"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-gray-900/50 backdrop-blur-md">
                                <h3 className="text-white font-semibold text-lg">Translate to...</h3>
                                <button
                                    onClick={() => setShowLanguageModal(false)}
                                    className="p-1 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                </button>
                            </div>

                            <div className="overflow-y-auto p-2 space-y-1 custom-scrollbar">
                                {languages.map(lang => (
                                    <button
                                        key={lang.code}
                                        onClick={() => handleTranslate(lang.code)}
                                        className="w-full text-left px-4 py-3 rounded-xl text-gray-200 hover:bg-white/10 hover:text-white transition-all flex items-center justify-between group active:scale-[0.98]"
                                    >
                                        <span className="font-medium">{lang.name}</span>
                                        {/* <span className="text-xs text-gray-500 uppercase font-mono bg-gray-800 px-1.5 py-0.5 rounded border border-gray-700">{lang.code}</span> */}
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-0 group-hover:opacity-100 text-violet-400 transition-opacity -translate-x-2 group-hover:translate-x-0"><polyline points="9 18 15 12 9 6"></polyline></svg>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )
            }
        </React.Fragment >
    );
};

export default memo(MessageBubble);
