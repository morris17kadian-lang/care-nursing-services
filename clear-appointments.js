/**
 * Clear All Appointments - Database Cleanup Script
 * Use Firebase Admin SDK for proper authentication
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = require('./firebase-service-key.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: 'https://nurses-2c3da-default-rtdb.firebaseio.com'
  });
}

const db = admin.firestore();

async function clearAllAppointments() {
  try {
    console.log('🧹 Starting database cleanup...\n');
    
    // Get all appointments
    const appointmentsSnapshot = await db.collection('appointments').get();
    const appointmentCount = appointmentsSnapshot.size;
    
    console.log(`📊 Found ${appointmentCount} appointments`);
    
    if (appointmentCount === 0) {
      console.log('✅ No appointments to delete. Database is already clean.');
      process.exit(0);
    }
    
    console.log('🗑️  Deleting appointments...\n');
    
    // Delete in batches (Firestore limit: 500 writes per batch)
    const batchSize = 500;
    let deletedCount = 0;
    
    while (true) {
      const snapshot = await db.collection('appointments')
        .limit(batchSize)
        .get();
      
      if (snapshot.empty) {
        break;
      }
      
      const batch = db.batch();
      snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
        deletedCount++;
      });
      
      await batch.commit();
      console.log(`   ✓ Deleted ${deletedCount}/${appointmentCount} appointments`);
    }
    
    console.log('\n✅ All appointments cleared successfully!');
    console.log(`   Total deleted: ${deletedCount} appointments`);
    console.log('\n🎯 Database is ready for testing new recurring shift requests!\n');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error clearing appointments:', error.message);
    process.exit(1);
  }
}

clearAllAppointments();
