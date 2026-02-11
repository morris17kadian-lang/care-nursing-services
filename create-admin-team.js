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

async function createAdminTeam() {
  console.log('🏥 Creating 876 Nurses Admin Team...\n');

  try {
    // 1. Update ADMIN001 - Katty-Ann Bernard (Managing Director)
    console.log('📝 Updating ADMIN001 - Katty-Ann Bernard (Managing Director)...');
    const admin001Ref = db.collection('admins').where('adminCode', '==', 'ADMIN001').limit(1);
    const admin001Snapshot = await admin001Ref.get();
    
    if (!admin001Snapshot.empty) {
      const docRef = admin001Snapshot.docs[0].ref;
      await docRef.update({
        fullName: 'Katty-Ann Bernard',
        title: 'Managing Director',
        emailNotificationRole: 'full_access',
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      console.log('✅ ADMIN001 updated: Katty-Ann Bernard - Managing Director (gets ALL emails)\n');
    }

    // 2. Create ADMIN003 - Destena Sinclair (Exec Admin Asst)
    console.log('➕ Creating ADMIN003 - Destena Sinclair (Exec Admin Asst)...');
    const hashedPassword003 = await bcrypt.hash('temp123', 12);
    
    // Create Firebase Auth account
    let admin003User;
    try {
      admin003User = await auth.createUser({
        email: 'destena@876nurses.com',
        password: 'temp123',
        displayName: 'Destena Sinclair'
      });
    } catch (error) {
      if (error.code === 'auth/email-already-exists') {
        admin003User = await auth.getUserByEmail('destena@876nurses.com');
        await auth.updateUser(admin003User.uid, { password: 'temp123' });
      } else {
        throw error;
      }
    }
    
    // Create/Update Firestore document
    await db.collection('admins').doc(admin003User.uid).set({
      fullName: 'Destena Sinclair',
      title: 'Executive Admin Assistant',
      email: 'destena@876nurses.com',
      phone: '+1876-555-0103',
      password: hashedPassword003,
      username: 'ADMIN003',
      adminCode: 'ADMIN003',
      code: 'ADMIN003',
      bankingDetails: {
        bankName: '',
        accountNumber: '',
        accountHolderName: '',
        bankBranch: '',
        currency: 'JMD'
      },
      role: 'admin',
      adminLevel: 'admin',
      isSuperAdmin: false,
      emailNotificationRole: 'full_access',
      emergencyContact: null,
      emergencyPhone: null,
      isActive: true,
      profilePhoto: null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log('✅ ADMIN003 created: Destena Sinclair - Exec Admin Asst (gets ALL emails)\n');

    // 3. Create ADMIN004 - Sandrene
    console.log('➕ Creating ADMIN004 - Sandrene...');
    const hashedPassword004 = await bcrypt.hash('temp123', 12);
    
    // Create Firebase Auth account
    let admin004User;
    try {
      admin004User = await auth.createUser({
        email: 'sandrene@876nurses.com',
        password: 'temp123',
        displayName: 'Sandrene'
      });
    } catch (error) {
      if (error.code === 'auth/email-already-exists') {
        admin004User = await auth.getUserByEmail('sandrene@876nurses.com');
        await auth.updateUser(admin004User.uid, { password: 'temp123' });
      } else {
        throw error;
      }
    }
    
    // Create/Update Firestore document
    await db.collection('admins').doc(admin004User.uid).set({
      fullName: 'Sandrene',
      title: 'Administrative Staff',
      email: 'sandrene@876nurses.com',
      phone: '+1876-555-0104',
      password: hashedPassword004,
      username: 'ADMIN004',
      adminCode: 'ADMIN004',
      code: 'ADMIN004',
      bankingDetails: {
        bankName: '',
        accountNumber: '',
        accountHolderName: '',
        bankBranch: '',
        currency: 'JMD'
      },
      role: 'admin',
      adminLevel: 'admin',
      isSuperAdmin: false,
      emailNotificationRole: 'full_access',
      emergencyContact: null,
      emergencyPhone: null,
      isActive: true,
      profilePhoto: null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log('✅ ADMIN004 created: Sandrene (gets ALL emails)\n');

    // 4. Create ADMIN005 - Subrina Prince (Nurse Supervisor/Manager - Scheduling Only)
    console.log('➕ Creating ADMIN005 - Subrina Prince (Nurse Supervisor/Manager)...');
    const hashedPassword005 = await bcrypt.hash('temp123', 12);
    
    // Create Firebase Auth account
    let admin005User;
    try {
      admin005User = await auth.createUser({
        email: 'prince@876nurses.com',
        password: 'temp123',
        displayName: 'Subrina Prince'
      });
    } catch (error) {
      if (error.code === 'auth/email-already-exists') {
        admin005User = await auth.getUserByEmail('prince@876nurses.com');
        await auth.updateUser(admin005User.uid, { password: 'temp123' });
      } else {
        throw error;
      }
    }
    
    // Create/Update Firestore document
    await db.collection('admins').doc(admin005User.uid).set({
      fullName: 'Subrina Prince',
      title: 'Nurse Supervisor/Manager',
      email: 'prince@876nurses.com',
      phone: '+1876-555-0105',
      password: hashedPassword005,
      username: 'ADMIN005',
      adminCode: 'ADMIN005',
      code: 'ADMIN005',
      bankingDetails: {
        bankName: '',
        accountNumber: '',
        accountHolderName: '',
        bankBranch: '',
        currency: 'JMD'
      },
      role: 'admin',
      adminLevel: 'admin',
      isSuperAdmin: false,
      emailNotificationRole: 'scheduling_only',
      emergencyContact: null,
      emergencyPhone: null,
      isActive: true,
      profilePhoto: null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log('✅ ADMIN005 created: Subrina Prince - Nurse Supervisor (gets ONLY scheduling/shift emails)\n');

    console.log('\n📊 Admin Team Summary:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('ADMIN001 - Katty-Ann Bernard (Managing Director)');
    console.log('           Email: nurse@876.com');
    console.log('           Notifications: ALL EMAILS (invoices, scheduling, payments, etc.)');
    console.log('');
    console.log('ADMIN003 - Destena Sinclair (Exec Admin Assistant)');
    console.log('           Username: ADMIN003');
    console.log('           Email: destena@876nurses.com');
    console.log('           Temp Password: temp123 (must change on first login)');
    console.log('           Notifications: ALL EMAILS');
    console.log('');
    console.log('ADMIN004 - Sandrene (Administrative Staff)');
    console.log('           Username: ADMIN004');
    console.log('           Email: sandrene@876nurses.com');
    console.log('           Temp Password: temp123 (must change on first login)');
    console.log('           Notifications: ALL EMAILS');
    console.log('');
    console.log('ADMIN005 - Subrina Prince (Nurse Supervisor/Manager)');
    console.log('           Username: ADMIN005');
    console.log('           Email: prince@876nurses.com');
    console.log('           Temp Password: temp123 (must change on first login)');
    console.log('           Notifications: SCHEDULING/SHIFT EMAILS ONLY (NO invoices/bills)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    console.log('\n✨ Admin team setup complete!');
    console.log('\n🔐 Login Instructions:');
    console.log('   - Login with USERNAME and PASSWORD (not email)');
    console.log('   - Example: Username: ADMIN003, Password: temp123');
    console.log('   - All new staff will be prompted to change password on first sign in');
    console.log('\n📧 Email Notification Roles:');
    console.log('   - full_access: Gets all notification types');
    console.log('   - scheduling_only: Gets only shift/scheduling notifications');
    console.log('   - financial_only: Gets only invoice/payment notifications (for future accountants)');

  } catch (error) {
    console.error('❌ Error creating admin team:', error);
    throw error;
  } finally {
    process.exit(0);
  }
}

createAdminTeam();
