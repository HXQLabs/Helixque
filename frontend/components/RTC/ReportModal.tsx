"use client";

import { useState } from "react";
import { IconX, IconFlag, IconAlertTriangle } from "@tabler/icons-react";

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (reason: string) => void;
  isSubmitting?: boolean;
}

export default function ReportModal({ 
  isOpen, 
  onClose, 
  onSubmit, 
  isSubmitting = false 
}: ReportModalProps) {
  const [reason, setReason] = useState("");
  const [selectedReason, setSelectedReason] = useState("");

  const predefinedReasons = [
    "Inappropriate behavior",
    "Harassment or bullying", 
    "Spam or unwanted content",
    "Technical issues",
    "Other"
  ];

  const handleSubmit = () => {
    if (!reason.trim() && !selectedReason) {
      return; // Don't submit if no reason provided
    }
    const finalReason = selectedReason || reason.trim();
    onSubmit(finalReason);
  };

  const handleClose = () => {
    if (isSubmitting) return; // Prevent closing during submission
    setReason("");
    setSelectedReason("");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div className="relative bg-neutral-900 rounded-2xl border border-white/10 shadow-2xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-600/20 rounded-lg">
              <IconFlag className="h-5 w-5 text-red-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Report User</h2>
              <p className="text-sm text-neutral-400">Help us maintain a safe environment</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            disabled={isSubmitting}
          >
            <IconX className="h-5 w-5 text-neutral-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Warning */}
          <div className="flex items-start gap-3 p-3 bg-orange-600/10 border border-orange-600/20 rounded-lg">
            <IconAlertTriangle className="h-5 w-5 text-orange-400 mt-0.5 shrink-0" />
            <div className="text-sm text-orange-200">
              <p className="font-medium">Please provide a reason for your report.</p>
              <p>This helps us take appropriate action and improve our platform.</p>
            </div>
          </div>

          {/* Predefined reasons */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-white">Select a reason:</label>
            <div className="space-y-2">
              {predefinedReasons.map((predefinedReason) => (
                <label
                  key={predefinedReason}
                  className="flex items-center gap-3 p-3 rounded-lg border border-white/10 hover:bg-white/5 transition-colors cursor-pointer"
                >
                  <input
                    type="radio"
                    name="reason"
                    value={predefinedReason}
                    checked={selectedReason === predefinedReason}
                    onChange={(e) => {
                      setSelectedReason(e.target.value);
                      setReason(""); // Clear custom reason when selecting predefined
                    }}
                    className="h-4 w-4 text-red-600 focus:ring-red-500"
                    disabled={isSubmitting}
                  />
                  <span className="text-sm text-white">{predefinedReason}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Custom reason */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-white">Or provide additional details:</label>
            <textarea
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                setSelectedReason(""); // Clear predefined when typing custom
              }}
              placeholder="Please describe the issue in detail..."
              className="w-full h-24 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-neutral-500 focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none resize-none"
              disabled={isSubmitting}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-white/10">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-sm font-medium text-neutral-400 hover:text-white transition-colors"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={(!reason.trim() && !selectedReason) || isSubmitting}
            className="px-6 py-2 bg-red-600 hover:bg-red-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <IconFlag className="h-4 w-4" />
                Submit Report
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
