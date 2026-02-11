/**
 * RESPONSIVE DESIGN IMPLEMENTATION GUIDE
 * 
 * This guide shows how to use the new ResponsiveDesign system
 * to make your app work on all screen sizes without useWindowDimensions
 */

// ============ BASIC USAGE ============

/**
 * Example 1: Simple Screen with useResponsive Hook
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useResponsive } from '../hooks/useResponsive';

const ExampleScreen = () => {
  const insets = useSafeAreaInsets();
  const responsive = useResponsive(insets);
  
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      paddingHorizontal: responsive.padding.horizontal,
      paddingVertical: responsive.padding.vertical,
      ...responsive.safeMargins,
    },
    title: {
      ...responsive.typography.h2,
      color: '#0c3d56',
      marginBottom: responsive.spacing.lg,
    },
    body: {
      ...responsive.typography.body,
      color: '#5a7c8f',
      marginBottom: responsive.spacing.md,
    },
  });

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Hello World</Text>
      <Text style={styles.body}>
        This text scales automatically to fit any screen size!
      </Text>
    </View>
  );
};

// ============ CONDITIONAL LAYOUTS ============

/**
 * Example 2: Different layouts based on screen size
 */
const ResponsiveLayoutScreen = () => {
  const insets = useSafeAreaInsets();
  const responsive = useResponsive(insets);
  
  const renderContent = () => {
    if (responsive.isTablet) {
      // Tablet layout - 3 columns
      return (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          <Card style={{ width: '33%' }} />
          <Card style={{ width: '33%' }} />
          <Card style={{ width: '33%' }} />
        </View>
      );
    } else if (responsive.screenCategory === 'large') {
      // Large phone - 2 columns
      return (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          <Card style={{ width: '50%' }} />
          <Card style={{ width: '50%' }} />
        </View>
      );
    } else {
      // Small/medium phone - 1 column
      return <Card style={{ width: '100%' }} />;
    }
  };

  return (
    <View style={{ flex: 1 }}>
      {renderContent()}
    </View>
  );
};

// ============ UTILITY FUNCTIONS ============

/**
 * Example 3: Using utility functions directly
 * (without the hook, if you prefer)
 */
import { 
  responsiveSize, 
  responsiveFontSize,
  getResponsiveSpacing,
} from '../utils/ResponsiveDesign';

const spacing = getResponsiveSpacing();
const padding = responsiveSize(16);
const fontSize = responsiveFontSize(18);

const styles2 = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.md,    // Scales based on screen width
    paddingVertical: spacing.lg,      // Automatically adjusts
    marginBottom: responsiveSize(20), // Custom scaling
  },
  text: {
    fontSize: responsiveFontSize(16), // Scales font proportionally
  },
});

// ============ HOW IT WORKS ============

/**
 * WHY NO useWindowDimensions?
 * 
 * Problem: useWindowDimensions causes re-renders on orientation change
 * This can disrupt state, animations, and modal dialogs
 * 
 * Solution: ResponsiveDesign calculates scales ONCE at startup
 * based on the initial screen dimensions (375x667 baseline)
 * 
 * Benefits:
 * ✅ No re-renders on orientation change
 * ✅ Works on ALL screen sizes (phones, tablets)
 * ✅ Maintains consistent scaling
 * ✅ Avoids disruption to state management
 * ✅ Fallback orientation detection still available if needed
 * 
 * Baseline: iPhone 8 (375pt x 667pt)
 * All sizes scale proportionally from this baseline
 * 
 * Scale factors:
 * - iPhone SE (375pt)          -> 1.0x
 * - iPhone 8-13 (390-414pt)   -> 1.04-1.10x
 * - iPhone 14 Pro Max (430pt) -> 1.15x
 * - Android large (6.5", 412pt) -> 1.10x
 * - iPad (1024pt)             -> 2.73x (but clamped for readability)
 */

// ============ COMMON RESPONSIVE PATTERNS ============

/**
 * Example 4: Responsive flex layout
 */
const ResponsiveFlexLayout = () => {
  const responsive = useResponsive();
  
  return (
    <View style={{ 
      flexDirection: responsive.screenCategory === 'tablet' ? 'row' : 'column',
      gap: responsive.spacing.md,
      padding: responsive.spacing.lg,
    }}>
      <View style={{ 
        flex: 1,
        padding: responsive.spacing.md,
        borderRadius: responsive.borderRadius.md,
      }}>
        {/* Content */}
      </View>
    </View>
  );
};

/**
 * Example 5: Responsive list/grid
 */
const ResponsiveGrid = ({ items }) => {
  const responsive = useResponsive();
  const columns = responsive.columns; // 1, 2, or 3 based on screen
  const itemWidth = responsive.containerWidth / columns;

  return (
    <View style={{ 
      flexDirection: 'row',
      flexWrap: 'wrap',
      paddingHorizontal: responsive.padding.horizontal,
    }}>
      {items.map(item => (
        <View 
          key={item.id}
          style={{
            width: `${100 / columns}%`,
            padding: responsive.spacing.sm,
          }}
        >
          {/* Grid item */}
        </View>
      ))}
    </View>
  );
};

/**
 * Example 6: Responsive card/container
 */
const ResponsiveCard = ({ children }) => {
  const responsive = useResponsive();
  
  return (
    <View style={{
      backgroundColor: '#fff',
      borderRadius: responsive.borderRadius.lg,
      padding: responsive.spacing.lg,
      marginHorizontal: responsive.spacing.md,
      marginVertical: responsive.spacing.md,
      maxWidth: responsive.containerWidth,
      alignSelf: 'center',
    }}>
      {children}
    </View>
  );
};

// ============ MIGRATION CHECKLIST ============

/**
 * To convert an existing screen to use ResponsiveDesign:
 * 
 * 1. Import the hook:
 *    import { useResponsive } from '../hooks/useResponsive';
 *    import { useSafeAreaInsets } from 'react-native-safe-area-context';
 * 
 * 2. Remove useWindowDimensions if present:
 *    ❌ const { width, height } = useWindowDimensions();
 * 
 * 3. Initialize the hook:
 *    const insets = useSafeAreaInsets();
 *    const responsive = useResponsive(insets);
 * 
 * 4. Replace hardcoded values in styles:
 *    ❌ fontSize: 16,
 *    ✅ fontSize: responsive.fontSize(16),
 *    
 *    ❌ padding: 16,
 *    ✅ padding: responsive.spacing.md,
 *    
 *    ❌ borderRadius: 12,
 *    ✅ borderRadius: responsive.borderRadius.md,
 * 
 * 5. For conditional layouts, use:
 *    if (responsive.isTablet) { /* tablet layout */ }
 *    if (responsive.screenCategory === 'large') { /* large phone */ }
 */

export default ExampleScreen;
