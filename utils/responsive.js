import { Dimensions, PixelRatio, Platform } from 'react-native';

// Base dimensions (iPhone 11 Pro as reference)
const BASE_WIDTH = 375;
const BASE_HEIGHT = 812;

// Runtime readiness tracking
let runtimeReady = false;
let dimensionsChecked = false;

// Initialize runtime readiness after a delay to allow React Native to fully initialize
const initializeRuntime = () => {
  if (dimensionsChecked) return;
  
  try {
    // Multiple checks to ensure runtime is truly ready
    if (global.__r && typeof Dimensions !== 'undefined' && Dimensions && 
        typeof Dimensions.get === 'function') {
      const testDims = Dimensions.get('window');
      if (testDims && testDims.width > 0 && testDims.height > 0) {
        runtimeReady = true;
      }
    }
  } catch (e) {
    // Runtime still not ready
  }
  
  dimensionsChecked = true;
};

// Delay runtime check to avoid early access
setTimeout(initializeRuntime, 200);

// Helper function to get current dimensions with strict runtime protection
const getDimensions = () => {
  const fallback = { width: BASE_WIDTH, height: BASE_HEIGHT };
  
  // If runtime hasn't been checked yet, do it now
  if (!dimensionsChecked) {
    initializeRuntime();
  }
  
  // If runtime is still not ready, return fallback immediately
  if (!runtimeReady) {
    return fallback;
  }
  
  try {
    // Triple-check runtime state before accessing Dimensions
    if (!global.__r || typeof Dimensions === 'undefined' || !Dimensions || 
        typeof Dimensions.get !== 'function') {
      return fallback;
    }
    
    const dims = Dimensions.get('window');
    
    // Validate returned dimensions
    if (!dims || typeof dims !== 'object' || 
        typeof dims.width !== 'number' || typeof dims.height !== 'number' ||
        dims.width <= 0 || dims.height <= 0 || 
        !Number.isFinite(dims.width) || !Number.isFinite(dims.height)) {
      return fallback;
    }
    
    return dims;
    
  } catch (error) {
    return fallback;
  }
};

/**
 * Responsive width based on screen size
 * @param {number} size - The size you want to scale
 * @returns {number} - Scaled size
 */
export const wp = (size) => {
  const { width: SCREEN_WIDTH } = getDimensions();
  const newSize = (SCREEN_WIDTH / BASE_WIDTH) * size;
  return Math.round(PixelRatio.roundToNearestPixel(newSize));
};

/**
 * Responsive height based on screen size
 * @param {number} size - The size you want to scale
 * @returns {number} - Scaled size
 */
export const hp = (size) => {
  const { height: SCREEN_HEIGHT } = getDimensions();
  const newSize = (SCREEN_HEIGHT / BASE_HEIGHT) * size;
  return Math.round(PixelRatio.roundToNearestPixel(newSize));
};

/**
 * Responsive font size
 * @param {number} size - The font size you want to scale
 * @returns {number} - Scaled font size
 */
export const fp = (size) => {
  const { width: SCREEN_WIDTH } = getDimensions();
  const scale = SCREEN_WIDTH / BASE_WIDTH;
  const newSize = size * scale;
  
  // Apply platform-specific adjustments
  if (Platform.OS === 'ios') {
    return Math.round(PixelRatio.roundToNearestPixel(newSize));
  }
  
  // Android: Adjust for pixel density
  return Math.round(PixelRatio.roundToNearestPixel(newSize)) - 1;
};

/**
 * Moderately scale size (between width and height)
 * Useful for elements that need to scale proportionally
 * @param {number} size - The size to scale
 * @param {number} factor - Scaling factor (default: 0.5)
 * @returns {number} - Scaled size
 */
export const ms = (size, factor = 0.5) => {
  const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = getDimensions();
  const widthScale = SCREEN_WIDTH / BASE_WIDTH;
  const heightScale = SCREEN_HEIGHT / BASE_HEIGHT;
  const scale = widthScale + (heightScale - widthScale) * factor;
  return Math.round(PixelRatio.roundToNearestPixel(size * scale));
};

/**
 * Check if device is a tablet
 * @returns {boolean}
 */
export const isTablet = () => {
  const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = getDimensions();
  const aspectRatio = SCREEN_HEIGHT / SCREEN_WIDTH;
  return (
    (Platform.OS === 'ios' && Platform.isPad) ||
    (SCREEN_WIDTH >= 768 && aspectRatio < 1.6)
  );
};

/**
 * Check if device is small (width < 375)
 * @returns {boolean}
 */
export const isSmallDevice = () => {
  const { width: SCREEN_WIDTH } = getDimensions();
  return SCREEN_WIDTH < 375;
};

/**
 * Check if device is large (width >= 768)
 * @returns {boolean}
 */
export const isLargeDevice = () => {
  const { width: SCREEN_WIDTH } = getDimensions();
  return SCREEN_WIDTH >= 768;
};

/**
 * Get responsive spacing based on device size
 * @param {string} size - 'xs', 'sm', 'md', 'lg', 'xl'
 * @returns {number}
 */
export const getSpacing = (size) => {
  const spacing = {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
  };
  
  return wp(spacing[size] || spacing.md);
};

/**
 * Get responsive icon size based on device
 * @param {string} size - 'sm', 'md', 'lg', 'xl'
 * @returns {number}
 */
export const getIconSize = (size) => {
  const sizes = {
    xs: 16,
    sm: 20,
    md: 24,
    lg: 32,
    xl: 40,
    xxl: 48,
  };
  
  return ms(sizes[size] || sizes.md);
};

/**
 * Get responsive border radius
 * @param {number} size - Base border radius
 * @returns {number}
 */
export const getBorderRadius = (size) => {
  return wp(size);
};

// Screen dimensions getter function (lazy evaluation)
// Call as SCREEN() to get current dimensions
export const SCREEN = () => {
  const { width, height } = getDimensions();
  return {
    width,
    height,
    isSmall: isSmallDevice(),
    isLarge: isLargeDevice(),
    isTablet: isTablet(),
  };
};

// Responsive helpers - do not export SCREEN in the object to avoid early evaluation
export const responsive = {
  wp,
  hp,
  fp,
  ms,
  getSpacing,
  getIconSize,
  getBorderRadius,
};

export default responsive;
