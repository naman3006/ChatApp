import "./App.css";
import { Routes, Route, Navigate } from "react-router-dom";
import { HomePage } from "./pages/HomePage";
import { LoginPage } from "./pages/LoginPage";
import { ProfilePage } from "./pages/ProfilePage";
import { UserProfilePage } from "./pages/UserProfilePage";
import SettingsPage from "./pages/SettingsPage";
import { Toaster } from "react-hot-toast";
import { useContext } from "react";
import { AuthContext } from "./context/authContext";
import VideoCall from "./components/VideoCall";
import CallNotification from "./components/CallNotification";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";

import { Loader } from "lucide-react";

function App() {
  const { authUser, isCheckingAuth } = useContext(AuthContext);

  if (isCheckingAuth && !authUser) {
    return (
      <div className="flex items-center justify-center h-screen w-full bg-slate-900">
        <Loader className="size-10 animate-spin text-white" />
      </div>
    )
  }

  return (
    <div className="bg-[url('../src/chat-assets/bgImage.svg')] bg-contain">
      <Toaster />
      <VideoCall />
      <CallNotification />
      <Routes>
        <Route
          path="/"
          element={authUser ? <HomePage /> : <Navigate to="/login" />}
        />
        <Route
          path="/login"
          element={!authUser ? <LoginPage /> : <Navigate to="/" />}
        />
        <Route
          path="/forgot-password"
          element={!authUser ? <ForgotPasswordPage /> : <Navigate to="/" />}
        />
        <Route
          path="/reset-password/:token"
          element={!authUser ? <ResetPasswordPage /> : <Navigate to="/" />}
        />
        <Route
          path="/profile"
          element={authUser ? <ProfilePage /> : <Navigate to="/login" />}
        />
        <Route
          path="/settings"
          element={authUser ? <SettingsPage /> : <Navigate to="/login" />}
        />
        <Route
          path="/user/:userId"
          element={authUser ? <UserProfilePage /> : <Navigate to="/login" />}
        />
      </Routes>
    </div>
  );
}

export default App;
