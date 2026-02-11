/**
 * Script to fix patient-created recurring shift requests that were marked as 'approved'
 * when they should be 'assigned' (so the nurse can accept/decline)
 * 
 * This script checks BOTH appointments and shiftRequests collections.
 * 
 * Run with: node fix-recurring-status-v2.js
 */

const admin = require('firebase-admin');
const serviceAccount = require('./firebase-service-key.json');

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function listAllRecurringDocs() {
  console.log('🔍 Searching for all recurring documents in both collections...\n');
  
  try {
    // Check appointments collection
    console.log('=== APPOINTMENTS COLLECTION ===');
    const appointmentsRef = db.collection('appointments');
    const aptSnapshot = await appointmentsRef.get();
    
    let aptCount = 0;
    for (const doc of aptSnapshot.docs) {
      const data = doc.data();
      
      const isRecurring = data.isRecurring === true || 
        (data.recurringSchedule && typeof data.recurringSchedule === 'object') ||
        data.daysOfWeek || 
        data.selectedDays ||
        data.adminRecurring === true;
      
      if (isRecurring || data.nurseId) {
        console.log(`\n📋 Appointment: ${doc.id}`);
        console.log(`   Status: ${data.status}`);
        console.log(`   isRecurring: ${data.isRecurring}`);
        console.log(`   adminRecurring: ${data.adminRecurring}`);
        console.log(`   nurseId: ${data.nurseId}`);
        console.log(`   nurseCode: ${data.nurseCode}`);
        console.log(`   assignedNurses: ${JSON.stringify(data.assignedNurses?.map(n => n.nurseId || n.nurseCode))}`);
        console.log(`   daysOfWeek: ${JSON.stringify(data.daysOfWeek)}`);
        console.log(`   requestedBy: ${data.requestedBy}`);
        console.log(`   nurseResponses: ${JSON.stringify(data.nurseResponses)}`);
        aptCount++;
      }
    }
    console.log(`\nTotal appointments with nurse or recurring: ${aptCount}`);
    
    // Check shiftRequests collection
    console.log('\n\n=== SHIFT REQUESTS COLLECTION ===');
    const shiftRequestsRef = db.collection('shiftRequests');
    const shiftSnapshot = await shiftRequestsRef.get();
    
    let shiftCount = 0;
    for (const doc of shiftSnapshot.docs) {
      const data = doc.data();
      
      const isRecurring = data.isRecurring === true || 
        (data.recurringSchedule && typeof data.recurringSchedule === 'object') ||
        data.daysOfWeek || 
        data.selectedDays ||
        data.adminRecurring === true;
      
      const hasNurse = data.nurseId || data.nurseCode || 
        (data.assignedNurses && data.assignedNurses.length > 0);
      
      if (isRecurring || hasNurse) {
        console.log(`\n📋 ShiftRequest: ${doc.id}`);
        console.log(`   Status: ${data.status}`);
        console.log(`   isRecurring: ${data.isRecurring}`);
        console.log(`   adminRecurring: ${data.adminRecurring}`);
        console.log(`   nurseId: ${data.nurseId}`);
        console.log(`   nurseCode: ${data.nurseCode}`);
        console.log(`   assignedNurses: ${JSON.stringify(data.assignedNurses?.map(n => n.nurseId || n.nurseCode))}`);
        console.log(`   daysOfWeek: ${JSON.stringify(data.daysOfWeek)}`);
        console.log(`   requestedBy: ${data.requestedBy}`);
        console.log(`   nurseResponses: ${JSON.stringify(data.nurseResponses)}`);
        shiftCount++;
      }
    }
    console.log(`\nTotal shiftRequests with nurse or recurring: ${shiftCount}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  }
}

// Run the script
listAllRecurringDocs()
  .then(() => {
    console.log('\n✨ Script completed.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Script failed:', error);
    process.exit(1);
  });
