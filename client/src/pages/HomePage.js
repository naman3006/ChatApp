import React, { useContext } from "react";
import { Sidebar } from "../components/Sidebar";
import { ChatContainer } from "../components/ChatContainer";
import { RightSidebar } from "../components/RightSidebar";
import { ChatContext } from "../context/ChatContext";

export const HomePage = () => {
  const { selectedUser, selectedGroup } = useContext(ChatContext);

  return (
    <div className="w-full h-screen bg-gray-900 text-gray-100 sm:px-[5%] sm:py-[5%]">
      <div
        className={`w-full h-full backdrop-blur-xl bg-gray-800/40 border border-gray-700 sm:rounded-2xl overflow-hidden grid grid-cols-1 ${selectedUser || selectedGroup
            ? "md:grid-cols-[350px_1fr_0px] lg:grid-cols-[350px_1fr_0px] xl:grid-cols-[350px_1fr_350px]"
            : "md:grid-cols-[350px_1fr]"
          }`}
      >
        <Sidebar />
        <ChatContainer />
        <RightSidebar />
      </div>
    </div>
  );
};
