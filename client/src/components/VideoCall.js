import React, { useContext, useState, useRef, useEffect } from 'react';
import { CallContext } from '../context/CallContext';
import { Mic, MicOff, Video, VideoOff, PhoneOff, MonitorUp, Maximize, Minimize, Minimize2, Disc, Square } from 'lucide-react';

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

    // Constants for sizing
    const PIP_WIDTH_DESKTOP = 250;
    const PIP_WIDTH_MOBILE = 130;

    // Advanced Draggable Logic
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const positionRef = useRef({ x: 0, y: 0 });
    const isDragging = useRef(false);
    const dragOffset = useRef({ x: 0, y: 0 });
    const longPressTimer = useRef(null);

    // Helper to update both state and ref
    const updatePosition = (newPos) => {
        positionRef.current = newPos;
        setPosition(newPos);
    };

    // Initialize position
    useEffect(() => {
        const handleResize = () => {
            const pipWidth = window.innerWidth > 768 ? PIP_WIDTH_DESKTOP : PIP_WIDTH_MOBILE;

            if (isPip) {
                // Keep within bounds
                updatePosition({
                    x: Math.min(Math.max(16, positionRef.current.x), window.innerWidth - pipWidth - 16),
                    y: Math.min(Math.max(16, positionRef.current.y), window.innerHeight - 200)
                });
            } else {
                updatePosition({
                    x: window.innerWidth - pipWidth - 20,
                    y: window.innerHeight - (window.innerWidth > 768 ? 260 : 200)
                });
            }
        };

        window.addEventListener('resize', handleResize);

        // Initial set
        if (typeof window !== 'undefined') {
            const pipWidth = window.innerWidth > 768 ? PIP_WIDTH_DESKTOP : PIP_WIDTH_MOBILE;
            updatePosition({
                x: window.innerWidth - pipWidth - 20,
                y: window.innerHeight - (window.innerWidth > 768 ? 260 : 200)
            });
        }

        return () => window.removeEventListener('resize', handleResize);
    }, [callState, isPip]);

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
            updatePosition({ x: newX, y: newY });
        }
    };

    const handleEnd = () => {
        if (!isDragging.current) return;
        isDragging.current = false;

        // Snap to edge logic using synchronous Ref value
        if (window.innerWidth > 0) {
            const windowWidth = window.innerWidth;
            const elementWidth = window.innerWidth > 768 ? PIP_WIDTH_DESKTOP : PIP_WIDTH_MOBILE;
            const midPoint = positionRef.current.x + (elementWidth / 2);

            let finalX;
            if (midPoint < windowWidth / 2) {
                finalX = 16; // Left margin
            } else {
                finalX = windowWidth - elementWidth - 16; // Right margin
            }

            // Keep Y within bounds
            const finalY = Math.max(16, Math.min(window.innerHeight - 200, positionRef.current.y));

            updatePosition({ x: finalX, y: finalY });
        }
    };

    // Mouse Events
    const handleMouseDown = (e) => {
        if (e.target.closest('button')) return;
        handleStart(e.clientX, e.clientY);

        const handleWindowMouseMove = (moveEvent) => {
            moveEvent.preventDefault();
            handleMove(moveEvent.clientX, moveEvent.clientY);
        };

        const handleWindowMouseUp = () => {
            handleEnd();
            window.removeEventListener('mousemove', handleWindowMouseMove);
            window.removeEventListener('mouseup', handleWindowMouseUp);
        };

        window.addEventListener('mousemove', handleWindowMouseMove);
        window.addEventListener('mouseup', handleWindowMouseUp);
    };

    // Touch Events
    const handleTouchStart = (e) => {
        if (!isPip || e.target.closest('button')) return;
        const touch = e.touches[0];

        // Tap and Hold Logic
        longPressTimer.current = setTimeout(() => {
            if (navigator.vibrate) navigator.vibrate(50);
            handleStart(touch.clientX, touch.clientY);
        }, 300);
    };

    const handleTouchMove = (e) => {
        if (isDragging.current) {
            e.preventDefault();
            const touch = e.touches[0];
            handleMove(touch.clientX, touch.clientY);
        } else {
            clearTimeout(longPressTimer.current);
        }
    };

    const handleTouchEnd = () => {
        clearTimeout(longPressTimer.current);
        handleEnd();
    };

    const toggleFullScreen = () => {
        if (!containerRef.current) return;
        if (!document.fullscreenElement) {
            containerRef.current.requestFullscreen().catch(err => {
                console.error(`Error attempting to enable full-screen mode: ${err.message}`);
            });
            setIsFullScreen(true);
        } else {
            document.exitFullscreen();
            setIsFullScreen(false);
        }
    };

    const togglePip = () => {
        // Reset position when entering PiP for the first time if needed, 
        // but state is improved to be persistent or smart.
        if (!isPip) {
            const pipWidth = window.innerWidth > 768 ? PIP_WIDTH_DESKTOP : PIP_WIDTH_MOBILE;
            setPosition({
                x: window.innerWidth - pipWidth - 20,
                y: window.innerHeight - 200
            });
        }
        setIsPip(!isPip);
        setIsFullScreen(false);
    };

    if (callState === 'idle' || callState === 'incoming') return null;

    return (
        <div
            ref={containerRef}
            className={`fixed z-50 transition-all duration-300 ${isPip
                ? 'pointer-events-none'
                : 'inset-0 bg-gray-900 bg-opacity-95 flex flex-col items-center justify-center p-4' // Overlay mode
                } ${isFullScreen ? 'p-0' : ''}`}
        >
            <div
                onMouseDown={handleMouseDown}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                style={isPip ? {
                    transform: `translate(${position.x}px, ${position.y}px)`,
                    width: window.innerWidth > 768 ? `${PIP_WIDTH_DESKTOP}px` : `${PIP_WIDTH_MOBILE}px`, // Responsive width
                    position: 'fixed',
                    left: 0,
                    top: 0,
                    touchAction: 'none' // Important for touch dragging
                } : {}}
                className={`relative overflow-hidden bg-black shadow-2xl ${isPip
                    ? `aspect-[3/4] rounded-xl border-2 border-gray-700 pointer-events-auto shadow-2xl hover:shadow-violet-500/20 ${isDragging.current ? 'scale-105 z-50 ring-2 ring-violet-500 cursor-grabbing' : 'transition-all duration-500 ease-in-out cursor-grab'}`
                    : isFullScreen
                        ? 'w-full h-full rounded-none'
                        : 'w-full max-w-6xl aspect-video rounded-xl border border-gray-800'
                    }`}
            >
                {/* Header/Grab Handle for PiP */}
                {isPip && (
                    <div className={`absolute top-0 left-0 right-0 z-20 h-8 flex justify-center items-center ${isDragging ? 'bg-violet-500/20' : ''}`}>
                        <div className="w-12 h-1 bg-gray-600 rounded-full/50 backdrop-blur-sm mt-2" />
                    </div>
                )}

                {/* Remote Video */}
                {callState === 'active' && (
                    <video
                        ref={remoteVideoRef}
                        playsInline
                        autoPlay
                        className={`w-full h-full ${isPip ? 'object-cover' : 'object-contain'}`}
                    />
                )}

                {/* Fallback Display */}
                {((callState === 'outgoing') || (callState === 'active' && (!userVideo || userVideo.getVideoTracks().length === 0))) && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                        <div className={`text-center animate-pulse ${isPip ? 'scale-50' : ''}`}>
                            <div className="w-24 h-24 md:w-32 md:h-32 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl text-white font-bold shadow-lg ring-4 ring-gray-800">
                                {callDetails?.calleeName?.charAt(0) || callDetails?.callerName?.charAt(0)}
                            </div>
                            <h3 className="text-white text-2xl md:text-3xl font-bold mb-2 tracking-tight">
                                {callState === 'outgoing' ? 'Calling...' : 'Audio Call'}
                            </h3>
                            <p className="text-gray-400 text-lg">
                                {callDetails?.calleeName || callDetails?.callerName}
                            </p>
                        </div>
                    </div>
                )}

                {/* My Video (PiP in Full View, Hidden in Mini PiP mode to save space/confusion usually, or kept small) */}
                {/* User asked for proper picture in picture mode. Standard is MyVideo is small corner in FullView. In PiP mode, usually we only see Remote Video unless we toggle. 
                    Let's keep MyVideo hidden in PiP mode to maximize RemoteVideo visibility on small screens, OR make it very small. 
                    The current code had it bottom-16. Let's keep it but ensure size is responsive.
                */}
                <div className={`absolute bg-gray-800 rounded-lg overflow-hidden border-2 border-gray-700 shadow-2xl transition-all z-10 ${!isScreenSharing && !callDetails?.isVideo ? 'hidden' : ''
                    } ${isPip
                        ? 'w-16 bottom-2 right-2 border pointer-events-none' // Smaller in PiP
                        : 'bottom-4 right-4 md:bottom-6 md:right-6 w-32 md:w-48 lg:w-64 aspect-video hover:scale-105'
                    }`}>
                    <video
                        ref={myVideo}
                        playsInline
                        muted
                        autoPlay
                        className={`w-full h-full object-cover transform scale-x-[-1]`}
                    />
                </div>

                {/* Controls Overlay */}
                <div className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent transition-all duration-300 flex justify-center gap-2 md:gap-8 ${isPip
                    ? 'p-2 opacity-0 hover:opacity-100'
                    : `p-6 opacity-0 hover:opacity-100 focus-within:opacity-100 ${isFullScreen ? '' : 'rounded-b-xl'}`
                    }`}>

                    <button
                        onClick={toggleMute}
                        className={`transition-all backdrop-blur-md rounded-full text-white flex items-center justify-center ${isPip ? 'p-1.5 w-7 h-7' : 'p-3 md:p-4'
                            } ${isMuted ? 'bg-red-500/90 hover:bg-red-600' : 'bg-gray-700/60 hover:bg-gray-600/80'}`}
                        title={isMuted ? "Unmute" : "Mute"}
                    >
                        {isMuted ? <MicOff size={isPip ? 12 : 24} /> : <Mic size={isPip ? 12 : 24} />}
                    </button>

                    <button
                        onClick={toggleVideo}
                        className={`transition-all backdrop-blur-md rounded-full text-white flex items-center justify-center ${isPip ? 'p-1.5 w-7 h-7' : 'p-3 md:p-4'
                            } ${isVideoOff ? 'bg-red-500/90 hover:bg-red-600' : 'bg-gray-700/60 hover:bg-gray-600/80'}`}
                        title={isVideoOff ? "Start Video" : "Stop Video"}
                    >
                        {isVideoOff ? <VideoOff size={isPip ? 12 : 24} /> : <Video size={isPip ? 12 : 24} />}
                    </button>

                    <button
                        onClick={isRecording ? stopRecording : startRecording}
                        className={`transition-all backdrop-blur-md rounded-full text-white flex items-center justify-center ${isPip ? 'p-1.5 w-7 h-7' : 'p-3 md:p-4'
                            } ${isRecording ? 'bg-red-500/90 hover:bg-red-600 animate-pulse' : 'bg-gray-700/60 hover:bg-gray-600/80'}`}
                        title={isRecording ? "Stop Recording" : "Start Recording"}
                    >
                        {isRecording ? <Square size={isPip ? 12 : 24} /> : <Disc size={isPip ? 12 : 24} />}
                    </button>

                    <button
                        onClick={() => leaveCall(true)}
                        className={`bg-red-600 hover:bg-red-700 text-white transition-all transform hover:scale-110 shadow-lg rounded-full flex items-center justify-center ${isPip ? 'p-1.5 w-7 h-7' : 'p-3 md:p-4'
                            }`}
                        title="End Call"
                    >
                        <PhoneOff size={isPip ? 12 : 28} />
                    </button>

                    {!isPip && (
                        <>
                            <button
                                onClick={toggleScreenShare}
                                className={`p-3 md:p-4 rounded-full transition-all backdrop-blur-md ${isScreenSharing ? 'bg-blue-600/90 hover:bg-blue-700 text-white shadow-blue-500/20 shadow-lg' : 'bg-gray-700/60 hover:bg-gray-600/80 text-white'}`}
                                title="Share Screen"
                            >
                                <MonitorUp size={24} />
                            </button>

                            <button
                                onClick={toggleFullScreen}
                                className="p-3 md:p-4 rounded-full bg-gray-700/60 hover:bg-gray-600/80 text-white transition-all backdrop-blur-md"
                                title={isFullScreen ? "Exit Full Screen" : "Full Screen"}
                            >
                                {isFullScreen ? <Minimize size={24} /> : <Maximize size={24} />}
                            </button>
                        </>
                    )}

                    {/* PiP Toggle Button */}
                    <button
                        onClick={togglePip}
                        className={`transition-all backdrop-blur-md rounded-full text-white flex items-center justify-center bg-gray-700/60 hover:bg-gray-600/80 ${isPip ? 'absolute top-1 right-1 p-1 w-5 h-5 bg-black/50 hover:bg-black/80' : 'p-3 md:p-4'
                            }`}
                        title={isPip ? "Expand" : "Picture in Picture"}
                    >
                        {isPip ? <Maximize size={10} /> : <Minimize2 size={24} />}
                    </button>
                </div>
            </div>
        </div>
    );
};
export default VideoCall;
