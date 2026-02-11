/*
  Quick Firestore sanity checker for shiftRequests.

  Usage:
    node scripts/checkShiftRequest.js <shiftRequestDocId>
    node scripts/checkShiftRequest.js --client <clientId>

  Notes:
  - Uses firebase-admin with the local firebase-service-key.json.
  - Prints a small subset of fields to avoid noisy output.
*/

const admin = require('firebase-admin');
const serviceAccount = require('../firebase-service-key.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: 'https://carenurse-5dab6-default-rtdb.firebaseio.com',
  });
}

const db = admin.firestore();

function pick(data, keys) {
  const out = {};
  for (const k of keys) {
    if (Object.prototype.hasOwnProperty.call(data, k)) out[k] = data[k];
  }
  return out;
}

async function main() {
  const args = process.argv.slice(2);

  const clientFlagIndex = args.indexOf('--client');
  const clientId = clientFlagIndex >= 0 ? args[clientFlagIndex + 1] : null;
  const docId = clientFlagIndex >= 0 ? null : (args[0] || null);

  if (!docId && !clientId) {
    console.log('Missing argument.');
    console.log('  node scripts/checkShiftRequest.js <shiftRequestDocId>');
    console.log('  node scripts/checkShiftRequest.js --client <clientId>');
    process.exit(2);
  }

  if (docId) {
    const snap = await db.collection('shiftRequests').doc(docId).get();
    if (!snap.exists) {
      console.log('NOT FOUND:', docId);
      process.exit(1);
    }

    const data = snap.data() || {};
    console.log('FOUND shiftRequests/' + snap.id);
    console.log(
      pick(data, [
        'status',
        'isRecurring',
        'adminRecurring',
        'clientId',
        'clientName',
        'patientId',
        'patientName',
        'nurseId',
        'nurseUid',
        'primaryNurseId',
        'assignedNurseId',
        'assignedNurses',
        'service',
        'visitInvoiceKeys',
        'lastVisitInvoiceId',
        'lastVisitInvoiceKey',
        'finalInvoiceId',
        'requestDate',
        'requestedAt',
        'date',
        'startDate',
        'endDate',
        'recurringScheduleId',
        'recurringPeriodStart',
        'recurringPeriodEnd',
        'createdAt',
        'updatedAt',
      ])
    );

    if (data?.clockByNurse && typeof data.clockByNurse === 'object') {
      console.log('clockByNurse keys:', Object.keys(data.clockByNurse));
    }
    process.exit(0);
  }

  // Query by clientId (no orderBy to avoid composite index needs)
  const querySnap = await db
    .collection('shiftRequests')
    .where('clientId', '==', clientId)
    .limit(10)
    .get();

  console.log(`Found ${querySnap.size} shiftRequests for clientId=${clientId}`);
  querySnap.forEach((doc) => {
    const data = doc.data() || {};
    console.log(' -', doc.id, pick(data, ['status', 'isRecurring', 'adminRecurring', 'service', 'requestDate', 'requestedAt']));
  });

  process.exit(0);
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
