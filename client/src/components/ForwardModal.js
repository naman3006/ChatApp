import React, { useState, useContext } from 'react';
import { ChatContext } from '../context/ChatContext';
import { AuthContext } from '../context/authContext';
import assets from '../chat-assets/assets';

const ForwardModal = ({ onClose }) => {
    const { users, groups, forwardMessages } = useContext(ChatContext);
    const { authUser, onlineUsers } = useContext(AuthContext);
    const [search, setSearch] = useState("");
    const [selectedRecipients, setSelectedRecipients] = useState([]);
    const [sending, setSending] = useState(false);

    // Filter lists
    const filteredUsers = users.filter(u =>
        u._id !== authUser._id &&
        (u.fullName.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()))
    );

    const filteredGroups = groups.filter(g =>
        g.name.toLowerCase().includes(search.toLowerCase())
    );

    const toggleRecipient = (id) => {
        setSelectedRecipients(prev =>
            prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
        );
    };

    const handleSend = async () => {
        if (selectedRecipients.length === 0) return;
        setSending(true);
        const success = await forwardMessages(selectedRecipients);
        setSending(false);
        if (success) onClose();
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-popover border border-border w-full max-w-md rounded-2xl flex flex-col max-h-[85vh] shadow-2xl overflow-hidden">

                {/* Header */}
                <div className="p-4 border-b border-border flex justify-between items-center bg-muted/30">
                    <h2 className="text-lg font-semibold text-foreground">Forward to...</h2>
                    <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1 rounded-full hover:bg-muted transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" x2="6" y1="6" y2="18" /><line x1="6" x2="18" y1="6" y2="18" /></svg>
                    </button>
                </div>

                {/* Search */}
                <div className="p-3 border-b border-border">
                    <div className="relative bg-muted/50 rounded-xl flex items-center px-3 py-2 focus-within:ring-2 ring-violet-500/50 transition-all">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground mr-2"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
                        <input
                            autoFocus
                            placeholder="Search people and groups..."
                            className="bg-transparent border-none outline-none text-sm w-full text-foreground placeholder-muted-foreground"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">

                    {/* Recent/Frequent section could go here */}

                    {/* Groups Section */}
                    {filteredGroups.length > 0 && (
                        <div className="mb-4">
                            <h3 className="text-xs font-semibold text-muted-foreground px-3 mb-2 uppercase tracking-wider">Groups</h3>
                            <div className="space-y-1">
                                {filteredGroups.map(group => (
                                    <div
                                        key={group._id}
                                        onClick={() => toggleRecipient(group._id)}
                                        className={`
                          flex items-center gap-3 p-2 rounded-xl cursor-pointer transition-colors
                          ${selectedRecipients.includes(group._id) ? "bg-violet-500/10 border border-violet-500/50" : "hover:bg-muted border border-transparent"}
                        `}
                                    >
                                        <div className="relative">
                                            {selectedRecipients.includes(group._id) && (
                                                <div className="absolute -top-1 -right-1 bg-violet-600 text-white rounded-full p-0.5 z-10 border-2 border-background">
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                                                </div>
                                            )}
                                            {group.icon ? (
                                                <img src={group.icon} className="w-10 h-10 rounded-full object-cover" alt="" />
                                            ) : (
                                                <div className="w-10 h-10 rounded-full bg-violet-600 flex items-center justify-center text-white font-bold text-sm">
                                                    {group.name[0].toUpperCase()}
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 overflow-hidden">
                                            <h4 className="font-medium text-foreground truncate">{group.name}</h4>
                                            <p className="text-xs text-muted-foreground truncate">{group.members.length} members</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Users Section */}
                    {filteredUsers.length > 0 && (
                        <div className="mb-2">
                            <h3 className="text-xs font-semibold text-muted-foreground px-3 mb-2 uppercase tracking-wider">Contacts</h3>
                            <div className="space-y-1">
                                {filteredUsers.map(user => (
                                    <div
                                        key={user._id}
                                        onClick={() => toggleRecipient(user._id)}
                                        className={`
                          flex items-center gap-3 p-2 rounded-xl cursor-pointer transition-colors
                          ${selectedRecipients.includes(user._id) ? "bg-violet-500/10 border border-violet-500/50" : "hover:bg-muted border border-transparent"}
                        `}
                                    >
                                        <div className="relative">
                                            {selectedRecipients.includes(user._id) && (
                                                <div className="absolute -top-1 -right-1 bg-violet-600 text-white rounded-full p-0.5 z-10 border-2 border-background">
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                                                </div>
                                            )}
                                            <div className="relative">
                                                <img src={user.profilePic || assets.avatar_icon} className="w-10 h-10 rounded-full object-cover" alt="" />
                                                {onlineUsers.includes(user._id) && <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-background"></span>}
                                            </div>
                                        </div>
                                        <div className="flex-1 overflow-hidden">
                                            <h4 className="font-medium text-foreground truncate">{user.fullName}</h4>
                                            <p className="text-xs text-muted-foreground truncate">
                                                {user.lastSeen ? `Last seen: ${new Date(user.lastSeen).toLocaleDateString()}` : "Offline"}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {filteredUsers.length === 0 && filteredGroups.length === 0 && (
                        <div className="p-8 text-center text-muted-foreground text-sm">
                            No results found
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-border bg-muted/30 flex justify-end gap-3">
                    <div className="flex-1 flex items-center text-sm text-muted-foreground">
                        {selectedRecipients.length > 0 ? (
                            <span>{selectedRecipients.length} selected</span>
                        ) : (
                            <span>Select at least 1 chat</span>
                        )}
                    </div>
                    <button onClick={onClose} className="px-4 py-2 text-sm font-medium hover:bg-muted rounded-lg transition-colors">
                        Cancel
                    </button>
                    <button
                        onClick={handleSend}
                        disabled={selectedRecipients.length === 0 || sending}
                        className="px-6 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-lg shadow-lg shadow-violet-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                    >
                        {sending ? (
                            <>
                                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                Sending...
                            </>
                        ) : (
                            <>
                                Send
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ForwardModal;
