import React, { useContext } from 'react';
import { StatusContext } from '../context/StatusContext';
import { AuthContext } from '../context/authContext';
import { Plus } from 'lucide-react';

const StatusList = ({ onOpenViewer, onCreateStatus }) => {
    const { statuses } = useContext(StatusContext);
    const { authUser } = useContext(AuthContext);

    // Find my status
    const myStatusGroup = statuses.find(s => s.user._id === authUser._id);
    const otherStatuses = statuses.filter(s => s.user._id !== authUser._id);

    return (
        <div className="flex gap-3 overflow-x-auto px-4 py-2 scrollbar-none select-none">
            {/* My Status */}
            <div className="flex flex-col items-center gap-1 min-w-[60px] cursor-pointer group" onClick={() => myStatusGroup ? onOpenViewer(authUser._id) : onCreateStatus()}>
                <div className={`relative w-[52px] h-[52px] rounded-full p-[2px] transition-transform group-hover:scale-105 ${myStatusGroup ? 'bg-gradient-to-tr from-yellow-400 to-fuchsia-600' : 'border-2 border-dashed border-gray-600 group-hover:border-gray-400'}`}>
                    <img
                        src={authUser?.profilePic || "/avatar.png"}
                        alt="My Status"
                        className="w-full h-full rounded-full object-cover border-2 border-[#131313]"
                    />
                    {!myStatusGroup && (
                        <div className="absolute bottom-0 right-0 bg-violet-600 rounded-full p-1 border-2 border-[#131313]">
                            <Plus size={10} className="text-white" />
                        </div>
                    )}
                </div>
                <span className="text-[10px] text-gray-400 font-medium">Your Story</span>
            </div>

            {/* Other Statuses */}
            {otherStatuses.map((statusGroup) => {
                const hasUnseen = statusGroup.statuses.some(s => !s.viewers.some(v => v.userId === authUser._id));

                return (
                    <div key={statusGroup.user._id} className="flex flex-col items-center gap-1 min-w-[60px] cursor-pointer group" onClick={() => onOpenViewer(statusGroup.user._id)}>
                        <div className={`w-[52px] h-[52px] rounded-full p-[2px] transition-transform group-hover:scale-105 ${hasUnseen ? 'bg-gradient-to-tr from-yellow-400 to-fuchsia-600' : 'bg-gray-700'}`}>
                            <img
                                src={statusGroup.user.profilePic || "/avatar.png"}
                                alt={statusGroup.user.fullName}
                                className="w-full h-full rounded-full object-cover border-2 border-[#131313]"
                            />
                        </div>
                        <span className="text-[10px] text-gray-400 font-medium truncate w-14 text-center">{statusGroup.user.fullName.split(" ")[0]}</span>
                    </div>
                )
            })}
        </div>
    );
};

export default StatusList;
