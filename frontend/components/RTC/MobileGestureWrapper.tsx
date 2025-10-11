"use client";

import React, { ReactNode, useEffect, useState, useCallback, memo, useRef } from 'react';
import { useMobileGestures } from './useMobileGestures';
import { useMobileOptimization } from './useMobileOptimization';

interface MobileGestureWrapperProps {
  children: ReactNode;
  onSwipeToNextUser?: () => void;
  onToggleChat?: () => void;
  disabled?: boolean;
  className?: string;
}

const MobileGestureWrapper: React.FC<MobileGestureWrapperProps> = memo(({
  children,
  onSwipeToNextUser,
  onToggleChat,
  disabled = false,
  className = ""
}) => {
  const [feedbackText, setFeedbackText] = useState<string>('');
  const { isMobile, hapticFeedback, getMobileClasses } = useMobileOptimization();
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Show feedback for gestures
  const showFeedback = useCallback((text: string, haptic: 'light' | 'medium' | 'heavy' = 'light') => {
    setFeedbackText(text);
    
    // Clear any existing timeout
    if (feedbackTimerRef.current) {
      clearTimeout(feedbackTimerRef.current);
    }
    
    try {
      hapticFeedback(haptic);
    } catch (error) {
      // Silently fail if haptic feedback is not supported
    }
    
    feedbackTimerRef.current = setTimeout(() => setFeedbackText(''), 1500);
  }, [hapticFeedback]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (feedbackTimerRef.current) {
        clearTimeout(feedbackTimerRef.current);
      }
    };
  }, []);

  // Memoize gesture handlers to prevent unnecessary re-renders
  const handleSwipeLeft = useCallback(() => {
    if (!disabled && onSwipeToNextUser) {
      showFeedback('💫 Next user', 'medium');
      onSwipeToNextUser();
    }
  }, [disabled, onSwipeToNextUser, showFeedback]);

  const handleSwipeRight = useCallback(() => {
    if (!disabled && onSwipeToNextUser) {
      showFeedback('💫 Next user', 'medium');
      onSwipeToNextUser();
    }
  }, [disabled, onSwipeToNextUser, showFeedback]);

  const handleSwipeUp = useCallback(() => {
    if (!disabled && onToggleChat) {
      showFeedback('💬 Chat toggled', 'light');
      onToggleChat();
    }
  }, [disabled, onToggleChat, showFeedback]);

  const handleSwipeDown = useCallback(() => {
    if (!disabled && onToggleChat) {
      showFeedback('💬 Chat toggled', 'light');
      onToggleChat();
    }
  }, [disabled, onToggleChat, showFeedback]);

  const handleDoubleClick = useCallback(() => {
    if (!disabled && onToggleChat) {
      showFeedback('💬 Chat toggled', 'medium');
      onToggleChat();
    }
  }, [disabled, onToggleChat, showFeedback]);

  const gestureHandlers = useMobileGestures({
    onSwipeLeft: handleSwipeLeft,
    onSwipeRight: handleSwipeRight,
    onSwipeUp: handleSwipeUp,
    onSwipeDown: handleSwipeDown,
    onDoubleClick: handleDoubleClick
  }, {
    preventScrollOnSwipe: false, // Allow scrolling in chat
    trackMouse: false, // Only track touch events for mobile
    swipeThreshold: 80, // Minimum distance for swipe recognition
    doubleTapThreshold: 400 // Time window for double tap
  });

  // Only apply gesture handlers on mobile devices
  const handlers = isMobile && !disabled ? gestureHandlers : {};

  return (
    <div
      {...handlers}
      className={getMobileClasses(
        `relative ${className}`,
        'touch-manipulation mobile-scrollable'
      )}
      style={{ 
        touchAction: disabled ? 'auto' : 'pan-y pinch-zoom', // Allow vertical scroll but handle horizontal swipes
        userSelect: 'none',
        WebkitUserSelect: 'none',
        WebkitTouchCallout: 'none'
      }}
      data-mobile-scrollable="true"
      role="application"
      aria-label="Mobile gesture interface"
      aria-description="Swipe left or right to switch users, swipe up or down to toggle chat"
    >
      {children}
      
      {/* Gesture feedback */}
      {feedbackText && isMobile && (
        <div 
          className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[100] pointer-events-none"
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          <div className="bg-black/80 text-white px-4 py-2 rounded-lg backdrop-blur-sm border border-white/20 shadow-lg animate-pulse">
            <span className="text-sm font-medium">{feedbackText}</span>
          </div>
        </div>
      )}

      {/* Mobile gesture hints (only show briefly on first load) */}
      {isMobile && !disabled && (
        <MobileGestureHints />
      )}
    </div>
  );
});

MobileGestureWrapper.displayName = 'MobileGestureWrapper';

// Component to show gesture hints to users
const MobileGestureHints: React.FC = () => {
  const [showHints, setShowHints] = useState(false);

  useEffect(() => {
    // Check if hints have been shown before
    const hintsShown = localStorage.getItem('mobileGestureHintsShown');
    if (!hintsShown) {
      setShowHints(true);
      const timer = setTimeout(() => {
        setShowHints(false);
        localStorage.setItem('mobileGestureHintsShown', 'true');
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, []);

  if (!showHints) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[90] flex items-center justify-center p-4 pointer-events-none"
      role="dialog"
      aria-labelledby="gesture-hints-title"
      aria-describedby="gesture-hints-description"
    >
      <div className="bg-neutral-900/95 border border-white/20 rounded-2xl p-6 max-w-sm mx-auto shadow-2xl">
        <h3 id="gesture-hints-title" className="text-white text-lg font-semibold mb-4 text-center">📱 Mobile Gestures</h3>
        <div id="gesture-hints-description" className="space-y-3 text-sm text-neutral-300">
          <div className="flex items-center gap-3">
            <span className="text-lg" aria-hidden="true">👈👉</span>
            <span>Swipe left/right to find next user</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-lg" aria-hidden="true">👆👇</span>
            <span>Swipe up/down to toggle chat</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-lg" aria-hidden="true">👆👆</span>
            <span>Double-tap to toggle chat</span>
          </div>
        </div>
        <div className="mt-4 text-xs text-neutral-500 text-center">
          These hints won't show again
        </div>
      </div>
    </div>
  );
};

export default MobileGestureWrapper;