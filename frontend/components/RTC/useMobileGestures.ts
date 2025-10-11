import { useSwipeable } from 'react-swipeable';
import { useCallback, useRef } from 'react';

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

  const handleDoubleClick = useCallback(() => {
    const now = Date.now();
    if (now - lastTapRef.current < doubleTapThreshold) {
      handlers.onDoubleClick?.();
    } else {
      handlers.onTap?.();
    }
    lastTapRef.current = now;
  }, [handlers.onDoubleClick, handlers.onTap, doubleTapThreshold]);

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