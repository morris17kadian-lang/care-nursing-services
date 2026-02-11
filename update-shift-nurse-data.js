const admin = require('firebase-admin');
const serviceAccount = require('./firebase-service-key.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: 'https://care-b7703-default-rtdb.firebaseio.com'
  });
}

const db = admin.firestore();

async function updateShift() {
  try {
    const shiftId = 'OP9plUjAzyrAgVBS4l3f';
    const shiftRef = db.collection('shiftRequests').doc(shiftId);
    const shiftDoc = await shiftRef.get();
    
    if (!shiftDoc.exists) {
      console.log('Shift not found');
      process.exit(1);
    }
    
    const data = shiftDoc.data();
    console.log('Current shift data:');
    console.log('- nurseId:', data.nurseId);
    console.log('- primaryNurseId:', data.primaryNurseId);
    console.log('- assignedNurseId:', data.assignedNurseId);
    
    // Update to ensure all nurse fields are set
    await shiftRef.update({
      nurseId: data.nurseCode || data.nurseId,
      primaryNurseId: data.primaryNurseId || data.nurseUid,
      assignedNurseId: data.primaryNurseId || data.nurseUid,
      nurseCode: data.nurseCode,
      staffCode: data.nurseCode,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    console.log('\n✅ Shift updated successfully');
    
    const updatedDoc = await shiftRef.get();
    const updatedData = updatedDoc.data();
    console.log('\nUpdated shift data:');
    console.log('- nurseId:', updatedData.nurseId);
    console.log('- primaryNurseId:', updatedData.primaryNurseId);
    console.log('- assignedNurseId:', updatedData.assignedNurseId);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

updateShift();
