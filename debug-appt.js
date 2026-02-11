const admin = require('firebase-admin');
const serviceAccount = require('./firebase-service-key.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: 'https://carenurse-5dab6-default-rtdb.firebaseio.com',
  });
}

const db = admin.firestore();

async function debugAppointment() {
  try {
    const docId = 'HpaE5aZ2fKLqqbY5wcmg'; 
    
    // Check appointments collection
    const aptDoc = await db.collection('appointments').doc(docId).get();
    
    if (aptDoc.exists) {
      console.log('Found in APPOINTMENTS collection:');
      const data = aptDoc.data();
      console.log('Status:', data.status);
      console.log('NurseId:', data.nurseId);
      console.log('NurseResponses:', data.nurseResponses);
    } else {
      console.log('NOT found in APPOINTMENTS collection.');
    }

    // Check shiftRequests collection again to be sure
    const shiftDoc = await db.collection('shiftRequests').doc(docId).get();
    if (shiftDoc.exists) {
      console.log('Found in SHIFTREQUESTS collection:');
       const data = shiftDoc.data();
      console.log('Status:', data.status);
      console.log('NurseResponses:', data.nurseResponses);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

debugAppointment();
