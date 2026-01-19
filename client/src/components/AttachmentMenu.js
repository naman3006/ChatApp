import React, { useRef, useEffect } from 'react';
import { Image as ImageIcon, FileText, BarChart2, Paperclip, X } from 'lucide-react';

const AttachmentMenu = ({
    isOpen,
    onClose,
    onSelectImage,
    onSelectDocument,
    onSelectPoll
}) => {
    const menuRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div
            ref={menuRef}
            className="absolute bottom-16 left-4 z-50 bg-popover border border-border rounded-xl shadow-xl p-2 flex flex-col gap-1 w-48 animate-in slide-in-from-bottom-5 fade-in duration-200"
        >
            <button
                onClick={onSelectImage}
                className="flex items-center gap-3 p-2.5 hover:bg-muted rounded-lg text-sm text-foreground transition-colors"
            >
                <div className="bg-violet-100 dark:bg-violet-900/30 p-1.5 rounded-full text-violet-600 dark:text-violet-400">
                    <ImageIcon size={18} />
                </div>
                <span>Photos & Videos</span>
            </button>

            <button
                onClick={onSelectDocument}
                className="flex items-center gap-3 p-2.5 hover:bg-muted rounded-lg text-sm text-foreground transition-colors"
                title="Send Document (PDF, Zip, etc)"
            >
                <div className="bg-blue-100 dark:bg-blue-900/30 p-1.5 rounded-full text-blue-600 dark:text-blue-400">
                    <FileText size={18} />
                </div>
                <span>Document</span>
            </button>

            <button
                onClick={onSelectPoll}
                className="flex items-center gap-3 p-2.5 hover:bg-muted rounded-lg text-sm text-foreground transition-colors"
            >
                <div className="bg-orange-100 dark:bg-orange-900/30 p-1.5 rounded-full text-orange-600 dark:text-orange-400">
                    <BarChart2 size={18} />
                </div>
                <span>Create Poll</span>
            </button>
        </div>
    );
};

export default AttachmentMenu;
