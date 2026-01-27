
import { createContext, useState, useEffect, useRef, useContext, useCallback } from "react";
import { AuthContext } from "./authContext";
import toast from "react-hot-toast";

export const CallContext = createContext();

export const CallProvider = ({ children }) => {
    const { socket, authUser } = useContext(AuthContext);

    const [callState, setCallState] = useState("idle"); // idle, incoming, outgoing, active
    const [callDetails, setCallDetails] = useState(null); // { callerId, callerName, isVideo, signal } (for incoming) or { calleeId, calleeName } (for outgoing)
    const [stream, setStream] = useState(null);
    const [userVideo, setUserVideo] = useState(null); // Remote stream
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);
    const [remoteVideoOff, setRemoteVideoOff] = useState(false);
    const [callStartTime, setCallStartTime] = useState(null);

    const { axios } = useContext(AuthContext);
    const myVideo = useRef();
    const remoteVideoRef = useRef();
    const peerConnection = useRef();

    // Audio Refs
    const audioRing = useRef(null);
    const audioCalling = useRef(null);
    const audioCallEnd = useRef(null);

    useEffect(() => {
        // Initialize Audio objects
        audioRing.current = new Audio('/sounds/ringtone.mp3');
        audioRing.current.loop = true;

        audioCalling.current = new Audio('/sounds/calling.mp3');
        audioCalling.current.loop = true;

        audioCallEnd.current = new Audio('/sounds/callEnd.mp3');
    }, []);

    useEffect(() => {
        const stopSounds = () => {
            if (audioRing.current) {
                audioRing.current.pause();
                audioRing.current.currentTime = 0;
            }
            if (audioCalling.current) {
                audioCalling.current.pause();
                audioCalling.current.currentTime = 0;
            }
        };

        if (callState === 'incoming') {
            audioRing.current?.play().catch(e => console.error("Error playing ringtone:", e));
        } else if (callState === 'outgoing') {
            audioCalling.current?.play().catch(e => console.error("Error playing calling sound:", e));
        } else {
            stopSounds();
        }

        return () => {
            // We don't necessarily want to stop on every unmount/re-render if the state is stable, 
            // but since dependency is [callState], this runs only on transition.
            // However, we WANT to stop previous sound when transitioning state.
            // Example: outgoing -> active (stop calling sound).
            stopSounds();
        };
    }, [callState]);

    // STUN servers
    const servers = {
        iceServers: [
            {
                urls: [
                    "stun:stun1.l.google.com:19302",
                    "stun:stun2.l.google.com:19302",
                ],
            },
        ],
    };

    const formatTime = (ms) => {
        const seconds = Math.floor((ms / 1000) % 60);
        const minutes = Math.floor((ms / (1000 * 60)) % 60);
        const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);

        const parts = [];
        if (hours > 0) parts.push(`${hours}h`);
        if (minutes > 0) parts.push(`${minutes}m`);
        parts.push(`${seconds}s`);
        return parts.join(' ');
    };

    const leaveCall = useCallback(async (isEndedByMe = false) => {
        // Play end sound if we are leaving a non-idle state
        if (callState !== 'idle' && audioCallEnd.current) {
            audioCallEnd.current.currentTime = 0;
            audioCallEnd.current.play().catch(e => console.error("Error playing call end sound:", e));
        }

        // Calculate duration and send message if active
        if (callState === "active" && callStartTime && isEndedByMe) {
            const duration = Date.now() - callStartTime;
            const durationText = formatTime(duration);
            const type = callDetails?.isVideo ? "Video" : "Audio";
            const messageText = `${type} Call ended • ${durationText}`;

            const otherId = callDetails?.callerId || callDetails?.calleeId;

            if (otherId) {
                try {
                    await axios.post(`/messages/send/${otherId}`, {
                        text: messageText
                    });
                } catch (error) {
                    console.error("Failed to send call duration message", error);
                }
            }
        }

        setCallState("idle");
        setCallStartTime(null);

        // Notify other user if in outgoing or active state
        if (callState === "outgoing" && callDetails?.calleeId) {
            socket.emit("endCall", { to: callDetails.calleeId });
        } else if (callState === "active") {
            const otherId = callDetails?.callerId || callDetails?.calleeId;
            // Only emit endCall if WE are ending it (to prevent loops if driven by socket)
            if (isEndedByMe && otherId) {
                socket.emit("endCall", { to: otherId });
            }
        } else if (callState === "incoming" && callDetails?.callerId) {
            socket.emit("rejectCall", { to: callDetails.callerId });
        }

        if (peerConnection.current) {
            peerConnection.current.close();
            peerConnection.current = null;
        }

        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }

        setCallDetails(null);
        setUserVideo(null);
        setIsMuted(false);
        setIsVideoOff(false);
        setRemoteVideoOff(false);
    }, [callState, callDetails, socket, stream, callStartTime, axios]);

    useEffect(() => {
        if (!socket) return;

        socket.on("cameraStatus", ({ isVideoOff }) => {
            setRemoteVideoOff(isVideoOff);
        });

        socket.on("callUser", ({ from, name: callerName, signal, isVideo }) => {
            console.log("Incoming call from", callerName);
            setCallDetails({ callerId: from, callerName, signal, isVideo });
            setCallState("incoming");
            setRemoteVideoOff(!isVideo);
        });

        socket.on("callAccepted", (signal) => {
            console.log("Call accepted");
            setCallState("active");
            setCallStartTime(Date.now());
            peerConnection.current.setRemoteDescription(new RTCSessionDescription(signal));
        });

        socket.on("iceCandidate", (candidate) => {
            if (peerConnection.current) {
                peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate)).catch(e => console.error("Error adding ice candidate", e));
            }
        });

        socket.on("callEnded", () => {
            leaveCall();
            toast("Call ended");
        });

        socket.on("callRejected", () => {
            leaveCall();
            toast("Call rejected");
        });

        socket.on("renegotiate", async ({ signal, from }) => {
            if (!peerConnection.current) return;
            try {
                if (signal.type === 'offer') {
                    await peerConnection.current.setRemoteDescription(new RTCSessionDescription(signal));
                    const answer = await peerConnection.current.createAnswer();
                    await peerConnection.current.setLocalDescription(answer);
                    socket.emit("renegotiate", { signal: answer, to: from });
                } else if (signal.type === 'answer') {
                    await peerConnection.current.setRemoteDescription(new RTCSessionDescription(signal));
                }
            } catch (error) {
                console.error("Error handling renegotiation:", error);
            }
        });

        return () => {
            socket.off("cameraStatus");
            socket.off("callUser");
            socket.off("callAccepted");
            socket.off("iceCandidate");
            socket.off("callEnded");
            socket.off("callRejected");
            socket.off("renegotiate");
        };
    }, [socket, leaveCall]);


    const startCall = async (userToCallId, userToCallName, isVideo = true) => {
        setCallState("outgoing");
        setCallDetails({ calleeId: userToCallId, calleeName: userToCallName, isVideo });
        setIsVideoOff(!isVideo);

        try {
            const currentStream = await navigator.mediaDevices.getUserMedia({ video: isVideo, audio: true });
            setStream(currentStream);
            if (myVideo.current) {
                myVideo.current.srcObject = currentStream;
            }

            peerConnection.current = new RTCPeerConnection(servers);

            currentStream.getTracks().forEach((track) => {
                peerConnection.current.addTrack(track, currentStream);
            });

            peerConnection.current.onicecandidate = (event) => {
                if (event.candidate) {
                    socket.emit("iceCandidate", { to: userToCallId, candidate: event.candidate });
                }
            };

            peerConnection.current.ontrack = (event) => {
                const remoteStream = event.streams[0];
                // Force a new reference to trigger React state update
                setUserVideo(new MediaStream(remoteStream.getTracks()));

                if (remoteVideoRef.current) {
                    remoteVideoRef.current.srcObject = remoteStream;
                }

                // Also listen for track changes on this stream
                remoteStream.onaddtrack = () => {
                    setUserVideo(new MediaStream(remoteStream.getTracks()));
                };
                remoteStream.onremovetrack = () => {
                    setUserVideo(new MediaStream(remoteStream.getTracks()));
                };
            };

            peerConnection.current.onnegotiationneeded = async () => {
                try {
                    const offer = await peerConnection.current.createOffer();
                    await peerConnection.current.setLocalDescription(offer);
                    socket.emit("renegotiate", { signal: offer, to: userToCallId }); // use userToCallId from closure
                } catch (err) {
                    console.error("Negotiation error:", err);
                }
            };

            const offer = await peerConnection.current.createOffer();
            await peerConnection.current.setLocalDescription(offer);

            socket.emit("callUser", {
                userToCall: userToCallId,
                signalData: offer,
                from: authUser._id,
                name: authUser.fullName,
                isVideo
            });

        } catch (error) {
            console.error("Error starting call:", error);
            toast.error("Failed to access camera/microphone");
            setCallState("idle");
        }
    };

    const answerCall = async () => {
        setCallState("active");
        setCallStartTime(Date.now());
        setIsVideoOff(!callDetails.isVideo);

        let currentStream = null;
        try {
            const isVideo = callDetails.isVideo;
            // Try to get media stream. If it fails (e.g. no camera), we proceed without local stream or with audio only
            try {
                currentStream = await navigator.mediaDevices.getUserMedia({ video: isVideo, audio: true });
            } catch (mediaError) {
                console.warn("Retrying with audio only due to media error:", mediaError);
                try {
                    currentStream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
                } catch (audioError) {
                    console.error("Failed to get audio stream:", audioError);
                    toast.error("Could not access microphone.");
                    // We can still answer to Receive only? 
                    // For now, let's proceed with null stream (receive only mode)
                }
            }

            setStream(currentStream);
            if (myVideo.current && currentStream) {
                myVideo.current.srcObject = currentStream;
            }

            peerConnection.current = new RTCPeerConnection(servers);

            if (currentStream) {
                currentStream.getTracks().forEach((track) => {
                    peerConnection.current.addTrack(track, currentStream);
                });
            }

            peerConnection.current.onicecandidate = (event) => {
                if (event.candidate) {
                    socket.emit("iceCandidate", { to: callDetails.callerId, candidate: event.candidate });
                }
            };

            peerConnection.current.ontrack = (event) => {
                const remoteStream = event.streams[0];
                // Force a new reference to trigger React state update
                setUserVideo(new MediaStream(remoteStream.getTracks()));

                if (remoteVideoRef.current) {
                    remoteVideoRef.current.srcObject = remoteStream;
                }

                // Also listen for track changes on this stream
                remoteStream.onaddtrack = () => {
                    setUserVideo(new MediaStream(remoteStream.getTracks()));
                };
                remoteStream.onremovetrack = () => {
                    setUserVideo(new MediaStream(remoteStream.getTracks()));
                };
            };

            peerConnection.current.onnegotiationneeded = async () => {
                try {
                    const offer = await peerConnection.current.createOffer();
                    await peerConnection.current.setLocalDescription(offer);
                    socket.emit("renegotiate", { signal: offer, to: callDetails.callerId });
                } catch (err) {
                    console.error("Negotiation error:", err);
                }
            };

            // signal is the offer from the caller
            await peerConnection.current.setRemoteDescription(new RTCSessionDescription(callDetails.signal));

            const answer = await peerConnection.current.createAnswer();
            await peerConnection.current.setLocalDescription(answer);

            socket.emit("answerCall", { signal: answer, to: callDetails.callerId });

        } catch (error) {
            console.error("Error answering call:", error);
            leaveCall();
        }
    };



    const toggleMute = () => {
        if (!stream) return;
        const audioTrack = stream.getAudioTracks()[0];
        if (audioTrack) {
            audioTrack.enabled = !audioTrack.enabled;
            setIsMuted(!audioTrack.enabled);
        } else {
            console.warn("toggleMute: No audio track found in stream");
        }
    };

    const toggleVideo = async () => {
        if (!stream) {
            toast.error("No active call stream found.");
            return;
        }

        const videoTrack = stream.getVideoTracks()[0];

        if (videoTrack) {
            // Video track exists - standard toggle behavior
            videoTrack.enabled = !videoTrack.enabled;
            setIsVideoOff(!videoTrack.enabled);

            // Emit status
            const otherId = callDetails?.callerId || callDetails?.calleeId;
            if (otherId) socket.emit("cameraStatus", { to: otherId, isVideoOff: !videoTrack.enabled });

        } else {
            // No video track - Attempt to upgrade to video call (Advanced Feature)
            try {
                const cameraStream = await navigator.mediaDevices.getUserMedia({ video: true });
                const newVideoTrack = cameraStream.getVideoTracks()[0];

                if (!newVideoTrack) throw new Error("No video track obtained");

                // Add the track to the local stream
                stream.addTrack(newVideoTrack);
                setIsVideoOff(false);

                // Emit status
                const otherId = callDetails?.callerId || callDetails?.calleeId;
                if (otherId) socket.emit("cameraStatus", { to: otherId, isVideoOff: false });

                // Add the track to the PeerConnection
                if (peerConnection.current) {
                    const senders = peerConnection.current.getSenders();
                    const videoSender = senders.find(s => s.track && s.track.kind === 'video');

                    if (videoSender) {
                        // If there was a sender (e.g. disabled track), replace it
                        await videoSender.replaceTrack(newVideoTrack);
                    } else {
                        // Add new transceiver/sender, triggers renegotiation
                        peerConnection.current.addTrack(newVideoTrack, stream);
                    }
                }

                toast.success("Camera enabled");

            } catch (error) {
                console.error("Error upgrading to video:", error);
                if (error.name === 'NotAllowedError') {
                    toast.error("Camera permission denied");
                } else {
                    toast.error("Could not access camera");
                }
            }
        }
    };

    const [isScreenSharing, setIsScreenSharing] = useState(false);

    const toggleScreenShare = async () => {
        if (isScreenSharing) {
            // Stop sharing (Return to Camera if possible)
            try {
                let cameraStream = null;
                try {
                    // Try to restore camera
                    cameraStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                } catch (e) {
                    console.warn("Could not restore camera:", e);
                    // If failed (no camera), try audio only?
                    try {
                        cameraStream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
                    } catch (ae) {
                        console.error("Could not restore audio either", ae);
                    }
                }

                // Stop the screen share track
                stream.getVideoTracks().forEach(track => track.stop());

                if (cameraStream) {
                    const videoTrack = cameraStream.getVideoTracks()[0];
                    const audioTrack = cameraStream.getAudioTracks()[0];

                    const videoSender = peerConnection.current.getSenders().find(s => s.track && s.track.kind === 'video');
                    if (videoSender && videoTrack) {
                        await videoSender.replaceTrack(videoTrack);
                    } else if (videoSender && !videoTrack) {
                        // If we had a video sender but no camera video track (e.g., audio-only fallback), stop sending video
                        await videoSender.replaceTrack(null);
                    } else if (!videoSender && videoTrack) {
                        // If no video sender existed (e.g., audio-only call) but we now have a camera video track
                        peerConnection.current.addTrack(videoTrack, cameraStream);
                    }

                    const audioSender = peerConnection.current.getSenders().find(s => s.track && s.track.kind === 'audio');
                    if (audioSender && audioTrack) {
                        await audioSender.replaceTrack(audioTrack);
                    } else if (!audioSender && audioTrack) {
                        // If no audio sender existed but we now have an audio track
                        peerConnection.current.addTrack(audioTrack, cameraStream);
                    }

                    setStream(cameraStream);
                    if (myVideo.current) {
                        myVideo.current.srcObject = cameraStream;
                    }
                } else {
                    // No camera stream could be obtained, revert to existing audio stream if any, or null
                    const audioOnlyStream = new MediaStream(stream.getAudioTracks());
                    setStream(audioOnlyStream);
                    if (myVideo.current) {
                        myVideo.current.srcObject = audioOnlyStream;
                    }
                }

                setIsScreenSharing(false);
                setIsVideoOff(!cameraStream?.getVideoTracks()?.length); // If no video track, video is off

            } catch (error) {
                console.error("Error switching back from screen share:", error);
                toast.error("Error stopping screen share");
            }
        } else {
            // Start sharing
            try {
                const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
                const screenTrack = screenStream.getVideoTracks()[0];

                screenTrack.onended = () => {
                    // Handle case where user stops sharing via browser UI
                    toggleScreenShare(); // This calls the "if (isScreenSharing)" block
                };

                const sender = peerConnection.current.getSenders().find(s => s.track && s.track.kind === 'video');
                if (sender) {
                    await sender.replaceTrack(screenTrack);
                } else {
                    // Audio-only call previously, now adding video (screen)
                    // This triggers 'onnegotiationneeded'
                    peerConnection.current.addTrack(screenTrack, stream);
                }

                // Stop local camera video if it was running
                stream.getVideoTracks().forEach(track => track.stop());

                // Create mixed stream: Screen Video + Existing Audio
                const newStream = new MediaStream([screenTrack, ...stream.getAudioTracks()]);

                setStream(newStream);
                if (myVideo.current) {
                    myVideo.current.srcObject = newStream;
                }

                setIsScreenSharing(true);
                setIsVideoOff(false);

            } catch (error) {
                console.error("Error starting screen share:", error);
                if (error.name === 'NotAllowedError') {
                    toast.error("Screen sharing permission denied");
                    setIsScreenSharing(false);
                }
            }
        }
    };

    const [isRecording, setIsRecording] = useState(false);
    const mediaRecorderRef = useRef(null);
    const recordedChunksRef = useRef([]);
    const canvasRef = useRef(null);
    const canvasIntervalRef = useRef(null);
    const audioContextRef = useRef(null);
    const audioDestinationRef = useRef(null);
    const localAudioSourceRef = useRef(null);
    const remoteAudioSourceRef = useRef(null);

    // Effect to handle dynamic audio stream changes during recording
    useEffect(() => {
        if (!isRecording || !audioContextRef.current || !audioDestinationRef.current) return;

        const cleanupLocal = () => {
            if (localAudioSourceRef.current) {
                try { localAudioSourceRef.current.disconnect(); } catch (e) { }
                localAudioSourceRef.current = null;
            }
        };

        const cleanupRemote = () => {
            if (remoteAudioSourceRef.current) {
                try { remoteAudioSourceRef.current.disconnect(); } catch (e) { }
                remoteAudioSourceRef.current = null;
            }
        };

        // Connect Local
        cleanupLocal();
        if (stream && stream.getAudioTracks().length > 0) {
            try {
                const source = audioContextRef.current.createMediaStreamSource(stream);
                source.connect(audioDestinationRef.current);
                localAudioSourceRef.current = source;
            } catch (error) {
                console.error("Error connecting local audio for recording:", error);
            }
        }

        // Connect Remote
        cleanupRemote();
        if (userVideo && userVideo.getAudioTracks().length > 0) {
            try {
                const source = audioContextRef.current.createMediaStreamSource(userVideo);
                source.connect(audioDestinationRef.current);
                remoteAudioSourceRef.current = source;
            } catch (error) {
                console.error("Error connecting remote audio for recording:", error);
            }
        }

        return () => {
            cleanupLocal();
            cleanupRemote();
        };

    }, [isRecording, stream, userVideo]);

    const startRecording = async () => {
        try {
            const width = 1280;
            const height = 720;
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            canvasRef.current = canvas;
            const ctx = canvas.getContext('2d');

            // Audio Mixing Setup
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            const audioContext = new AudioContext();
            audioContextRef.current = audioContext;
            const destination = audioContext.createMediaStreamDestination();
            audioDestinationRef.current = destination;

            // Video Mixing Loop
            const draw = () => {
                ctx.fillStyle = '#000';
                ctx.fillRect(0, 0, width, height);

                const localVideo = myVideo.current;
                const remoteVideo = remoteVideoRef.current;

                // Simple Side-by-Side Layout
                // Remote (Left or Main), Local (Right or generic) - Let's do 50/50 split

                if (localVideo && localVideo.readyState === 4 && remoteVideo && remoteVideo.readyState === 4) {
                    // Both videos active - Split screen
                    // Draw Remote (Left)
                    const rW = remoteVideo.videoWidth;
                    const rH = remoteVideo.videoHeight;
                    const rAspect = rW / rH;
                    let drawRW = width / 2;
                    let drawRH = drawRW / rAspect;
                    if (drawRH > height) {
                        drawRH = height;
                        drawRW = drawRH * rAspect;
                    }
                    ctx.drawImage(remoteVideo, 0 + (width / 2 - drawRW) / 2, (height - drawRH) / 2, drawRW, drawRH);

                    // Draw Local (Right)
                    const lW = localVideo.videoWidth;
                    const lH = localVideo.videoHeight;
                    const lAspect = lW / lH;
                    let drawLW = width / 2;
                    let drawLH = drawLW / lAspect;
                    if (drawLH > height) {
                        drawLH = height;
                        drawLW = drawLH * lAspect;
                    }
                    ctx.drawImage(localVideo, width / 2 + (width / 2 - drawLW) / 2, (height - drawLH) / 2, drawLW, drawLH);

                } else if (remoteVideo && remoteVideo.readyState === 4) {
                    // Only Remote
                    const rW = remoteVideo.videoWidth;
                    const rH = remoteVideo.videoHeight;
                    const rAspect = rW / rH;
                    let drawW = width;
                    let drawH = drawW / rAspect;
                    if (drawH > height) {
                        drawH = height;
                        drawW = drawH * rAspect;
                    }
                    ctx.drawImage(remoteVideo, (width - drawW) / 2, (height - drawH) / 2, drawW, drawH);
                } else if (localVideo && localVideo.readyState === 4) {
                    // Only Local
                    const lW = localVideo.videoWidth;
                    const lH = localVideo.videoHeight;
                    const lAspect = lW / lH;
                    let drawW = width;
                    let drawH = drawW / lAspect;
                    if (drawH > height) {
                        drawH = height;
                        drawW = drawH * lAspect;
                    }
                    ctx.drawImage(localVideo, (width - drawW) / 2, (height - drawH) / 2, drawW, drawH);
                } else {
                    // Audio only visualization or placeholder
                    ctx.fillStyle = '#333';
                    ctx.font = '30px Arial';
                    ctx.fillStyle = 'white';
                    ctx.textAlign = 'center';
                    ctx.fillText('Audio Call Recording', width / 2, height / 2);

                    // Helper: pulsating dot
                    const time = Date.now() / 1000;
                    if (Math.sin(time * 3) > 0) {
                        ctx.beginPath();
                        ctx.arc(width / 2, height / 2 + 50, 10, 0, 2 * Math.PI);
                        ctx.fillStyle = 'red';
                        ctx.fill();
                    }
                }
            };

            canvasIntervalRef.current = setInterval(draw, 1000 / 30); // 30 FPS

            const canvasStream = canvas.captureStream(30);

            // Combine Audio and Video
            const combinedTracks = [
                ...canvasStream.getVideoTracks(),
                ...destination.stream.getAudioTracks()
            ];

            const combinedStream = new MediaStream(combinedTracks);

            const recorder = new MediaRecorder(combinedStream, {
                mimeType: 'video/webm;codecs=vp9'
            });

            mediaRecorderRef.current = recorder;
            recordedChunksRef.current = [];

            recorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    recordedChunksRef.current.push(event.data);
                }
            };

            recorder.onstop = () => {
                const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = url;
                a.download = `call-recording-${new Date().toISOString()}.webm`;
                document.body.appendChild(a);
                a.click();
                setTimeout(() => {
                    document.body.removeChild(a);
                    window.URL.revokeObjectURL(url);
                }, 100);

                // Cleanup
                if (canvasIntervalRef.current) clearInterval(canvasIntervalRef.current);
                if (audioContextRef.current) {
                    audioContextRef.current.close();
                    audioContextRef.current = null;
                }
                audioDestinationRef.current = null;
                localAudioSourceRef.current = null;
                remoteAudioSourceRef.current = null;
            };

            recorder.start();
            setIsRecording(true);
            toast.success("Recording started");

        } catch (error) {
            console.error("Failed to start recording:", error);
            toast.error("Could not start recording");
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            toast.success("Recording saved to computer");
        }
    };

    // Auto-stop recording if call ends
    useEffect(() => {
        if (callState === 'idle' && isRecording) {
            stopRecording();
        }
    }, [callState, isRecording]);

    return (
        <CallContext.Provider value={{
            callState,
            callDetails,
            myVideo,
            userVideo,
            remoteVideoRef,
            stream,
            startCall,
            answerCall,
            leaveCall,
            toggleMute,
            toggleVideo,
            isMuted,
            isVideoOff,
            remoteVideoOff,
            isScreenSharing,
            toggleScreenShare,
            isRecording,
            startRecording,
            stopRecording
        }}>
            {children}
        </CallContext.Provider>
    );
};