/* eslint-disable react-hooks/exhaustive-deps */
import React, { useContext, useEffect, useState } from "react";
import { MoreVertical, LogOut } from "lucide-react";
import assets from "../chat-assets/assets";
import { useNavigate } from "react-router-dom";
import { formatMessageTime } from "../lib/utils";
import { AuthContext } from "../context/authContext";
import { ChatContext } from "../context/ChatContext";
import toast from "react-hot-toast";
import StatusList from "./StatusList";
import StatusViewer from "./StatusViewer";
import CreateStatusModal from "./CreateStatusModal";
import { StatusContext } from "../context/StatusContext";

import SidebarSkeleton from "./skeletons/SidebarSkeleton";
import { ThemeToggle } from "./ThemeToggle";

export const Sidebar = () => {
    const {
        getUsers,
        users,
        selectedUser,
        setSelectedUser,
        unseenMessages,
        setUnseenMessages,
        groups,
        getGroups,
        setSelectedGroup,
        selectedGroup,
        createGroup,
        typingData,
        isUsersLoading
    } = useContext(ChatContext);

    // ... (keep middle unchanged if possible using context, but replace needs context)
    // Actually I will just target the start of the function to add isUsersLoading

    const { logout, onlineUsers, authUser } = useContext(AuthContext);

    const [showGroupModal, setShowGroupModal] = useState(false);
    const [groupName, setGroupName] = useState("");
    const [selectedMembers, setSelectedMembers] = useState([]);

    const [viewerUserId, setViewerUserId] = useState(null);
    const [isCreatingStatus, setIsCreatingStatus] = useState(false);
    const { createStatus, getStatuses } = useContext(StatusContext);


    const [input, setInput] = useState("");

    const navigate = useNavigate();

    const filteredUsers = input
        ? users.filter((user) =>
            user.fullName.toLowerCase().includes(input.toLowerCase())
        )
        : users;

    useEffect(() => {
        getUsers();
        getGroups();
    }, [onlineUsers]);

    // ...

    const handleCreateGroup = async () => {
        if (!groupName || selectedMembers.length === 0) return toast.error("Name and members required");
        const success = await createGroup(groupName, selectedMembers);
        if (success) {
            setShowGroupModal(false);
            setGroupName("");
            setSelectedMembers([]);
        }
    };

    const toggleMemberSelection = (userId) => {
        if (selectedMembers.includes(userId)) {
            setSelectedMembers(prev => prev.filter(id => id !== userId));
        } else {
            setSelectedMembers(prev => [...prev, userId]);
        }
    };

    return (
        <div
            className={`h-full relative sm:rounded-l-2xl text-foreground w-full border-r border-border overflow-hidden bg-background/30 ${selectedUser || selectedGroup ? "hidden md:block" : "block"}`}
        >
            {/* Fixed Floating Header Section with Glassmorphism */}
            <div className="absolute top-0 left-0 w-full z-20 p-5 pb-3 bg-background/80 backdrop-blur-xl border-b border-border shadow-sm transition-all text-foreground">
                <div className="flex justify-between items-center mb-5">
                    <div className="flex items-center gap-2">
                        <img
                            onClick={() => navigate("/profile")}
                            src={authUser?.profilePic || assets.avatar_icon}
                            alt="Profile"
                            className="w-10 h-10 rounded-full object-cover cursor-pointer border-2 border-transparent hover:border-violet-500 transition-all shadow-md"
                            title="Edit Profile"
                        />
                        <img src={assets.logo} alt="logo" className="hidden sm:block max-w-32 drop-shadow-md invert dark:invert-0 transition-all" />
                    </div>
                    <div className="flex items-center gap-4">
                        <button onClick={() => setShowGroupModal(true)} title="Create Group" className="text-muted-foreground hover:text-foreground transition-colors p-2 hover:bg-muted rounded-full">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                        </button>
                        <button onClick={() => navigate("/settings")} title="Settings" className="text-muted-foreground hover:text-foreground transition-colors p-2 hover:bg-muted rounded-full">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.72v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" /><circle cx="12" cy="12" r="3" /></svg>
                        </button>
                        <ThemeToggle className="text-muted-foreground hover:text-foreground hover:bg-muted bg-transparent border-none shadow-none" />
                        <div className="relative py-2 group">
                            <button className="text-muted-foreground hover:text-foreground transition-colors p-2 hover:bg-muted rounded-full">
                                <MoreVertical size={20} />
                            </button>
                            <div className="absolute top-full right-0 z-20 w-32 p-1.5 rounded-lg bg-popover border border-border text-popover-foreground hidden group-hover:block shadow-xl">
                                <button onClick={() => logout()} className="w-full cursor-pointer text-sm hover:bg-muted p-2 rounded-md transition-colors flex items-center gap-2 text-destructive">
                                    <LogOut size={16} />
                                    Logout
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-secondary/50 backdrop-blur-sm border border-border/40 rounded-full flex items-center gap-2 py-3 px-4 focus-within:border-primary/50 focus-within:bg-secondary transition-all">
                    <img src={assets.search_icon} alt="Search" className="w-3 opacity-60 dark:invert" />
                    <input
                        onChange={(e) => setInput(e.target.value)}
                        type="text"
                        className="bg-transparent border-none outline-none text-foreground text-xs placeholder:text-muted-foreground flex-1"
                        placeholder="Search User..."
                    />
                </div>
            </div>


            {/* Scrollable Content (Groups + Users) */}
            <div className="h-full overflow-y-auto pt-[160px] px-5 pb-5 custom-scrollbar">
                {isUsersLoading ? <SidebarSkeleton /> : (
                    <>
                        {/* Status List */}
                        <StatusList
                            onOpenViewer={setViewerUserId}
                            onCreateStatus={() => setIsCreatingStatus(true)}
                        />
                        <div className="my-4 border-b border-white/5"></div>

                        {/* Group List */}
                        <div className="flex flex-col mb-4">
                            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-2">Groups</h3>
                            {groups.map((group) => (
                                <div
                                    key={group._id}
                                    onClick={() => setSelectedGroup(group)}
                                    className={`flex items-center gap-2 p-2 pl-4 rounded cursor-pointer max-sm:text-sm hover:bg-muted transition-colors ${selectedGroup?._id === group._id ? "bg-accent" : ""}`}
                                >
                                    <div className="w-[35px] h-[35px] min-w-[35px] rounded-full bg-violet-600 flex items-center justify-center text-white font-bold text-sm">
                                        {group.name[0].toUpperCase()}
                                    </div>
                                    <div className="flex flex-col truncate w-full">
                                        <p className="truncate text-sm font-medium">{group.name}</p>
                                        {typingData && typingData[group._id] && typingData[group._id].size > 0 ? (
                                            <p className="text-[10px] text-green-400 animate-pulse font-medium truncate">
                                                {users.find(u => u._id === Array.from(typingData[group._id])[0])?.fullName.split(' ')[0] || "Someone"} is typing...
                                            </p>
                                        ) : null}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="flex flex-col">
                            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-2">Direct Messages</h3>
                            {filteredUsers.map((user, idx) => (
                                <div
                                    onClick={() => {
                                        setSelectedUser(user);
                                        setUnseenMessages((prev) => {
                                            const newUnseen = { ...prev };
                                            delete newUnseen[user._id];
                                            return newUnseen;
                                        });
                                    }}
                                    key={idx}
                                    className={`relative flex items-center gap-2 p-2 pl-4 rounded cursor-pointer max-sm:text-sm hover:bg-muted transition-colors ${selectedUser?._id === user._id && "bg-accent"
                                        }`}
                                >
                                    <img
                                        src={user?.profilePic || assets.avatar_icon}
                                        alt=""
                                        className="w-[35px] aspect-[1/1] rounded-full"
                                    />
                                    <div className="flex flex-col leading-5">
                                        <p className="text-sm font-medium">{user.fullName}</p>
                                        {typingData && typingData[user._id] && typingData[user._id].size > 0 ? (
                                            <span className="text-green-400 text-xs animate-pulse font-medium">Typing...</span>
                                        ) : (
                                            onlineUsers.includes(user._id) ? (
                                                <span className="text-green-400 text-xs">Online</span>
                                            ) : (
                                                <span className="text-muted-foreground text-xs">
                                                    {user.updatedAt ? `Last seen: ${formatMessageTime(user.updatedAt)}` : "Offline"}
                                                </span>
                                            )
                                        )}
                                    </div>
                                    {unseenMessages && unseenMessages[user._id] > 0 && (
                                        <p className="absolute top-4 right-4 text-xs h-5 w-5 flex justify-center items-center rounded-full bg-violet-500/50">
                                            {unseenMessages[user._id]}
                                        </p>
                                    )}
                                </div>
                            ))}
                        </div>
                    </>
                )}

                {/* Create Group Modal */}
                {
                    showGroupModal && (
                        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                            <div className="bg-popover border border-border p-6 rounded-xl w-full max-w-md shadow-2xl">
                                <h2 className="text-xl text-popover-foreground font-bold mb-4">Create New Group</h2>

                                <input
                                    value={groupName}
                                    onChange={(e) => setGroupName(e.target.value)}
                                    placeholder="Group Name"
                                    className="w-full bg-secondary text-foreground p-3 rounded-lg mb-4 border border-border outline-none focus:border-primary"
                                />

                                <p className="text-muted-foreground text-sm mb-2">Select Members:</p>
                                <div className="max-h-48 overflow-y-auto mb-4 space-y-2 custom-scrollbar">
                                    {users.map(user => (
                                        <div key={user._id} onClick={() => toggleMemberSelection(user._id)} className={`flex items-center gap-2 p-2 rounded cursor-pointer ${selectedMembers.includes(user._id) ? "bg-primary/20 border border-primary/50" : "bg-muted/50 hover:bg-muted"}`}>
                                            <img src={user.profilePic || assets.avatar_icon} className="w-8 h-8 rounded-full" alt="" />
                                            <p className="text-sm text-foreground">{user.fullName}</p>
                                            {selectedMembers.includes(user._id) && <span className="ml-auto text-primary">✓</span>}
                                        </div>
                                    ))}
                                </div>

                                <div className="flex justify-end gap-2">
                                    <button onClick={() => setShowGroupModal(false)} className="text-muted-foreground hover:text-foreground px-4 py-2">Cancel</button>
                                    <button onClick={handleCreateGroup} className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg">Create</button>
                                </div>
                            </div>
                        </div>
                    )
                }

            </div>
            {/* Status Modals */}
            <>
                {viewerUserId && <StatusViewer startUserId={viewerUserId} onClose={() => { setViewerUserId(null); getStatuses(); }} />}
                {isCreatingStatus && <CreateStatusModal onClose={() => setIsCreatingStatus(false)} onCreate={createStatus} />}
            </>
        </div>
    );
};

