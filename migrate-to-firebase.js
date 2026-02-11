#!/usr/bin/env node

/**
 * MongoDB to Firebase Firestore Migration Script
 * Reads exported MongoDB collections and migrates them to Firebase
 * 
 * Usage: node migrate-to-firebase.js
 */

const fs = require('fs');
const path = require('path');
const {
  initializeApp,
  cert,
} = require('firebase-admin/app');
const {
  getFirestore,
  Timestamp,
} = require('firebase-admin/firestore');
const {
  getAuth,
} = require('firebase-admin/auth');

// Path to the exported MongoDB data
const DATA_DIR = path.join(__dirname, '876Nursesdatabase');

// Collections to migrate (in order)
const COLLECTIONS_TO_MIGRATE = [
  'care_database.users.json',
  'care_database.nurses.json',
  'care_database.admins.json',
  'care_database.appointments.json',
  'care_database.invoices.json',
  'care_database.payslips.json',
  'care_database.messages.json',
  'care_database.reminders.json',
  'care_database.transactions.json',
  'care_database.orders.json',
  'care_database.products.json',
  'care_database.analytics.json',
  'care_database.counters.json',
  'care_database.paymentmethods.json',
  'care_database.paymentsettings.json',
  'care_database.notificationpreferences.json',
  'care_database.privacysettings.json',
  'care_database.profileeditrequests.json',
];

// Initialize Firebase Admin SDK
// Note: You need to set up Firebase service account credentials
// Download from Firebase Console > Project Settings > Service Accounts > Generate New Private Key
let db, auth;

async function initializeFirebase() {
  try {
    // Try to use default credentials (GOOGLE_APPLICATION_CREDENTIALS env variable)
    const app = initializeApp();
    db = getFirestore(app);
    auth = getAuth(app);
    console.log('✅ Firebase initialized');
    return true;
  } catch (error) {
    console.error('❌ Firebase initialization failed:', error.message);
    console.log('\n⚠️  To use this script, you need to:');
    console.log('1. Download Firebase service account key from Console > Project Settings > Service Accounts');
    console.log('2. Save it as firebase-service-key.json in the project root');
    console.log('3. Set environment variable: export GOOGLE_APPLICATION_CREDENTIALS=$(pwd)/firebase-service-key.json');
    return false;
  }
}

function loadJsonFile(filename) {
  const filepath = path.join(DATA_DIR, filename);
  try {
    const data = fs.readFileSync(filepath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`❌ Error loading ${filename}:`, error.message);
    return null;
  }
}

function convertMongoDate(mongoDate) {
  if (!mongoDate) return null;
  
  if (mongoDate.$date) {
    // Handle MongoDB extended JSON format
    if (typeof mongoDate.$date === 'string') {
      return Timestamp.fromDate(new Date(mongoDate.$date));
    } else if (mongoDate.$date.$numberLong) {
      return Timestamp.fromDate(new Date(parseInt(mongoDate.$date.$numberLong)));
    }
  }
  
  if (mongoDate instanceof Date) {
    return Timestamp.fromDate(mongoDate);
  }
  
  return null;
}

function convertMongoId(mongoId) {
  if (!mongoId) return null;
  
  if (mongoId.$oid) {
    return mongoId.$oid;
  }
  
  return mongoId;
}

function normalizeDocument(doc) {
  const normalized = {};
  
  for (const [key, value] of Object.entries(doc)) {
    // Convert MongoDB IDs
    if (key === '_id' || key.endsWith('Id')) {
      normalized[key === '_id' ? 'id' : key] = convertMongoId(value);
    }
    // Convert MongoDB dates
    else if (value && value.$date) {
      normalized[key] = convertMongoDate(value);
    }
    // Skip version field
    else if (key === '__v') {
      continue;
    }
    // Keep everything else as-is
    else {
      normalized[key] = value;
    }
  }
  
  return normalized;
}

async function migrateUserCollection(type, data) {
  if (!data || !Array.isArray(data)) {
    console.log(`⏭️  No data found for ${type}`);
    return { success: 0, failed: 0, skipped: 0 };
  }

  const results = { success: 0, failed: 0, skipped: 0 };
  const collectionName = type === 'users' ? 'users' : type === 'nurses' ? 'nurses' : 'admins';
  
  console.log(`\n📤 Migrating ${type} (${data.length} records)...`);

  for (const user of data) {
    try {
      const userId = convertMongoId(user._id);
      const email = user.email;
      
      if (!email) {
        console.log(`⏭️  Skipped ${user.username} - no email`);
        results.skipped++;
        continue;
      }

      // Normalize the user document
      const normalizedUser = normalizeDocument(user);
      // Map collection type to role: 'admins' -> 'admin', 'nurses' -> 'nurse', 'users' -> 'patient'
      const roleMap = { admins: 'admin', nurses: 'nurse', users: 'patient' };
      normalizedUser.role = roleMap[type] || type;
      normalizedUser.migratedFrom = 'mongodb';
      normalizedUser.migratedAt = Timestamp.now();

      // Create user in Firebase Authentication
      try {
        await auth.createUser({
          uid: userId,
          email: email,
          password: 'TemporaryPassword123!', // Default password for migrated users
          displayName: user.fullName || user.username || email.split('@')[0],
        });
        console.log(`👤 Created Auth user: ${email}`);
      } catch (authError) {
        if (authError.code === 'auth/email-already-exists' || authError.code === 'auth/uid-already-exists') {
          console.log(`ℹ️  Auth user already exists: ${email}`);
        } else {
          console.error(`⚠️  Auth creation failed for ${email}:`, authError.message);
        }
      }

      // Save to Firestore with MongoDB ID as document ID
      await db.collection(collectionName).doc(userId).set(normalizedUser);
      
      console.log(`✅ Migrated ${type}: ${email}`);
      results.success++;
    } catch (error) {
      console.error(`❌ Error migrating ${user.username}:`, error.message);
      results.failed++;
    }
  }

  return results;
}

