import React, { useContext } from "react";
import { ChatContext } from "../context/ChatContext";
import { AuthContext } from "../context/authContext";

const PollBubble = ({ message }) => {
    const { pollDetails, votePoll } = useContext(ChatContext);
    const { authUser } = useContext(AuthContext);

    // Poll data might be populated in message.pollId or handled via separate state if updated real-time
    // For simplicity implementation plan, we assume message.pollId gets populated with initial data,
    // but real-time updates might need to come from a polls map in context if we want live progress bars without refetching messages.
    // HOWEVER, let's use the data from message.pollId first. If we update the poll via socket, we should update the message in the messages array.

    const poll = message.pollId;

    if (!poll || typeof poll === 'string') return <div className="text-red-500 text-xs">Loading Poll...</div>;

    const totalVotes = poll.options.reduce((acc, opt) => acc + opt.votes.length, 0);

    const handleVote = (index) => {
        votePoll(poll._id, index);
    };

    return (
        <div className={`rounded-2xl p-4 min-w-[280px] max-w-sm shadow-sm border ${message.senderId === authUser._id ? 'bg-violet-600/90 border-violet-500' : 'bg-gray-800/90 border-gray-700'} backdrop-blur-sm`}>
            <h3 className="text-white font-medium mb-3 text-lg leading-snug">{poll.question}</h3>
            <div className="space-y-2">
                {poll.options.map((option, index) => {
                    const voteCount = option.votes.length;
                    const percentage = totalVotes === 0 ? 0 : Math.round((voteCount / totalVotes) * 100);
                    const isVoted = option.votes.includes(authUser._id);

                    return (
                        <div
                            key={index}
                            className="relative cursor-pointer group"
                            onClick={() => handleVote(index)}
                        >
                            {/* Progress Bar Background */}
                            <div className="absolute inset-0 bg-black/20 rounded-lg overflow-hidden">
                                <div
                                    className={`h-full transition-all duration-500 ease-out ${message.senderId === authUser._id ? 'bg-white/20' : 'bg-violet-500/30'}`}
                                    style={{ width: `${percentage}%` }}
                                />
                            </div>

                            {/* Content */}
                            <div className="relative flex items-center justify-between p-3 z-10">
                                <div className="flex items-center gap-2">
                                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${isVoted ? 'border-white bg-white' : 'border-gray-400 group-hover:border-white'}`}>
                                        {isVoted && <div className="w-2 h-2 rounded-full bg-violet-600 mb-[0.5px]" />}
                                    </div>
                                    <span className="text-white text-sm font-medium">{option.text}</span>
                                </div>
                                <span className="text-xs text-gray-200 font-medium">{percentage}% ({voteCount})</span>
                            </div>
                        </div>
                    );
                })}
            </div>
            <div className="mt-3 text-xs text-gray-300 flex justify-between items-center opacity-80">
                <span>{totalVotes} votes</span>
                <span>{poll.allowMultipleAnswers ? "Multiple answers" : "Single answer"}</span>
            </div>
        </div>
    );
};

export default PollBubble;
