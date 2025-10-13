"use client";

import { IconFlag } from "@tabler/icons-react";

interface TimeoutAlertProps {
  show: boolean;
  message: string;
  onRetry: () => void;
  onCancel: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
}

export default function TimeoutAlert({ 
  show, 
  message, 
  onRetry, 
  onCancel, 
  onKeyDown 
}: TimeoutAlertProps) {
  if (!show) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/50 backdrop-blur-sm" 
      role="dialog" 
      aria-modal="true" 
      aria-labelledby="timeout-title"
      onKeyDown={onKeyDown}
    >
      <div className="mx-4 max-w-md rounded-2xl bg-card border-elevated p-6 shadow-2xl">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-orange-600/20">
            <IconFlag className="h-6 w-6 text-orange-400" />
          </div>
          
          <h3 id="timeout-title" className="mb-2 text-lg font-semibold text-foreground">
            No Match Found
          </h3>
          
          <p className="mb-6 text-sm text-neutral-400">
            {message || "We couldn't find a match right now. Please try again later."}
          </p>
          
          <div className="flex gap-3">
            <button
              onClick={onRetry}
              className="flex-1 rounded-xl bg-white text-black px-4 py-2 font-medium hover:bg-white/90 transition-colors focus:outline-none focus:ring-2 focus:ring-ring/50"
              autoFocus
            >
              Try Again
            </button>
            <button
              onClick={onCancel}
              className="flex-1 rounded-xl input-border-match bg-background text-foreground px-4 py-2 font-medium hover:bg-muted/10 transition-colors focus:outline-none focus:ring-2 focus:ring-ring/50"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}