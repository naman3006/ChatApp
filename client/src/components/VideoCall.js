
import React, { useContext } from 'react';
import { CallContext } from '../context/CallContext';
import { Mic, MicOff, Video, VideoOff, PhoneOff } from 'lucide-react';

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
        isVideoOff
    } = useContext(CallContext);

    if (callState === 'idle' || callState === 'incoming') return null;

    return (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-95 z-50 flex flex-col items-center justify-center p-4">
            <div className="relative w-full max-w-4xl aspect-video bg-black rounded-xl overflow-hidden shadow-2xl">
                {/* Remote Video */}
                {callState === 'active' && (
                    <video
                        ref={remoteVideoRef}
                        playsInline
                        autoPlay
                        className="w-full h-full object-cover"
                    />
                )}

                {/* Fallback for outgoing or audio-only remote */}
                {((callState === 'outgoing') || (!userVideo && callState === 'active')) && (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                            <div className="w-24 h-24 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl text-white font-bold">
                                {callDetails?.calleeName?.charAt(0) || callDetails?.callerName?.charAt(0)}
                            </div>
                            <h3 className="text-white text-xl font-semibold">
                                {callState === 'outgoing' ? 'Calling...' : 'Connected'}
                            </h3>
                            <p className="text-gray-400">
                                {callDetails?.calleeName || callDetails?.callerName}
                            </p>
                        </div>
                    </div>
                )}

                {/* My Video (Picture in Picture) */}
                <div className="absolute bottom-4 right-4 w-48 aspect-video bg-gray-800 rounded-lg overflow-hidden border-2 border-gray-700 shadow-lg">
                    <video
                        ref={myVideo}
                        playsInline
                        muted
                        autoPlay
                        className={`w-full h-full object-cover ${!callDetails?.isVideo ? 'hidden' : ''}`}
                    />
                    {!callDetails?.isVideo && (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                            Audio Only
                        </div>
                    )}
                </div>
            </div>

            {/* Controls */}
            <div className="mt-8 flex items-center gap-6">
                <button
                    onClick={toggleMute}
                    className={`p-4 rounded-full transition-all ${isMuted ? 'bg-red-500 text-white' : 'bg-gray-700 text-white hover:bg-gray-600'}`}
                >
                    {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
                </button>

                <button
                    onClick={leaveCall}
                    className="p-4 rounded-full bg-red-600 text-white hover:bg-red-700 transition-all transform hover:scale-110"
                >
                    <PhoneOff size={28} />
                </button>

                <button
                    onClick={toggleVideo}
                    className={`p-4 rounded-full transition-all ${isVideoOff ? 'bg-red-500 text-white' : 'bg-gray-700 text-white hover:bg-gray-600'}`}
                >
                    {isVideoOff ? <VideoOff size={24} /> : <Video size={24} />}
                </button>
            </div>
        </div>
    );
};

export default VideoCall;
