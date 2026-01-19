import React, { useContext, useEffect, useState } from "react";
import assets from "../chat-assets/assets";
import { ReportModal } from "./ReportModal";
import { ChatContext } from "../context/ChatContext";
import { AuthContext } from "../context/authContext";
import { formatLastSeen } from "../lib/utils";
import { ShieldAlert, Ban, LogOut, Image as ImageIcon, Video as VideoIcon, X, Timer } from "lucide-react";

export const RightSidebar = () => {
  const { selectedUser, messages, blockUser, unblockUser, reportUser, currentEphemeralDuration, toggleEphemeralMode, selectedGroup, updateGroupEphemeralMode } = useContext(ChatContext);
  const { logout, onlineUsers, authUser } = useContext(AuthContext);
  const [mediaItems, setMediaItems] = useState([]);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [showAllMedia, setShowAllMedia] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState(null);

  useEffect(() => {
    // Collect both images and potentially videos in the future
    const images = messages
      .filter((msg) => msg.image)
      .map((msg) => ({ type: 'image', url: msg.image, id: msg._id }));
    setMediaItems(images.reverse()); // Newest first
  }, [messages]);

  // Timer Options
  const timerOptions = [
    { label: "Off", value: 0 },
    { label: "24 Hours", value: 86400 },
    { label: "7 Days", value: 604800 },
    { label: "90 Days", value: 7776000 },
  ];

  const handleTimerChange = async (e) => {
    const duration = parseInt(e.target.value);
    if (selectedGroup) {
      // Check admin
      if (!selectedGroup.admins.includes(authUser._id)) return;
      await updateGroupEphemeralMode(selectedGroup._id, duration);
    } else {
      await toggleEphemeralMode(selectedUser._id, duration);
    }
  };

  const isBlocked = authUser?.blockedUsers?.includes(selectedUser?._id);

  const handleBlockToggle = async () => {
    if (isBlocked) {
      await unblockUser(selectedUser._id);
    } else {
      await blockUser(selectedUser._id);
    }
  };

  const handleReportSubmit = async (reason, description) => {
    await reportUser(selectedUser._id, reason, description);
    setIsReportModalOpen(false);
  };

  const isGroup = !!selectedGroup;
  const displayItem = isGroup ? selectedGroup : selectedUser;

  if (!displayItem) return null;

  const displayName = isGroup ? displayItem.name : displayItem.fullName;
  const displayImage = isGroup
    ? (displayItem.icon || "") // Group icon or handle fallback in JSX
    : (displayItem.profilePic || assets.avatar_icon);

  // Logic for subtitle (Online status / Bio / Member count)
  const renderSubtitle = () => {
    if (isGroup) return `${displayItem.members.length} members`;
    return onlineUsers.includes(displayItem._id) ? "Online" : formatLastSeen(displayItem.lastSeen);
  };

  return (
    <div className="hidden xl:flex flex-col h-full bg-background border-l border-border w-full relative overflow-hidden transition-all duration-300">

      {/* 1. Top Section: Profile Info */}
      <div className="flex flex-col items-center pt-10 pb-6 px-6 relative">
        <div className="relative group cursor-pointer mb-4">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-violet-600 to-indigo-600 rounded-full blur opacity-50 group-hover:opacity-100 transition duration-500"></div>
          {isGroup && !displayImage ? (
            <div className="relative w-28 h-28 rounded-full bg-violet-600 flex items-center justify-center text-white font-bold text-4xl border-4 border-background shadow-xl">
              {displayName[0].toUpperCase()}
            </div>
          ) : (
            <img
              src={displayImage}
              alt={displayName}
              className="relative w-28 h-28 rounded-full object-cover border-4 border-background shadow-xl"
            />
          )}
          {!isGroup && onlineUsers.includes(selectedUser._id) && (
            <span className="absolute bottom-1 right-1 w-5 h-5 bg-green-500 border-4 border-background rounded-full"></span>
          )}
        </div>

        <h2 className="text-xl font-bold text-foreground mb-1 text-center">{displayName}</h2>

        <div className="text-sm font-medium text-muted-foreground mb-4 flex items-center gap-2">
          <span className={!isGroup && onlineUsers.includes(selectedUser._id) ? "text-green-500" : ""}>
            {renderSubtitle()}
          </span>
        </div>

        {!isGroup && (
          <p className="text-center text-muted-foreground text-sm italic px-4 line-clamp-3">
            {selectedUser.bio || "No bio available"}
          </p>
        )}
      </div>



      <hr className="border-border w-4/5 mx-auto" />

      {/* 2. Middle Section: Media Gallery */}
      <div className="flex-1 overflow-y-auto px-6 py-6 custom-scrollbar">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Shared Media</h3>
          <span className="text-xs text-muted-foreground">{mediaItems.length} files</span>
        </div>

        {mediaItems.length > 0 ? (
          <div className="grid grid-cols-3 gap-2">
            {mediaItems.slice(0, showAllMedia ? undefined : 6).map((item, idx) => (
              <div
                key={idx}
                onClick={() => setSelectedMedia(item)}
                className="aspect-square rounded-lg overflow-hidden cursor-pointer relative group border border-border hover:border-primary/50 transition-colors"
              >
                <img
                  src={item.url}
                  alt="media"
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <ImageIcon size={16} className="text-white" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-10 text-muted-foreground space-y-2">
            <ImageIcon size={32} className="opacity-50" />
            <span className="text-xs">No media shared yet</span>
          </div>
        )}

        {mediaItems.length > 6 && !showAllMedia && (
          <button
            onClick={() => setShowAllMedia(true)}
            className="w-full mt-4 py-2 text-xs text-primary hover:text-primary/80 font-medium bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors"
          >
            View All Media
          </button>
        )}
      </div>

      {/* 3. Bottom Section: Actions */}
      <div className="p-6 bg-muted/50 backdrop-blur-sm mt-auto border-t border-border space-y-3">

        {!isGroup && (
          <>
            <button
              onClick={handleBlockToggle}
              className={`w-full py-3 rounded-xl flex items-center justify-center gap-2 text-sm font-semibold transition-all duration-200 transform active:scale-[0.98] ${isBlocked
                ? 'bg-muted text-foreground hover:bg-muted/80'
                : 'bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white'
                }`}
            >
              <Ban size={18} />
              {isBlocked ? "Unblock User" : "Block User"}
            </button>

            <button
              onClick={() => setIsReportModalOpen(true)}
              className="w-full py-3 rounded-xl flex items-center justify-center gap-2 text-sm font-semibold text-amber-500 bg-amber-500/10 hover:bg-amber-500 hover:text-white transition-all duration-200 transform active:scale-[0.98]"
            >
              <ShieldAlert size={18} />
              Report User
            </button>
          </>
        )}

        <button
          onClick={logout}
          className="w-full py-3 rounded-xl flex items-center justify-center gap-2 text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 shadow-lg shadow-violet-500/20 transition-all duration-200 transform active:scale-[0.98]"
        >
          <LogOut size={18} />
          Logout
        </button>
      </div>

      {/* Media Viewer Modal */}
      {
        selectedMedia && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md p-4 animate-in fade-in duration-200">
            <button
              onClick={() => setSelectedMedia(null)}
              className="absolute top-4 right-4 text-white/70 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors"
            >
              <X size={24} />
            </button>
            <img
              src={selectedMedia.url}
              alt="Full view"
              className="max-w-full max-h-[90vh] rounded-lg shadow-2xl"
            />
          </div>
        )
      }

      <ReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        onSubmit={handleReportSubmit}
        reportingUser={selectedUser}
      />
    </div >
  );
};
