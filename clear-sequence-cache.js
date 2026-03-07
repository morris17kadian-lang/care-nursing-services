import AsyncStorage from '@react-native-async-storage/async-storage';

// Clears locally cached sequence/counter values so admins can re-seed them from
// Firestore/backend data on next use.
//
// NOTE: This is a runtime utility (imported by contexts), not a one-off script.
export async function clearAllSequenceCache() {
  const keysToRemove = [
    // Staff code counters
    'adminSequenceCounter',
    'nurseSequenceCounter',

    // Legacy counters that may still exist on devices
    'patientSequenceCounter',
    'invoiceSequenceCounter',

    // InvoiceService counters/queues
    '@876_invoice_counter',
    '@876_invoice_sync_queue',
  ];

  try {
    const existingKeys = await AsyncStorage.getAllKeys();
    const present = keysToRemove.filter((k) => existingKeys.includes(k));

    if (present.length > 0) {
      await AsyncStorage.multiRemove(present);
    }

    return { success: true, removed: present };
  } catch (error) {
    // Never crash the app because of cache clearing.
    return { success: false, error: error?.message || String(error) };
  }
}
