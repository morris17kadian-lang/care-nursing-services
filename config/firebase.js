import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  connectAuthEmulator,
  setPersistence,
  browserLocalPersistence 
} from 'firebase/auth';
import { 
  getFirestore, 
  connectFirestoreEmulator,
  enableIndexedDbPersistence 
} from 'firebase/firestore';
import { getStorage, connectStorageEmulator } from 'firebase/storage';
import { Platform } from 'react-native';

// Firebase Configuration
// Replace with your Firebase project credentials from Firebase Console
export const firebaseConfig = {
  apiKey: 'REDACTED_FIREBASE_API_KEY',
  authDomain: 'nurses-afb7e.firebaseapp.com',
  projectId: 'nurses-afb7e',
  storageBucket: 'nurses-afb7e.appspot.com',
  messagingSenderId: '4033147002',
  appId: '1:4033147002:web:6685ba84e685ac30004bc3'
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Get Auth instance
const auth = getAuth(app);

// Get Firestore instance
const db = getFirestore(app);

// Get Storage instance
const storage = getStorage(app);

// Enable offline persistence for Firestore (web only).
// NOTE: React Native (Expo Go / dev builds) does not provide IndexedDB.
if (Platform.OS === 'web') {
  try {
    enableIndexedDbPersistence(db).catch(() => {
      // Keep silent: persistence is best-effort.
    });
  } catch {
    // Keep silent: persistence is best-effort.
  }
}

// Connect to emulator in development (optional)
// Uncomment these lines to use Firebase emulator suite locally
/*
const useEmulator = __DEV__;

if (useEmulator) {
  try {
    connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
    connectFirestoreEmulator(db, 'localhost', 8080);
    connectStorageEmulator(storage, 'localhost', 9199);
  } catch (error) {
    // Emulator already initialized
  }
}
*/

export { auth, db, storage, app };
