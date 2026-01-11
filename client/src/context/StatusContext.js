/* eslint-disable react-hooks/exhaustive-deps */
import { createContext, useContext, useEffect, useState } from "react";
import { AuthContext } from "../context/authContext";
import toast from "react-hot-toast";

export const StatusContext = createContext();

export const StatusProvider = ({ children }) => {
    const [statuses, setStatuses] = useState([]); // Array of grouped statuses: [{ _id, user, statuses: [] }]
    const [loading, setLoading] = useState(false);
    const { axios, authUser } = useContext(AuthContext);

    const getStatuses = async () => {
        // Avoid loader flicker for background updates, but if empty, show loading
        if (statuses.length === 0) setLoading(true);
        try {
            const { data } = await axios.get("/status");
            if (data.success) {
                setStatuses(data.statuses);
            }
        } catch (error) {
            console.error("Failed to fetch statuses", error);
        } finally {
            setLoading(false);
        }
    };

    const createStatus = async (media, type, caption, music) => {
        const toastId = toast.loading("Posting status...");
        try {
            const { data } = await axios.post("/status", { media, type, caption, music });
            if (data.success) {
                toast.success("Status posted!", { id: toastId });
                await getStatuses();
                return true;
            }
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to post status", { id: toastId });
            return false;
        }
    };

    const viewStatus = async (id) => {
        try {
            await axios.post(`/status/${id}/view`);
        } catch (error) {
            console.error(error);
        }
    };

    const deleteStatus = async (id) => {
        try {
            const { data } = await axios.delete(`/status/${id}`);
            if (data.success) {
                toast.success("Status deleted");
                getStatuses(); // Refresh
                return true;
            }
        } catch (error) {
            toast.error("Failed to delete status");
            return false;
        }
    }

    // Initial fetch
    useEffect(() => {
        if (authUser) {
            getStatuses();
        }
    }, [authUser]);

    return (
        <StatusContext.Provider value={{
            statuses,
            loading,
            getStatuses,
            createStatus,
            viewStatus,
            deleteStatus
        }}>
            {children}
        </StatusContext.Provider>
    );
};
