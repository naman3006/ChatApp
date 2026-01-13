import React, { useContext, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import assets from "../chat-assets/assets";
import { AuthContext } from "../context/authContext";
import { Camera, Trash2, User, FileText, Save, ArrowLeft } from "lucide-react";

export const ProfilePage = () => {
  const { authUser, updateProfile } = useContext(AuthContext);
  const [selectedImage, setSelectedImage] = useState(null);
  const navigate = useNavigate();
  const [name, setName] = useState(authUser.fullName);
  const [bio, setBio] = useState(authUser.bio);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (!selectedImage) {
        await updateProfile({ fullName: name, bio });
        toast.success("Profile updated successfully!");
        navigate("/");
        return;
      }

      const render = new FileReader();
      render.readAsDataURL(selectedImage);
      render.onload = async () => {
        const base64Image = render.result;
        await updateProfile({ profilePic: base64Image, fullName: name, bio });
        toast.success("Profile updated successfully!");
        navigate("/");
      };
    } catch (error) {
      toast.error("Failed to update profile");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveImage = async () => {
    if (!window.confirm("Are you sure you want to remove your profile picture?")) return;
    try {
      await updateProfile({ profilePic: "", fullName: name, bio });
      setSelectedImage(null);
      toast.success("Profile picture removed");
    } catch (error) {
      toast.error("Failed to remove profile picture");
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden bg-background">
      {/* Dynamic Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-violet-600/20 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-600/20 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: "1s" }}></div>
      </div>

      <div className="relative w-full max-w-4xl bg-card/40 backdrop-blur-2xl border border-border rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row animate-fade-in-up">

        {/* Left Side - Visual & Avatar */}
        <div className="w-full md:w-2/5 p-8 flex flex-col items-center justify-center bg-gradient-to-br from-violet-600/10 to-transparent border-b md:border-b-0 md:border-r border-border relative">
          <button onClick={() => navigate("/")} className="absolute top-6 left-6 p-2 rounded-full bg-secondary hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
            <ArrowLeft size={20} />
          </button>

          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-violet-600 to-indigo-600 rounded-full blur opacity-75 group-hover:opacity-100 transition duration-500"></div>
            <div className="relative w-40 h-40 md:w-56 md:h-56 rounded-full overflow-hidden border-4 border-background shadow-2xl">
              <img
                src={
                  selectedImage
                    ? URL.createObjectURL(selectedImage)
                    : authUser?.profilePic || assets.avatar_icon
                }
                alt="Profile"
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              />

              <label htmlFor="avatar" className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 cursor-pointer backdrop-blur-sm">
                <Camera className="w-8 h-8 text-white mb-2" />
                <span className="text-white text-sm font-medium">Change Photo</span>
              </label>
              <input
                onChange={(e) => setSelectedImage(e.target.files[0])}
                type="file"
                id="avatar"
                accept=".png, .jpg, .jpeg"
                hidden
              />
            </div>

            {(selectedImage || authUser?.profilePic) && (
              <button
                onClick={handleRemoveImage}
                className="absolute bottom-2 right-2 p-3 bg-red-500/80 hover:bg-red-600 text-white rounded-full shadow-lg backdrop-blur-md transition-all duration-300 hover:scale-110"
                title="Remove Profile Picture"
              >
                <Trash2 size={18} />
              </button>
            )}
          </div>

          <h2 className="mt-6 text-2xl font-bold text-foreground text-center bg-clip-text text-transparent bg-gradient-to-r from-foreground to-muted-foreground">
            {authUser.fullName}
          </h2>
          <p className="text-muted-foreground text-sm mt-1 text-center font-medium">
            Full Stack Developer
          </p>
        </div>

        {/* Right Side - Form */}
        <div className="w-full md:w-3/5 p-8 md:p-12">
          <div className="mb-8">
            <h3 className="text-3xl font-bold text-foreground mb-2">Edit Profile</h3>
            <p className="text-muted-foreground">Update your personal information</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <User size={16} className="text-violet-500" /> Full Name
              </label>
              <input
                onChange={(e) => setName(e.target.value)}
                value={name}
                type="text"
                required
                placeholder="Your name"
                className="w-full bg-secondary/50 border border-border rounded-xl px-4 py-3 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all duration-300 backdrop-blur-sm"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <FileText size={16} className="text-violet-500" /> Bio
              </label>
              <textarea
                onChange={(e) => setBio(e.target.value)}
                value={bio}
                placeholder="Tell us about yourself..."
                required
                className="w-full bg-secondary/50 border border-border rounded-xl px-4 py-3 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all duration-300 backdrop-blur-sm min-h-[120px] resize-none"
              ></textarea>
            </div>

            <div className="pt-4 flex items-center gap-4">
              <button
                type="button"
                onClick={() => navigate("/")}
                className="px-6 py-3 rounded-xl text-muted-foreground font-medium hover:text-foreground hover:bg-secondary/80 transition-all duration-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white px-8 py-3 rounded-xl font-semibold shadow-lg shadow-violet-500/25 flex items-center justify-center gap-2 transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Save size={18} /> Save Changes
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};