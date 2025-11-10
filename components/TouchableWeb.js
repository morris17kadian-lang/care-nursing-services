import React from 'react';
import { TouchableOpacity, Platform } from 'react-native';

/**
 * TouchableWeb - A TouchableOpacity wrapper with web-specific fixes
 * Ensures all touchable elements work correctly on web platform
 */
export const TouchableWeb = React.forwardRef((props, ref) => {
  const { style, children, activeOpacity, ...otherProps } = props;
  
  const webStyle = Platform.OS === 'web' ? {
    cursor: 'pointer',
    userSelect: 'none',
    outline: 'none',
  } : {};

  return (
    <TouchableOpacity
      ref={ref}
      {...otherProps}
      style={[style, webStyle]}
      activeOpacity={activeOpacity !== undefined ? activeOpacity : 0.7}
    >
      {children}
    </TouchableOpacity>
  );
});

export default TouchableWeb;
