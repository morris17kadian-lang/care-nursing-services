import { Dimensions, Platform } from 'react-native';

// Get screen dimensions
const screenWidth = Dimensions.get('window').width;
const screenHeight = Dimensions.get('window').height;

// Determine device type and scale factor
const DESIGN_WIDTH = 375; // iPhone 8 baseline width (points, not pixels)
const DESIGN_HEIGHT = 667; // iPhone 8 baseline height

// Calculate scale factors for responsive sizing
const widthScale = screenWidth / DESIGN_WIDTH;
const heightScale = screenHeight / DESIGN_HEIGHT;
const scale = Math.min(widthScale, heightScale); // Use minimum to maintain aspect ratio

/**
 * Responsive scale function - scales any value based on screen size
 * @param {number} size - The base size (from design)
 * @returns {number} Scaled size for current device
 */
export const responsiveSize = (size) => {
  return Math.round(size * scale);
};

/**
 * Scale font size responsively
 * @param {number} fontSize - Base font size
 * @returns {number} Scaled font size
 */
export const responsiveFontSize = (fontSize) => {
  const scaleFactor = widthScale;
  const minFontSize = fontSize * 0.8;
  const maxFontSize = fontSize * 1.4;
  const scaledSize = fontSize * scaleFactor;
  
  // Clamp between min and max to prevent extreme scaling
  return Math.round(Math.min(Math.max(scaledSize, minFontSize), maxFontSize));
};

/**
 * Get responsive spacing based on screen width
 * @returns {object} Responsive spacing values
 */
export const getResponsiveSpacing = () => {
  return {
    xs: responsiveSize(4),
    sm: responsiveSize(8),
    md: responsiveSize(16),
    lg: responsiveSize(24),
    xl: responsiveSize(32),
    xxl: responsiveSize(48),
  };
};

/**
 * Get responsive typography
 * @returns {object} Responsive font sizes
 */
export const getResponsiveTypography = () => {
  return {
    h1: {
      fontSize: responsiveFontSize(32),
      lineHeight: responsiveFontSize(40),
    },
    h2: {
      fontSize: responsiveFontSize(24),
      lineHeight: responsiveFontSize(32),
    },
    h3: {
      fontSize: responsiveFontSize(20),
      lineHeight: responsiveFontSize(28),
    },
    body: {
      fontSize: responsiveFontSize(16),
      lineHeight: responsiveFontSize(24),
    },
    caption: {
      fontSize: responsiveFontSize(14),
      lineHeight: responsiveFontSize(20),
    },
    small: {
      fontSize: responsiveFontSize(12),
      lineHeight: responsiveFontSize(18),
    },
  };
};

/**
 * Get screen size category for conditional rendering
 * @returns {string} 'small' | 'medium' | 'large' | 'tablet'
 */
export const getScreenCategory = () => {
  if (screenWidth < 375) return 'small';      // iPhone SE
  if (screenWidth < 414) return 'medium';     // iPhone 8-13
  if (screenWidth < 600) return 'large';      // iPhone 14 Pro Max, Pixel
  return 'tablet';                            // iPad, large tablets
};

/**
 * Get layout columns based on screen width
 * @returns {number} Number of columns for grid/list layouts
 */
export const getResponsiveColumns = () => {
  const category = getScreenCategory();
  
  switch (category) {
    case 'small':
      return 1;
    case 'medium':
      return 1;
    case 'large':
      return 2;
    case 'tablet':
      return 3;
    default:
      return 1;
  }
};

/**
 * Get responsive padding for safe areas on different devices
 * @returns {object} Responsive padding values
 */
export const getResponsivePadding = () => {
  const spacing = getResponsiveSpacing();
  
  return {
    horizontal: spacing.md,
    vertical: spacing.md,
    screen: spacing.lg,
  };
};

/**
 * Get responsive border radius
 * @returns {object} Responsive border radius values
 */
export const getResponsiveBorderRadius = () => {
  const spacing = getResponsiveSpacing();
  
  return {
    sm: spacing.xs + spacing.xs,     // 8
    md: spacing.sm + spacing.sm,     // 16
    lg: spacing.md,                  // 24
    xl: spacing.lg,                  // 32
    round: 999,                      // Fully rounded
  };
};

/**
 * Check if device is in portrait orientation
 * @returns {boolean}
 */
export const isPortrait = () => {
  return screenHeight > screenWidth;
};

/**
 * Check if device is tablet
 * @returns {boolean}
 */
export const isTablet = () => {
  return getScreenCategory() === 'tablet';
};

/**
 * Get safe area margins considering notches and other elements
 * @param {object} insets - From useSafeAreaInsets()
 * @returns {object} Safe margins
 */
export const getSafeAreaMargins = (insets = {}) => {
  const { top = 0, bottom = 0, left = 0, right = 0 } = insets;
  
  return {
    marginTop: Math.max(top, responsiveSize(8)),
    marginBottom: Math.max(bottom, responsiveSize(8)),
    marginLeft: Math.max(left, responsiveSize(8)),
    marginRight: Math.max(right, responsiveSize(8)),
  };
};

/**
 * Get responsive width for containers
 * Width is clamped to max width for large tablets
 * @returns {number} Width in points
 */
export const getResponsiveContainerWidth = () => {
  const maxWidth = 500; // Max width for tablet views
  return Math.min(screenWidth - responsiveSize(32), maxWidth);
};

export const RESPONSIVE = {
  screenWidth,
  screenHeight,
  scale,
  widthScale,
  heightScale,
  isTablet: getScreenCategory() === 'tablet',
  isSmallDevice: getScreenCategory() === 'small',
  isPortrait: isPortrait(),
};

export default {
  responsiveSize,
  responsiveFontSize,
  getResponsiveSpacing,
  getResponsiveTypography,
  getScreenCategory,
  getResponsiveColumns,
  getResponsivePadding,
  getResponsiveBorderRadius,
  isPortrait,
  isTablet,
  getSafeAreaMargins,
  getResponsiveContainerWidth,
  RESPONSIVE,
};
