/**
 * Script to fix the specific recurring shift request EwQdQH35KjVd3edfQxmJ
 * Change status from 'approved' to 'assigned' so nurse can accept/decline
 * 
 * Run with: node fix-specific-recurring.js
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

async function fixSpecificShiftRequest() {
  const docId = 'EwQdQH35KjVd3edfQxmJ';
  const nurseCode = 'NURSE003';
  
  console.log(`🔧 Fixing shift request: ${docId}\n`);
  
  try {
    const docRef = db.collection('shiftRequests').doc(docId);
    const doc = await docRef.get();
    
    if (!doc.exists) {
      console.log('❌ Document not found!');
      return;
    }
    
    const data = doc.data();
    console.log('📋 Current state:');
    console.log(`   Status: ${data.status}`);
    console.log(`   NurseCode: ${data.nurseCode}`);
    console.log(`   NurseId: ${data.nurseId}`);
    console.log(`   nurseResponses: ${JSON.stringify(data.nurseResponses)}`);
    
    // Update to 'assigned' status and set nurseResponses to pending
    const updatePayload = {
      status: 'assigned',
      updatedAt: new Date().toISOString(),
      [`nurseResponses.${nurseCode}`]: {
        status: 'pending',
        nurseId: data.nurseId,
        nurseCode: nurseCode,
        assignedAt: new Date().toISOString()
      }
    };
    
    await docRef.update(updatePayload);
    
    console.log('\n✅ Updated successfully!');
    console.log('   New status: assigned');
    console.log(`   nurseResponses.${nurseCode}.status: pending`);
    
    // Verify the update
    const updatedDoc = await docRef.get();
    const updatedData = updatedDoc.data();
    console.log('\n📋 Verified new state:');
    console.log(`   Status: ${updatedData.status}`);
    console.log(`   nurseResponses: ${JSON.stringify(updatedData.nurseResponses)}`);
    
    console.log('\n🎉 Done! Now refresh the nurse app - NURSE003 should see this in their Pending section.');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  }
}

// Run the script
fixSpecificShiftRequest()
  .then(() => {
    console.log('\n✨ Script completed.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Script failed:', error);
    process.exit(1);
  });
