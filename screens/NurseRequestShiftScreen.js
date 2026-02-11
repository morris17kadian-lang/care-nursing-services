import React, { useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { COLORS } from '../constants';

// This screen acts as a wrapper to trigger the shift booking modal in NurseAppointmentsScreen
export default function NurseRequestShiftScreen() {
  const navigation = useNavigation();
  const isFocused = useIsFocused();

  useEffect(() => {
    // Only navigate if this screen is focused (tab pressed)
    if (isFocused) {
      // Use a small delay to ensure smooth transition
      const timer = setTimeout(() => {
        navigation.navigate('Appointments', { 
          openBookingModal: true,
          timestamp: Date.now() // Add timestamp to force re-trigger
        });
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [isFocused, navigation]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={COLORS.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
