import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Clear all AsyncStorage data including duplicate invoices
 * Run this script to reset local storage and start fresh
 */
async function clearAllAsyncStorage() {
  try {
    console.log('🗑️  Starting AsyncStorage cleanup...');
    
    // Get all keys first to see what we're clearing
    const keys = await AsyncStorage.getAllKeys();
    console.log(`📋 Found ${keys.length} items in AsyncStorage:`);
    keys.forEach(key => console.log(`  - ${key}`));
    
    // Clear everything
    await AsyncStorage.clear();
    
    console.log('✅ AsyncStorage cleared successfully!');
    console.log('🎉 All local data including duplicate invoices has been removed');
    console.log('💡 Next invoices created will use Firestore and start from NUR-INV-0001');
    
    // Verify it's empty
    const remainingKeys = await AsyncStorage.getAllKeys();
    if (remainingKeys.length === 0) {
      console.log('✓ Verification: AsyncStorage is now empty');
    } else {
      console.warn('⚠️  Warning: Some keys remain:', remainingKeys);
    }
    
  } catch (error) {
    console.error('❌ Error clearing AsyncStorage:', error);
  }
}

// Alternative: Clear only invoice-related data
async function clearInvoiceDataOnly() {
  try {
    console.log('🗑️  Clearing invoice data from AsyncStorage...');
    
    const keys = await AsyncStorage.getAllKeys();
    const invoiceKeys = keys.filter(key => 
      key.includes('invoice') || 
      key.includes('Invoice') ||
      key.includes('INVOICE')
    );
    
    console.log(`📋 Found ${invoiceKeys.length} invoice-related items:`);
    invoiceKeys.forEach(key => console.log(`  - ${key}`));
    
    if (invoiceKeys.length > 0) {
      await AsyncStorage.multiRemove(invoiceKeys);
      console.log('✅ Invoice data cleared successfully!');
    } else {
      console.log('ℹ️  No invoice data found in AsyncStorage');
    }
    
  } catch (error) {
    console.error('❌ Error clearing invoice data:', error);
  }
}

// Export both functions
export { clearAllAsyncStorage, clearInvoiceDataOnly };

// If running directly in React Native (add to a component temporarily)
// Usage in a component:
// import { clearAllAsyncStorage } from './clear-async-storage';
// 
// <Button 
//   title="Clear All Data" 
//   onPress={() => clearAllAsyncStorage()} 
// />

// For immediate use, uncomment one of these:
// clearAllAsyncStorage();
// clearInvoiceDataOnly();
