import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../constants';

export default function StoreComingSoonScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Image
          source={require('../assets/Images/Nurses-logo.png')}
          style={styles.watermark}
          resizeMode="contain"
          pointerEvents="none"
        />

        <Text style={styles.subtitle}>876nurses store</Text>
        <Text style={styles.title}>Coming soon</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  watermark: {
    position: 'absolute',
    width: 260,
    height: 260,
    opacity: 0.08,
  },
  subtitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 16,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginBottom: 6,
  },
  title: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 24,
    color: COLORS.text,
    textAlign: 'center',
  },
});
