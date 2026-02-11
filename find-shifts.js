const admin = require('firebase-admin');
const serviceAccount = require('./firebase-service-key.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: 'https://care-b7703-default-rtdb.firebaseio.com'
  });
}

const db = admin.firestore();

async function findShifts() {
  const shiftsSnapshot = await db.collection('shift_requests')
    .where('adminRecurring', '==', true)
    .limit(5)
    .get();
  
  console.log('Found', shiftsSnapshot.size, 'admin recurring shifts');
  shiftsSnapshot.forEach(doc => {
    const data = doc.data();
    console.log('\nShift ID:', doc.id);
    console.log('Client:', data.clientName || data.patientName);
    console.log('Nurse ID:', data.nurseId);
    console.log('Primary Nurse ID:', data.primaryNurseId);
    console.log('Nurse Code:', data.nurseCode);
    console.log('Assigned Nurse ID:', data.assignedNurseId);
    console.log('Staff Code:', data.staffCode);
    console.log('Status:', data.status);
  });
  process.exit(0);
}

findShifts().catch(console.error);
