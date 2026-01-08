
import { createContext, useState, useEffect, useRef, useContext } from "react";
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

    const myVideo = useRef();
    const remoteVideoRef = useRef();
    const peerConnection = useRef();

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

    useEffect(() => {
        if (!socket) return;

        socket.on("callUser", ({ from, name: callerName, signal, isVideo }) => {
            console.log("Incoming call from", callerName);
            setCallDetails({ callerId: from, callerName, signal, isVideo });
            setCallState("incoming");
        });

        socket.on("callAccepted", (signal) => {
            console.log("Call accepted");
            setCallState("active");
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

        return () => {
            socket.off("callUser");
            socket.off("callAccepted");
            socket.off("iceCandidate");
            socket.off("callEnded");
            socket.off("callRejected");
        };
    }, [socket]);


    const startCall = async (userToCallId, userToCallName, isVideo = true) => {
        setCallState("outgoing");
        setCallDetails({ calleeId: userToCallId, calleeName: userToCallName, isVideo });

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
                setUserVideo(event.streams[0]);
                if (remoteVideoRef.current) {
                    remoteVideoRef.current.srcObject = event.streams[0];
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

        try {
            const isVideo = callDetails.isVideo;
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
                    socket.emit("iceCandidate", { to: callDetails.callerId, candidate: event.candidate });
                }
            };

            peerConnection.current.ontrack = (event) => {
                setUserVideo(event.streams[0]);
                if (remoteVideoRef.current) {
                    remoteVideoRef.current.srcObject = event.streams[0];
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

    const leaveCall = () => {
        setCallState("idle");

        // Notify other user if in outgoing or active state
        if (callState === "outgoing" && callDetails?.calleeId) {
            socket.emit("endCall", { to: callDetails.calleeId });
        } else if (callState === "active") {
            const otherId = callDetails?.callerId || callDetails?.calleeId;
            if (otherId) socket.emit("endCall", { to: otherId });
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
    };

    const toggleMute = () => {
        if (stream) {
            stream.getAudioTracks()[0].enabled = !stream.getAudioTracks()[0].enabled;
            setIsMuted(!stream.getAudioTracks()[0].enabled);
        }
    }

    const toggleVideo = () => {
        if (stream) {
            stream.getVideoTracks()[0].enabled = !stream.getVideoTracks()[0].enabled;
            setIsVideoOff(!stream.getVideoTracks()[0].enabled);
        }
    }

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
            isVideoOff
        }}>
            {children}
        </CallContext.Provider>
    );
};
