import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, Mail, ArrowLeft } from "lucide-react";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";

const ForgotPasswordPage = () => {
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [previewUrl, setPreviewUrl] = useState("");

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!email) return;

        setLoading(true);
        try {
            const response = await axiosInstance.post("/auth/forgot-password", { email });
            setIsSubmitted(true);
            if (response.data.previewUrl) {
                setPreviewUrl(response.data.previewUrl);
            }
            toast.success("Reset link sent!");
        } catch (error) {
            toast.error(error.response?.data?.message || "Something went wrong");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-background">
            <div className="w-full max-w-md bg-card/80 backdrop-blur-md rounded-xl shadow-xl border border-border p-8">
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold text-foreground mb-2">
                        Reset Password
                    </h1>
                    <p className="text-muted-foreground text-sm">
                        {!isSubmitted
                            ? "Enter your email address and we'll send you a link to reset your password."
                            : "Check your email for the reset link."}
                    </p>
                </div>

                {!isSubmitted ? (
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">
                                Email Address
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-white placeholder:text-gray-400"
                                    placeholder="you@example.com"
                                    required
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Sending Link...
                                </>
                            ) : (
                                "Send Reset Link"
                            )}
                        </button>
                    </form>
                ) : (
                    <div className="text-center space-y-6">
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                            <Mail className="w-8 h-8 text-green-600" />
                        </div>
                        <div className="text-sm text-muted-foreground bg-secondary/50 p-4 rounded-lg">
                            If an account exists for <b>{email}</b>, you will receive a password reset link shortly.
                        </div>

                        {previewUrl && (
                            <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                                <p className="text-sm text-blue-400 mb-2">Development Mode: Ethereal Link</p>
                                <a href={previewUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 underline text-sm break-all hover:text-blue-400">
                                    Click here to view email
                                </a>
                            </div>
                        )}

                        <button
                            onClick={() => setIsSubmitted(false)}
                            className="text-primary hover:underline text-sm font-medium"
                        >
                            Resend link?
                        </button>
                    </div>
                )}

                <div className="mt-8 text-center">
                    <Link
                        to="/login"
                        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group"
                    >
                        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                        Back to Login
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default ForgotPasswordPage;
