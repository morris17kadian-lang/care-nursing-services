const admin = require('firebase-admin');
const serviceAccount = require('./firebase-service-key.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: 'https://care-b7703-default-rtdb.firebaseio.com'
  });
}

const db = admin.firestore();

async function findAllShifts() {
  console.log('Searching all shift-related collections...\n');
  
  // Check shift_requests
  const shiftRequests = await db.collection('shift_requests').limit(10).get();
  console.log('shift_requests:', shiftRequests.size, 'documents');
  shiftRequests.forEach(doc => {
    const data = doc.data();
    console.log('  -', doc.id, ':', data.clientName || data.patientName, '| adminRecurring:', data.adminRecurring, '| nurseId:', data.nurseId);
  });
  
  // Check appointments
  const appointments = await db.collection('appointments').limit(10).get();
  console.log('\nappointments:', appointments.size, 'documents');
  appointments.forEach(doc => {
    const data = doc.data();
    console.log('  -', doc.id, ':', data.clientName || data.patientName, '| adminRecurring:', data.adminRecurring, '| nurseId:', data.nurseId);
  });
  
  // Check recurring_shifts
  const recurringShifts = await db.collection('recurring_shifts').limit(10).get();
  console.log('\nrecurring_shifts:', recurringShifts.size, 'documents');
  recurringShifts.forEach(doc => {
    const data = doc.data();
    console.log('  -', doc.id, ':', data.clientName || data.patientName, '| nurseId:', data.nurseId);
  });
  
  process.exit(0);
}

findAllShifts().catch(console.error);
