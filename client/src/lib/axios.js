import axios from "axios";

// Use REACT_APP_BACKEND_URL if available (set by our script), otherwise fallback to localhost
const BASE_URL = process.env.REACT_APP_BACKEND_URL
    ? `${process.env.REACT_APP_BACKEND_URL}/api`
    : (process.env.NODE_ENV === "development" ? "http://localhost:5001/api" : "/api");

export const axiosInstance = axios.create({
    baseURL: BASE_URL,
    withCredentials: true,
    headers: {
        "Bypass-Tunnel-Reminder": "true"
    }
});
