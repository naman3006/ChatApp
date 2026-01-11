import React, { useState, useRef, useEffect } from 'react';
import { X, Image, Video, Loader2, Music, Search, Play, Pause } from 'lucide-react';
import toast from 'react-hot-toast';

const CreateStatusModal = ({ onClose, onCreate }) => {
    const [file, setFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const [caption, setCaption] = useState("");
    const [loading, setLoading] = useState(false);

    // Music States
    const [showMusicSearch, setShowMusicSearch] = useState(false);
    const [musicQuery, setMusicQuery] = useState("");
    const [musicResults, setMusicResults] = useState([]);
    const [selectedMusic, setSelectedMusic] = useState(null);
    const [playingPreview, setPlayingPreview] = useState(null);
    const audioRef = useRef(new Audio());

    // Cleanup audio on unmount
    useEffect(() => {
        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current.currentTime = 0;
            }
        };
    }, []);

    const fileInputRef = useRef(null);

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) {
            setFile(selectedFile);
            setPreview(URL.createObjectURL(selectedFile));
        }
    };

    // Trending Music Fetch
    useEffect(() => {
        if (showMusicSearch && musicResults.length === 0) {
            fetchTrendingMusic();
        }
    }, [showMusicSearch]);

    const fetchTrendingMusic = async () => {
        try {
            const res = await fetch(`https://itunes.apple.com/search?term=top+hits&entity=song&limit=20`);
            const data = await res.json();
            setMusicResults(data.results);
        } catch (error) {
            console.error("Failed to fetch trending music");
        }
    };

    const handleSearchMusic = async (e) => {
        e.preventDefault();
        if (!musicQuery.trim()) return;

        try {
            const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(musicQuery)}&entity=song&limit=20`);
            const data = await res.json();
            setMusicResults(data.results);
        } catch (error) {
            toast.error("Failed to search music");
        }
    };

    const togglePreview = (url) => {
        if (playingPreview === url) {
            audioRef.current.pause();
            setPlayingPreview(null);
        } else {
            audioRef.current.src = url;
            audioRef.current.play();
            setPlayingPreview(url);
        }
    };

    const handleSelectMusic = (track) => {
        setSelectedMusic({
            url: track.previewUrl,
            title: track.trackName,
            artist: track.artistName,
            thumbnail: track.artworkUrl100
        });
        audioRef.current.pause();
        setShowMusicSearch(false);
        toast.success("Music added!");
    };

    const handleSubmit = async () => {
        if (!file) return toast.error("Please select an image or video");

        setLoading(true);
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onloadend = async () => {
            const type = file.type.startsWith("video") ? "video" : "image";
            // Pass selectedMusic to onCreate
            const success = await onCreate(reader.result, type, caption, selectedMusic);
            setLoading(false);
            if (success) onClose();
        };
    };

    return (
        <div className="fixed inset-0 bg-black/90 z-[60] flex items-center justify-center md:p-4">
            <div className="w-full h-full md:h-auto md:max-h-[85vh] md:max-w-md bg-[#1c1c1c] md:rounded-2xl flex flex-col relative border-0 md:border border-gray-800 shadow-2xl">
                {/* Header */}
                <div className="flex justify-between items-center p-4 border-b border-gray-800">
                    <h3 className="text-white font-semibold">Create Status</h3>
                    <div className="flex gap-4">
                        {!showMusicSearch && (
                            <button onClick={() => setShowMusicSearch(true)} className={`text-gray-400 hover:text-white ${selectedMusic ? 'text-violet-500' : ''}`}>
                                <Music size={24} />
                            </button>
                        )}
                        <button onClick={() => { onClose(); audioRef.current.pause(); }} className="text-gray-400 hover:text-white"><X size={24} /></button>
                    </div>
                </div>

                {/* Main Content Area */}
                {showMusicSearch ? (
                    <div className="flex-1 flex flex-col bg-[#0f0f0f] overflow-hidden">
                        <div className="p-4 border-b border-gray-800 shrink-0">
                            <form onSubmit={handleSearchMusic} className="flex gap-2">
                                <input
                                    value={musicQuery}
                                    onChange={(e) => setMusicQuery(e.target.value)}
                                    placeholder="Search songs..."
                                    className="flex-1 bg-[#2a2a2a] text-white p-2 rounded-lg outline-none text-sm"
                                    autoFocus
                                />
                                <button type="submit" className="bg-violet-600 p-2 rounded-lg text-white">
                                    <Search size={18} />
                                </button>
                            </form>
                        </div>
                        <div className="px-4 py-2 border-b border-gray-800 bg-[#1c1c1c]">
                            <h4 className="text-gray-400 text-xs font-semibold uppercase tracking-wider">
                                {musicQuery ? 'Search Results' : 'Trending Hits'}
                            </h4>
                        </div>
                        <div className="flex-1 overflow-y-auto p-2 space-y-2">
                            {musicResults.map(track => (
                                <div key={track.trackId} className="flex items-center gap-3 p-2 hover:bg-white/5 rounded-lg">
                                    <img src={track.artworkUrl60} className="w-10 h-10 rounded" alt="" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-white text-sm font-medium truncate">{track.trackName}</p>
                                        <p className="text-gray-400 text-xs truncate">{track.artistName}</p>
                                    </div>
                                    <button onClick={() => togglePreview(track.previewUrl)}>
                                        {playingPreview === track.previewUrl ? <Pause size={18} className="text-violet-500" /> : <Play size={18} className="text-gray-400" />}
                                    </button>
                                    <button onClick={() => handleSelectMusic(track)} className="bg-white/10 hover:bg-white/20 px-3 py-1 rounded text-xs text-white">
                                        Add
                                    </button>
                                </div>
                            ))}
                        </div>
                        <button onClick={() => { setShowMusicSearch(false); audioRef.current.pause(); setPlayingPreview(null); }} className="m-4 text-gray-400 hover:text-white text-sm">Cancel</button>
                    </div>
                ) : (
                    <div className="flex-1 p-4 flex flex-col items-center justify-center bg-[#0f0f0f] relative">
                        {/* Music Sticker */}
                        {selectedMusic && (
                            <div className="absolute top-4 left-4 z-20 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-2 border border-white/10">
                                <Music size={14} className="text-violet-400" />
                                <div className="max-w-[150px] overflow-hidden">
                                    <div className="whitespace-nowrap animate-marquee text-xs text-white">
                                        {selectedMusic.title} • {selectedMusic.artist}
                                    </div>
                                </div>
                                <button onClick={() => { setSelectedMusic(null); audioRef.current.pause(); }}><X size={12} className="text-gray-400" /></button>
                            </div>
                        )}

                        {preview ? (
                            <div className="relative w-full h-full flex items-center justify-center bg-transparent rounded-lg overflow-hidden">
                                {file.type.startsWith("video") ? (
                                    <video src={preview} controls className="max-h-[50vh] w-full object-contain" />
                                ) : (
                                    <img src={preview} alt="Preview" className="max-h-[50vh] w-full object-contain" />
                                )}
                                <button onClick={() => { setFile(null); setPreview(null); }} className="absolute top-2 right-2 bg-black/50 p-1 rounded-full text-white hover:bg-black/70 z-10">
                                    <X size={16} />
                                </button>
                            </div>
                        ) : (
                            <div
                                onClick={() => fileInputRef.current.click()}
                                className="w-full h-64 border-2 border-dashed border-gray-700 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-violet-500 hover:bg-gray-800/50 transition-all gap-2"
                            >
                                <div className="flex gap-2 text-gray-500">
                                    <Image size={32} />
                                    <Video size={32} />
                                </div>
                                <p className="text-gray-400 text-sm">Click to upload photo or video</p>
                            </div>
                        )}
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            accept="image/*,video/*"
                            className="hidden"
                        />
                    </div>
                )}

                {/* Footer */}
                {!showMusicSearch && (
                    <div className="p-4 bg-[#1c1c1c] border-t border-gray-800">
                        <input
                            value={caption}
                            onChange={(e) => setCaption(e.target.value)}
                            placeholder="Add a caption..."
                            className="w-full bg-[#2a2a2a] text-white p-3 rounded-lg mb-4 outline-none focus:ring-1 focus:ring-violet-500 text-sm"
                        />
                        <button
                            onClick={handleSubmit}
                            disabled={loading || !file}
                            className="w-full bg-violet-600 hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 rounded-lg font-medium transition-colors flex justify-center items-center gap-2"
                        >
                            {loading && <Loader2 size={18} className="animate-spin" />}
                            Share to Status
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CreateStatusModal;
