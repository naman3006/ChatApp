import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/authContext';
import { Eye, EyeOff, User, Mail, Lock, ArrowRight, Github, Twitter, Linkedin } from 'lucide-react';


export const LoginPage = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    bio: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useContext(AuthContext);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isSignUp) {
      // Signup logic
      login("signup", formData);
    } else {
      // Login logic
      login("login", { email: formData.email, password: formData.password });
    }
  };

  const toggleMode = () => {
    setIsSignUp(!isSignUp);
    setFormData({ fullName: '', email: '', password: '', bio: '' }); // Reset form
  };

  return (
    <div className="h-full w-full bg-[#0a0a0a] flex items-center justify-center p-4 relative overflow-y-auto perspective-1000">

      {/* 3D Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[10%] left-[10%] w-64 h-64 bg-purple-600/20 rounded-full blur-[80px] animate-pulse-glow" />
        <div className="absolute bottom-[20%] right-[10%] w-80 h-80 bg-blue-600/20 rounded-full blur-[80px] animate-pulse-glow" style={{ animationDelay: '2s' }} />

        {/* Floating Shapes */}
        <div className="absolute top-[15%] left-[20%] w-16 h-16 border-2 border-white/10 rounded-2xl transform rotate-12 animate-float backdrop-blur-sm" />
        <div className="absolute bottom-[25%] right-[25%] w-24 h-24 border-2 border-white/5 rounded-full animate-float-delayed backdrop-blur-sm" />
        <div className="absolute top-[40%] right-[10%] w-12 h-12 bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-lg transform -rotate-12 animate-float" style={{ animationDelay: '1s' }} />
      </div>

      {/* Main Container */}
      <div className={`relative bg-zinc-900 rounded-[30px] shadow-2xl w-full max-w-[1000px] min-h-[600px] overflow-hidden flex flex-col md:flex-row transition-all duration-700 ease-in-out border border-white/10 z-10 ${isSignUp ? 'md:flex-row-reverse' : ''}`}>

        {/* Form Container */}
        <div className={`w-full md:w-1/2 p-8 md:p-12 flex flex-col justify-center transition-all duration-700 ${isSignUp ? 'md:translate-x-0' : ''}`}>

          <div className="mb-8 text-center md:text-left">
            <h2 className="text-3xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent mb-2">
              {isSignUp ? 'Create Account' : 'Welcome Back'}
            </h2>
            <p className="text-gray-400 text-sm">
              {isSignUp ? 'Join our community today' : 'Please enter your details'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">

            {isSignUp && (
              <div className="relative group">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-purple-500 transition-colors" />
                <input
                  type="text"
                  name="fullName"
                  placeholder="Full Name"
                  value={formData.fullName}
                  onChange={handleInputChange}
                  required
                  className="w-full bg-zinc-800/50 border border-zinc-700 text-white pl-10 pr-4 py-3 rounded-xl focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all placeholder:text-gray-600"
                />
              </div>
            )}

            <div className="relative group">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-purple-500 transition-colors" />
              <input
                type="email"
                name="email"
                placeholder="Email Address"
                value={formData.email}
                onChange={handleInputChange}
                required
                className="w-full bg-zinc-800/50 border border-zinc-700 text-white pl-10 pr-4 py-3 rounded-xl focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all placeholder:text-gray-600"
              />
            </div>

            <div className="relative group">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-purple-500 transition-colors" />
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="Password"
                value={formData.password}
                onChange={handleInputChange}
                required
                className="w-full bg-zinc-800/50 border border-zinc-700 text-white pl-10 pr-12 py-3 rounded-xl focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all placeholder:text-gray-600"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            {isSignUp && (
              <div className="relative group">
                <textarea
                  name="bio"
                  placeholder="Tell us a bit about yourself (Bio)"
                  value={formData.bio}
                  onChange={handleInputChange}
                  rows="3"
                  className="w-full bg-zinc-800/50 border border-zinc-700 text-white px-4 py-3 rounded-xl focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all placeholder:text-gray-600 resize-none"
                />
              </div>
            )}

            {!isSignUp && (
              <div className="flex justify-end">
                <a href="/forgot-password" className="text-sm text-purple-400 hover:text-purple-300 transition-colors">
                  Forgot Password?
                </a>
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-medium py-3 rounded-xl flex items-center justify-center gap-2 transform active:scale-[0.98] transition-all shadow-lg shadow-purple-900/20"
            >
              {isSignUp ? 'Sign Up' : 'Sign In'}
              <ArrowRight className="w-5 h-5" />
            </button>

            {/* Social Login Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-zinc-700"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-zinc-900 text-gray-500">Or continue with</span>
              </div>
            </div>

            {/* Social Icons (Visual Only) */}
            <div className="flex justify-center gap-4">
              <button type="button" className="p-2 rounded-lg bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 hover:border-zinc-600 transition-all text-white">
                <Github className="w-5 h-5" />
              </button>
              <button type="button" className="p-2 rounded-lg bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 hover:border-zinc-600 transition-all text-blue-400">
                <Twitter className="w-5 h-5" />
              </button>
              <button type="button" className="p-2 rounded-lg bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 hover:border-zinc-600 transition-all text-blue-600">
                <Linkedin className="w-5 h-5" />
              </button>
            </div>

            {/* Mobile Toggle */}
            <div className="mt-6 text-center md:hidden">
              <p className="text-gray-400 text-sm">
                {isSignUp ? "Already have an account?" : "Don't have an account?"}
                <button
                  type="button"
                  onClick={toggleMode}
                  className="ml-2 text-purple-400 font-medium hover:underline"
                >
                  {isSignUp ? 'Login' : 'Sign Up'}
                </button>
              </p>
            </div>

          </form>
        </div>

        {/* Overlay / Side Panel (Desktop Only) */}
        <div className="hidden md:flex w-1/2 bg-gradient-to-br from-purple-600 to-blue-900 relative items-center justify-center p-12 overflow-hidden">

          {/* Animated Background Overlay */}
          <div className="absolute inset-0">
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150"></div>
            <div className="absolute -top-1/2 -left-1/2 w-[200%] h-[200%] bg-gradient-to-br from-transparent via-white/10 to-transparent rotate-45 animate-shimmer pointer-events-none"></div>
          </div>

          <div className="relative z-10 text-center text-white space-y-6 max-w-sm">
            <h2 className="text-4xl font-bold tracking-tight mb-4">
              {isSignUp ? 'Already Joined?' : 'New Here?'}
            </h2>
            <p className="text-blue-100 text-lg leading-relaxed">
              {isSignUp
                ? 'To keep connected with us please login with your personal info.'
                : 'Sign up and discover a great amount of new opportunities!'}
            </p>
            <button
              onClick={toggleMode}
              className="px-8 py-3 bg-transparent border-2 border-white rounded-xl font-semibold hover:bg-white hover:text-purple-700 transition-all transform hover:scale-105 active:scale-95 shadow-lg"
            >
              {isSignUp ? 'Sign In' : 'Sign Up'}
            </button>
          </div>

          {/* 3D Decor in Overlay */}
          <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-black/20 to-transparent pointer-events-none"></div>
        </div>

      </div>
    </div>
  );
};
