import { useEffect, useState, useCallback } from 'react';

// Hook to detect mobile devices and provide mobile-specific utilities
export const useMobileOptimization = () => {
  const [isMobile, setIsMobile] = useState(false);
  const [isPortrait, setIsPortrait] = useState(false);
  const [screenSize, setScreenSize] = useState({ width: 0, height: 0 });

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      try {
        const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        const isSmallScreen = window.innerWidth <= 768;
        
        setIsMobile(isMobileDevice || isTouchDevice || isSmallScreen);
        setIsPortrait(window.innerHeight > window.innerWidth);
        setScreenSize({ width: window.innerWidth, height: window.innerHeight });
      } catch (error) {
        // Fallback: assume desktop if detection fails
        if (process.env.NODE_ENV === 'development') {
          console.warn('Mobile detection failed, defaulting to desktop mode:', error);
        }
        setIsMobile(false);
        setIsPortrait(false);
        setScreenSize({ width: 1920, height: 1080 });
      }
    };

    checkMobile();
    
    try {
      window.addEventListener('resize', checkMobile);
      window.addEventListener('orientationchange', checkMobile);
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('Event listener setup failed:', error);
      }
    }
    
    return () => {
      try {
        window.removeEventListener('resize', checkMobile);
        window.removeEventListener('orientationchange', checkMobile);
      } catch (error) {
        // Silently ignore cleanup errors
      }
    };
  }, []);

  // Prevent iOS elastic scrolling
  const preventElasticScroll = useCallback(() => {
    if (!isMobile) return;
    
    const preventScroll = (e: TouchEvent) => {
      // Allow scrolling only inside chat containers
      const target = e.target as Element;
      const isScrollable = target.closest('[data-mobile-scrollable="true"]') || 
                          target.closest('.chat-messages') ||
                          target.closest('.overflow-auto') ||
                          target.closest('.overflow-y-auto');
      
      if (!isScrollable) {
        e.preventDefault();
      }
    };

    document.addEventListener('touchmove', preventScroll, { passive: false });
    
    return () => {
      document.removeEventListener('touchmove', preventScroll);
    };
  }, [isMobile]);

  // Optimize viewport for mobile
  const optimizeViewport = useCallback(() => {
    if (!isMobile) return;

    // Set viewport meta tag for better mobile experience
    let viewport = document.querySelector('meta[name="viewport"]');
    if (!viewport) {
      viewport = document.createElement('meta');
      viewport.setAttribute('name', 'viewport');
      document.head.appendChild(viewport);
    }
    
    // Prevent zoom on input focus and provide better touch experience
    viewport.setAttribute('content', 
      'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover'
    );

    // Add mobile-specific styles
    const style = document.createElement('style');
    style.textContent = `
      * {
        -webkit-tap-highlight-color: transparent;
        -webkit-touch-callout: none;
      }
      
      input, textarea, select {
        font-size: 16px !important; /* Prevent zoom on focus */
      }
      
      .touch-manipulation {
        touch-action: manipulation;
      }
      
      .mobile-scrollable {
        -webkit-overflow-scrolling: touch;
        overscroll-behavior: contain;
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, [isMobile]);

  // Apply mobile optimizations
  useEffect(() => {
    const cleanupViewport = optimizeViewport();
    const cleanupScroll = preventElasticScroll();
    
    return () => {
      cleanupViewport?.();
      cleanupScroll?.();
    };
  }, [optimizeViewport, preventElasticScroll]);

  // Get mobile-optimized CSS classes
  const getMobileClasses = useCallback((baseClasses: string, mobileClasses?: string) => {
    if (!isMobile || !mobileClasses) return baseClasses;
    return `${baseClasses} ${mobileClasses}`;
  }, [isMobile]);

  // Haptic feedback for mobile interactions
  const hapticFeedback = useCallback((type: 'light' | 'medium' | 'heavy' = 'light') => {
    if (!isMobile) return;
    
    try {
      if (!navigator.vibrate) return;
      
      const patterns = {
        light: [10],
        medium: [20],
        heavy: [30]
      };
      
      navigator.vibrate(patterns[type]);
    } catch (error) {
      // Silently fail if vibration is not supported or blocked
    }
  }, [isMobile]);

  return {
    isMobile,
    isPortrait,
    screenSize,
    getMobileClasses,
    hapticFeedback,
    
    // Mobile-specific utilities
    isSmallScreen: screenSize.width <= 640,
    isMediumScreen: screenSize.width <= 768,
    isLandscape: !isPortrait,
    hasNotch: isMobile && screenSize.height > 800, // Rough heuristic for notched devices
  };
};

export default useMobileOptimization;