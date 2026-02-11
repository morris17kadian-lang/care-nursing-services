const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = require('./firebase-service-key.json');

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function checkLatestShift() {
  try {
    const shiftsRef = db.collection('shiftRequests');
    // Get the most recent one
    const snapshot = await shiftsRef.orderBy('createdAt', 'desc').limit(1).get();
    
    if (snapshot.empty) {
      console.log('No shift requests found.');
      return;
    }

    const doc = snapshot.docs[0];
    const data = doc.data();
    
    console.log('LATEST SHIFT REQUEST:', doc.id);
    console.log('Assignment Type:', data.assignmentType);
    console.log('Service:', data.service);
    console.log('Nurse Services:', JSON.stringify(data.nurseServices, null, 2));
    console.log('Assigned Nurses:', data.assignedNurses);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

checkLatestShift();
