import React, { useContext, useState, useRef, useEffect } from 'react';
import { CallContext } from '../context/CallContext';
import { Mic, MicOff, Video, VideoOff, PhoneOff, MonitorUp, Maximize, Minimize, Move, Minimize2 } from 'lucide-react';

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
        isScreenSharing
    } = useContext(CallContext);

    const [isFullScreen, setIsFullScreen] = useState(false);
    const [isPip, setIsPip] = useState(false);
    const containerRef = useRef(null);

    // Draggable Logic
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const dragStartPos = useRef({ x: 0, y: 0 });

    useEffect(() => {
        // Set initial position to bottom-right when component mounts
        if (typeof window !== 'undefined') {
            setPosition({
                x: window.innerWidth - 340, // standard width + margin
                y: window.innerHeight - 260
            });
        }
    }, [callState]); // Reset/Ensure position when call starts

    const handleMouseDown = (e) => {
        if (!isPip) return;
        if (e.target.closest('button')) return; // Don't drag if clicking buttons

        setIsDragging(true);
        dragStartPos.current = {
            x: e.clientX - position.x,
            y: e.clientY - position.y
        };
    };

    useEffect(() => {
        const handleMouseMove = (e) => {
            if (isDragging && isPip) {
                e.preventDefault();
                const newX = e.clientX - dragStartPos.current.x;
                const newY = e.clientY - dragStartPos.current.y;
                setPosition({ x: newX, y: newY });
            }
        };

        const handleMouseUp = () => {
            setIsDragging(false);
        };

        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, isPip]);


    const toggleFullScreen = () => {
        if (!document.fullscreenElement) {
            containerRef.current.requestFullscreen().catch(err => {
                console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
            });
            setIsFullScreen(true);
        } else {
            document.exitFullscreen();
            setIsFullScreen(false);
        }
    };

    const togglePip = () => {
        setIsPip(!isPip);
        setIsFullScreen(false);
    };

    if (callState === 'idle' || callState === 'incoming') return null;

    return (
        <div
            ref={containerRef}
            className={`fixed z-50 transition-all duration-300 ${isPip
                ? 'pointer-events-none'
                : 'inset-0 bg-gray-900 bg-opacity-95 flex flex-col items-center justify-center p-4'
                } ${isFullScreen ? 'p-0' : ''}`}
        >
            <div
                onMouseDown={handleMouseDown}
                style={isPip ? {
                    transform: `translate(${position.x}px, ${position.y}px)`,
                    width: '320px',
                    position: 'fixed',
                    left: 0,
                    top: 0
                } : {}}
                className={`relative overflow-hidden bg-black shadow-2xl transition-all duration-300 ${isPip
                    ? 'aspect-[3/4] rounded-xl border-2 border-gray-700 pointer-events-auto cursor-move shadow-2xl hover:shadow-violet-500/20'
                    : isFullScreen
                        ? 'w-full h-full rounded-none'
                        : 'w-full max-w-6xl aspect-video rounded-xl border border-gray-800'
                    }`}
            >
                {/* Header for PiP */}
                {isPip && (
                    <div className="absolute top-2 left-0 right-0 z-20 flex justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="bg-gray-800/80 rounded-full p-1 shadow-sm">
                            <Move size={14} className="text-gray-400" />
                        </div>
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

                {/* My Video (PiP) */}
                <div className={`absolute bg-gray-800 rounded-lg overflow-hidden border-2 border-gray-700 shadow-2xl transition-all z-10 ${!isScreenSharing && !callDetails?.isVideo ? 'hidden' : ''
                    } ${isPip
                        ? 'w-20 bottom-16 right-2 border hover:scale-105'
                        : 'bottom-4 right-4 md:bottom-6 md:right-6 w-32 md:w-48 lg:w-64 aspect-video hover:scale-105'
                    }`}>
                    <video
                        ref={myVideo}
                        playsInline
                        muted
                        autoPlay
                        className={`w-full h-full object-cover transform scale-x-[-1]`}
                    />
                    {!isScreenSharing && !callDetails?.isVideo && (
                        <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs md:text-sm font-medium bg-gray-900/80">
                            Audio Only
                        </div>
                    )}
                </div>

                {/* Controls Overlay */}
                <div className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent transition-all duration-300 flex justify-center gap-2 md:gap-8 ${isPip
                    ? 'p-2 opacity-0 hover:opacity-100' // Auto-hide in PiP
                    : `p-6 opacity-0 hover:opacity-100 focus-within:opacity-100 ${isFullScreen ? '' : 'rounded-b-xl'}`
                    }`}>

                    <button
                        onClick={toggleMute}
                        className={`transition-all backdrop-blur-md rounded-full text-white flex items-center justify-center ${isPip ? 'p-2 w-8 h-8' : 'p-3 md:p-4'
                            } ${isMuted ? 'bg-red-500/90 hover:bg-red-600' : 'bg-gray-700/60 hover:bg-gray-600/80'}`}
                        title={isMuted ? "Unmute" : "Mute"}
                    >
                        {isMuted ? <MicOff size={isPip ? 14 : 24} /> : <Mic size={isPip ? 14 : 24} />}
                    </button>

                    <button
                        onClick={toggleVideo}
                        className={`transition-all backdrop-blur-md rounded-full text-white flex items-center justify-center ${isPip ? 'p-2 w-8 h-8' : 'p-3 md:p-4'
                            } ${isVideoOff ? 'bg-red-500/90 hover:bg-red-600' : 'bg-gray-700/60 hover:bg-gray-600/80'}`}
                        title={isVideoOff ? "Start Video" : "Stop Video"}
                    >
                        {isVideoOff ? <VideoOff size={isPip ? 14 : 24} /> : <Video size={isPip ? 14 : 24} />}
                    </button>

                    <button
                        onClick={() => leaveCall(true)}
                        className={`bg-red-600 hover:bg-red-700 text-white transition-all transform hover:scale-110 shadow-lg rounded-full flex items-center justify-center ${isPip ? 'p-2 w-8 h-8' : 'p-3 md:p-4'
                            }`}
                        title="End Call"
                    >
                        <PhoneOff size={isPip ? 14 : 28} />
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
                        className={`transition-all backdrop-blur-md rounded-full text-white flex items-center justify-center bg-gray-700/60 hover:bg-gray-600/80 ${isPip ? 'absolute top-2 right-2 p-1.5 w-6 h-6 bg-black/50 hover:bg-black/80' : 'p-3 md:p-4'
                            }`}
                        title={isPip ? "Expand" : "Picture in Picture"}
                    >
                        {isPip ? <Maximize size={12} /> : <Minimize2 size={24} />}
                    </button>
                </div>
            </div>
        </div>
    );
};
export default VideoCall;
