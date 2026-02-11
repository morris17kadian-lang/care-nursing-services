import { useMemo } from 'react';
import {
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
} from '../utils/ResponsiveDesign';

/**
 * useResponsive Hook - Provides all responsive design utilities
 * This hook does NOT use useWindowDimensions, preventing re-renders on orientation change
 * All values are calculated once at mount time based on static screen dimensions
 * 
 * @param {object} insets - Optional safe area insets from useSafeAreaInsets()
 * @returns {object} All responsive design utilities
 */
export const useResponsive = (insets = {}) => {
  const responsive = useMemo(() => ({
    // Size scaling
    size: responsiveSize,
    fontSize: responsiveFontSize,
    
    // Pre-calculated responsive values
    spacing: getResponsiveSpacing(),
    typography: getResponsiveTypography(),
    padding: getResponsivePadding(),
    borderRadius: getResponsiveBorderRadius(),
    
    // Device info
    screenCategory: getScreenCategory(),
    columns: getResponsiveColumns(),
    isPortrait: isPortrait(),
    isTablet: isTablet(),
    
    // Safe area
    safeMargins: getSafeAreaMargins(insets),
    containerWidth: getResponsiveContainerWidth(),
    
    // Utility methods
    scale: (value) => responsiveSize(value),
    scaleFont: (value) => responsiveFontSize(value),
  }), [insets]);

  return responsive;
};

export default useResponsive;
