const admin = require('firebase-admin');
const serviceAccount = require('./firebase-service-key.json');

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: 'https://care-b7703-default-rtdb.firebaseio.com'
  });
}

const db = admin.firestore();

async function updateKadianShift() {
  try {
    console.log('Finding Kadian Red recurring shift...');
    
    // Find the shift for Kadian Red
    const shiftsSnapshot = await db.collection('shift_requests')
      .where('clientName', '==', 'Kadian Red')
      .where('adminRecurring', '==', true)
      .get();
    
    if (shiftsSnapshot.empty) {
      console.log('No recurring shift found for Kadian Red');
      return;
    }
    
    // Get the nurse (Nurse Bernard - ADMIN001)
    const nursesSnapshot = await db.collection('nurses')
      .where('nurseCode', '==', 'NURSE009')
      .get();
    
    let nurseData = null;
    if (!nursesSnapshot.empty) {
      nurseData = nursesSnapshot.docs[0].data();
      console.log('Found nurse:', nurseData.firstName, nurseData.lastName, nurseData.nurseCode);
    } else {
      console.log('Nurse not found, using placeholder data');
      nurseData = {
        uid: 'nurse-uid-placeholder',
        nurseCode: 'NURSE009',
        firstName: 'Assigned',
        lastName: 'Nurse',
        email: 'nurse@876.com',
        phone: '1234567890'
      };
    }
    
    const updates = [];
    
    for (const doc of shiftsSnapshot.docs) {
      const shiftData = doc.data();
      console.log('\nUpdating shift:', doc.id);
      console.log('Current data:', {
        nurseId: shiftData.nurseId,
        primaryNurseId: shiftData.primaryNurseId,
        nurseCode: shiftData.nurseCode
      });
      
      // Update with nurse information
      const updateData = {
        nurseId: nurseData.nurseCode || nurseData.uid,
        primaryNurseId: nurseData.uid,
        assignedNurseId: nurseData.uid,
        nurseCode: nurseData.nurseCode,
        staffCode: nurseData.nurseCode,
        nurseName: `${nurseData.firstName} ${nurseData.lastName}`,
        nurseEmail: nurseData.email,
        nursePhone: nurseData.phone,
        nurseUid: nurseData.uid,
        adminRecurring: true,
        status: 'pending'
      };
      
      await doc.ref.update(updateData);
      console.log('Updated with:', updateData);
      updates.push(doc.id);
    }
    
    console.log(`\n✅ Successfully updated ${updates.length} shift(s)`);
    process.exit(0);
    
  } catch (error) {
    console.error('Error updating shift:', error);
    process.exit(1);
  }
}

updateKadianShift();
