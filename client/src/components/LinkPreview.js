import React from 'react';

const LinkPreview = ({ metadata }) => {
    if (!metadata) return null;

    const { title, description, image, url } = metadata;

    return (
        <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="block mt-2 mb-1 bg-black/20 rounded-xl overflow-hidden border border-white/10 hover:bg-black/30 transition-colors max-w-sm"
            onClick={(e) => e.stopPropagation()} // Prevent message bubble click
        >
            {image && (
                <div className="w-full h-32 overflow-hidden relative">
                    <img
                        src={image}
                        alt={title}
                        className="w-full h-full object-cover"
                        onError={(e) => e.target.style.display = 'none'}
                    />
                </div>
            )}
            <div className="p-3">
                <h4 className="text-sm font-semibold text-white/90 truncate leading-tight mb-1">{title}</h4>
                {description && (
                    <p className="text-xs text-white/60 line-clamp-2 mb-2">{description}</p>
                )}
                <div className="flex items-center gap-1 text-[10px] text-white/40">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="2" x2="22" y1="12" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>
                    <span className="truncate">{new URL(url).hostname}</span>
                </div>
            </div>
        </a>
    );
};

export default LinkPreview;
