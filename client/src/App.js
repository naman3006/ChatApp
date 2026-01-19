import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { useContext, lazy, Suspense } from "react"; // Added lazy, Suspense
import { AuthContext } from "./context/authContext";
import VideoCall from "./components/VideoCall";
import CallNotification from "./components/CallNotification";
import { Loader } from "lucide-react";

// Lazy Loaded Components
const HomePage = lazy(() => import("./pages/HomePage").then(module => ({ default: module.HomePage })));
const LoginPage = lazy(() => import("./pages/LoginPage").then(module => ({ default: module.LoginPage })));
const ProfilePage = lazy(() => import("./pages/ProfilePage").then(module => ({ default: module.ProfilePage })));
const UserProfilePage = lazy(() => import("./pages/UserProfilePage").then(module => ({ default: module.UserProfilePage })));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const ForgotPasswordPage = lazy(() => import("./pages/ForgotPasswordPage"));
const ResetPasswordPage = lazy(() => import("./pages/ResetPasswordPage"));
const JoinPage = lazy(() => import("./pages/JoinPage"));

// Wrapper to redirect authenticated users
const AuthRedirect = ({ children }) => {
  const { authUser } = useContext(AuthContext);
  const location = useLocation();

  if (authUser) {
    return <Navigate to={location.state?.from || "/"} replace />;
  }

  return children;
};

// Loading Component for Suspense Fallback
const PageLoader = () => (
  <div className="flex items-center justify-center h-screen w-full bg-slate-900">
    <Loader className="size-10 animate-spin text-white" />
  </div>
);

function App() {
  const { authUser, isCheckingAuth } = useContext(AuthContext);

  if (isCheckingAuth && !authUser) {
    return <PageLoader />;
  }

  return (
    <div className="bg-[url('../src/chat-assets/bgImage.svg')] bg-contain">
      <Toaster />
      <VideoCall />
      <CallNotification />
      <Suspense fallback={<PageLoader />}>
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
      </Suspense>
    </div>
  );
}

export default App;
