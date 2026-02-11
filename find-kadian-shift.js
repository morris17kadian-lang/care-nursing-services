const admin = require('firebase-admin');
const serviceAccount = require('./firebase-service-key.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: 'https://care-b7703-default-rtdb.firebaseio.com'
  });
}

const db = admin.firestore();

async function findKadianShift() {
  console.log('Searching shiftRequests collection...\n');
  
  // Get all recent shift requests
  const shiftsSnapshot = await db.collection('shiftRequests')
    .orderBy('createdAt', 'desc')
    .limit(10)
    .get();
  
  console.log('Found', shiftsSnapshot.size, 'shift requests');
  
  shiftsSnapshot.forEach(doc => {
    const data = doc.data();
    console.log('\n--- Shift ID:', doc.id, '---');
    console.log('Client:', data.clientName || data.patientName);
    console.log('Admin Recurring:', data.adminRecurring);
    console.log('Nurse ID:', data.nurseId);
    console.log('Primary Nurse ID:', data.primaryNurseId);
    console.log('Assigned Nurse ID:', data.assignedNurseId);
    console.log('Nurse Code:', data.nurseCode);
    console.log('Staff Code:', data.staffCode);
    console.log('Nurse Name:', data.nurseName);
    console.log('Status:', data.status);
  });
  
  process.exit(0);
}

findKadianShift().catch(console.error);
