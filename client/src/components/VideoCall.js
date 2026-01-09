import React, { useContext, useState, useRef } from 'react';
import { CallContext } from '../context/CallContext';
import { Mic, MicOff, Video, VideoOff, PhoneOff, MonitorUp, Maximize, Minimize } from 'lucide-react';

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
    const containerRef = useRef(null);

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

    if (callState === 'idle' || callState === 'incoming') return null;

    return (
        <div
            ref={containerRef}
            className={`fixed inset-0 bg-gray-900 z-50 flex flex-col items-center justify-center p-4 transition-all duration-300 ${isFullScreen ? 'p-0' : 'bg-opacity-95'}`}
        >
            <div className={`relative w-full h-full overflow-hidden bg-black shadow-2xl flex items-center justify-center transition-all duration-300 ${isFullScreen ? 'rounded-none' : 'max-w-6xl aspect-video rounded-xl border border-gray-800'}`}>

                {/* Remote Video */}
                {callState === 'active' && (
                    <video
                        ref={remoteVideoRef}
                        playsInline
                        autoPlay
                        className="w-full h-full object-contain"
                    />
                )}

                {/* Fallback for outgoing or audio-only remote */}
                {/* Show if outgoing OR (active AND (no stream OR no video tracks)) */}
                {((callState === 'outgoing') || (callState === 'active' && (!userVideo || userVideo.getVideoTracks().length === 0))) && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                        <div className="text-center animate-pulse">
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

                {/* My Video (Picture in Picture) */}
                <div className={`absolute bottom-4 right-4 md:bottom-6 md:right-6 w-32 md:w-48 lg:w-64 aspect-video bg-gray-800 rounded-lg overflow-hidden border-2 border-gray-700 shadow-2xl transition-all hover:scale-105 z-10 ${!isScreenSharing && !callDetails?.isVideo ? 'hidden' : ''}`}>
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

                {/* Controls Overlay - Shows on hover or touch */}
                <div className={`absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/90 via-black/50 to-transparent transition-opacity duration-300 opacity-0 hover:opacity-100 focus-within:opacity-100 ${isFullScreen ? '' : 'rounded-b-xl'} flex justify-center gap-4 md:gap-8`}>

                    <button
                        onClick={toggleMute}
                        className={`p-3 md:p-4 rounded-full transition-all backdrop-blur-md ${isMuted ? 'bg-red-500/90 hover:bg-red-600 text-white shadow-red-500/20 shadow-lg' : 'bg-gray-700/60 hover:bg-gray-600/80 text-white'}`}
                        title={isMuted ? "Unmute" : "Mute"}
                    >
                        {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
                    </button>

                    <button
                        onClick={leaveCall}
                        className="p-3 md:p-4 rounded-full bg-red-600 hover:bg-red-700 text-white transition-all transform hover:scale-110 shadow-lg shadow-red-600/30"
                        title="End Call"
                    >
                        <PhoneOff size={28} />
                    </button>

                    <button
                        onClick={toggleVideo}
                        className={`p-3 md:p-4 rounded-full transition-all backdrop-blur-md ${isVideoOff ? 'bg-red-500/90 hover:bg-red-600 text-white shadow-red-500/20 shadow-lg' : 'bg-gray-700/60 hover:bg-gray-600/80 text-white'}`}
                        title={isVideoOff ? "Start Video" : "Stop Video"}
                    >
                        {isVideoOff ? <VideoOff size={24} /> : <Video size={24} />}
                    </button>

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
                </div>
            </div>
        </div>
    );
};

export default VideoCall;
