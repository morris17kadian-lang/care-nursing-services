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

async function resetFeb13Shift() {
  try {
    const shiftId = '9zWRiLM25x8HRWlMj8ce';
    
    console.log('Resetting shift for Feb 13, 2026 clock-out test...');
    console.log('Shift ID:', shiftId);
    
    const shiftRef = db.collection('shiftRequests').doc(shiftId);
    const shiftDoc = await shiftRef.get();
    
    if (!shiftDoc.exists) {
      console.log('❌ Shift not found');
      process.exit(1);
    }
    
    const shiftData = shiftDoc.data();
    console.log('\nCurrent status:', shiftData.status);
    console.log('Clock-out time:', shiftData.actualEndTime);
    
    // Reset to approved status with clock-in only (ready to clock out)
    const updateData = {
      status: 'approved',
      actualEndTime: admin.firestore.FieldValue.delete(),
      lastClockOutTime: admin.firestore.FieldValue.delete(),
      clockOutTime: admin.firestore.FieldValue.delete(),
      completedAt: admin.firestore.FieldValue.delete(),
      hoursWorked: admin.firestore.FieldValue.delete(),
      clockOutLocation: admin.firestore.FieldValue.delete(),
      // Keep clock-in timestamp so nurse can clock out
      // actualStartTime should remain so shift shows as "in progress"
    };
    
    // If there's a clockByNurse map, reset the clock-out fields for all nurses
    if (shiftData.clockByNurse) {
      const clockByNurse = { ...shiftData.clockByNurse };
      Object.keys(clockByNurse).forEach(nurseId => {
        if (clockByNurse[nurseId]) {
          delete clockByNurse[nurseId].lastClockOutTime;
          delete clockByNurse[nurseId].clockOutTime;
          delete clockByNurse[nurseId].actualEndTime;
          delete clockByNurse[nurseId].completedAt;
          delete clockByNurse[nurseId].hoursWorked;
          delete clockByNurse[nurseId].clockOutLocation;
        }
      });
      updateData.clockByNurse = clockByNurse;
    }
    
    await shiftRef.update(updateData);
    
    console.log('\n✅ Shift reset successfully');
    console.log('Status: approved (in progress)');
    console.log('Ready to clock out again to trigger debug logs');
    console.log('\nLook for logs starting with: 💰 [Feb13]');
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error resetting shift:', error);
    process.exit(1);
  }
}

resetFeb13Shift();
