const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin
const serviceAccount = require(path.join(__dirname, '../firebase-service-key.json'));

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

async function fixPendingShiftPatientNames() {
  try {
    console.log('🔍 Fetching all shift requests and appointments...');
    
    // Get all shift requests
    const shiftsSnapshot = await db.collection('shiftRequests').get();
    const appointmentsSnapshot = await db.collection('appointments')
      .where('isRecurring', '==', true)
      .get();
    
    console.log(`📊 Found ${shiftsSnapshot.size} shift requests`);
    console.log(`📊 Found ${appointmentsSnapshot.size} recurring appointments`);
    
    let updated = 0;
    let skipped = 0;
    let errors = 0;
    
    // Process shift requests
    for (const shiftDoc of shiftsSnapshot.docs) {
      const shift = shiftDoc.data();
      const shiftId = shiftDoc.id;
      
      // Check if patient name is missing
      const hasPatientName = shift.patientName || shift.name || 
                           shift.patient?.name || shift.patient?.fullName ||
                           shift.clientName || shift.client?.name;
      
      if (hasPatientName) {
        skipped++;
        continue;
      }
      
      console.log(`\n🔧 Fixing shift request ${shiftId}...`);
      
      // Try to get patient info from patientId
      const patientId = shift.patientId || shift.clientId || shift.userId;
      
      if (!patientId) {
        console.log(`  ⚠️  No patientId found`);
        errors++;
        continue;
      }
      
      try {
        const userDoc = await db.collection('users').doc(patientId).get();
        
        if (userDoc.exists) {
          const userData = userDoc.data();
          const updateData = {};
          
          if (userData.name || userData.fullName) {
            updateData.patientName = userData.name || userData.fullName;
            updateData.name = userData.name || userData.fullName;
          }
          
          if (userData.email && !shift.email) updateData.email = userData.email;
          if (userData.phone && !shift.phone) updateData.phone = userData.phone;
          if (userData.address && !shift.address) updateData.address = userData.address;
          
          if (Object.keys(updateData).length > 0) {
            await db.collection('shiftRequests').doc(shiftId).update(updateData);
            console.log(`  ✅ Updated with:`, updateData);
            updated++;
          } else {
            skipped++;
          }
        } else {
          console.log(`  ⚠️  Patient not found`);
          errors++;
        }
      } catch (error) {
        console.error(`  ❌ Error:`, error.message);
        errors++;
      }
    }
    
    // Process appointments
    for (const aptDoc of appointmentsSnapshot.docs) {
      const apt = aptDoc.data();
      const aptId = aptDoc.id;
      
      const hasPatientName = apt.patientName || apt.name || apt.clientName;
      
      if (hasPatientName) {
        skipped++;
        continue;
      }
      
      console.log(`\n🔧 Fixing appointment ${aptId}...`);
      
      const patientId = apt.patientId || apt.clientId || apt.userId;
      
      if (!patientId) {
        console.log(`  ⚠️  No patientId found`);
        errors++;
        continue;
      }
      
      try {
        const userDoc = await db.collection('users').doc(patientId).get();
        
        if (userDoc.exists) {
          const userData = userDoc.data();
          const updateData = {};
          
          if (userData.name || userData.fullName) {
            updateData.patientName = userData.name || userData.fullName;
            updateData.name = userData.name || userData.fullName;
          }
          
          if (userData.email && !apt.email) updateData.email = userData.email;
          if (userData.phone && !apt.phone) updateData.phone = userData.phone;
          if (userData.address && !apt.address) updateData.address = userData.address;
          
          if (Object.keys(updateData).length > 0) {
            await db.collection('appointments').doc(aptId).update(updateData);
            console.log(`  ✅ Updated with:`, updateData);
            updated++;
          } else {
            skipped++;
          }
        } else {
          console.log(`  ⚠️  Patient not found`);
          errors++;
        }
      } catch (error) {
        console.error(`  ❌ Error:`, error.message);
        errors++;
      }
    }
    
    const total = shiftsSnapshot.size + appointmentsSnapshot.size;
    
    for (const shiftDoc of shiftsSnapshot.docs) {
      const shift = shiftDoc.data();
      const shiftId = shiftDoc.id;
      
      // Check if patient name is missing
      const hasPatientName = shift.patientName || shift.name || 
                           shift.patient?.name || shift.patient?.fullName ||
                           shift.clientName || shift.client?.name;
      
      if (hasPatientName) {
        skipped++;
        continue;
      }
      
      console.log(`\n🔧 Fixing shift ${shiftId}...`);
      
      // Try to get patient info from patientId
      const patientId = shift.patientId || shift.clientId || shift.userId;
      
      if (!patientId) {
        console.log(`  ⚠️  No patientId found for shift ${shiftId}`);
        errors++;
        continue;
      }
      
      try {
        // Look up patient in users collection
        const userDoc = await db.collection('users').doc(patientId).get();
        
        if (userDoc.exists) {
          const userData = userDoc.data();
          const updateData = {};
          
          if (userData.name || userData.fullName) {
            updateData.patientName = userData.name || userData.fullName;
            updateData.name = userData.name || userData.fullName;
          }
          
          if (userData.email && !shift.email) {
            updateData.email = userData.email;
          }
          
          if (userData.phone && !shift.phone) {
            updateData.phone = userData.phone;
          }
          
          if (userData.address && !shift.address) {
            updateData.address = userData.address;
          }
          
          if (Object.keys(updateData).length > 0) {
            await db.collection('shiftRequests').doc(shiftId).update(updateData);
            console.log(`  ✅ Updated shift ${shiftId} with patient info:`, updateData);
            updated++;
          } else {
            console.log(`  ⚠️  No additional data to update for shift ${shiftId}`);
            skipped++;
          }
        } else {
          console.log(`  ⚠️  Patient ${patientId} not found in users collection`);
          errors++;
        }
      } catch (error) {
        console.error(`  ❌ Error updating shift ${shiftId}:`, error.message);
        errors++;
      }
    }
    
    console.log('\n\n📈 Summary:');
    console.log(`  ✅ Updated: ${updated}`);
    console.log(`  ⏭️  Skipped: ${skipped}`);
    console.log(`  ❌ Errors: ${errors}`);
    console.log(`  📊 Total: ${total}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit(0);
  }
}

fixPendingShiftPatientNames();
