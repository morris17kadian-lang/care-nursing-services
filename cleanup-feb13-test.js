const admin = require('firebase-admin');
const serviceAccount = require('./firebase-service-key.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: 'https://care-b7703-default-rtdb.firebaseio.com'
  });
}

const db = admin.firestore();

async function cleanupFeb13Test() {
  try {
    const shiftId = '9zWRiLM25x8HRWlMj8ce';
    const invoiceId = 'NUR-INV-0014';
    
    console.log('Cleaning up Feb 13 test data...\n');
    
    // Delete the test invoice
    console.log('Deleting invoice:', invoiceId);
    const invoiceRef = db.collection('invoices').doc(invoiceId);
    const invoiceDoc = await invoiceRef.get();
    if (invoiceDoc.exists) {
      await invoiceRef.delete();
      console.log('✅ Invoice deleted');
    } else {
      console.log('Invoice not found (may have already been deleted)');
    }
    
    // Reset the shift
    console.log('\nResetting shift:', shiftId);
    const shiftRef = db.collection('shiftRequests').doc(shiftId);
    const shiftDoc = await shiftRef.get();
    
    if (!shiftDoc.exists) {
      console.log('❌ Shift not found');
      process.exit(1);
    }
    
    const shiftData = shiftDoc.data();
    
    // Reset to approved status without clock-out
    const updateData = {
      status: 'approved',
      actualEndTime: admin.firestore.FieldValue.delete(),
      lastClockOutTime: admin.firestore.FieldValue.delete(),
      clockOutTime: admin.firestore.FieldValue.delete(),
      completedAt: admin.firestore.FieldValue.delete(),
      hoursWorked: admin.firestore.FieldValue.delete(),
      clockOutLocation: admin.firestore.FieldValue.delete(),
      visitInvoiceKeys: admin.firestore.FieldValue.delete(),
      lastVisitInvoiceId: admin.firestore.FieldValue.delete(),
      lastVisitInvoiceGeneratedAt: admin.firestore.FieldValue.delete(),
      lastVisitInvoiceKey: admin.firestore.FieldValue.delete(),
    };
    
    // Reset clockByNurse entries
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
          delete clockByNurse[nurseId].lastClockOutLocation;
          delete clockByNurse[nurseId].lastClockOutCapturedAt;
          delete clockByNurse[nurseId].lastHoursWorked;
        }
      });
      updateData.clockByNurse = clockByNurse;
    }
    
    await shiftRef.update(updateData);
    
    console.log('✅ Shift reset successfully');
    console.log('\n📋 Ready to test:');
    console.log('   - Clock out as backup nurse');
    console.log('   - NO per-visit invoice should be generated (only 1 nurse worked)');
    console.log('   - Invoice will only be generated at final completion (end of period)');
    console.log('\nLook for logs: 💰 [Feb13]');
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

cleanupFeb13Test();
