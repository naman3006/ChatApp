import { useState, useRef, useEffect } from 'react';
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
        const audio = audioRef.current;
        return () => {
            if (audio) {
                audio.pause();
                audio.currentTime = 0;
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
        const fetchTrendingMusic = async () => {
            try {
                const res = await fetch(`https://itunes.apple.com/search?term=top+hits&entity=song&limit=20`);
                const data = await res.json();
                setMusicResults(data.results);
            } catch (error) {
                console.error("Failed to fetch trending music");
            }
        };

        if (showMusicSearch && musicResults.length === 0) {
            fetchTrendingMusic();
        }
    }, [showMusicSearch, musicResults.length]);

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
            <div className="w-full h-full md:h-auto md:max-h-[85vh] md:max-w-md bg-popover md:rounded-2xl flex flex-col relative border-0 md:border border-border shadow-2xl">
                {/* Header */}
                <div className="flex justify-between items-center p-4 border-b border-border">
                    <h3 className="text-foreground font-semibold">Create Status</h3>
                    <div className="flex gap-4">
                        {!showMusicSearch && (
                            <button onClick={() => setShowMusicSearch(true)} className={`text-muted-foreground hover:text-foreground ${selectedMusic ? 'text-violet-500' : ''}`}>
                                <Music size={24} />
                            </button>
                        )}
                        <button onClick={() => { onClose(); audioRef.current.pause(); }} className="text-muted-foreground hover:text-foreground"><X size={24} /></button>
                    </div>
                </div>

                {/* Main Content Area */}
                {showMusicSearch ? (
                    <div className="flex-1 flex flex-col bg-background overflow-hidden">
                        <div className="p-4 border-b border-border shrink-0">
                            <form onSubmit={handleSearchMusic} className="flex gap-2">
                                <input
                                    value={musicQuery}
                                    onChange={(e) => setMusicQuery(e.target.value)}
                                    placeholder="Search songs..."
                                    className="flex-1 bg-secondary text-foreground p-2 rounded-lg outline-none text-sm"
                                    autoFocus
                                />
                                <button type="submit" className="bg-violet-600 p-2 rounded-lg text-white">
                                    <Search size={18} />
                                </button>
                            </form>
                        </div>
                        <div className="px-4 py-2 border-b border-border bg-muted/30">
                            <h4 className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                                {musicQuery ? 'Search Results' : 'Trending Hits'}
                            </h4>
                        </div>
                        <div className="flex-1 overflow-y-auto p-2 space-y-2">
                            {musicResults.map(track => (
                                <div key={track.trackId} className="flex items-center gap-3 p-2 hover:bg-muted/50 rounded-lg">
                                    <img src={track.artworkUrl60} className="w-10 h-10 rounded" alt="" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-foreground text-sm font-medium truncate">{track.trackName}</p>
                                        <p className="text-muted-foreground text-xs truncate">{track.artistName}</p>
                                    </div>
                                    <button onClick={() => togglePreview(track.previewUrl)}>
                                        {playingPreview === track.previewUrl ? <Pause size={18} className="text-violet-500" /> : <Play size={18} className="text-muted-foreground" />}
                                    </button>
                                    <button onClick={() => handleSelectMusic(track)} className="bg-muted hover:bg-muted/80 px-3 py-1 rounded text-xs text-foreground">
                                        Add
                                    </button>
                                </div>
                            ))}
                        </div>
                        <button onClick={() => { setShowMusicSearch(false); audioRef.current.pause(); setPlayingPreview(null); }} className="m-4 text-muted-foreground hover:text-foreground text-sm">Cancel</button>
                    </div>
                ) : (
                    <div className="flex-1 p-4 flex flex-col items-center justify-center bg-background relative">
                        {/* Music Sticker */}
                        {selectedMusic && (
                            <div className="absolute top-4 left-4 z-20 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-2 border border-white/10">
                                <Music size={14} className="text-violet-400" />
                                <div className="max-w-[150px] overflow-hidden">
                                    <div className="whitespace-nowrap animate-marquee text-xs text-white">
                                        {selectedMusic.title} • {selectedMusic.artist}
                                    </div>
                                </div>
                                <button onClick={() => { setSelectedMusic(null); audioRef.current.pause(); }}><X size={12} className="text-gray-300" /></button>
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
                                className="w-full h-64 border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-violet-500 hover:bg-muted/30 transition-all gap-2"
                            >
                                <div className="flex gap-2 text-muted-foreground">
                                    <Image size={32} />
                                    <Video size={32} />
                                </div>
                                <p className="text-muted-foreground text-sm">Click to upload photo or video</p>
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
                    <div className="p-4 bg-popover border-t border-border">
                        <input
                            value={caption}
                            onChange={(e) => setCaption(e.target.value)}
                            placeholder="Add a caption..."
                            className="w-full bg-secondary text-foreground p-3 rounded-lg mb-4 outline-none focus:ring-1 focus:ring-violet-500 text-sm"
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
