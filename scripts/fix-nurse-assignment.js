const admin = require('firebase-admin');
const serviceAccount = require('../firebase-service-key.json');

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function fixNurseAssignment() {
  try {
    console.log('🔍 Checking ALL shift requests...');
    
    // First check all shift requests
    const allShiftsSnapshot = await db.collection('shiftRequests').get();
    console.log(`Total shift requests in database: ${allShiftsSnapshot.size}`);
    
    allShiftsSnapshot.forEach(doc => {
      const data = doc.data();
      console.log(`  - ${doc.id}: ${data.patientName || data.clientName} (${data.status}) - adminRecurring: ${data.adminRecurring}`);
    });
    
    if (allShiftsSnapshot.size === 0) {
      console.log('❌ No shift requests in database');
      return;
    }
    
    console.log('\n🔧 Fixing all Kadian shifts...');
    
    // Fix all Kadian shifts
    let fixed = 0;
    for (const doc of allShiftsSnapshot.docs) {
      const data = doc.data();
      const patientName = (data.patientName || data.clientName || '').toLowerCase();
      
      if (patientName.includes('kadian')) {
        console.log(`\n  Fixing shift: ${doc.id}`);
        
        // Nurse details for NURSE003
        const nurseId = 'DSsg6wV1XOepPN4R5y6MNpDs6rD2';
        const nurseCode = 'NURSE003';
        const nurseName = 'Sara Johnson';
        const nurseEmail = 'sara@nurse.com';
        const nowIso = new Date().toISOString();
        
        const updates = {
          adminRecurring: true,
          primaryNurseId: nurseId,
          nurseId: nurseId,
          nurseName: nurseName,
          nurseCode: nurseCode,
          nurseEmail: nurseEmail,
          status: 'approved',
          recurringApproved: true,
          approvedAt: nowIso,
          updatedAt: nowIso,
          nurseResponses: {
            [nurseId]: {
              status: 'pending',
              respondedAt: nowIso,
              nurseId: nurseId,
              nurseName: nurseName,
              nurseCode: nurseCode,
              email: nurseEmail
            },
            [nurseCode]: {
              status: 'pending',
              respondedAt: nowIso,
              nurseId: nurseId,
              nurseName: nurseName,
              nurseCode: nurseCode,
              email: nurseEmail
            }
          }
        };
        
        await db.collection('shiftRequests').doc(doc.id).update(updates);
        console.log('  ✅ Updated');
        fixed++;
      }
    }
    
    console.log(`\n✅ Fixed ${fixed} shift(s)`);
    
    if (fixed === 0) {
      console.log('❌ No Kadian shifts found');
      return;
    }
    
    console.log('\n✅ Done! The nurse should now see the shift(s) in their Pending section.');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit(0);
  }
}

fixNurseAssignment();
