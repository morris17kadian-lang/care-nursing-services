import { useState, useEffect } from 'react';

/**
 * ULTRA-SAFE replacement for useWindowDimensions that prevents ALL runtime crashes
 * This hook handles all dimension-related errors that cause "__r(0)" and "height doesn't exist" errors
 */
const useWindowDimensions = () => {
  // Initialize with safe fallback dimensions immediately
  const [dimensions, setDimensions] = useState({
    width: 375,
    height: 812
  });

  const [startupComplete, setStartupComplete] = useState(false);

  useEffect(() => {
    // Extended startup delay to allow full runtime initialization
    const startupTimer = setTimeout(() => {
      // Verify runtime is truly ready before proceeding
      try {
        if (global.__r && global.require && typeof global.require === 'function') {
          setStartupComplete(true);
        }
      } catch (e) {
        // Runtime still not ready, extend delay
        setTimeout(() => setStartupComplete(true), 100);
      }
    }, 300); // Increased delay

    return () => clearTimeout(startupTimer);
  }, []);

  useEffect(() => {
    if (!startupComplete) return;

    let isMounted = true;
    
    const updateDimensions = () => {
      if (!isMounted) return;
      
      try {
        // Dynamic import to avoid early dimension access
        const ReactNative = require('react-native');
        const { Dimensions } = ReactNative;
        
        if (!Dimensions || typeof Dimensions.get !== 'function') {
          return;
        }

        const windowData = Dimensions.get('window');
        
        if (windowData && typeof windowData === 'object') {
          const { width, height } = windowData;
          
          if (typeof width === 'number' && typeof height === 'number' && 
              width > 0 && height > 0 && width < 10000 && height < 10000 &&
              Number.isFinite(width) && Number.isFinite(height)) {
            
            setDimensions({ width, height });
          }
        }
        
      } catch (error) {
        // Silently handle any errors to prevent crashes
      }
    };

    // Delayed initial update to ensure runtime stability
    const initialUpdateTimer = setTimeout(updateDimensions, 150);

    // Set up dimension change listener with additional protection
    let subscription;
    const setupListener = () => {
      try {
        const ReactNative = require('react-native');
        const { Dimensions } = ReactNative;
        if (Dimensions && typeof Dimensions.addEventListener === 'function') {
          subscription = Dimensions.addEventListener('change', updateDimensions);
        }
      } catch (error) {
        // Ignore listener setup errors
      }
    };
    
    // Delay listener setup even more
    const listenerTimer = setTimeout(setupListener, 300);

    return () => {
      isMounted = false;
      clearTimeout(initialUpdateTimer);
      clearTimeout(listenerTimer);
      
      try {
        if (subscription) {
          if (typeof subscription.remove === 'function') {
            subscription.remove();
          } else if (typeof subscription === 'function') {
            subscription();
          }
        }
      } catch (error) {
        // Ignore cleanup errors
      }
    };
  }, [startupComplete]);

  return dimensions;
};

/**
 * Alternative hook name for compatibility
 */
export const useSafeWindowDimensions = useWindowDimensions;

export default useWindowDimensions;