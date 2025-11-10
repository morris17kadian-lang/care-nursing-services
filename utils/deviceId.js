import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Device from 'expo-device';
import Constants from 'expo-constants';

// Generate or retrieve a persistent device ID for multi-device testing
let cachedDeviceId = null;

export const getDeviceId = async () => {
  // Return cached value if available
  if (cachedDeviceId) {
    return cachedDeviceId;
  }

  try {
    // Try to get existing device ID from storage
    const storedDeviceId = await AsyncStorage.getItem('@care_device_id');
    
    if (storedDeviceId) {
      cachedDeviceId = storedDeviceId;
      return storedDeviceId;
    }

    // Generate new device ID using device info
    const deviceName = Device.deviceName || 'Unknown';
    const modelName = Device.modelName || 'Unknown';
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 9);
    
    // Create a unique device ID
    const newDeviceId = `${deviceName}_${modelName}_${timestamp}_${random}`
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .substring(0, 50);

    // Store for future use
    await AsyncStorage.setItem('@care_device_id', newDeviceId);
    cachedDeviceId = newDeviceId;
    
    console.log('📱 Generated new device ID:', newDeviceId);
    return newDeviceId;
  } catch (error) {
    console.error('Failed to generate device ID:', error);
    // Fallback to a random ID
    const fallbackId = `device_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    cachedDeviceId = fallbackId;
    return fallbackId;
  }
};

// Get device-specific storage key
export const getDeviceStorageKey = async (baseKey) => {
  const deviceId = await getDeviceId();
  return `${baseKey}_${deviceId}`;
};

// Clear device ID (useful for testing)
export const clearDeviceId = async () => {
  try {
    await AsyncStorage.removeItem('@care_device_id');
    cachedDeviceId = null;
    console.log('🗑️ Device ID cleared');
  } catch (error) {
    console.error('Failed to clear device ID:', error);
  }
};

// Get info about current device for display
export const getDeviceInfo = async () => {
  const deviceId = await getDeviceId();
  return {
    id: deviceId,
    name: Device.deviceName || 'Unknown Device',
    model: Device.modelName || 'Unknown Model',
    platform: Device.osName || 'Unknown Platform',
  };
};
