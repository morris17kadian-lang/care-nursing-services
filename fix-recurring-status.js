/**
 * Script to fix patient-created recurring appointments that were marked as 'approved'
 * when they should be 'assigned' (so the nurse can accept/decline)
 * 
 * Run with: node fix-recurring-status.js
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

async function fixRecurringAppointments() {
  console.log('🔍 Searching for patient-created recurring appointments with approved status...\n');
  
  try {
    // Query appointments collection for recurring appointments with status 'approved'
    // that have nurseId set (meaning a nurse was assigned)
    const appointmentsRef = db.collection('appointments');
    const snapshot = await appointmentsRef.get();
    
    let fixedCount = 0;
    const updates = [];
    
    for (const doc of snapshot.docs) {
      const data = doc.data();
      
      // Check if this is a recurring appointment
      const isRecurring = data.isRecurring === true || 
        (data.recurringSchedule && typeof data.recurringSchedule === 'object') ||
        data.daysOfWeek || 
        data.selectedDays;
      
      if (!isRecurring) continue;
      
      // Check if status is 'approved' and has a nurse assigned
      const status = (data.status || '').toLowerCase();
      const hasNurseAssigned = data.nurseId || data.assignedNurseId || 
        (data.assignedNurses && data.assignedNurses.length > 0);
      
      // Check if nurseResponses has 'accepted' status (auto-accepted by admin)
      let hasAutoAccepted = false;
      if (data.nurseResponses && typeof data.nurseResponses === 'object') {
        for (const [key, response] of Object.entries(data.nurseResponses)) {
          if (response && response.status === 'accepted') {
            hasAutoAccepted = true;
            break;
          }
        }
      }
      
      if ((status === 'approved' || hasAutoAccepted) && hasNurseAssigned) {
        console.log(`📋 Found appointment: ${doc.id}`);
        console.log(`   Status: ${data.status}`);
        console.log(`   NurseId: ${data.nurseId || data.assignedNurseId || 'N/A'}`);
        console.log(`   NurseCode: ${data.nurseCode || 'N/A'}`);
        console.log(`   IsRecurring: ${isRecurring}`);
        console.log(`   HasAutoAccepted: ${hasAutoAccepted}`);
        
        // Build the update payload
        const updatePayload = {
          status: 'assigned',
          updatedAt: new Date().toISOString(),
        };
        
        // Reset nurseResponses to 'pending' for all nurses
        if (data.nurseResponses && typeof data.nurseResponses === 'object') {
          for (const [key, response] of Object.entries(data.nurseResponses)) {
            if (response && response.status === 'accepted') {
              updatePayload[`nurseResponses.${key}.status`] = 'pending';
              updatePayload[`nurseResponses.${key}.assignedAt`] = new Date().toISOString();
              // Remove respondedAt since they haven't responded yet
              updatePayload[`nurseResponses.${key}.respondedAt`] = admin.firestore.FieldValue.delete();
            }
          }
        }
        
        // Remove recurringApproved if set
        if (data.recurringApproved) {
          updatePayload.recurringApproved = admin.firestore.FieldValue.delete();
          updatePayload.approvedAt = admin.firestore.FieldValue.delete();
        }
        
        updates.push({
          id: doc.id,
          ref: doc.ref,
          payload: updatePayload,
          originalStatus: data.status,
          nurseId: data.nurseId || data.nurseCode || 'unknown'
        });
      }
    }
    
    if (updates.length === 0) {
      console.log('\n✅ No appointments need to be fixed.');
      return;
    }
    
    console.log(`\n📝 Found ${updates.length} appointment(s) to fix.\n`);
    
    // Apply updates
    for (const update of updates) {
      console.log(`🔧 Updating ${update.id}...`);
      await update.ref.update(update.payload);
      console.log(`   ✅ Changed status from '${update.originalStatus}' to 'assigned'`);
      console.log(`   ✅ Reset nurseResponses to 'pending' for nurse to accept/decline`);
      fixedCount++;
    }
    
    console.log(`\n🎉 Successfully fixed ${fixedCount} appointment(s)!`);
    console.log('\n📱 Now refresh the nurse app - the appointment should appear in the Pending section.');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  }
}

// Run the script
fixRecurringAppointments()
  .then(() => {
    console.log('\n✨ Script completed.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Script failed:', error);
    process.exit(1);
  });
