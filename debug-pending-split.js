const admin = require('firebase-admin');
const serviceAccount = require('./firebase-service-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function debugPendingSplit() {
  try {
    console.log('Checking appointments collection...\n');
    
    // First, get all appointments
    const allSnapshot = await db.collection('appointments').limit(10).get();
    console.log(`Total appointments found: ${allSnapshot.size}\n`);
    
    if (allSnapshot.empty) {
      console.log('No appointments found at all!');
      process.exit(0);
    }

    // Check for any field that might indicate recurring
    console.log('Sample appointment fields:');
    const firstDoc = allSnapshot.docs[0];
    console.log('Fields:', Object.keys(firstDoc.data()));
    console.log('\n');

    // Try different queries
    console.log('Trying query with recurring === true...');
    const recurringSnapshot = await db.collection('appointments')
      .where('recurring', '==', true)
      .limit(5)
      .get();
    console.log(`Found ${recurringSnapshot.size} with recurring === true\n`);

    console.log('Trying query with isRecurring === true...');
    const isRecurringSnapshot = await db.collection('appointments')
      .where('isRecurring', '==', true)
      .limit(5)
      .get();
    console.log(`Found ${isRecurringSnapshot.size} with isRecurring === true\n`);

    console.log('Trying query with type === "recurring"...');
    const typeRecurringSnapshot = await db.collection('appointments')
      .where('type', '==', 'recurring')
      .limit(5)
      .get();
    console.log(`Found ${typeRecurringSnapshot.size} with type === "recurring"\n`);

    // Get whichever has results
    const snapshot = recurringSnapshot.size > 0 ? recurringSnapshot : 
                     isRecurringSnapshot.size > 0 ? isRecurringSnapshot :
                     typeRecurringSnapshot;

    if (snapshot.empty) {
      console.log('No recurring appointments found with any query');
      process.exit(0);
    }

    snapshot.forEach(doc => {
      const data = doc.data();
      console.log('════════════════════════════════════════');
      console.log('Document ID:', doc.id);
      console.log('status:', data.status);
      console.log('\nassignmentType:', data.assignmentType);
      console.log('\nnurseSchedule:', JSON.stringify(data.nurseSchedule, null, 2));
      console.log('\nsplitNurseServices:', JSON.stringify(data.splitNurseServices, null, 2));
      console.log('\nnurseResponses:', JSON.stringify(data.nurseResponses, null, 2));
      console.log('\nnurseId:', data.nurseId);
      console.log('primaryNurseId:', data.primaryNurseId);
      console.log('adminRecurring:', data.adminRecurring);
      console.log('\ndaysOfWeek:', data.daysOfWeek);
      console.log('recurringDaysOfWeek:', data.recurringDaysOfWeek);
      console.log('════════════════════════════════════════\n');
    });

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

debugPendingSplit();
