import React, { useState, useRef, useCallback, useEffect, useContext } from "react";
import { Sidebar } from "../components/Sidebar";
import { ChatContainer } from "../components/ChatContainer";
import { ChatContext } from "../context/ChatContext";

export const HomePage = () => {
  const { selectedUser, selectedGroup } = useContext(ChatContext);
  const [sidebarWidth, setSidebarWidth] = useState(350);
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef(null);

  const startResizing = useCallback(() => {
    setIsResizing(true);
  }, []);

  const stopResizing = useCallback(() => {
    setIsResizing(false);
  }, []);

  const resize = useCallback(
    (mouseMoveEvent) => {
      if (isResizing) {
        // Calculate new width based on mouse position
        // We assume the sidebar is on the left
        const newWidth = mouseMoveEvent.clientX;

        // Min width 250px, Max width 600px (or 50% of screen?)
        if (newWidth >= 250 && newWidth <= 600) {
          setSidebarWidth(newWidth);
        }
      }
    },
    [isResizing]
  );

  useEffect(() => {
    window.addEventListener("mousemove", resize);
    window.addEventListener("mouseup", stopResizing);
    return () => {
      window.removeEventListener("mousemove", resize);
      window.removeEventListener("mouseup", stopResizing);
    };
  }, [resize, stopResizing]);

  return (
    <div className="w-full h-full bg-background text-foreground overflow-hidden relative">
      {/* Background Mesh Gradient */}
      <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-200 via-purple-100 to-teal-50 opacity-60 dark:opacity-0 pointer-events-none"></div>
      <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-rose-100 via-sky-100 to-violet-100 opacity-60 dark:opacity-0 pointer-events-none"></div>

      {/* Main Layout Container */}
      <div
        className="w-full h-full backdrop-blur-xl bg-background/60 flex flex-col md:flex-row relative z-10"
        style={{ '--sidebar-width': `${sidebarWidth}px` }}
      >
        {/* Sidebar Wrapper */}
        <div
          ref={sidebarRef}
          className={`${selectedUser || selectedGroup ? "hidden md:flex" : "flex"} w-full md:w-[var(--sidebar-width)] flex-shrink-0 flex-col relative h-full min-h-0`}
        >
          <Sidebar />
        </div>

        {/* Resizer Handle (Desktop Only) */}
        <div
          className={`hidden md:flex w-1 cursor-col-resize items-center justify-center hover:bg-violet-500/50 transition-colors z-20 select-none ${isResizing ? 'bg-violet-500' : 'bg-transparent'}`}
          onMouseDown={startResizing}
        >
          {/* Optional Handle Visual */}
          <div className={`h-8 w-0.5 rounded-full bg-border transition-colors ${isResizing ? 'bg-white' : ''}`} />
        </div>

        {/* Chat Container */}
        <div className={`flex-1 min-w-0 ${!selectedUser && !selectedGroup ? "hidden md:flex" : "flex"} h-full`}>
          <ChatContainer />
        </div>

        {/* Overlay while resizing to prevent iframe (if any) or text selection interference */}
        {isResizing && (
          <div className="fixed inset-0 z-50 cursor-col-resize" />
        )}
      </div>
    </div>
  );
};
