/* eslint-disable react-hooks/exhaustive-deps */
import { createContext, useEffect, useState } from "react";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";
import { io } from "socket.io-client";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(sessionStorage.getItem("token"));
  const [authUser, setAuthUser] = useState(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true); // Add loading state
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [socket, setSocket] = useState(null);

  // Set initial token header if exists
  if (token) {
    axiosInstance.defaults.headers.common["token"] = token;
  }

  const checkAuth = async () => {
    try {
      const { data } = await axiosInstance.put("/auth/check");
      if (data.success) {
        if (data.user) {
          setAuthUser(data.user);
          connectSocket(data.user);
        } else {
          // Token valid but user null? Handled by backend usually
        }
      } else {
        // If check failed logic
        setAuthUser(null);
        sessionStorage.removeItem("token");
        setToken(null);
      }
    } catch (error) {
      console.log(error);
      setAuthUser(null);
    } finally {
      setIsCheckingAuth(false);
    }
  };

  const login = async (state, credentials) => {
    try {
      const { data } = await axiosInstance.post(`/auth/${state}`, credentials);
      if (data.success) {
        setAuthUser(data.userData);
        connectSocket(data.userData);
        axiosInstance.defaults.headers.common["token"] = data.token;
        setToken(data.token);
        sessionStorage.setItem("token", data.token);
        toast.success(data.message);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      // Handle axios error response structure
      toast.error(error.response?.data?.message || error.message);
    }
  };

  const logout = async () => {
    sessionStorage.removeItem("token");
    setToken(null);
    setAuthUser(null);
    setOnlineUsers([]);
    delete axiosInstance.defaults.headers.common["token"];
    toast.success("Logged out successfully");
    if (socket) {
      socket.disconnect();
      setSocket(null);
    }
  };

  const updateProfile = async (body) => {
    try {
      const { data } = await axiosInstance.put("/auth/update-profile", body);
      if (data.success) {
        setAuthUser(data.user);
        toast.success("Profile updated successfully");
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.message);
    }
  };

  const connectSocket = (userData) => {
    if (!userData || socket?.connected) return;
    console.log("Initialize Socket Connection...");
    const backendUrl = process.env.REACT_APP_BACKEND_URL || (process.env.NODE_ENV === "development" ? "http://localhost:5001" : "/");
    console.log("Socket Backend URL:", backendUrl);

    const newSocket = io(backendUrl, {
      query: {
        userId: userData._id,
        isGhostMode: userData.privacy?.ghostMode || false,
      },
    });
    newSocket.on("connect", () => {
      console.log("Socket Connected Successfully!", newSocket.id);
    });
    newSocket.on("connect_error", (err) => {
      console.error("Socket Connection Failed:", err.message);
    });
    newSocket.connect();
    setSocket(newSocket);
    newSocket.on("getOnlineUsers", (userIds) => {
      setOnlineUsers(userIds);
    });
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const value = {
    checkAuth,
    isCheckingAuth,
    axios: axiosInstance,
    authUser,
    onlineUsers,
    socket,
    login,
    logout,
    updateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
