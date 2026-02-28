import AsyncStorage from '@react-native-async-storage/async-storage';

const MIGRATION_DONE_KEY = '@876_migration_care_to_876_v1_done';

async function safeGetAllKeys() {
  try {
    const keys = await AsyncStorage.getAllKeys();
    return Array.isArray(keys) ? keys : [];
  } catch {
    return [];
  }
}

async function keyExists(key) {
  try {
    const value = await AsyncStorage.getItem(key);
    return value !== null;
  } catch {
    return false;
  }
}

/**
 * One-time migration: copies all AsyncStorage keys that start with '@care_' to '@876_'
 * and removes the old '@care_' keys after successful copy.
 */
export async function migrateAsyncStorageCareTo876() {
  try {
    const done = await AsyncStorage.getItem(MIGRATION_DONE_KEY);
    if (done === 'true') return { migrated: 0, skipped: 0 };

    const keys = await safeGetAllKeys();
    const careKeys = keys.filter((k) => typeof k === 'string' && k.startsWith('@care_'));

    let migrated = 0;
    let skipped = 0;

    for (const oldKey of careKeys) {
      const newKey = `@876_${oldKey.slice('@care_'.length)}`;

      // If new key already exists, prefer it and just remove the old key.
      const newExists = await keyExists(newKey);
      if (newExists) {
        skipped += 1;
        try {
          await AsyncStorage.removeItem(oldKey);
        } catch {
          // ignore
        }
        continue;
      }

      let value;
      try {
        value = await AsyncStorage.getItem(oldKey);
      } catch {
        skipped += 1;
        continue;
      }

      if (value === null) {
        skipped += 1;
        try {
          await AsyncStorage.removeItem(oldKey);
        } catch {
          // ignore
        }
        continue;
      }

      try {
        await AsyncStorage.setItem(newKey, value);
        await AsyncStorage.removeItem(oldKey);
        migrated += 1;
      } catch {
        skipped += 1;
      }
    }

    await AsyncStorage.setItem(MIGRATION_DONE_KEY, 'true');
    return { migrated, skipped };
  } catch {
    return { migrated: 0, skipped: 0 };
  }
}
