const { getFirestore } = require('../services/firebaseAdmin');

/**
 * Script to delete all analytics from Firestore
 * Run: node backend/scripts/deleteAllAnalytics.js
 */

async function deleteAllAnalytics() {
  const db = getFirestore();
  
  if (!db) {
    console.error('❌ Failed to initialize Firestore. Check your firebase-service-key.json');
    process.exit(1);
  }

  try {
    console.log('🔍 Fetching all analytics...');
    const analyticsRef = db.collection('analytics');
    const snapshot = await analyticsRef.get();

    if (snapshot.empty) {
      console.log('✅ No analytics found in the database.');
      return;
    }

    console.log(`📋 Found ${snapshot.size} analytics document(s) to delete...`);

    // Delete in batches (Firestore batch size limit is 500)
    const batchSize = 500;
    let deletedCount = 0;

    const deleteInBatches = async (docs) => {
      const batch = db.batch();
      docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      await batch.commit();
      deletedCount += docs.length;
      console.log(`   Deleted ${deletedCount}/${snapshot.size} analytics...`);
    };

    let batch = [];
    for (const doc of snapshot.docs) {
      batch.push(doc);
      if (batch.length === batchSize) {
        await deleteInBatches(batch);
        batch = [];
      }
    }

    // Delete remaining documents
    if (batch.length > 0) {
      await deleteInBatches(batch);
    }

    console.log(`✅ Successfully deleted ${deletedCount} analytics document(s) from Firestore!`);
    console.log('🧪 You can now test with new analytics.');

  } catch (error) {
    console.error('❌ Error deleting analytics:', error);
    process.exit(1);
  }
}

// Run the script
deleteAllAnalytics()
  .then(() => {
    console.log('\n✨ Script completed.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
