import React, { useState, useEffect } from "react";
import { axiosInstance } from "../lib/axios";
import { Copy, Plus, Trash2, Key, Terminal, AlertTriangle, Check } from "lucide-react";
import toast from "react-hot-toast";
import { formatMessageTime } from "../lib/utils";

const DeveloperSettings = () => {
    const [keys, setKeys] = useState([]);
    const [newKeyName, setNewKeyName] = useState("");
    const [generatedKey, setGeneratedKey] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isCreating, setIsCreating] = useState(false);

    useEffect(() => {
        fetchKeys();
    }, []);

    const fetchKeys = async () => {
        setIsLoading(true);
        try {
            const res = await axiosInstance.get("/developer/keys");
            setKeys(res.data.keys);
        } catch (error) {
            console.error(error);
            toast.error("Failed to load API keys");
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateKey = async () => {
        if (!newKeyName.trim()) return toast.error("Key name is required");
        setIsCreating(true);
        try {
            const res = await axiosInstance.post("/developer/keys", { name: newKeyName });
            const { apiKey, ...keyData } = res.data.data;
            setGeneratedKey(apiKey); // Show raw key once
            setKeys([keyData, ...keys]);
            setNewKeyName("");
            toast.success("API Key Generated");
        } catch (error) {
            console.error(error);
            toast.error("Failed to generate key");
        } finally {
            setIsCreating(false);
        }
    };

    const handleRevokeKey = async (id) => {
        if (!window.confirm("Are you sure? This implementation will stop working immediately.")) return;
        try {
            await axiosInstance.delete(`/developer/keys/${id}`);
            setKeys(keys.filter(k => k._id !== id));
            toast.success("Key revoked");
        } catch (error) {
            console.error(error);
            toast.error("Failed to revoke key");
        }
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        toast.success("Copied to clipboard");
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-gray-800 rounded-lg text-emerald-400">
                    <Terminal size={24} />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-white">Developer API</h2>
                    <p className="text-gray-400 text-sm">Manage API keys for external integrations</p>
                </div>
            </div>

            {/* Create Key Section */}
            <div className="bg-white/5 border border-white/5 rounded-2xl p-5">
                <h3 className="text-white font-medium mb-4 flex items-center gap-2">
                    <Plus size={18} className="text-violet-400" /> Generate New Key
                </h3>
                <div className="flex gap-2">
                    <input
                        value={newKeyName}
                        onChange={(e) => setNewKeyName(e.target.value)}
                        placeholder="Integration Name (e.g. My CRM)"
                        className="flex-1 bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 text-white outline-none focus:border-violet-500 transition-all placeholder:text-gray-600"
                    />
                    <button
                        onClick={handleCreateKey}
                        disabled={isCreating || !newKeyName.trim()}
                        className="bg-violet-600 hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-xl font-medium transition-colors flex items-center gap-2"
                    >
                        {isCreating ? "Generating..." : "Generate"}
                    </button>
                </div>

                {/* Display Generated Key */}
                {generatedKey && (
                    <div className="mt-4 bg-emerald-900/20 border border-emerald-500/30 rounded-xl p-4 animate-in zoom-in-95">
                        <div className="flex items-start gap-3">
                            <AlertTriangle className="text-emerald-400 shrink-0 mt-0.5" size={20} />
                            <div className="flex-1 overflow-hidden">
                                <p className="text-emerald-200 font-bold mb-1">Key Generated Successfully!</p>
                                <p className="text-emerald-400/80 text-xs mb-3">Copy this key now. You won't be able to see it again.</p>
                                <div className="bg-black/40 rounded-lg p-3 flex items-center justify-between gap-2 border border-emerald-500/20 group">
                                    <code className="text-emerald-300 font-mono text-sm break-all">{generatedKey}</code>
                                    <button
                                        onClick={() => copyToClipboard(generatedKey)}
                                        className="text-emerald-400 hover:text-white p-1.5 hover:bg-emerald-500/20 rounded-md transition-colors"
                                        title="Copy"
                                    >
                                        <Copy size={16} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Keys List */}
            <div className="space-y-3">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest pl-2 border-l-2 border-emerald-500">Active Keys</h3>

                {isLoading ? (
                    <div className="text-center py-8 text-gray-500 text-sm">Loading keys...</div>
                ) : keys.length === 0 ? (
                    <div className="text-center py-8 bg-white/5 rounded-2xl border border-white/5 border-dashed">
                        <Key className="mx-auto text-gray-600 mb-2" size={24} />
                        <p className="text-gray-400 text-sm">No active API keys found</p>
                    </div>
                ) : (
                    <div className="grid gap-3">
                        {keys.map((key) => (
                            <div key={key._id} className="bg-white/5 border border-white/5 rounded-xl p-4 flex items-center justify-between hover:bg-white/[0.07] transition-all group">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="font-medium text-white">{key.name}</span>
                                        <span className="text-[10px] bg-violet-500/20 text-violet-300 px-1.5 py-0.5 rounded border border-violet-500/30">
                                            {key.permissions?.[0] || "send_message"}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3 text-xs text-gray-500">
                                        <span>Created: {new Date(key.createdAt).toLocaleDateString()}</span>
                                        {key.lastUsed && (
                                            <span className="text-emerald-400/70 flex items-center gap-1">
                                                <Check size={10} /> Used {formatMessageTime(key.lastUsed)}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleRevokeKey(key._id)}
                                    className="text-gray-500 hover:text-red-400 p-2 hover:bg-red-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                                    title="Revoke Key"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Documentation Helper */}
            <div className="mt-8 p-4 bg-indigo-900/20 border border-indigo-500/30 rounded-xl">
                <h4 className="text-indigo-200 font-medium text-sm mb-2 flex items-center gap-2">
                    <Terminal size={14} /> Usage Example
                </h4>
                <div className="bg-black/50 p-3 rounded-lg overflow-x-auto text-[10px] md:text-xs text-gray-300 font-mono border border-white/5">
                    <span className="text-purple-400">curl</span> -X POST \<br />
                    &nbsp;&nbsp;{window.location.origin.replace('3000', '5001')}/api/external/message \<br />
                    &nbsp;&nbsp;-H <span className="text-green-400">"x-api-key: YOUR_KEY"</span> \<br />
                    &nbsp;&nbsp;-d <span className="text-orange-300">'&#123;"toUserId": "USER_ID", "text": "Hello"&#125;'</span>
                </div>
            </div>
        </div>
    );
};

export default DeveloperSettings;
