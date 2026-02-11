// Clear all sample/test data from AsyncStorage
// Call this from within the React Native app

import AsyncStorage from '@react-native-async-storage/async-storage';

// Clear ALL sample and test data (payslips, invoices, etc.)
export const clearAllSampleData = async () => {
  try {
    // Get all keys first
    const allKeys = await AsyncStorage.getAllKeys();
    
    // Keys to remove completely - includes ALL sample/test data
    const keysToRemove = [
      // Payslips
      'generatedPayslips',
      'nursePayslips',
      'staffPayslipHistory',
      // Sample invoices
      'sampleInvoices',
      // Sequence counters (will regenerate)
      'adminSequenceCounter', 
      'nurseSequenceCounter',
      'patientSequenceCounter',
      'invoiceSequenceCounter',
      // Sample admin profiles
      'adminProfile_ADMIN001',
      // Cached data
      'cachedAnalytics',
      'cachedTransactions',
    ];
    
    // Also remove any admin profile keys, user keys, and sample credentials
    const adminProfileKeys = allKeys.filter(key => key.startsWith('adminProfile_'));
    const deviceUserKeys = allKeys.filter(key => key.includes('user_'));
    const credentialKeys = allKeys.filter(key => key.includes('savedCredentials'));
    const sampleKeys = allKeys.filter(key => 
      key.includes('sample') || 
      key.includes('Sample') || 
      key.includes('test') || 
      key.includes('Test')
    );
    
    const allKeysToRemove = [
      ...keysToRemove, 
      ...adminProfileKeys,
      ...deviceUserKeys, 
      ...credentialKeys,
      ...sampleKeys
    ];
    
    // Filter to only existing keys
    const existingKeysToRemove = allKeysToRemove.filter(key => allKeys.includes(key));
    
    // Remove all identified keys
    if (existingKeysToRemove.length > 0) {
      await AsyncStorage.multiRemove(existingKeysToRemove);
    }
    
    return { success: true, keysRemoved: existingKeysToRemove.length };
  } catch (error) {
    console.error('❌ Error clearing data:', error);
    return { success: false, error: error.message };
  }
};

// Legacy function name for backwards compatibility
export const clearAllAdminData = clearAllSampleData;

// Simple function to check what data exists
export const checkCurrentData = async () => {
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    console.log('📊 Current AsyncStorage keys:');
    
    for (const key of allKeys) {
      const value = await AsyncStorage.getItem(key);
      if (value) {
        const preview = value.length > 100 ? value.substring(0, 100) + '...' : value;
        console.log(`  ${key}: ${preview}`);
      }
    }
  } catch (error) {
    console.error('Error checking data:', error);
  }
};