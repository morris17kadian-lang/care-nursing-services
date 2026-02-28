// Force clear all sequence data from AsyncStorage
import AsyncStorage from '@react-native-async-storage/async-storage';

export const clearAllSequenceCache = async () => {
  try {
    // Clear specific sequence keys we know about
    const keysToRemove = [
      'nurseSequence',
      'adminSequence', 
      'sequencesInitialized',
      'dashboard_sequences',
      'analytics_sequences',
      'nurse_sequence',
      'admin_sequence',
      'staff_sequences',
      '@876_sequences',
      '@876_counters'
    ];
    
    // Try to get all keys and filter
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const sequenceKeys = allKeys.filter(key => 
        key.toLowerCase().includes('sequence') || 
        key.toLowerCase().includes('counter') ||
        key.toLowerCase().includes('admin') ||
        key.toLowerCase().includes('nurse') ||
        key.toLowerCase().includes('staff')
      );
      keysToRemove.push(...sequenceKeys);
    } catch (e) {
      // Best-effort; fall back to predefined list.
    }
    
    // Remove duplicates
    const uniqueKeys = [...new Set(keysToRemove)];
    
    await AsyncStorage.multiRemove(uniqueKeys);
    
  } catch (error) {
    console.error('❌ Error clearing sequence cache:', error);
  }
};

// Note: Do not auto-execute on import — call `clearAllSequenceCache()` where appropriate (e.g., after admin login)