import { useSwipeable } from 'react-swipeable';
import { useCallback, useRef, useEffect } from 'react';

interface MobileGestureHandlers {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  onDoubleClick?: () => void;
  onTap?: () => void;
}

interface UseMobileGesturesOptions {
  preventScrollOnSwipe?: boolean;
  trackMouse?: boolean;
  swipeThreshold?: number;
  doubleTapThreshold?: number;
}

export const useMobileGestures = (
  handlers: MobileGestureHandlers,
  options: UseMobileGesturesOptions = {}
) => {
  const {
    preventScrollOnSwipe = true,
    trackMouse = false,
    swipeThreshold = 50,
    doubleTapThreshold = 300
  } = options;

  const lastTapRef = useRef<number>(0);
  const tapTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleDoubleClick = useCallback(() => {
    const now = Date.now();
    const timeSinceLastTap = now - lastTapRef.current;
    
    // Clear any pending single-tap handler
    if (tapTimeoutRef.current) {
      clearTimeout(tapTimeoutRef.current);
      tapTimeoutRef.current = null;
    }
    
    if (timeSinceLastTap < doubleTapThreshold && timeSinceLastTap > 0) {
      // Second tap within threshold - fire double-tap
      handlers.onDoubleClick?.();
      lastTapRef.current = 0; // Reset to prevent triple-tap from triggering another double-tap
    } else {
      // First tap or tap after threshold - debounce single-tap
      tapTimeoutRef.current = setTimeout(() => {
        handlers.onTap?.();
        tapTimeoutRef.current = null;
      }, doubleTapThreshold);
    }
    lastTapRef.current = now;
  }, [handlers, doubleTapThreshold]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (tapTimeoutRef.current) {
        clearTimeout(tapTimeoutRef.current);
      }
    };
  }, []);

  const swipeHandlers = useSwipeable({
    onSwipedLeft: (eventData) => {
      try {
        handlers.onSwipeLeft?.();
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Error handling swipe left:', error);
        }
      }
    },
    onSwipedRight: (eventData) => {
      try {
        handlers.onSwipeRight?.();
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Error handling swipe right:', error);
        }
      }
    },
    onSwipedUp: (eventData) => {
      try {
        handlers.onSwipeUp?.();
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Error handling swipe up:', error);
        }
      }
    },
    onSwipedDown: (eventData) => {
      try {
        handlers.onSwipeDown?.();
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Error handling swipe down:', error);
        }
      }
    },
    onTap: (eventData) => {
      try {
        handleDoubleClick();
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Error handling tap:', error);
        }
      }
    },
    preventScrollOnSwipe,
    trackMouse,
    delta: swipeThreshold,
  });

  return {
    ...swipeHandlers,
  };
};

export default useMobileGestures;