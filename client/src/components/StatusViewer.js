
import { useState, useEffect, useContext, useCallback, useRef } from 'react';
import { X, Trash2, Music, Loader2, Volume2, VolumeX } from 'lucide-react';
import { StatusContext } from '../context/StatusContext';
import { AuthContext } from '../context/authContext';

const StatusViewer = ({ startUserId, onClose }) => {
    const { statuses, viewStatus, deleteStatus } = useContext(StatusContext);
    const { authUser } = useContext(AuthContext);

    const [currentUserIndex, setCurrentUserIndex] = useState(() =>
        statuses.findIndex(g => g.user._id === startUserId)
    );
    const [currentStatusIndex, setCurrentStatusIndex] = useState(0);
    const [progress, setProgress] = useState(0);
    const [elapsedTime, setElapsedTime] = useState(0);
    // const [totalDuration, setTotalDuration] = useState(0); // Unused
    const [isVideoLoading, setIsVideoLoading] = useState(true);
    const [isMuted, setIsMuted] = useState(false);

    // Audio Ref
    const audioRef = useRef(new Audio());
    const videoRef = useRef(null);

    const currentUserGroup = statuses[currentUserIndex];
    const currentStatus = currentUserGroup?.statuses[currentStatusIndex];

    const handleNext = useCallback(() => {
        if (!currentUserGroup) return;
        if (currentStatusIndex < currentUserGroup.statuses.length - 1) {
            setCurrentStatusIndex(prev => prev + 1);
        } else {
            if (currentUserIndex < statuses.length - 1) {
                setCurrentUserIndex(prev => prev + 1);
                setCurrentStatusIndex(0);
            } else {
                onClose();
            }
        }
    }, [currentStatusIndex, currentUserGroup, currentUserIndex, statuses.length, onClose]);

    const handlePrev = useCallback(() => {
        if (!currentUserGroup) return;
        if (currentStatusIndex > 0) {
            setCurrentStatusIndex(prev => prev - 1);
        } else {
            if (currentUserIndex > 0) {
                setCurrentUserIndex(prev => prev - 1);
                setCurrentStatusIndex(statuses[currentUserIndex - 1].statuses.length - 1);
            } else {
                onClose();
            }
        }
    }, [currentStatusIndex, currentUserIndex, statuses, onClose, currentUserGroup]);

    useEffect(() => {
        if (!currentStatus || !currentUserGroup) return;

        viewStatus(currentStatus._id);

        const isVideo = currentStatus.mediaType === 'video';
        const hasMusic = !!currentStatus.music?.url;
        const duration = isVideo ? 0 : 5000;

        setProgress(0);
        setElapsedTime(0);
        // setTotalDuration(duration / 1000); // Default 5s
        setIsVideoLoading(true); // Reset loading state
        setIsMuted(!!currentStatus.music?.url); // Initialize mute based on music
        let frameId;

        // Music Playback Setup
        const audio = audioRef.current;
        if (hasMusic) {
            audio.src = currentStatus.music.url;
            audio.volume = 0.5;
            audio.play().catch(e => console.log("Audio play failed"));
        } else {
            audio.pause();
            audio.currentTime = 0;
        }

        // Logic Routing: Who drives the progress?
        // 1. Video: Video element handles it via onEnded in JSX.
        // 2. Image + Music: Audio handles it via onended event here.
        // 3. Image + No Music: RequestAnimationFrame handles it here.

        const handleAudioEnd = () => {
            handleNext();
        };

        const handleAudioUpdate = () => {
            if (audio.duration) {
                setElapsedTime(audio.currentTime);
                // setTotalDuration(audio.duration);
                setProgress((audio.currentTime / audio.duration) * 100);
            }
        };

        if (isVideo) {
            // Video component onTimeUpdate handles logic
        } else if (hasMusic) {
            // Image + Music
            audio.addEventListener('ended', handleAudioEnd);
            audio.addEventListener('timeupdate', handleAudioUpdate);
        } else {
            // Image + No Music
            // setTotalDuration(5);
            let startTime = Date.now();
            const animate = () => {
                const elapsed = Date.now() - startTime;
                const p = Math.min((elapsed / duration) * 100, 100);
                setProgress(p);
                setElapsedTime(elapsed / 1000);

                if (elapsed < duration) {
                    frameId = requestAnimationFrame(animate);
                } else {
                    handleNext();
                }
            };
            frameId = requestAnimationFrame(animate);
        }

        return () => {
            cancelAnimationFrame(frameId);
            audio.pause();
            audio.removeEventListener('ended', handleAudioEnd);
            audio.removeEventListener('timeupdate', handleAudioUpdate);
        };
    }, [currentStatus, currentUserGroup, handleNext, viewStatus]);

    if (!currentUserGroup || !currentStatus) {
        return null;
    }

    const handleDelete = async () => {
        if (window.confirm("Delete this status?")) {
            await deleteStatus(currentStatus._id);
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 h-[100dvh] z-[100] bg-black flex items-center justify-center overflow-hidden">
            {/* Time Timer */}
            <div className="absolute top-1 right-2 z-30 text-[10px] font-mono font-medium text-white/80 drop-shadow-md">
                {Math.floor(elapsedTime / 60)}:{String(Math.floor(elapsedTime % 60)).padStart(2, '0')}
            </div>

            {/* Progress Bars */}
            <div className="absolute top-4 left-0 w-full px-2 flex gap-1 z-20">
                {currentUserGroup.statuses.map((stat, idx) => (
                    <div key={stat._id} className="h-1 flex-1 bg-gray-700 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-white transition-all duration-100 linear"
                            style={{
                                width: idx < currentStatusIndex ? '100%' :
                                    idx === currentStatusIndex ? `${progress}% ` : '0%'
                            }}
                        />
                    </div>
                ))}
            </div>

            {/* Header */}
            <div className="absolute top-8 left-0 w-full px-4 flex justify-between items-center z-20">
                <div className="flex items-center gap-3">
                    <img src={currentUserGroup.user.profilePic || "/avatar.png"} alt="User" className="w-10 h-10 rounded-full border border-gray-500" />
                    <div className="flex flex-col">
                        <span className="text-white font-semibold text-sm">{currentUserGroup.user.fullName}</span>
                        <span className="text-gray-400 text-xs">{new Date(currentStatus.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                </div>
                <div className="flex gap-4">
                    {authUser._id === currentUserGroup.user._id && (
                        <button onClick={handleDelete} className="text-white hover:text-red-500"><Trash2 size={20} /></button>
                    )}
                    <button onClick={onClose} className="text-white"><X size={28} /></button>
                </div>
            </div>

            {/* Music Indicator */}
            {currentStatus.music?.url && (
                <div className="absolute top-20 left-4 z-20 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-2 border border-white/10 animate-fade-in">
                    <Music size={14} className="text-violet-400 animate-pulse" />
                    <div className="max-w-[150px] overflow-hidden">
                        <div className="whitespace-nowrap animate-marquee text-xs text-white font-medium">
                            {currentStatus.music.title} • {currentStatus.music.artist}
                        </div>
                    </div>
                </div>
            )}

            {/* Navigation Areas */}
            <div className="absolute inset-0 flex z-10">
                <div className="w-1/3 h-full" onClick={handlePrev}></div>
                <div className="w-1/3 h-full" onClick={handleNext}></div>
                <div className="w-1/3 h-full" onClick={handleNext}></div>
            </div>

            {/* Content with Blurred Background */}
            <div className="w-full h-full flex items-center justify-center bg-black relative overflow-hidden">
                {/* Twisted Blur Background */}
                <div className="absolute inset-0 z-0 opacity-30 blur-3xl scale-125 pointer-events-none">
                    {currentStatus.mediaType === 'video' ? (
                        <video src={currentStatus.mediaUrl} className="w-full h-full object-cover" muted />
                    ) : (
                        <img src={currentStatus.mediaUrl} alt="" className="w-full h-full object-cover" />
                    )}
                </div>

                {/* Main Content */}
                <div className="relative z-10 w-full h-full flex items-center justify-center p-2 md:p-0">
                    {currentStatus.mediaType === 'video' ? (
                        <div className="relative w-full h-full flex items-center justify-center">
                            {isVideoLoading && (
                                <div className="absolute inset-0 flex items-center justify-center z-10">
                                    <Loader2 size={40} className="text-white/80 animate-spin" />
                                </div>
                            )}

                            <video
                                ref={videoRef}
                                src={currentStatus.mediaUrl}
                                className={`w-full h-full object-contain shadow-2xl rounded-lg transition-opacity duration-300 ${isVideoLoading ? 'opacity-0' : 'opacity-100'}`}
                                autoPlay
                                playsInline
                                muted={isMuted}
                                onLoadedData={() => setIsVideoLoading(false)}
                                onWaiting={() => setIsVideoLoading(true)}
                                onPlaying={() => setIsVideoLoading(false)}
                                onEnded={handleNext}
                                onTimeUpdate={(e) => {
                                    const p = (e.target.currentTime / e.target.duration) * 100;
                                    setProgress(p);
                                    setElapsedTime(e.target.currentTime);
                                    // setTotalDuration(e.target.duration);
                                }}
                            />

                            {/* Mute Toggle Button */}
                            <button
                                onClick={(e) => { e.stopPropagation(); setIsMuted(!isMuted); }}
                                className="absolute bottom-6 right-4 z-20 bg-black/50 p-2 rounded-full text-white hover:bg-black/70 backdrop-blur-sm transition-all"
                            >
                                {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                            </button>
                        </div>
                    ) : (
                        <>
                            {isVideoLoading && (
                                <div className="absolute inset-0 flex items-center justify-center z-10">
                                    <Loader2 size={40} className="text-white/80 animate-spin" />
                                </div>
                            )}
                            <img
                                src={currentStatus.mediaUrl}
                                onLoad={() => setIsVideoLoading(false)}
                                alt="Status"
                                className={`w-full h-full object-contain shadow-2xl rounded-lg transition-opacity duration-300 ${isVideoLoading ? 'opacity-0' : 'opacity-100'}`}
                            />
                        </>
                    )}
                </div>
            </div>

            {/* Caption */}
            {currentStatus.caption && (
                <div className="absolute bottom-10 left-0 w-full p-4 text-center z-20">
                    <p className="text-white bg-black/50 p-2 rounded-lg inline-block backdrop-blur-sm text-sm">{currentStatus.caption}</p>
                </div>
            )}
        </div>
    );
};

export default StatusViewer;
