import AsyncStorage from '@react-native-async-storage/async-storage';

export const clearAllAdminData = async () => {
  try {
    // Get all AsyncStorage keys
    const allKeys = await AsyncStorage.getAllKeys();
    
    // Keys to keep (authentication, important settings)
    const keysToKeep = [
      'userToken',
      'authToken',
      'jwtToken',
      'userPreferences',
      'appSettings'
    ];
    
    // Filter keys to remove (everything except keysToKeep)
    const keysToRemove = allKeys.filter(key => !keysToKeep.includes(key));
    
    console.log('🧹 Clearing', keysToRemove.length, 'keys from AsyncStorage');
    
    if (keysToRemove.length > 0) {
      await AsyncStorage.multiRemove(keysToRemove);
    }
    
    // Set a flag to prevent default data reload
    await AsyncStorage.setItem('dataCleared', 'true');
    
    console.log('✅ All sample data cleared from AsyncStorage');
    return true;
  } catch (error) {
    console.error('Error clearing data:', error);
    return false;
  }
};
