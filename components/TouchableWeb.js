import React from 'react';
import { TouchableOpacity, Platform } from 'react-native';

/**
 * TouchableWeb - A TouchableOpacity wrapper with web-specific fixes
 * Ensures all touchable elements work correctly on web platform
 */
export const TouchableWeb = ({ style, ...props }) => {
  const webStyle = Platform.OS === 'web' ? {
    cursor: 'pointer',
    userSelect: 'none',
    outline: 'none',
  } : {};

  return (
    <TouchableOpacity
      style={[style, webStyle]}
      activeOpacity={0.7}
      {...props}
    />
  );
};

export default TouchableWeb;
