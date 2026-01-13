
import React, { useContext } from 'react';
import { CallContext } from '../context/CallContext';
import { Phone, PhoneOff, Video } from 'lucide-react';

const CallNotification = () => {
    const { callState, callDetails, answerCall, leaveCall } = useContext(CallContext);

    if (callState !== 'incoming') return null;

    return (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 animate-bounce-in">
            <div className="bg-popover rounded-lg shadow-2xl p-4 w-80 border border-border flex flex-col items-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-3 text-2xl text-blue-600 font-bold">
                    {callDetails?.callerName?.charAt(0)}
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-1">
                    {callDetails?.callerName}
                </h3>
                <p className="text-sm text-muted-foreground mb-6 flex items-center gap-2">
                    {callDetails?.isVideo ? <Video size={16} /> : <Phone size={16} />}
                    Incoming {callDetails?.isVideo ? 'Video' : 'Audio'} Call...
                </p>

                <div className="flex items-center gap-8 w-full justify-center">
                    <button
                        onClick={leaveCall}
                        className="flex flex-col items-center gap-1 group"
                    >
                        <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center transition-all group-hover:bg-red-500 group-hover:text-white">
                            <PhoneOff size={20} />
                        </div>
                        <span className="text-xs text-muted-foreground group-hover:text-red-500 font-medium">Decline</span>
                    </button>

                    <button
                        onClick={answerCall}
                        className="flex flex-col items-center gap-1 group"
                    >
                        <div className="w-12 h-12 rounded-full bg-green-500/10 text-green-500 flex items-center justify-center transition-all group-hover:bg-green-500 group-hover:text-white animate-pulse">
                            <Phone size={20} />
                        </div>
                        <span className="text-xs text-muted-foreground group-hover:text-green-500 font-medium">Accept</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CallNotification;
