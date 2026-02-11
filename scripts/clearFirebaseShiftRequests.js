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

const parseArgs = () => {
  const args = process.argv.slice(2);
  const flags = new Set(args);

  const getArgValue = (name, defaultValue) => {
    const prefix = `${name}=`;
    const match = args.find((a) => a.startsWith(prefix));
    return match ? match.slice(prefix.length) : defaultValue;
  };

  return {
    confirm: flags.has('--confirm'),
    batchSize: Number(getArgValue('--batchSize', '400')) || 400,
  };
};

const safeCount = async (query) => {
  // Prefer Firestore aggregation if available; fall back to a slow full scan.
  try {
    // eslint-disable-next-line no-undef
    if (typeof query.count === 'function') {
      const snap = await query.count().get();
      return snap.data().count;
    }
  } catch (e) {
    // ignore
  }

  let total = 0;
  let lastDoc = null;
  while (true) {
    let page = query.limit(500);
    if (lastDoc) page = page.startAfter(lastDoc);
    const snapshot = await page.get();
    if (snapshot.empty) break;
    total += snapshot.size;
    lastDoc = snapshot.docs[snapshot.docs.length - 1];
  }
  return total;
};

async function deleteBatch(collectionName, batchSize = 400) {
  const snapshot = await db.collection(collectionName).limit(batchSize).get();
  if (snapshot.empty) return 0;

  const batch = db.batch();
  snapshot.docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();
  return snapshot.size;
}

(async function clearShiftRequests() {
  try {
    const { confirm, batchSize } = parseArgs();

    console.log('🧹 Shift Requests Reset (Firestore)');
    console.log('   Collection: shiftRequests');

    const total = await safeCount(db.collection('shiftRequests'));
    const recurring = await safeCount(
      db.collection('shiftRequests').where('adminRecurring', '==', true)
    );

    console.log(`   Total docs: ${total}`);
    console.log(`   Recurring (adminRecurring==true): ${recurring}`);
    console.log(`   Other: ${Math.max(0, total - recurring)}`);
    console.log(`   Mode: ${confirm ? 'DELETE' : 'DRY RUN (no deletions)'}`);

    if (!confirm) {
      console.log('\nTo actually delete ALL shift requests (including recurring), run:');
      console.log('   node scripts/clearFirebaseShiftRequests.js --confirm');
      process.exit(0);
    }

    console.log('\n🗑️  Clearing shiftRequests collection...');
    let totalDeleted = 0;
    let batchDeleted = 0;

    do {
      batchDeleted = await deleteBatch('shiftRequests', batchSize);
      totalDeleted += batchDeleted;
      if (batchDeleted > 0) {
        console.log(`   ➤ Deleted ${totalDeleted} shift request(s) so far...`);
      }
    } while (batchDeleted > 0);

    console.log('✅ All shift requests (including recurring) removed from Firestore.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error deleting shift requests:', error);
    process.exit(1);
  }
})();
