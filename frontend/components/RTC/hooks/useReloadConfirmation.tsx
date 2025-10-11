"use client";

import { useEffect, useRef } from "react";

interface UseReloadConfirmationProps {
  isInCall: boolean;
  message?: string;
}

export function useReloadConfirmation({ 
  isInCall, 
  message = "Are you sure you want to reload? Reloading will disconnect you from the person you're currently connected with." 
}: UseReloadConfirmationProps) {
  const isInCallRef = useRef(isInCall);

  
  useEffect(() => {
    isInCallRef.current = isInCall;
  }, [isInCall]);

  useEffect(() => {
    if (!isInCall) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (isInCallRef.current) {
        event.preventDefault();
        event.returnValue = message;
        return message;
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      // Check for Ctrl+R (Windows/Linux) or Cmd+R (Mac)
      if ((event.ctrlKey || event.metaKey) && event.key === 'r') {
        if (isInCallRef.current) {
          event.preventDefault();
          const shouldReload = window.confirm(message);
          if (shouldReload) {
            window.location.reload();
          }
        }
      }
    };

    // Add event listeners
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('keydown', handleKeyDown);

    // Cleanup
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isInCall, message]);
}
