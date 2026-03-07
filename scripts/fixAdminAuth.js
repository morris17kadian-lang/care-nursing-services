const admin = require('firebase-admin');
const serviceAccount = require('../firebase-service-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

(async () => {
  try {
    console.log('🔍 Checking admin authentication mismatch...\n');
    
    // Get all auth users
    const authUsers = (await admin.auth().listUsers(1000)).users;
    const adminEmails = ['nurse@876.com', 'destena@876nurses.com', 'prince@876nurses.com', 'sandrene@876nurses.com'];
    
    console.log('👤 Auth Users (admin emails only):');
    const adminAuthUsers = authUsers.filter(u => adminEmails.includes(u.email));
    adminAuthUsers.forEach(u => {
      console.log(`  ${u.email} → Auth UID: ${u.uid}`);
    });
    
    console.log('\n📁 Admin Collection Documents:');
    const adminsSnap = await db.collection('admins').get();
    adminsSnap.docs.forEach(doc => {
      const data = doc.data();
      const email = data.email || data.contactEmail;
      console.log(`  ${email} → Doc ID: ${doc.id} | Role: ${data.role || 'MISSING'}`);
    });
    
    console.log('\n🔍 Checking for mismatches:');
    let hasMismatch = false;
    let mismatchedAdmins = [];
    
    adminAuthUsers.forEach(authUser => {
      const docExists = adminsSnap.docs.some(doc => doc.id === authUser.uid);
      if (!docExists) {
        console.log(`  ❌ MISMATCH: ${authUser.email} (Auth UID: ${authUser.uid}) has NO matching admin document!`);
        hasMismatch = true;
        
        // Find the admin doc with this email
        const adminDoc = adminsSnap.docs.find(doc => {
          const data = doc.data();
          return (data.email || data.contactEmail) === authUser.email;
        });
        
        if (adminDoc) {
          mismatchedAdmins.push({
            email: authUser.email,
            authUid: authUser.uid,
            wrongDocId: adminDoc.id,
            correctData: adminDoc.data()
          });
        }
      } else {
        console.log(`  ✅ Match: ${authUser.email} (Auth UID: ${authUser.uid})`);
      }
    });
    
    if (hasMismatch) {
      console.log('\n❌ PROBLEM FOUND: Admin cannot access data because Firestore rules check:');
      console.log('   get(/admins/$(request.auth.uid)).data.role == "admin"');
      console.log('   But the document is stored with a DIFFERENT ID!');
      console.log('\n🔧 FIXING: Creating correct admin documents...');
      
      for (const mismatch of mismatchedAdmins) {
        const correctDocRef = db.collection('admins').doc(mismatch.authUid);
        await correctDocRef.set({
          ...mismatch.correctData,
          id: mismatch.authUid,
          uid: mismatch.authUid,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        console.log(`  ✅ Created admin document: admins/${mismatch.authUid} for ${mismatch.email}`);
      }
      
      console.log('\n✅ FIX APPLIED: Admin documents now match authentication UIDs');
      console.log('   👉 Now restart the admin app and sign in again!');
    } else {
      console.log('\n✅ All admin auth UIDs match their document IDs');
      console.log('   The issue must be something else...');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
})();