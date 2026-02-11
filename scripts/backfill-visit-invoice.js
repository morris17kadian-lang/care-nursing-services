/*
  Backfill a per-visit invoice for a completed recurring shift occurrence.

  Usage:
    node scripts/backfill-visit-invoice.js <shiftRequestId> <YYYY-MM-DD>

  Notes:
  - Uses firebase-admin with local firebase-service-key.json.
  - Creates an invoice document linked via:
      appointmentId = <shiftId>:<dateKey>
      relatedAppointmentId = <shiftId>:<dateKey>
      shiftRequestId = <shiftId>
      visitKey = <shiftId>:<dateKey>
  - Increments counters/nurseInvoiceNumber to generate NUR-INV-XXXX.
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

function formatInvoiceDate(dateKey) {
  // dateKey: YYYY-MM-DD
  const d = new Date(dateKey + 'T00:00:00.000Z');
  if (Number.isNaN(d.getTime())) return dateKey;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getServiceRate(serviceName) {
  // Minimal subset for backfills; extend if needed.
  const RATES = {
    'NG Tube Repass - With Supplies': 15000,
    'NG Tube Repass - Without Supplies': 8500,
    'NG Tubes': 8500,
    'Wound Care - With Supplies': 15000,
    'Wound Care - Without Supplies': 9500,
    'Wound Care': 9500,
    'Repass Urine Catheter - With Supplies': 16500,
    'Repass Urine Catheter - Without Supplies': 10000,
    'Urinary Catheter': 10000,
    'RN - Hourly': 4500,
    'Registered Nurse Hourly': 4500,
    'PN - 8 Hour Service': 7500,
    'PN - 12 Hour Service': 9500,
    'Practical Nurse Shift': 7500,
  };

  if (!serviceName) return 18100;
  if (Object.prototype.hasOwnProperty.call(RATES, serviceName)) return RATES[serviceName];

  const key = Object.keys(RATES).find((k) => k.toLowerCase() === String(serviceName).toLowerCase());
  if (key) return RATES[key];

  return 18100;
}

async function nextNurseInvoiceId() {
  const ref = db.collection('counters').doc('nurseInvoiceNumber');

  const seq = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const current = snap.exists && typeof snap.data()?.sequence === 'number' ? snap.data().sequence : 0;
    const next = current + 1;
    tx.set(
      ref,
      {
        sequence: next,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
    return next;
  });

  return `NUR-INV-${String(seq).padStart(4, '0')}`;
}

async function main() {
  const [shiftId, dateKey] = process.argv.slice(2);

  if (!shiftId || !dateKey || !/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
    console.log('Usage: node scripts/backfill-visit-invoice.js <shiftRequestId> <YYYY-MM-DD>');
    process.exit(2);
  }

  const shiftSnap = await db.collection('shiftRequests').doc(shiftId).get();
  if (!shiftSnap.exists) {
    console.error('Shift request not found:', shiftId);
    process.exit(1);
  }

  const shift = shiftSnap.data() || {};
  const visitKey = `${shiftId}:${dateKey}`;

  // Skip if invoice already exists for this visitKey.
  const existing = await db
    .collection('invoices')
    .where('appointmentId', '==', visitKey)
    .limit(1)
    .get();

  if (!existing.empty) {
    console.log('Invoice already exists for appointmentId:', visitKey);
    process.exit(0);
  }

  const hoursRaw =
    shift?.lastHoursWorked ||
    shift?.hoursWorked ||
    shift?.clockByNurse?.[shift?.nurseUid || '']?.lastHoursWorked ||
    1;
  const hours = (() => {
    const n = typeof hoursRaw === 'string' ? parseFloat(hoursRaw) : Number(hoursRaw);
    return Number.isFinite(n) && n > 0 ? n : 1;
  })();

  const service = shift?.service || shift?.serviceType || 'Shift Services';
  const rate = getServiceRate(service);
  const total = rate * hours;

  const invoiceId = await nextNurseInvoiceId();

  const serviceDate = formatInvoiceDate(dateKey);
  const issueDate = serviceDate;

  const dueDateObj = new Date(dateKey + 'T00:00:00.000Z');
  dueDateObj.setUTCDate(dueDateObj.getUTCDate() + 7);
  const dueDate = dueDateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const invoiceDoc = {
    invoiceId,
    status: 'Pending',

    clientName: shift?.patientName || shift?.clientName || 'Client',
    patientName: shift?.patientName || shift?.clientName || 'Client',
    clientEmail: shift?.patientEmail || shift?.clientEmail || shift?.email || '',
    patientEmail: shift?.patientEmail || shift?.clientEmail || shift?.email || '',
    clientPhone: shift?.patientPhone || shift?.clientPhone || shift?.phone || 'N/A',
    clientAddress: shift?.address || shift?.clientAddress || 'Address on file',

    nurseName: shift?.nurseName || shift?.assignedNurseName || 'Assigned Nurse',
    service,

    date: serviceDate,
    serviceDate,
    issueDate,
    dueDate,

    hours,
    rate,
    total,
    subtotal: total,
    tax: 0,
    finalTotal: total,

    // Critical linkage fields for patient matching
    appointmentId: visitKey,
    relatedAppointmentId: visitKey,
    shiftRequestId: shiftId,
    visitKey,

    items: [
      {
        description: service,
        detailedDescription: `Professional ${String(service).toLowerCase()} services provided`,
        quantity: hours,
        price: rate,
        total,
        serviceDates: serviceDate,
        nurseNames: shift?.nurseName || 'Care Professional',
      },
    ],

    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),

    // Metadata
    createdBySource: 'admin-script',
    sourceShiftId: shiftId,
  };

  const ref = await db.collection('invoices').add(invoiceDoc);
  console.log('✅ Backfilled invoice');
  console.log(' - firestoreId:', ref.id);
  console.log(' - invoiceId:', invoiceId);
  console.log(' - appointmentId:', visitKey);

  process.exit(0);
}

main().catch((err) => {
  console.error('Backfill failed:', err);
  process.exit(1);
});
