import React, { useContext, useEffect, useState } from "react";
import assets from "../chat-assets/assets";
import { ReportModal } from "./ReportModal";
import { ChatContext } from "../context/ChatContext";
import { AuthContext } from "../context/authContext";
import { formatLastSeen } from "../lib/utils";
import { Link, Copy, RefreshCw, Trash2 } from "lucide-react";
import toast from "react-hot-toast";

export const RightSidebar = () => {
  const { selectedUser, messages, blockUser, unblockUser, reportUser, currentEphemeralDuration, toggleEphemeralMode, selectedGroup, updateGroupEphemeralMode, generateInvite, revokeInvite, updateGroup } = useContext(ChatContext);
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

      <div className="flex-1 overflow-y-auto px-6 py-6 custom-scrollbar">

        {/* Invite Link Section (Group Admins Only) */}
        {/* Invite Link Section (Group Admins Only) */}
        {/* Invite Link Section (Group Admins Only) */}
        {isGroup && displayItem.admins.includes(authUser._id) && (
          <div className="mb-6 bg-gradient-to-br from-violet-500/10 via-fuchsia-500/10 to-transparent p-5 rounded-2xl border border-violet-500/20 shadow-lg backdrop-blur-sm relative overflow-hidden group/card">
            {/* Decorative background element */}
            <div className="absolute top-0 right-0 w-24 h-24 bg-violet-500/10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>

            <div className="flex items-center justify-between mb-4 relative z-10">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <div className="p-1.5 bg-violet-500/20 rounded-lg text-violet-500">
                  <Link size={16} />
                </div>
                Invite via Link
              </h3>
              {displayItem.inviteCode && (
                <button
                  onClick={async () => {
                    if (window.confirm("Revoke this invite link? Users with the old link won't be able to join.")) {
                      const success = await revokeInvite(selectedGroup._id);
                      if (success) {
                        // Optimistic update
                        updateGroup(selectedGroup._id, { ...selectedGroup, inviteCode: undefined });
                      }
                    }
                  }}
                  className="text-xs flex items-center gap-1 text-red-500/80 hover:text-red-500 transition-colors font-medium px-2 py-1 hover:bg-red-500/10 rounded-lg"
                  title="Revoke Link"
                >
                  <Trash2 size={13} />
                </button>
              )}
            </div>

            {displayItem.inviteCode ? (
              <div className="flex flex-col gap-3 relative z-10">
                <div className="flex items-center gap-2 bg-background/60 p-1 pl-3 rounded-xl border border-border/60 focus-within:border-violet-500/50 transition-all shadow-inner">
                  <p className="text-xs text-muted-foreground truncate flex-1 font-mono tracking-wide">
                    {window.location.host}/invite/{displayItem.inviteCode}
                  </p>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/invite/${displayItem.inviteCode}`);
                      toast.success("Link copied!");
                    }}
                    className="p-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg shadow-md transition-all active:scale-95 flex items-center justify-center"
                    title="Copy Link"
                  >
                    <Copy size={14} />
                  </button>
                </div>

                <div className="flex gap-2">
                  {!showShareOptions ? (
                    <button
                      onClick={() => {
                        if (navigator.share) {
                          navigator.share({
                            title: `Join ${displayItem.name}`,
                            text: `Join my group "${displayItem.name}" on ChatApp!`,
                            url: `${window.location.origin}/invite/${displayItem.inviteCode}`
                          }).catch(console.error);
                        } else {
                          setShowShareOptions(true);
                        }
                      }}
                      className="flex-1 py-2 bg-secondary/50 hover:bg-secondary text-foreground text-xs font-semibold rounded-lg transition-colors border border-border/50"
                    >
                      Share via...
                    </button>
                  ) : (
                    <div className="w-full grid grid-cols-3 gap-1 animate-in fade-in slide-in-from-top-1">
                      <a
                        href={`https://wa.me/?text=${encodeURIComponent(`Join my group "${displayItem.name}" on ChatApp! ${window.location.origin}/invite/${displayItem.inviteCode}`)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex flex-col items-center justify-center p-1.5 rounded-lg bg-[#25D366]/10 hover:bg-[#25D366]/20 transition-colors gap-1 border border-[#25D366]/20"
                        title="WhatsApp"
                      >
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" className="text-[#25D366]"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" /></svg>
                      </a>
                      <a
                        href={`https://t.me/share/url?url=${encodeURIComponent(`${window.location.origin}/invite/${displayItem.inviteCode}`)}&text=${encodeURIComponent(`Join my group "${displayItem.name}" on ChatApp!`)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex flex-col items-center justify-center p-1.5 rounded-lg bg-[#0088cc]/10 hover:bg-[#0088cc]/20 transition-colors gap-1 border border-[#0088cc]/20"
                        title="Telegram"
                      >
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" className="text-[#0088cc]"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 11.944 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" /></svg>
                      </a>
                      <button
                        onClick={() => setShowShareOptions(false)}
                        className="flex items-center justify-center p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-500 transition-colors border border-red-500/20 font-medium text-[10px]"
                      >
                        X
                      </button>
                    </div>
                  )}
                </div>

              </div>
            ) : (
              <div className="text-center py-2">
                <p className="text-xs text-muted-foreground mb-3">
                  Create a unique link to let people join this group easily.
                </p>
                <button
                  onClick={async () => {
                    const code = await generateInvite(selectedGroup._id);
                    if (code) {
                      updateGroup(selectedGroup._id, { ...selectedGroup, inviteCode: code });
                    }
                  }}
                  className="w-full py-2.5 flex items-center justify-center gap-2 text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 rounded-xl transition-all shadow-md active:scale-[0.98]"
                >
                  <RefreshCw size={16} /> Generate Link
                </button>
              </div>
            )}
          </div>
        )}

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
