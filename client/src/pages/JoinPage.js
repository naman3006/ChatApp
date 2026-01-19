
import React, { useEffect, useState, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ChatContext } from "../context/ChatContext";
import { AuthContext } from "../context/authContext";
import { Loader2, Users, AlertTriangle, LogIn } from "lucide-react";
import toast from "react-hot-toast";

const JoinPage = () => {
    const { code } = useParams();
    const navigate = useNavigate();
    const { getGroupInfoByCode, joinGroupViaCode } = useContext(ChatContext);

    const [group, setGroup] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [joining, setJoining] = useState(false);

    useEffect(() => {
        const fetchGroup = async () => {
            setLoading(true);
            const groupInfo = await getGroupInfoByCode(code);
            if (groupInfo) {
                setGroup(groupInfo);
            } else {
                setError("Invalid or expired invite link");
            }
            setLoading(false);
        };

        if (code) fetchGroup();
    }, [code, getGroupInfoByCode]);

    const { authUser } = useContext(AuthContext);

    const handleJoin = async () => {
        if (!authUser) {
            toast.error("Please login to join the group");
            navigate("/login", { state: { from: window.location.pathname } });
            return;
        }

        setJoining(true);
        const groupId = await joinGroupViaCode(code);
        if (groupId) {
            navigate("/");
        }
        setJoining(false);
    };

    if (loading) {
        return (
            <div className="h-screen flex items-center justify-center bg-[#0a0a0a] text-white">
                <Loader2 className="w-10 h-10 animate-spin text-emerald-500" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="h-screen flex flex-col items-center justify-center bg-[#0a0a0a] text-white gap-4">
                <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center">
                    <AlertTriangle className="w-8 h-8 text-red-500" />
                </div>
                <h2 className="text-xl font-semibold">Link Expired or Invalid</h2>
                <p className="text-gray-400 max-w-xs text-center">{error}</p>
                <button onClick={() => navigate("/")} className="mt-4 px-6 py-2 bg-zinc-800 rounded-full hover:bg-zinc-700 transition">
                    Go Home
                </button>
            </div>
        );
    }

    return (
        <div className="h-screen flex flex-col items-center justify-center bg-[#0a0a0a] text-white p-4 relative overflow-hidden">
            {/* Background Ambience */}
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-emerald-900/10 to-fuchsia-900/10 pointer-events-none" />

            <div className="relative z-10 bg-zinc-900/50 backdrop-blur-xl border border-white/5 p-8 rounded-2xl w-full max-w-sm flex flex-col items-center shadow-2xl">
                <div className="w-24 h-24 mb-6 rounded-full p-1 bg-gradient-to-tr from-emerald-500 to-fuchsia-500">
                    <img
                        src={group?.icon || "/group.png"}
                        alt={group?.name}
                        className="w-full h-full rounded-full object-cover bg-zinc-800"
                    />
                </div>

                <h1 className="text-2xl font-bold mb-2 text-center">{group?.name}</h1>

                <div className="flex items-center gap-2 text-gray-400 mb-8 bg-zinc-800/50 px-3 py-1 rounded-full text-sm">
                    <Users className="w-4 h-4" />
                    <span>{group?.memberCount} members</span>
                </div>

                <button
                    onClick={handleJoin}
                    disabled={joining}
                    className={`w-full py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${!authUser ? 'bg-violet-600 hover:bg-violet-500 text-white' : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                        }`}
                >
                    {joining ? (
                        <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Joining...
                        </>
                    ) : !authUser ? (
                        <>
                            <LogIn className="w-4 h-4" />
                            Login to Join
                        </>
                    ) : (
                        "Join Group"
                    )}
                </button>

                <button onClick={() => navigate("/")} className="mt-4 text-sm text-gray-500 hover:text-white transition">
                    Cancel
                </button>
            </div>
        </div>
    );
};

export default JoinPage;
