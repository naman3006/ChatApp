import React from 'react';
import Skeleton from './Skeleton';

const SidebarSkeleton = () => {
    return (
        <div className="flex flex-col gap-3 w-full">
            {[...Array(8)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-2 pl-4">
                    <Skeleton className="w-[35px] h-[35px] rounded-full flex-shrink-0" />
                    <div className="flex flex-col gap-2 flex-1">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-20" />
                    </div>
                </div>
            ))}
        </div>
    );
};

export default SidebarSkeleton;
