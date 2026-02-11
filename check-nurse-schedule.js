const admin = require('firebase-admin');
const serviceAccount = require('./firebase-service-key.json');

if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}

const db = admin.firestore();

db.collection('appointments').doc('2eWSUALwmTv1Bd5aw7tY').get()
  .then(doc => {
    if (!doc.exists) {
      console.log('Document not found');
      process.exit(1);
    }
    const data = doc.data();
    console.log('Keys:', Object.keys(data));
    console.log('\nnurseSchedule:', JSON.stringify(data.nurseSchedule, null, 2));
    console.log('\nsplitNurseServices:', JSON.stringify(data.splitNurseServices, null, 2));
    console.log('\nassignmentType:', data.assignmentType);
    console.log('\nadminRecurring:', data.adminRecurring);
    process.exit(0);
  })
  .catch(err => { 
    console.error(err); 
    process.exit(1); 
  });
