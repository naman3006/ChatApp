import React, { useState } from 'react';

export const ReportModal = ({ isOpen, onClose, onSubmit, reportingUser }) => {
    const [reason, setReason] = useState('spam');
    const [description, setDescription] = useState('');

    if (!isOpen) return null;

    const handleSubmit = () => {
        onSubmit(reason, description);
        onClose();
        setReason('spam');
        setDescription('');
    };

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-popover border border-border p-6 rounded-xl w-full max-w-md shadow-2xl">
                <h2 className="text-xl text-foreground font-bold mb-4">Report {reportingUser?.fullName}</h2>

                <div className="mb-4">
                    <label className="block text-muted-foreground text-sm mb-2">Reason</label>
                    <select
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        className="w-full bg-secondary text-foreground p-3 rounded-lg border border-border outline-none focus:border-red-500"
                    >
                        <option value="spam">Spam</option>
                        <option value="harassment">Harassment</option>
                        <option value="inappropriate">Inappropriate Content</option>
                        <option value="other">Other</option>
                    </select>
                </div>

                <div className="mb-6">
                    <label className="block text-muted-foreground text-sm mb-2">Description (Optional)</label>
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Please provide more details..."
                        className="w-full bg-secondary text-foreground p-3 rounded-lg border border-border outline-none focus:border-red-500 min-h-[100px]"
                    />
                </div>

                <div className="flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="text-muted-foreground hover:text-foreground px-4 py-2 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                    >
                        Submit Report
                    </button>
                </div>
            </div>
        </div>
    );
};
