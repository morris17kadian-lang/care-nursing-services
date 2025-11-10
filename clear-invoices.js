// Script to clear all invoices from storage
import AsyncStorage from '@react-native-async-storage/async-storage';

async function clearInvoices() {
  try {
    await AsyncStorage.removeItem('@care_invoices');
    await AsyncStorage.removeItem('@care_invoice_counter');
    console.log('✅ All invoices cleared successfully!');
    console.log('📝 Next invoice will start from CARE-INV-0001');
  } catch (error) {
    console.error('❌ Error clearing invoices:', error);
  }
}

clearInvoices();
