/* eslint-disable react-hooks/exhaustive-deps */
import React, { useContext, useEffect, useState } from "react";
import assets from "../chat-assets/assets";
import { useNavigate } from "react-router-dom";
import { formatMessageTime } from "../lib/utils";
import { AuthContext } from "../context/authContext";
import { ChatContext } from "../context/ChatContext";
import toast from "react-hot-toast";

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
        typingData
    } = useContext(ChatContext);

    const { logout, onlineUsers, authUser } = useContext(AuthContext);

    const [showGroupModal, setShowGroupModal] = useState(false);
    const [groupName, setGroupName] = useState("");
    const [selectedMembers, setSelectedMembers] = useState([]);


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
            className={`h-full relative sm:rounded-l-2xl text-white w-full border-r border-gray-700/30 overflow-hidden bg-[#8185B2]/10 ${selectedUser || selectedGroup ? "hidden md:block" : "block"}`}
        >
            {/* Fixed Floating Header Section with Glassmorphism */}
            <div className="absolute top-0 left-0 w-full z-20 p-5 pb-3 bg-[#131313]/50 backdrop-blur-xl border-b border-white/5 shadow-sm transition-all text-white">
                <div className="flex justify-between items-center mb-5">
                    <div className="flex items-center gap-2">
                        <img
                            onClick={() => navigate("/profile")}
                            src={authUser?.profilePic || assets.avatar_icon}
                            alt="Profile"
                            className="w-10 h-10 rounded-full object-cover cursor-pointer border-2 border-transparent hover:border-violet-500 transition-all shadow-md"
                            title="Edit Profile"
                        />
                        <img src={assets.logo} alt="logo" className="hidden sm:block max-w-32 drop-shadow-md" />
                    </div>
                    <div className="flex items-center gap-4">
                        <button onClick={() => setShowGroupModal(true)} title="Create Group" className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-full">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><line x1="19" x2="19" y1="8" y2="14" /><line x1="22" x2="16" y1="11" y2="11" /></svg>
                        </button>
                        <button onClick={() => navigate("/settings")} title="Settings" className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-full">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.72v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" /><circle cx="12" cy="12" r="3" /></svg>
                        </button>
                        <div className="relative py-2 group">
                            <img
                                src={assets.menu_icon}
                                alt="menu"
                                className="max-h-5 cursor-pointer opacity-80 hover:opacity-100 transition-opacity"
                            />
                            <div className="absolute top-full right-0 z-20 w-32 p-1.5 rounded-lg bg-[#282142] border border-gray-700 text-gray-100 hidden group-hover:block shadow-xl">
                                <p onClick={() => logout()} className="cursor-pointer text-sm hover:bg-white/10 p-2 rounded-md transition-colors flex items-center gap-2 text-red-400">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" x2="9" y1="12" y2="12" /></svg>
                                    Logout
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-[#282142]/80 backdrop-blur-sm border border-white/5 rounded-full flex items-center gap-2 py-3 px-4 focus-within:border-violet-500/50 focus-within:bg-[#282142] transition-all">
                    <img src={assets.search_icon} alt="Search" className="w-3 opacity-60" />
                    <input
                        onChange={(e) => setInput(e.target.value)}
                        type="text"
                        className="bg-transparent border-none outline-none text-white text-xs placeholder:text-gray-500 flex-1"
                        placeholder="Search User..."
                    />
                </div>
            </div>

            {/* Scrollable Content (Groups + Users) */}
            <div className="h-full overflow-y-auto pt-[160px] px-5 pb-5 custom-scrollbar">
                {/* Group List */}
                <div className="flex flex-col mb-4">
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-2">Groups</h3>
                    {groups.map((group) => (
                        <div
                            key={group._id}
                            onClick={() => setSelectedGroup(group)}
                            className={`flex items-center gap-2 p-2 pl-4 rounded cursor-pointer max-sm:text-sm hover:bg-white/5 transition-colors ${selectedGroup?._id === group._id ? "bg-[#282142]/80" : ""}`}
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
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-2">Direct Messages</h3>
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
                            className={`relative flex items-center gap-2 p-2 pl-4 rounded cursor-pointer max-sm:text-sm ${selectedUser?._id === user._id && "bg-[#282142]/50"
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
                                        <span className="text-neutral-400 text-xs">
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

                {/* Create Group Modal */}
                {
                    showGroupModal && (
                        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                            <div className="bg-gray-900 border border-gray-700 p-6 rounded-xl w-full max-w-md">
                                <h2 className="text-xl text-white font-bold mb-4">Create New Group</h2>

                                <input
                                    value={groupName}
                                    onChange={(e) => setGroupName(e.target.value)}
                                    placeholder="Group Name"
                                    className="w-full bg-gray-800 text-white p-3 rounded-lg mb-4 border border-gray-700 outline-none focus:border-violet-500"
                                />

                                <p className="text-gray-400 text-sm mb-2">Select Members:</p>
                                <div className="max-h-48 overflow-y-auto mb-4 space-y-2">
                                    {users.map(user => (
                                        <div key={user._id} onClick={() => toggleMemberSelection(user._id)} className={`flex items-center gap-2 p-2 rounded cursor-pointer ${selectedMembers.includes(user._id) ? "bg-violet-600/30 border border-violet-500" : "bg-gray-800"}`}>
                                            <img src={user.profilePic || assets.avatar_icon} className="w-8 h-8 rounded-full" alt="" />
                                            <p className="text-sm text-gray-300">{user.fullName}</p>
                                            {selectedMembers.includes(user._id) && <span className="ml-auto text-violet-400">✓</span>}
                                        </div>
                                    ))}
                                </div>

                                <div className="flex justify-end gap-2">
                                    <button onClick={() => setShowGroupModal(false)} className="text-gray-400 hover:text-white px-4 py-2">Cancel</button>
                                    <button onClick={handleCreateGroup} className="bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-lg">Create</button>
                                </div>
                            </div>
                        </div>
                    )
                }

            </div>
        </div >
    );
};
