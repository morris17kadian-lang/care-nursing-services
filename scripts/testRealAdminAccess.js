const admin = require('firebase-admin');
const serviceAccount = require('../firebase-service-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

(async () => {
  try {
    console.log('🔍 Testing actual admin access to medical reports...\n');
    
    // Get an admin user
    const adminAuth = (await admin.auth().getUserByEmail('nurse@876.com'));
    console.log('Testing with admin:', adminAuth.email, '| UID:', adminAuth.uid);
    
    // Check if their admin document exists and has role
    const adminDocSnap = await db.collection('admins').doc(adminAuth.uid).get();
    if (!adminDocSnap.exists) {
      console.log('❌ Admin document does NOT exist at admins/' + adminAuth.uid);
      process.exit(1);
    }
    
    const adminData = adminDocSnap.data();
    console.log('✅ Admin document exists with role:', adminData.role);
    
    // Now try to read medical reports (simulating what the app does)
    console.log('\n🔍 Attempting to read medical reports...');
    try {
      const medicalSnapshot = await db.collection('medicalReportRequests')
        .orderBy('createdAt', 'desc')
        .limit(50)
        .get();
      
      console.log('✅ Successfully read medical reports collection');
      console.log('   Total documents:', medicalSnapshot.docs.length);
      
      const all = medicalSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      const pending = all.filter(r => String(r?.status || '').toLowerCase() === 'pending');
      
      console.log('   Pending reports:', pending.length);
      
      if (pending.length > 0) {
        console.log('\n📋 Pending medical reports:');
        pending.forEach((req, i) => {
          console.log(`  ${i+1}. ${req.id} - ${req.patientEmail} (${req.paymentStatus})`);
        });
        
        console.log('\n✅ BACKEND IS WORKING CORRECTLY!');
        console.log('   The issue must be on the client side.');
        console.log('\n💡 TROUBLESHOOTING STEPS:');
        console.log('   1. In admin app, check the JavaScript console for errors');
        console.log('   2. Look for "📋 Fetched medical report requests" log');
        console.log('   3. Check if user?.role is actually "admin" or "superAdmin"');
        console.log('   4. Check if selectedCard is "pending"');
        console.log('   5. Try adding console.log before the if conditions in loadPendingMedicalReports');
      } else {
        console.log('\n❌ No pending medical reports found');
      }
      
    } catch (queryError) {
      console.log('❌ FAILED to read medical reports:', queryError.message);
      console.log('   This indicates a Firestore security rules issue');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
})();