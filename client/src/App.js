import "./App.css";
import { Routes, Route, Navigate } from "react-router-dom";
import { HomePage } from "./pages/HomePage";
import { LoginPage } from "./pages/LoginPage";
import { ProfilePage } from "./pages/ProfilePage";
import SettingsPage from "./pages/SettingsPage";
import { Toaster } from "react-hot-toast";
import { useContext } from "react";
import { AuthContext } from "./context/authContext";
import VideoCall from "./components/VideoCall";
import CallNotification from "./components/CallNotification";

function App() {
  const { authUser } = useContext(AuthContext);

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
          path="/profile"
          element={authUser ? <ProfilePage /> : <Navigate to="/login" />}
        />
        <Route
          path="/settings"
          element={authUser ? <SettingsPage /> : <Navigate to="/login" />}
        />
      </Routes>
    </div>
  );
}

export default App;
