import React from 'react';
import { LogBox } from 'react-native';
import ErrorBoundary from './components/ErrorBoundary';

// Suppress Expo notifications warning in Expo Go (SDK 53+)
LogBox.ignoreLogs([
  'expo-notifications: Android Push notifications',
  'WARN  expo-notifications',
  'WARN  `expo-notifications` functionality is not fully supported',
  'provided by expo-notifications was removed from Expo Go',
  'Use a development build instead of Expo Go',
  '@firebase/firestore: Firestore',
  'Error using user provided cache',
  'Offline persistence has been disabled',
  'WARN  [expo-av]: Expo AV has been deprecated',
]);

// Import the full original app - now safe with dimension fixes
import AppOriginal from './App-original';

/**
 * SAFE App Entry Point 
 * Direct loading of the 876Nurses app with all features!
 */
export default function App() {
  // Render the FULL 876Nurses app directly
  return (
    <ErrorBoundary>
      <AppOriginal />
    </ErrorBoundary>
  );
}

