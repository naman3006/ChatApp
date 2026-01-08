import React, { useContext, useEffect, useState } from "react";
import assets from "../chat-assets/assets";
import { ReportModal } from "./ReportModal";
import { ChatContext } from "../context/ChatContext";
import { AuthContext } from "../context/authContext";

export const RightSidebar = () => {
  const { selectedUser, messages, blockUser, unblockUser, reportUser } = useContext(ChatContext);
  const { logout, onlineUsers, authUser } = useContext(AuthContext);
  const [msgImages, setMsgImages] = useState([]);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  useEffect(() => {
    setMsgImages(messages.filter((msg) => msg.image).map((msg) => msg.image));
  }, [messages]);

  const isBlocked = authUser?.blockedUsers?.includes(selectedUser?._id);

  const handleBlockToggle = async () => {
    if (isBlocked) {
      await unblockUser(selectedUser._id);
    } else {
      await blockUser(selectedUser._id);
    }
  };

  const handleReportSubmit = async (reason, description) => {
    await reportUser(selectedUser._id, reason, description);
  };

  return (
    selectedUser && (
      <div
        className={`hidden xl:block bg-[#818582]/10 text-white w-full relative overflow-y-scroll border-l border-gray-700/30 ${selectedUser ? "max-md:hidden" : ""}`}
      >
        <div className="pt-16  flex flex-col items-center gap-5 text-xs font-light m-auto">
          <img
            src={selectedUser?.profilePic || assets.avatar_icon}
            alt=""
            className="w-20 aspect-[1/1] rounded-full"
          />

          <h1 className="px-5 mx-auto  text-xl font-medium  flex items-center gap-2">
            {onlineUsers.includes(selectedUser._id) && (
              <p className="w-2 h-2 rounded-full bg-green-500"></p>
            )}
            {selectedUser.fullName}
          </h1>
          <p className="px-10 mt-10 mx-auto">{selectedUser.bio}</p>
        </div>
        <hr className="border-[#ffffff50] my-4" />

        <div className="px-5 text-xs mb-8">
          <p>Media</p>
          <div className="mt-2 max-h-[200px] overflow-y-scroll grid grid-cols-2 gap-4 opacity-80">
            {msgImages.map((url, index) => (
              <div
                key={index}
                onClick={() => window.open(url)}
                className="cursor-pointer rounded"
              >
                <img src={url} alt="" className="h-full rounded-md" />
              </div>
            ))}
          </div>
        </div>

        <div className="px-5 flex flex-col gap-3">
          <button
            onClick={handleBlockToggle}
            className={`w-full py-2 rounded-lg text-sm font-medium transition-colors ${isBlocked ? 'bg-gray-600 hover:bg-gray-700' : 'bg-red-600/80 hover:bg-red-700'}`}
          >
            {isBlocked ? "Unblock User" : "Block User"}
          </button>
          <button
            onClick={() => setIsReportModalOpen(true)}
            className="w-full py-2 rounded-lg text-sm font-medium bg-yellow-600/80 hover:bg-yellow-700 transition-colors"
          >
            Report User
          </button>
        </div>

        <button
          onClick={() => logout()}
          className="absolute bottom-5 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-purple-400 to-violet-600 text-white border-none text-sm font-light py-2 px-20 rounded-full cursor-pointer"
        >
          Logout
        </button>

        <ReportModal
          isOpen={isReportModalOpen}
          onClose={() => setIsReportModalOpen(false)}
          onSubmit={handleReportSubmit}
          reportingUser={selectedUser}
        />
      </div>
    )
  );
};
