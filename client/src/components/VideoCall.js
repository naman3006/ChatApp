import React, { useContext, useState, useRef, useEffect } from 'react';
import { CallContext } from '../context/CallContext';
import { Mic, MicOff, Video, VideoOff, PhoneOff, MonitorUp, Maximize, Minimize, Minimize2, Disc, Square, Users, Layout, Smartphone } from 'lucide-react';
import assets from '../chat-assets/assets';

const VideoCall = () => {
    const {
        callState,
        callDetails,
        myVideo,
        userVideo,
        remoteVideoRef,
        leaveCall,
        toggleMute,
        toggleVideo,
        isMuted,
        isVideoOff,
        toggleScreenShare,
        isScreenSharing,
        isRecording,
        startRecording,
        stopRecording
    } = useContext(CallContext);

    const [isFullScreen, setIsFullScreen] = useState(false);
    const [isPip, setIsPip] = useState(false);
    const containerRef = useRef(null);

    // Initial PIP Position (Bottom Right default)
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const positionRef = useRef({ x: 0, y: 0 });
    const isDragging = useRef(false);
    const dragOffset = useRef({ x: 0, y: 0 });
    const longPressTimer = useRef(null);

    const isMobile = window.innerWidth <= 768;

    // Helper to update both state and ref for synchronous access
    const updatePosition = (newPos) => {
        positionRef.current = newPos;
        setPosition(newPos);
    };

    // Calculate initial position based on window size
    const getInitialPosition = () => {
        const width = window.innerWidth;
        const height = window.innerHeight;
        // Desktop: Bottom right with margin. Mobile: Bottom right with smaller margin.
        const pipWidth = width > 768 ? 320 : 140; // Approx width
        const pipHeight = width > 768 ? 180 : 200; // Approx height

        return {
            x: width - pipWidth - 24,
            y: height - pipHeight - 24
        };
    };

    // Set Initial Position on Mount/Resize logic
    useEffect(() => {
        if (callState === 'active' && !isPip) {
            // Reset to centered or default view when becoming active not in PIP
        }
        // If entering PIP, we might want to default to a corner if not set
        if (isPip && position.x === 0 && position.y === 0) {
            updatePosition(getInitialPosition());
        }
    }, [isPip, callState]);


    const handleStart = (clientX, clientY) => {
        if (!isPip) return;
        const rect = containerRef.current.firstElementChild.getBoundingClientRect();
        dragOffset.current = {
            x: clientX - rect.left,
            y: clientY - rect.top
        };
        isDragging.current = true;
    };

    const handleMove = (clientX, clientY) => {
        if (isDragging.current && isPip) {
            const newX = clientX - dragOffset.current.x;
            const newY = clientY - dragOffset.current.y;
            // Immediate update for responsiveness
            updatePosition({ x: newX, y: newY });
        }
    };

    const handleEnd = () => {
        if (!isDragging.current) return;
        isDragging.current = false;

        // Snap to edges logic
        const { x, y } = positionRef.current;
        const width = window.innerWidth;
        const height = window.innerHeight;
        const elWidth = isMobile ? 140 : 320; // Estimated widths
        const elHeight = isMobile ? 220 : 180;

        let finalX = x;
        let finalY = y;

        // Simple Boundary Check
        if (finalX < 10) finalX = 10;
        if (finalX + elWidth > width - 10) finalX = width - elWidth - 10;
        if (finalY < 10) finalY = 10;
        if (finalY + elHeight > height - 10) finalY = height - elHeight - 10;

        // Optional: Snap to closest side horizontally
        if (finalX + elWidth / 2 < width / 2) {
            finalX = 16; // Snap Left
        } else {
            finalX = width - elWidth - 16; // Snap Right
        }

        updatePosition({ x: finalX, y: finalY });
    };

    // Mouse Events
    const handleMouseDown = (e) => {
        if (e.target.closest('button')) return;
        handleStart(e.clientX, e.clientY);

        const onMouseMove = (ev) => {
            ev.preventDefault();
            handleMove(ev.clientX, ev.clientY);
        };
        const onMouseUp = () => {
            handleEnd();
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
        };
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
    };

    // Touch Events
    const handleTouchStart = (e) => {
        if (!isPip || e.target.closest('button')) return;
        const touch = e.touches[0];
        // Short delay to differentiate tap vs drag if needed, or just drag immediately
        handleStart(touch.clientX, touch.clientY);
    };

    const handleTouchMove = (e) => {
        if (isDragging.current) {
            e.preventDefault(); // Prevent scrolling
            const touch = e.touches[0];
            handleMove(touch.clientX, touch.clientY);
        }
    };

    const toggleFullScreen = () => {
        if (!containerRef.current) return;
        if (!document.fullscreenElement) {
            containerRef.current.requestFullscreen().catch(err => console.error(err));
            setIsFullScreen(true);
        } else {
            document.exitFullscreen();
            setIsFullScreen(false);
        }
    };

    const togglePipMode = () => {
        if (!isPip) {
            // Entering PIP
            updatePosition(getInitialPosition());
        }
        setIsPip(!isPip);
        setIsFullScreen(false);
    };

    if (callState === 'idle' || callState === 'incoming') return null;

    const isOutgoing = callState === 'outgoing';

    return (
        <div
            ref={containerRef}
            className={`fixed z-[9999] transition-all duration-300 ease-in-out
                ${isPip ? 'pointer-events-none' : 'inset-0 bg-black/95 flex flex-col items-center justify-center'}
            `}
        >
            <div
                onMouseDown={handleMouseDown}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleEnd}
                style={isPip ? {
                    transform: `translate(${position.x}px, ${position.y}px)`,
                    position: 'fixed',
                    left: 0,
                    top: 0
                } : { width: '100%', height: '100%' }}
                className={`
                    relative overflow-hidden shadow-2xl transition-all
                    ${isPip
                        ? `pointer-events-auto rounded-2xl bg-gray-900 border border-white/10 ${isDragging.current ? 'scale-105 shadow-violet-500/50 cursor-grabbing' : 'cursor-grab'} 
                           w-[140px] h-[200px] sm:w-[320px] sm:h-[180px]` /* Mobile: Portraitish, Desktop: Landscape */
                        : 'w-full h-full'
                    }
                `}
            >
                {/* Background/Placeholder */}
                <div className="absolute inset-0 bg-gradient-to-br from-gray-900 to-black z-0 flex flex-col items-center justify-center">
                    {/* Show avatar if no video or outgoing */}
                    {(isOutgoing || !userVideo || userVideo.getVideoTracks().length === 0) && (
                        <div className={`flex flex-col items-center justify-center animate-pulse ${isPip ? 'scale-50' : ''}`}>
                            <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full overflow-hidden border-4 border-violet-500/30 shadow-[0_0_30px_rgba(139,92,246,0.3)] mb-4 relative">
                                <img
                                    src={callDetails?.calleePic || callDetails?.callerPic || assets.avatar_icon}
                                    className="w-full h-full object-cover"
                                    alt="User"
                                />
                                <div className="absolute inset-0 bg-violet-500/10 mix-blend-overlay"></div>
                            </div>
                            <h3 className="text-white font-bold text-xl sm:text-2xl tracking-tight text-center px-4">
                                {isOutgoing ? "Calling..." : (callDetails?.calleeName || callDetails?.callerName)}
                            </h3>
                            <p className="text-violet-300/70 text-sm mt-1">
                                {isOutgoing ? "Ringing" : "Audio Call"}
                            </p>
                        </div>
                    )}
                </div>

                {/* Remote Video */}
                {callState === 'active' && (
                    <video
                        ref={remoteVideoRef}
                        playsInline
                        autoPlay
                        className={`absolute inset-0 w-full h-full z-10 ${isPip ? 'object-cover' : 'object-contain'} bg-transparent`}
                    />
                )}

                {/* My Video - Mini View */}
                {/* Only show if I have video on. Hidden in very small PIP to avoid clutter unless screen sharing */}
                {(!isVideoOff || isScreenSharing) && (
                    <div className={`absolute z-20 rounded-xl overflow-hidden border border-white/20 shadow-lg bg-black/50 backdrop-blur-sm transition-all duration-300
                        ${isPip
                            ? 'w-1/3 bottom-2 right-2 opacity-80 hover:opacity-100' // Tiny corner in PIP
                            : 'w-32 sm:w-48 bottom-24 right-4 sm:bottom-8 sm:right-8 hover:scale-105 hover:border-violet-500/50' // Normal usage
                        }
                    `}>
                        <video
                            ref={myVideo}
                            playsInline
                            muted
                            autoPlay
                            className="w-full h-full object-cover scale-x-[-1]"
                        />
                    </div>
                )}





                {/* Controls - Hidden in PIP unless hovered (desktop) or tapped (mobile - hard to do, usually just simple expand btn) */}
                {!isPip && (
                    <div className="absolute bottom-0 inset-x-0 z-30 p-6 sm:p-8 bg-gradient-to-t from-black via-black/60 to-transparent flex flex-col gap-4">

                        {/* Actions Bar */}
                        <div className="flex items-center justify-center gap-4 sm:gap-6">

                            <button onClick={toggleMute} className={`p-4 rounded-full backdrop-blur-xl transition-all duration-300 transform active:scale-95 shadow-lg ${isMuted ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-gray-800/60 text-white hover:bg-gray-700/80 border border-white/10'}`}>
                                {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
                            </button>

                            <button onClick={toggleVideo} className={`p-4 rounded-full backdrop-blur-xl transition-all duration-300 transform active:scale-95 shadow-lg ${isVideoOff ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-gray-800/60 text-white hover:bg-gray-700/80 border border-white/10'}`}>
                                {isVideoOff ? <VideoOff size={24} /> : <Video size={24} />}
                            </button>

                            <button onClick={leaveCall} className="p-4 rounded-full bg-red-600 text-white hover:bg-red-700 backdrop-blur-xl transition-all duration-300 transform active:scale-95 shadow-lg shadow-red-600/20 px-8">
                                <PhoneOff size={28} />
                            </button>

                            <button onClick={isRecording ? stopRecording : startRecording} className={`md:flex hidden p-4 rounded-full backdrop-blur-xl transition-all duration-300 transform active:scale-95 shadow-lg ${isRecording ? 'bg-red-500 text-white animate-pulse' : 'bg-gray-800/60 text-white hover:bg-gray-700/80 border border-white/10'}`}>
                                {isRecording ? <Square size={24} /> : <Disc size={24} />}
                            </button>

                            <button onClick={toggleScreenShare} className={`md:flex hidden p-4 rounded-full backdrop-blur-xl transition-all duration-300 transform active:scale-95 shadow-lg ${isScreenSharing ? 'bg-blue-600 text-white' : 'bg-gray-800/60 text-white hover:bg-gray-700/80 border border-white/10'}`}>
                                <MonitorUp size={24} />
                            </button>
                        </div>
                    </div>
                )}

                {/* Top Controls (PIP / Fullscreen) - Only visible when NOT in PIP or on hover in PIP */}
                <div className={`absolute top-4 right-4 z-30 flex gap-2 transition-opacity duration-300 ${isPip ? 'opacity-0 group-hover:opacity-100 hover:opacity-100' : 'opacity-100'}`}>
                    {!isPip && (
                        <button onClick={toggleFullScreen} className="p-2 rounded-full bg-black/40 text-white hover:bg-black/60 backdrop-blur-md border border-white/10">
                            {isFullScreen ? <Minimize size={20} /> : <Maximize size={20} />}
                        </button>
                    )}
                    <button onClick={togglePipMode} className="p-2 rounded-full bg-black/40 text-white hover:bg-black/60 backdrop-blur-md border border-white/10 shadow-lg">
                        {isPip ? <Maximize size={16} /> : <Minimize2 size={20} />}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default VideoCall;
