const admin = require('firebase-admin');
const path = require('path');

const serviceAccountPath = path.join(__dirname, '..', 'firebase-service-key.json');
let serviceAccount;
try {
  serviceAccount = require(serviceAccountPath);
} catch (error) {
  console.error('❌ Unable to load firebase-service-key.json:', error.message);
  process.exit(1);
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

async function deleteBatch(batchSize = 400) {
  const snapshot = await db.collection('appointments').limit(batchSize).get();

  if (snapshot.empty) {
    return 0;
  }

  const batch = db.batch();
  snapshot.docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();
  return snapshot.size;
}

(async function clearAppointments() {
  try {
    console.log('🗑️  Clearing appointments from Firestore...');
    let totalDeleted = 0;
    let batchDeleted = 0;

    do {
      batchDeleted = await deleteBatch();
      totalDeleted += batchDeleted;
      if (batchDeleted > 0) {
        console.log(`   ➤ Deleted ${totalDeleted} so far...`);
      }
    } while (batchDeleted > 0);

    console.log('✅ All appointments removed from Firestore.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error deleting appointments:', error);
    process.exit(1);
  }
})();