async function migrateCollection(collectionName, data) {
  if (!data || !Array.isArray(data)) {
    return { success: 0, failed: 0 };
  }

  const results = { success: 0, failed: 0 };
  const cleanCollectionName = collectionName.replace('care_database.', '').replace('.json', '');
  
  console.log(`\n📤 Migrating ${cleanCollectionName} (${data.length} records)...`);

  // Use batch writes for efficiency
  const batch = db.batch();
  let batchCount = 0;
  const BATCH_SIZE = 500;

  for (const doc of data) {
    try {
      const docId = convertMongoId(doc._id);
      const normalizedDoc = normalizeDocument(doc);
      normalizedDoc.migratedFrom = 'mongodb';
      normalizedDoc.migratedAt = Timestamp.now();

      batch.set(db.collection(cleanCollectionName).doc(docId), normalizedDoc);
      batchCount++;

      // Commit batch every 500 documents
      if (batchCount % BATCH_SIZE === 0) {
        await batch.commit();
        console.log(`  ✅ Committed ${batchCount} documents`);
      }

      results.success++;
    } catch (error) {
      console.error(`❌ Error with document:`, error.message);
      results.failed++;
    }
  }

  // Commit remaining documents
  if (batchCount > 0 && batchCount % BATCH_SIZE !== 0) {
    await batch.commit();
    console.log(`  ✅ Committed remaining ${batchCount % BATCH_SIZE} documents`);
  }

  return results;
}

async function runMigration() {
  console.log('🚀 Starting MongoDB to Firebase Migration...\n');

  // Initialize Firebase
  const initialized = await initializeFirebase();
  if (!initialized) {
    process.exit(1);
  }

  const totalResults = {
    users: { success: 0, failed: 0, skipped: 0 },
    nurses: { success: 0, failed: 0, skipped: 0 },
    admins: { success: 0, failed: 0, skipped: 0 },
    other: { success: 0, failed: 0 },
  };

  // Migrate user collections first (users, nurses, admins)
  const usersData = loadJsonFile('care_database.users.json');
  const nursesData = loadJsonFile('care_database.nurses.json');
  const adminsData = loadJsonFile('care_database.admins.json');

  if (usersData) {
    totalResults.users = await migrateUserCollection('users', usersData);
  }
  if (nursesData) {
    totalResults.nurses = await migrateUserCollection('nurses', nursesData);
  }
  if (adminsData) {
    totalResults.admins = await migrateUserCollection('admins', adminsData);
  }

  // Migrate other collections
  for (const filename of COLLECTIONS_TO_MIGRATE) {
    if (filename.includes('users.json') || filename.includes('nurses.json') || filename.includes('admins.json')) {
      continue; // Already handled
    }

    const data = loadJsonFile(filename);
    if (data) {
      const result = await migrateCollection(filename, data);
      totalResults.other.success += result.success;
      totalResults.other.failed += result.failed;
    }
  }

  // Print summary
  console.log('\n\n📊 Migration Summary:');
  console.log('═'.repeat(50));
  console.log(`Users:    ✅ ${totalResults.users.success} | ❌ ${totalResults.users.failed} | ⏭️ ${totalResults.users.skipped}`);
  console.log(`Nurses:   ✅ ${totalResults.nurses.success} | ❌ ${totalResults.nurses.failed} | ⏭️ ${totalResults.nurses.skipped}`);
  console.log(`Admins:   ✅ ${totalResults.admins.success} | ❌ ${totalResults.admins.failed} | ⏭️ ${totalResults.admins.skipped}`);
  console.log(`Other:    ✅ ${totalResults.other.success} | ❌ ${totalResults.other.failed}`);
  console.log('═'.repeat(50));

  const totalSuccess = 
    totalResults.users.success + 
    totalResults.nurses.success + 
    totalResults.admins.success + 
    totalResults.other.success;
  
  const totalFailed = 
    totalResults.users.failed + 
    totalResults.nurses.failed + 
    totalResults.admins.failed + 
    totalResults.other.failed;

  console.log(`\n🎉 Total: ✅ ${totalSuccess} migrated | ❌ ${totalFailed} failed\n`);
  
  process.exit(0);
}

// Run migration
runMigration().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
