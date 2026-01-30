import React, { useEffect, useRef } from 'react';
import assets from "../chat-assets/assets";

const MentionSuggestions = ({
    suggestions,
    onSelect,
    activeIndex,
    onClose
}) => {
    const listRef = useRef(null);

    useEffect(() => {
        // Scroll active item into view
        if (listRef.current) {
            const activeItem = listRef.current.children[activeIndex];
            if (activeItem) {
                activeItem.scrollIntoView({ block: 'nearest' });
            }
        }
    }, [activeIndex]);

    // Click outside to close? Managed by parent usually, but good to have overlay if needed.
    // For now simple absolute list.

    if (suggestions.length === 0) return null;

    return (
        <div
            className="absolute bottom-full mb-2 left-0 z-50 w-64 bg-[#1f2937] border border-gray-700 rounded-xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in slide-in-from-bottom-2"
        >
            <div className="px-3 py-2 bg-gray-800/50 border-b border-gray-700 text-xs text-gray-400 font-medium">
                People
            </div>
            <ul ref={listRef} className="max-h-48 overflow-y-auto custom-scrollbar">
                {suggestions.map((user, index) => (
                    <li
                        key={user._id}
                        onClick={() => onSelect(user)}
                        className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors border-b border-gray-700/30 last:border-0 ${index === activeIndex ? "bg-violet-600 text-white" : "text-gray-200 hover:bg-gray-800"
                            }`}
                    >
                        <img
                            src={user.profilePic || assets.avatar_icon}
                            alt=""
                            className="w-8 h-8 rounded-full object-cover border border-gray-600"
                        />
                        <div className="flex flex-col min-w-0">
                            <span className="font-medium text-sm truncate">{user.username || user.fullName.split(" ")[0]}</span>
                            <span className={`text-xs truncate ${index === activeIndex ? "text-violet-200" : "text-gray-500"}`}>{user.fullName}</span>
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default MentionSuggestions;
