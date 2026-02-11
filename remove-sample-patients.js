const admin = require('firebase-admin');
const serviceAccount = require('./firebase-service-key.json');

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();
const auth = admin.auth();

async function removeSamplePatients() {
  console.log('🗑️  Removing sample patients/clients (keeping only Kadian Red)...\n');

  try {
    // Get all users from 'users' collection (patients)
    const usersSnapshot = await db.collection('users').get();
    
    let deletedCount = 0;
    let keptCount = 0;
    
    for (const doc of usersSnapshot.docs) {
      const userData = doc.data();
      const fullName = (userData.fullName || userData.name || '').toLowerCase();
      
      // Keep only Kadian Red
      if (fullName.includes('kadian') && fullName.includes('red')) {
        console.log(`✅ Keeping: ${userData.fullName || userData.name} (${userData.email})`);
        keptCount++;
        continue;
      }
      
      // Delete all other patients
      console.log(`🗑️  Deleting: ${userData.fullName || userData.name} (${userData.email})`);
      
      // Delete from Firestore
      await doc.ref.delete();
      
      // Try to delete from Firebase Auth
      try {
        if (userData.uid || doc.id) {
          await auth.deleteUser(userData.uid || doc.id);
        }
      } catch (authError) {
        // User might not exist in Auth, that's okay
        console.log(`   ℹ️  Auth user not found or already deleted`);
      }
      
      deletedCount++;
    }
    
    // Also check 'patients' collection if it exists
    try {
      const patientsSnapshot = await db.collection('patients').get();
      
      for (const doc of patientsSnapshot.docs) {
        const patientData = doc.data();
        const fullName = (patientData.fullName || patientData.name || '').toLowerCase();
        
        // Keep only Kadian Red
        if (fullName.includes('kadian') && fullName.includes('red')) {
          console.log(`✅ Keeping (patients): ${patientData.fullName || patientData.name}`);
          keptCount++;
          continue;
        }
        
        // Delete all other patients
        console.log(`🗑️  Deleting (patients): ${patientData.fullName || patientData.name}`);
        await doc.ref.delete();
        deletedCount++;
      }
    } catch (error) {
      console.log('ℹ️  No patients collection found (this is okay)');
    }
    
    console.log(`\n✨ Cleanup complete!`);
    console.log(`   Deleted: ${deletedCount} patient(s)`);
    console.log(`   Kept: ${keptCount} patient(s) (Kadian Red)`);
    
  } catch (error) {
    console.error('❌ Error removing sample patients:', error);
  } finally {
    process.exit(0);
  }
}

// Run the cleanup
removeSamplePatients();
