import React, { useState } from "react";
import toast from "react-hot-toast";

const THEMES = {
    solid: [
        { id: "default", value: "", name: "Default" },
        { id: "midnight", value: "#0f172a", name: "Midnight" },
        { id: "forest", value: "#052e16", name: "Forest" },
        { id: "ocean", value: "#0c4a6e", name: "Ocean" },
        { id: "rose", value: "#881337", name: "Rose" },
        { id: "purple", value: "#581c87", name: "Royal Purple" },
    ],
    gradient: [
        { id: "sunset", value: "linear-gradient(to bottom right, #f97316, #db2777)", name: "Sunset" },
        { id: "northern", value: "linear-gradient(to bottom right, #0f172a, #3b82f6)", name: "Northern Lights" },
        { id: "tropical", value: "linear-gradient(to bottom right, #059669, #34d399)", name: "Tropical" },
        { id: "berry", value: "linear-gradient(to bottom right, #7e22ce, #ec4899)", name: "Berry" },
        { id: "steel", value: "linear-gradient(to bottom right, #374151, #9ca3af)", name: "Steel" },
    ],
};

const ThemeSelector = ({ onClose, onSelect, currentTheme }) => {
    const [activeTab, setActiveTab] = useState("solid");
    const [customImage, setCustomImage] = useState(null);

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            toast.error("File size too large (max 5MB)");
            return;
        }

        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            setCustomImage(reader.result);
            onSelect({ type: "image", value: reader.result, id: "custom" });
            onClose();
        };
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-800">
                    <h2 className="text-lg font-semibold text-white">Customize Chat Theme</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 18 12" /></svg>
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex p-2 gap-2 bg-gray-950/50">
                    {["solid", "gradient", "image"].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === tab
                                    ? "bg-violet-600 text-white shadow-lg shadow-violet-500/20"
                                    : "text-gray-400 hover:text-white hover:bg-white/5"
                                }`}
                        >
                            {tab.charAt(0).toUpperCase() + tab.slice(1)}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                    <div className="grid grid-cols-2 gap-3">
                        {activeTab !== "image" && THEMES[activeTab].map((theme) => (
                            <button
                                key={theme.id}
                                onClick={() => {
                                    onSelect({ type: activeTab, value: theme.value, id: theme.id });
                                    onClose();
                                }}
                                className={`relative group bg-gray-800 rounded-xl overflow-hidden aspect-video border-2 transition-all hover:scale-105 ${currentTheme?.id === theme.id ? "border-violet-500 ring-2 ring-violet-500/20" : "border-transparent hover:border-gray-600"
                                    }`}
                            >
                                <div
                                    className="w-full h-full"
                                    style={{ background: theme.value || "#111827" }}
                                />
                                <div className="absolute inset-x-0 bottom-0 bg-black/60 p-2 text-xs text-white font-medium text-center backdrop-blur-sm">
                                    {theme.name}
                                </div>
                                {currentTheme?.id === theme.id && (
                                    <div className="absolute top-2 right-2 bg-violet-500 rounded-full p-1 text-white">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                                    </div>
                                )}
                            </button>
                        ))}

                        {activeTab === "image" && (
                            <div className="col-span-2 space-y-4">
                                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-700 rounded-xl hover:border-violet-500 hover:bg-violet-500/5 transition-all cursor-pointer group">
                                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                        <svg className="w-8 h-8 mb-3 text-gray-500 group-hover:text-violet-400 transition-colors" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" /></svg>
                                        <p className="text-sm text-gray-400 group-hover:text-gray-300">Upload Wallpaper</p>
                                    </div>
                                    <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                                </label>

                                {currentTheme?.type === 'image' && (
                                    <div className="relative rounded-xl overflow-hidden aspect-video border-2 border-violet-500">
                                        <img src={currentTheme.value} alt="Current Wallpaper" className="w-full h-full object-cover" />
                                        <div className="absolute inset-x-0 bottom-0 bg-black/60 p-2 text-xs text-center text-white backdrop-blur-sm">Current Wallpaper</div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ThemeSelector;
