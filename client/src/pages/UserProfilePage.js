import React, { useContext, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import assets from "../chat-assets/assets";
import { ReportModal } from "../components/ReportModal";
import { ChatContext } from "../context/ChatContext";
import { AuthContext } from "../context/authContext";
import { formatLastSeen } from "../lib/utils";
import { ShieldAlert, Ban, Image as ImageIcon, X, ArrowLeft } from "lucide-react";

export const UserProfilePage = () => {
    const { userId } = useParams();
    const navigate = useNavigate();
    const { messages, blockUser, unblockUser, reportUser, users, getMessages, selectedUser, setSelectedUser } = useContext(ChatContext); // Added users and selectedUser manipulation
    const { onlineUsers, authUser } = useContext(AuthContext);
    const [mediaItems, setMediaItems] = useState([]);
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const [showAllMedia, setShowAllMedia] = useState(false);
    const [selectedMedia, setSelectedMedia] = useState(null);

    // Find user from Context users list or use selectedUser if matches
    const user = users.find(u => u._id === userId) || (selectedUser?._id === userId ? selectedUser : null);

    useEffect(() => {
        if (user && user._id !== selectedUser?._id) {
            setSelectedUser(user);
        }
    }, [user, selectedUser, setSelectedUser]);

    useEffect(() => {
        if (user) {
            // Ensure we have messages for this user to show media
            getMessages(user._id);
        }
    }, [user, getMessages]);


    useEffect(() => {
        // Collect both images and potentially videos in the future
        const images = messages
            .filter((msg) => msg.image)
            .map((msg) => ({ type: 'image', url: msg.image, id: msg._id }));
        setMediaItems(images.reverse()); // Newest first
    }, [messages]);

    const isBlocked = authUser?.blockedUsers?.includes(user?._id);

    const handleBlockToggle = async () => {
        if (isBlocked) {
            await unblockUser(user._id);
        } else {
            await blockUser(user._id);
        }
    };

    const handleReportSubmit = async (reason, description) => {
        await reportUser(user._id, reason, description);
        setIsReportModalOpen(false);
    };

    if (!user) {
        return (
            <div className="h-screen w-full flex items-center justify-center bg-background text-foreground">
                <p>User not found. <button onClick={() => navigate("/")} className="text-violet-400 underline">Go Back</button></p>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-background text-foreground flex justify-center p-4">
            <div className="w-full max-w-2xl bg-card rounded-2xl border border-border overflow-hidden shadow-2xl relative flex flex-col">

                {/* Back Button */}
                <div className="absolute top-4 left-4 z-10">
                    <button onClick={() => navigate("/")} className="p-2 bg-black/40 hover:bg-black/60 rounded-full text-white transition-colors">
                        <ArrowLeft size={24} />
                    </button>
                </div>

                {/* 1. Top Section: Profile Info */}
                <div className="flex flex-col items-center pt-12 pb-6 px-6 relative bg-gradient-to-b from-muted/20 to-card">
                    <div className="relative group cursor-default mb-4">
                        <div className="absolute -inset-0.5 bg-gradient-to-r from-violet-600 to-indigo-600 rounded-full blur opacity-50 group-hover:opacity-100 transition duration-500"></div>
                        <img
                            src={user.profilePic || assets.avatar_icon}
                            alt={user.fullName}
                            className="relative w-32 h-32 rounded-full object-cover border-4 border-card shadow-xl"
                        />
                        {onlineUsers.includes(user._id) && (
                            <span className="absolute bottom-2 right-2 w-5 h-5 bg-green-500 border-4 border-card rounded-full shadow-lg"></span>
                        )}
                    </div>

                    <h2 className="text-2xl font-bold text-foreground mb-2 text-center">{user.fullName}</h2>

                    <div className="text-sm font-medium text-muted-foreground mb-6 flex items-center gap-2">
                        {onlineUsers.includes(user._id) ? (
                            <span className="text-green-500 bg-green-500/10 px-3 py-1 rounded-full">Online</span>
                        ) : (
                            <span className="text-muted-foreground bg-secondary/50 px-3 py-1 rounded-full">{formatLastSeen(user.lastSeen)}</span>
                        )}
                    </div>

                    <p className="text-center text-muted-foreground text-base leading-relaxed max-w-md px-4 glass-morphism p-4 rounded-xl border border-border bg-muted/30">
                        {user.bio || "No bio available"}
                    </p>
                </div>

                <hr className="border-border w-11/12 mx-auto" />

                {/* 2. Middle Section: Media Gallery */}
                <div className="flex-1 overflow-y-auto px-8 py-6 custom-scrollbar">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-foreground tracking-wide flex items-center gap-2">
                            <ImageIcon size={20} className="text-violet-500" />
                            Shared Media
                        </h3>
                        <span className="text-sm text-muted-foreground bg-secondary px-2 py-0.5 rounded-md">{mediaItems.length} files</span>
                    </div>

                    {mediaItems.length > 0 ? (
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                            {mediaItems.slice(0, showAllMedia ? undefined : 8).map((item, idx) => (
                                <div
                                    key={idx}
                                    onClick={() => setSelectedMedia(item)}
                                    className="aspect-square rounded-xl overflow-hidden cursor-pointer relative group border border-white/5 hover:border-violet-500/50 transition-colors shadow-lg bg-black/20"
                                >
                                    <img
                                        src={item.url}
                                        alt="media"
                                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                    />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <ImageIcon size={20} className="text-white drop-shadow-md" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground space-y-3 bg-secondary/20 rounded-2xl border border-border border-dashed">
                            <ImageIcon size={48} className="opacity-30" />
                            <span className="text-sm font-medium">No shared media yet</span>
                        </div>
                    )}

                    {mediaItems.length > 8 && !showAllMedia && (
                        <button
                            onClick={() => setShowAllMedia(true)}
                            className="w-full mt-6 py-3 text-sm text-violet-400 hover:text-white font-medium bg-violet-500/10 hover:bg-violet-600 rounded-xl transition-all duration-300"
                        >
                            View All Media
                        </button>
                    )}
                </div>

                {/* 3. Bottom Section: Actions */}
                <div className="p-8 bg-muted/30 mt-auto border-t border-border grid grid-cols-1 sm:grid-cols-2 gap-4">

                    <button
                        onClick={handleBlockToggle}
                        className={`py-3.5 rounded-xl flex items-center justify-center gap-2 text-sm font-semibold transition-all duration-200 transform active:scale-[0.98] shadow-lg ${isBlocked
                            ? 'bg-secondary text-foreground hover:bg-muted'
                            : 'bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white'
                            }`}
                    >
                        <Ban size={18} />
                        {isBlocked ? "Unblock User" : "Block User"}
                    </button>

                    <button
                        onClick={() => setIsReportModalOpen(true)}
                        className="py-3.5 rounded-xl flex items-center justify-center gap-2 text-sm font-semibold text-amber-500 bg-amber-500/10 hover:bg-amber-500 hover:text-white transition-all duration-200 transform active:scale-[0.98] shadow-lg"
                    >
                        <ShieldAlert size={18} />
                        Report User
                    </button>

                    {/* <button
                        onClick={logout}
                        className="col-span-1 sm:col-span-2 py-3.5 rounded-xl flex items-center justify-center gap-2 text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 shadow-lg shadow-violet-500/20 transition-all duration-200 transform active:scale-[0.98] mt-2"
                    >
                        <LogOut size={18} />
                        Logout
                    </button> */}
                </div>

                {/* Media Viewer Modal */}
                {selectedMedia && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md p-4 animate-in fade-in duration-200">
                        <button
                            onClick={() => setSelectedMedia(null)}
                            className="absolute top-6 right-6 text-white/70 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors z-50"
                        >
                            <X size={32} />
                        </button>
                        <img
                            src={selectedMedia.url}
                            alt="Full view"
                            className="max-w-full max-h-[90vh] rounded-lg shadow-2xl"
                        />
                    </div>
                )}

                <ReportModal
                    isOpen={isReportModalOpen}
                    onClose={() => setIsReportModalOpen(false)}
                    onSubmit={handleReportSubmit}
                    reportingUser={user}
                />
            </div>
        </div>
    );
};
