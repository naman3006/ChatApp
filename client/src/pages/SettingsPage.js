import React, { useContext, useState } from 'react';
import { AuthContext } from '../context/authContext';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import assets from '../chat-assets/assets';

const SettingsPage = () => {
    const { authUser, updateProfile } = useContext(AuthContext);
    const navigate = useNavigate();
    const [privacy, setPrivacy] = useState(authUser?.privacy || {
        ghostMode: false,
        lastSeen: true,
        readReceipts: true
    });
    const [isSaving, setIsSaving] = useState(false);

    const handleToggle = (key) => {
        setPrivacy(prev => ({
            ...prev,
            [key]: !prev[key]
        }));
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await updateProfile({ privacy });
            toast.success("Settings saved successfully");
            // Refresh might be needed for socket to pick up ghost mode changes effectively or handled via context re-connection logic
            if (privacy.ghostMode !== authUser.privacy?.ghostMode) {
                window.location.reload();
            }
        } catch (error) {
            toast.error("Failed to update settings");
        } finally {
            setIsSaving(false);
        }
    }

    return (
        <div className="h-screen w-screen bg-black/90 flex items-center justify-center p-4">
            <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md p-6 relative">
                <button onClick={() => navigate("/")} className="absolute top-4 left-4 text-gray-400 hover:text-white">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
                </button>

                <div className="flex flex-col items-center mb-8 mt-2">
                    <img src={authUser?.profilePic || assets.avatar_icon} className="w-20 h-20 rounded-full border-2 border-violet-500 mb-3" alt="Profile" />
                    <h2 className="text-xl text-white font-semibold">{authUser?.fullName}</h2>
                    <p className="text-gray-400 text-sm">{authUser?.email}</p>
                </div>

                <h3 className="text-gray-500 uppercase text-xs font-bold tracking-wider mb-4 px-2">Privacy & Security</h3>

                <div className="space-y-4">
                    {/* Ghost Mode */}
                    <div className="flex items-center justify-between bg-gray-800/50 p-4 rounded-xl">
                        <div>
                            <p className="text-white font-medium">Ghost Mode</p>
                            <p className="text-gray-400 text-xs mt-1">Hide your online status from everyone</p>
                        </div>
                        <button
                            onClick={() => handleToggle('ghostMode')}
                            className={`w-12 h-6 rounded-full transition-colors relative ${privacy.ghostMode ? 'bg-violet-500' : 'bg-gray-600'}`}
                        >
                            <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${privacy.ghostMode ? 'left-7' : 'left-1'}`}></div>
                        </button>
                    </div>

                    {/* Last Seen */}
                    <div className="flex items-center justify-between bg-gray-800/50 p-4 rounded-xl">
                        <div>
                            <p className="text-white font-medium">Last Seen</p>
                            <p className="text-gray-400 text-xs mt-1">Show when you were last active</p>
                        </div>
                        <button
                            onClick={() => handleToggle('lastSeen')}
                            className={`w-12 h-6 rounded-full transition-colors relative ${privacy.lastSeen ? 'bg-violet-500' : 'bg-gray-600'}`}
                        >
                            <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${privacy.lastSeen ? 'left-7' : 'left-1'}`}></div>
                        </button>
                    </div>

                    {/* Read Receipts */}
                    <div className="flex items-center justify-between bg-gray-800/50 p-4 rounded-xl">
                        <div>
                            <p className="text-white font-medium">Read Receipts</p>
                            <p className="text-gray-400 text-xs mt-1">Show blue ticks when you read messages</p>
                        </div>
                        <button
                            onClick={() => handleToggle('readReceipts')}
                            className={`w-12 h-6 rounded-full transition-colors relative ${privacy.readReceipts ? 'bg-violet-500' : 'bg-gray-600'}`}
                        >
                            <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${privacy.readReceipts ? 'left-7' : 'left-1'}`}></div>
                        </button>
                    </div>

                    {/* Undo Window */}
                    <div className="flex items-center justify-between bg-gray-800/50 p-4 rounded-xl">
                        <div>
                            <p className="text-white font-medium">Undo Message Window</p>
                            <p className="text-gray-400 text-xs mt-1">Time limit to restore deleted messages</p>
                        </div>
                        <select
                            value={privacy.undoWindow !== undefined ? privacy.undoWindow : 5}
                            onChange={(e) => setPrivacy(prev => ({ ...prev, undoWindow: Number(e.target.value) }))}
                            className="bg-gray-700 text-white text-sm rounded-lg p-2 outline-none border border-gray-600 focus:border-violet-500"
                        >
                            <option value={0}>Off</option>
                            <option value={2}>2 Minutes</option>
                            <option value={5}>5 Minutes</option>
                            <option value={10}>10 Minutes</option>
                        </select>
                    </div>
                </div>

                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="w-full mt-8 bg-violet-600 hover:bg-violet-700 text-white py-3 rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                    {isSaving ? "Saving Settings..." : "Save Changes"}
                </button>

            </div>
        </div>
    );
};

export default SettingsPage;
