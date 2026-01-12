import React from 'react';
import Skeleton from './Skeleton';

const MessageSkeleton = () => {
    return (
        <div className="flex flex-col gap-6 p-4 w-full h-full overflow-hidden justify-end pb-20">
            {/* Incoming Message Skeleton */}
            <div className="flex items-end gap-3 justify-start max-w-[85%] animate-pulse delay-75">
                <Skeleton className="w-8 h-8 rounded-full flex-shrink-0 mb-1" />
                <Skeleton className="h-12 w-48 rounded-2xl rounded-tl-none" />
            </div>

            {/* Outgoing Message Skeleton */}
            <div className="flex items-end gap-3 justify-end self-end max-w-[85%] w-full animate-pulse delay-100">
                <Skeleton className="h-16 w-64 rounded-2xl rounded-tr-none bg-indigo-500/10" />
            </div>

            {/* Incoming Message Skeleton (Short) */}
            <div className="flex items-end gap-3 justify-start max-w-[85%] animate-pulse delay-150">
                <Skeleton className="w-8 h-8 rounded-full flex-shrink-0 mb-1" />
                <Skeleton className="h-10 w-32 rounded-2xl rounded-tl-none" />
            </div>

            {/* Outgoing Message Skeleton (Image) */}
            <div className="flex items-end gap-3 justify-end self-end max-w-[85%] w-full animate-pulse delay-200">
                <Skeleton className="h-48 w-48 rounded-2xl rounded-tr-none bg-indigo-500/10" />
            </div>

            {/* Incoming Message Skeleton */}
            <div className="flex items-end gap-3 justify-start max-w-[85%] animate-pulse delay-300">
                <Skeleton className="w-8 h-8 rounded-full flex-shrink-0 mb-1" />
                <Skeleton className="h-20 w-56 rounded-2xl rounded-tl-none" />
            </div>
        </div>
    );
};
export default MessageSkeleton;
