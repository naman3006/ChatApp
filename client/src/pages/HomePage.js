import React from "react";
import { Sidebar } from "../components/Sidebar";
import { ChatContainer } from "../components/ChatContainer";

export const HomePage = () => {
  // const { selectedUser, selectedGroup } = useContext(ChatContext); // Removed unused variables

  return (
    <div className="w-full h-[100dvh] bg-background text-foreground overflow-hidden relative">
      {/* Background Mesh Gradient */}
      <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-200 via-purple-100 to-teal-50 opacity-60 dark:opacity-0 pointer-events-none"></div>
      <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-rose-100 via-sky-100 to-violet-100 opacity-60 dark:opacity-0 pointer-events-none"></div>

      <div
        className="w-full h-full backdrop-blur-xl bg-background/60 grid grid-cols-1 md:grid-cols-[350px_1fr] relative z-10"
      >
        <Sidebar />
        <ChatContainer />
      </div>
    </div>
  );
};
