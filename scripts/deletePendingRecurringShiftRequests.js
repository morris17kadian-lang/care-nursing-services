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

  const statusArg = getArgValue('--status', 'pending,requested');
  const statuses = statusArg.split(',').map(s => s.trim()).filter(Boolean);

  return {
    confirm: flags.has('--confirm'),
    batchSize: Number(getArgValue('--batchSize', '250')) || 250,
    statuses: statuses.length > 0 ? statuses : ['pending', 'requested'],
    deleteAll: flags.has('--all'),
    verbose: flags.has('--verbose'),
  };
};

const chunkDelete = async (docs) => {
  const batch = db.batch();
  docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();
};

(async function deletePendingRecurringShiftRequests() {
  const { confirm, batchSize, statuses, deleteAll, verbose } = parseArgs();

  try {
    console.log(`🔎 Searching Firestore for ${deleteAll ? 'ALL' : 'pending'} recurring shift requests...`);
    console.log(`   Collection: shiftRequests`);
    if (deleteAll) {
      console.log(`   Filters: adminRecurring == true, isShift == true (IGNORING status)`);
    } else {
      console.log(`   Filters: adminRecurring == true, isShift == true, status in [${statuses.join(', ')}]`);
    }
    console.log(`   Mode: ${confirm ? 'DELETE' : 'DRY RUN (no deletions)'}`);

    let totalMatched = 0;
    let totalDeleted = 0;

    // Loop until query returns empty. We re-run the same limited query after deletes.
    // This avoids needing pagination state while documents are being removed.
    while (true) {
      let query = db
        .collection('shiftRequests')
        .where('adminRecurring', '==', true)
        .where('isShift', '==', true);

      if (!deleteAll) {
        query = query.where('status', 'in', statuses);
      }
        
      query = query.limit(batchSize);

      const snapshot = await query.get();
      if (snapshot.empty) break;

      const docs = snapshot.docs;
      totalMatched += docs.length;

      if (verbose) {
        docs.slice(0, 10).forEach((d) => {
          const data = d.data() || {};
          console.log(
            `   ➤ ${d.id} | status=${data.status} | nurseId=${data.nurseId || 'N/A'} | clientId=${data.clientId || 'N/A'} | days=${Array.isArray(data.recurringDaysOfWeekList) ? data.recurringDaysOfWeekList.join(',') : 'N/A'}`
          );
        });
        if (docs.length > 10) console.log(`   ...and ${docs.length - 10} more in this batch`);
      }

      if (!confirm) {
        // Dry-run: keep counting, but don't delete.
        // To avoid infinite loops, we must break (since we didn't delete anything).
        break;
      }

      await chunkDelete(docs);
      totalDeleted += docs.length;
      console.log(`🗑️  Deleted ${docs.length} (total deleted: ${totalDeleted})`);
    }

    if (!confirm) {
      console.log(`✅ Dry run complete. Matched ${totalMatched} recurring shift request(s).`);
      console.log('To actually delete them, rerun with:');
      if (deleteAll) {
        console.log('   node scripts/deletePendingRecurringShiftRequests.js --all --confirm');
      } else {
        console.log('   node scripts/deletePendingRecurringShiftRequests.js --confirm');
      }
      process.exit(0);
    }

    console.log(`✅ Done. Deleted ${totalDeleted} recurring shift request(s).`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to delete pending recurring shift requests:', error);
    process.exit(1);
  }
})();
