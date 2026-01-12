import React, { useState } from "react";
import toast from "react-hot-toast";

const CreatePollModal = ({ isOpen, onClose, onCreate }) => {
    const [question, setQuestion] = useState("");
    const [options, setOptions] = useState(["", ""]);
    const [allowMultipleAnswers, setAllowMultipleAnswers] = useState(false);

    if (!isOpen) return null;

    const handleOptionChange = (index, value) => {
        const newOptions = [...options];
        newOptions[index] = value;
        setOptions(newOptions);
    };

    const addOption = () => {
        if (options.length < 5) {
            setOptions([...options, ""]);
        } else {
            toast.error("Max 5 options allowed");
        }
    };

    const removeOption = (index) => {
        if (options.length > 2) {
            const newOptions = options.filter((_, i) => i !== index);
            setOptions(newOptions);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!question.trim()) return toast.error("Question is required");
        const validOptions = options.filter(opt => opt.trim());
        if (validOptions.length < 2) return toast.error("At least 2 options required");

        onCreate({ question, options: validOptions, allowMultipleAnswers });
        onClose();
        setQuestion("");
        setOptions(["", ""]);
        setAllowMultipleAnswers(false);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col">
                <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-gray-950/50">
                    <h2 className="text-lg font-semibold text-white">Create Poll</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 18 12" /></svg>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-4 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Question</label>
                        <input
                            type="text"
                            value={question}
                            onChange={(e) => setQuestion(e.target.value)}
                            placeholder="Ask a question..."
                            className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg p-3 focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none transition-all placeholder:text-gray-500"
                            autoFocus
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-400">Options</label>
                        {options.map((option, index) => (
                            <div key={index} className="flex gap-2">
                                <input
                                    type="text"
                                    value={option}
                                    onChange={(e) => handleOptionChange(index, e.target.value)}
                                    placeholder={`Option ${index + 1}`}
                                    className="flex-1 bg-gray-800 border border-gray-700 text-white rounded-lg p-2.5 focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none transition-all placeholder:text-gray-500 text-sm"
                                />
                                {options.length > 2 && (
                                    <button
                                        type="button"
                                        onClick={() => removeOption(index)}
                                        className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 18 12" /></svg>
                                    </button>
                                )}
                            </div>
                        ))}
                        {options.length < 5 && (
                            <button
                                type="button"
                                onClick={addOption}
                                className="text-sm text-violet-400 hover:text-violet-300 font-medium flex items-center gap-1 mt-1 transition-colors"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" x2="12" y1="8" y2="16" /><line x1="8" x2="16" y1="12" y2="12" /></svg>
                                Add Option
                            </button>
                        )}
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                        <input
                            type="checkbox"
                            id="allowMultiple"
                            checked={allowMultipleAnswers}
                            onChange={(e) => setAllowMultipleAnswers(e.target.checked)}
                            className="w-4 h-4 rounded border-gray-600 text-violet-600 focus:ring-violet-500 bg-gray-700"
                        />
                        <label htmlFor="allowMultiple" className="text-sm text-gray-300">Allow multiple answers</label>
                    </div>

                    <button
                        type="submit"
                        className="w-full bg-violet-600 hover:bg-violet-700 text-white font-medium py-3 rounded-lg transition-colors shadow-lg shadow-violet-500/20 active:scale-[0.98]"
                    >
                        Create Poll
                    </button>
                </form>
            </div>
        </div>
    );
};

export default CreatePollModal;
