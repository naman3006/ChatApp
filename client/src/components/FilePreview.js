import React from 'react';
import { FileText, X, File, FileCode, FileArchive, Film, Image as ImageIcon } from 'lucide-react';

const FilePreview = ({ file, onRemove }) => {
    if (!file) return null;

    // Helper to get icon based on type
    const getFileIcon = (mimeType) => {
        if (mimeType.includes('pdf')) return <FileText size={24} className="text-red-500" />;
        if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('tar')) return <FileArchive size={24} className="text-yellow-500" />;
        if (mimeType.includes('image')) return <ImageIcon size={24} className="text-violet-500" />;
        if (mimeType.includes('video')) return <Film size={24} className="text-blue-500" />;
        return <File size={24} className="text-gray-500" />;
    };

    // Helper to format size
    const formatSize = (bytes) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const width = 1;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(width)) + ' ' + sizes[i];
    };

    return (
        <div className="absolute bottom-20 left-4 right-4 z-40">
            <div className="bg-popover border border-border shadow-xl rounded-xl p-3 flex items-center gap-3 max-w-sm animate-in slide-in-from-bottom-2 fade-in">
                <div className="bg-muted p-2.5 rounded-lg flex-shrink-0">
                    {getFileIcon(file.type)}
                </div>

                <div className="flex-1 overflow-hidden min-w-0">
                    <p className="text-sm font-medium text-foreground truncate" title={file.name}>
                        {file.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                        {formatSize(file.size)} • {file.type.split('/')[1]?.toUpperCase() || 'FILE'}
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={onRemove}
                        className="p-1.5 hover:bg-muted rounded-full text-muted-foreground hover:text-destructive transition-colors"
                        title="Remove file"
                    >
                        <X size={18} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default FilePreview;
