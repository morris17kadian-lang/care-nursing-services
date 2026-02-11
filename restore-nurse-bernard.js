const admin = require('firebase-admin');
const bcrypt = require('bcrypt');
const serviceAccount = require('./firebase-service-key.json');

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();
const auth = admin.auth();

async function restoreNurseBernard() {
  console.log('👩‍⚕️ Restoring Nurse Bernard (Super Admin)...\n');

  try {
    const email = 'nurse@876.com';
    const password = 'temp123';
    const hashedPassword = await bcrypt.hash(password, 12);
    
    // Create Firebase Auth account
    let nurseBernardUser;
    try {
      nurseBernardUser = await auth.createUser({
        email: email,
        password: password,
        displayName: 'Nurse Bernard'
      });
      console.log('✅ Firebase Auth account created');
    } catch (error) {
      if (error.code === 'auth/email-already-exists') {
        nurseBernardUser = await auth.getUserByEmail(email);
        await auth.updateUser(nurseBernardUser.uid, { password: password });
        console.log('✅ Firebase Auth account updated');
      } else {
        throw error;
      }
    }
    
    // Create Firestore document in admins collection
    await db.collection('admins').doc(nurseBernardUser.uid).set({
      fullName: 'Nurse Bernard',
      name: 'Nurse Bernard',
      email: email,
      phone: '+1876-555-0100',
      password: hashedPassword,
      username: 'ADMIN001',
      adminCode: 'ADMIN001',
      code: 'ADMIN001',
      title: 'Super Administrator',
      bankingDetails: {
        bankName: '',
        accountNumber: '',
        accountHolderName: '',
        bankBranch: '',
        currency: 'JMD'
      },
      role: 'admin',
      adminLevel: 'super',
      isSuperAdmin: true,
      emailNotificationRole: 'full_access',
      emergencyContact: null,
      emergencyPhone: null,
      isActive: true,
      profilePhoto: null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    console.log('\n✨ Nurse Bernard restored successfully!');
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${password}`);
    console.log(`   Role: Super Admin (ADMIN001)`);
    console.log(`   UID: ${nurseBernardUser.uid}`);
    
  } catch (error) {
    console.error('❌ Error restoring Nurse Bernard:', error);
  } finally {
    process.exit(0);
  }
}

// Run the restore
restoreNurseBernard();
