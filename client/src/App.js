import { Routes, Route, Navigate, useLocation } from "react-router-dom";
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
import JoinPage from "./pages/JoinPage";

import { Loader } from "lucide-react";

// Wrapper to redirect authenticated users
const AuthRedirect = ({ children }) => {
  const { authUser } = useContext(AuthContext);
  const location = useLocation();

  if (authUser) {
    return <Navigate to={location.state?.from || "/"} replace />;
  }

  return children;
};

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
          element={<AuthRedirect><LoginPage /></AuthRedirect>}
        />
        <Route
          path="/forgot-password"
          element={<AuthRedirect><ForgotPasswordPage /></AuthRedirect>}
        />
        <Route
          path="/reset-password/:token"
          element={<AuthRedirect><ResetPasswordPage /></AuthRedirect>}
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
        <Route
          path="/invite/:code"
          element={<JoinPage />}
        />
      </Routes>
    </div>
  );
}

export default App;
