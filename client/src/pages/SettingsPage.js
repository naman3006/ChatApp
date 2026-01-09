import React, { useContext, useState } from 'react';
import { AuthContext } from '../context/authContext';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import assets from '../chat-assets/assets';
import { ChevronLeft, Save, Shield, Clock, Eye, CheckCircle, Ghost } from "lucide-react";

const SettingsPage = () => {
    const { authUser, updateProfile } = useContext(AuthContext);
    const navigate = useNavigate();
    const [privacy, setPrivacy] = useState(authUser?.privacy || {
        ghostMode: false,
        lastSeen: true,
        readReceipts: true,
        undoWindow: 5
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

            // Logic to handle potential socket reconnections for privacy changes
            if (privacy.ghostMode !== authUser.privacy?.ghostMode) {
                // Reload might be needed for rigorous privacy enforcement if socket logic depends on initial connection params
                // But usually context update is enough if socket listens to updates. 
                // For safety based on previous logic:
                setTimeout(() => {
                    navigate("/");
                    window.location.reload();
                }, 1000);
            } else {
                navigate("/");
            }

        } catch (error) {
            toast.error("Failed to update settings");
        } finally {
            setIsSaving(false);
        }
    }

    return (
        <div className="min-h-screen w-full bg-[#0f0f13] relative overflow-hidden flex items-center justify-center p-4">

            {/* Ambient Background */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-violet-900/20 rounded-full blur-[120px] animate-pulse"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-900/20 rounded-full blur-[120px] animate-pulse delay-1000"></div>
            </div>

            <div className="bg-gray-900/60 backdrop-blur-2xl border border-white/10 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl relative z-10 flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="p-6 border-b border-white/5 flex items-center gap-4 bg-white/5">
                    <button
                        onClick={() => navigate("/")}
                        className="p-2 rounded-full hover:bg-white/10 text-gray-300 hover:text-white transition-colors"
                    >
                        <ChevronLeft size={24} />
                    </button>
                    <h1 className="text-xl font-bold text-white tracking-wide">Settings</h1>
                </div>

                <div className="overflow-y-auto p-6 space-y-8 custom-scrollbar">

                    {/* Profile Section */}
                    <div className="flex flex-col items-center">
                        <div className="relative group">
                            <div className="absolute -inset-1 bg-gradient-to-r from-violet-600 to-indigo-600 rounded-full blur opacity-40 group-hover:opacity-70 transition duration-500"></div>
                            <img
                                src={authUser?.profilePic || assets.avatar_icon}
                                className="relative w-24 h-24 rounded-full object-cover border-4 border-[#1a1b26] shadow-xl"
                                alt="Profile"
                            />
                        </div>
                        <h2 className="mt-4 text-2xl font-bold text-white">{authUser?.fullName}</h2>
                        <p className="text-gray-400 text-sm">{authUser?.email}</p>
                    </div>

                    {/* Privacy Section */}
                    <div className="space-y-4">
                        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest pl-2 border-l-2 border-violet-500">Privacy & Security</h3>

                        {/* Ghost Mode Toggle */}
                        <div className="bg-white/5 border border-white/5 rounded-2xl p-4 flex items-center justify-between hover:bg-white/[0.07] transition-colors">
                            <div className="flex items-start gap-3">
                                <div className="p-2 bg-gray-800 rounded-lg text-violet-400">
                                    <Ghost size={20} />
                                </div>
                                <div>
                                    <p className="text-white font-medium text-base">Ghost Mode</p>
                                    <p className="text-gray-400 text-xs mt-0.5">Hide your online status completely</p>
                                </div>
                            </div>
                            <button
                                onClick={() => handleToggle('ghostMode')}
                                className={`w-12 h-7 rounded-full transition-colors relative focus:outline-none focus:ring-2 focus:ring-violet-500/50 ${privacy.ghostMode ? 'bg-violet-600' : 'bg-gray-700'}`}
                            >
                                <div className={`w-5 h-5 bg-white rounded-full absolute top-1 shadow-md transition-all duration-300 ${privacy.ghostMode ? 'left-[26px]' : 'left-1'}`}></div>
                            </button>
                        </div>

                        {/* Last Seen Toggle */}
                        <div className="bg-white/5 border border-white/5 rounded-2xl p-4 flex items-center justify-between hover:bg-white/[0.07] transition-colors">
                            <div className="flex items-start gap-3">
                                <div className="p-2 bg-gray-800 rounded-lg text-indigo-400">
                                    <Clock size={20} />
                                </div>
                                <div>
                                    <p className="text-white font-medium text-base">Last Seen</p>
                                    <p className="text-gray-400 text-xs mt-0.5">Allow others to see when you were active</p>
                                </div>
                            </div>
                            <button
                                onClick={() => handleToggle('lastSeen')}
                                className={`w-12 h-7 rounded-full transition-colors relative focus:outline-none focus:ring-2 focus:ring-violet-500/50 ${privacy.lastSeen ? 'bg-violet-600' : 'bg-gray-700'}`}
                            >
                                <div className={`w-5 h-5 bg-white rounded-full absolute top-1 shadow-md transition-all duration-300 ${privacy.lastSeen ? 'left-[26px]' : 'left-1'}`}></div>
                            </button>
                        </div>

                        {/* Read Receipts Toggle */}
                        <div className="bg-white/5 border border-white/5 rounded-2xl p-4 flex items-center justify-between hover:bg-white/[0.07] transition-colors">
                            <div className="flex items-start gap-3">
                                <div className="p-2 bg-gray-800 rounded-lg text-blue-400">
                                    <CheckCircle size={20} />
                                </div>
                                <div>
                                    <p className="text-white font-medium text-base">Read Receipts</p>
                                    <p className="text-gray-400 text-xs mt-0.5">Show blue ticks when messages are read</p>
                                </div>
                            </div>
                            <button
                                onClick={() => handleToggle('readReceipts')}
                                className={`w-12 h-7 rounded-full transition-colors relative focus:outline-none focus:ring-2 focus:ring-violet-500/50 ${privacy.readReceipts ? 'bg-violet-600' : 'bg-gray-700'}`}
                            >
                                <div className={`w-5 h-5 bg-white rounded-full absolute top-1 shadow-md transition-all duration-300 ${privacy.readReceipts ? 'left-[26px]' : 'left-1'}`}></div>
                            </button>
                        </div>

                        {/* Undo Window Select */}
                        <div className="bg-white/5 border border-white/5 rounded-2xl p-4 flex items-center justify-between hover:bg-white/[0.07] transition-colors">
                            <div className="flex items-start gap-3">
                                <div className="p-2 bg-gray-800 rounded-lg text-amber-400">
                                    <Shield size={20} />
                                </div>
                                <div>
                                    <p className="text-white font-medium text-base">Undo Window</p>
                                    <p className="text-gray-400 text-xs mt-0.5">Time limit to delete messages</p>
                                </div>
                            </div>
                            <div className="relative">
                                <select
                                    value={privacy.undoWindow}
                                    onChange={(e) => setPrivacy(prev => ({ ...prev, undoWindow: Number(e.target.value) }))}
                                    className="appearance-none bg-gray-800 text-white text-sm rounded-lg pl-3 pr-8 py-2 outline-none border border-gray-700 focus:border-violet-500 cursor-pointer hover:bg-gray-750 transition-colors"
                                >
                                    <option value={0}>Off</option>
                                    <option value={2}>2 mins</option>
                                    <option value={5}>5 mins</option>
                                    <option value={10}>10 mins</option>
                                </select>
                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
                                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
                                </div>
                            </div>
                        </div>

                    </div>

                </div>

                {/* Footer Action */}
                <div className="p-6 border-t border-white/5 bg-gray-900/50">
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white py-3.5 rounded-xl font-semibold shadow-lg shadow-violet-500/20 transform transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {isSaving ? (
                            <>
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                Saving...
                            </>
                        ) : (
                            <>
                                <Save size={20} />
                                Save Changes
                            </>
                        )}
                    </button>
                    <p className="text-center text-xs text-gray-500 mt-4"> Changes affect your experience immediately</p>
                </div>

            </div>
        </div>
    );
};

export default SettingsPage;
