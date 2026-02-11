/*
  Update ADMIN001 email in Firebase Auth to nurse@876.com

  Usage:
    node scripts/update-admin001-email.js

  Notes:
    - Requires firebase-admin service account JSON.
    - Looks for GOOGLE_APPLICATION_CREDENTIALS or ./firebase-service-key.json
*/

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const OLD_EMAIL = 'shertonia@care.com';
const NEW_EMAIL = 'nurse@876.com';
const PASSWORD = 'temp123'; // Reset password to temp123 for consistency

async function main() {
  const keyPath =
    process.env.GOOGLE_APPLICATION_CREDENTIALS ||
    path.join(process.cwd(), 'firebase-service-key.json');

  if (!fs.existsSync(keyPath)) {
    throw new Error(
      `Firebase service account key not found at ${keyPath}. Set GOOGLE_APPLICATION_CREDENTIALS or add firebase-service-key.json.`
    );
  }

  const svc = require(keyPath);
  admin.initializeApp({ credential: admin.credential.cert(svc) });

  console.log(`Looking for ADMIN001 user with email: ${OLD_EMAIL}`);

  try {
    // Try to find user by old email
    let user;
    try {
      user = await admin.auth().getUserByEmail(OLD_EMAIL);
      console.log(`✓ Found user by email ${OLD_EMAIL}`);
    } catch (err) {
      console.log(`User not found by old email, trying new email ${NEW_EMAIL}...`);
      user = await admin.auth().getUserByEmail(NEW_EMAIL);
      console.log(`✓ User already has new email ${NEW_EMAIL}`);
    }

    console.log(`User UID: ${user.uid}`);
    console.log(`Current email: ${user.email}`);
    console.log(`Display name: ${user.displayName || 'N/A'}`);

    // Update to new email and reset password
    await admin.auth().updateUser(user.uid, {
      email: NEW_EMAIL,
      password: PASSWORD,
      displayName: 'Nurse Bernard'
    });

    console.log(`\n✅ SUCCESS!`);
    console.log(`Updated email to: ${NEW_EMAIL}`);
    console.log(`Updated displayName to: Nurse Bernard`);
    console.log(`Reset password to: ${PASSWORD}`);
    console.log(`\nYou can now login with:`);
    console.log(`  Username: ADMIN001`);
    console.log(`  Email: ${NEW_EMAIL}`);
    console.log(`  Password: ${PASSWORD}`);

    // Also update Firestore profile
    const db = admin.firestore();
    const adminDoc = await db.collection('admins').doc(user.uid).get();
    
    if (adminDoc.exists) {
      await db.collection('admins').doc(user.uid).update({
        email: NEW_EMAIL,
        contactEmail: NEW_EMAIL,
        fullName: 'Nurse Bernard',
        displayName: 'Nurse Bernard',
        username: 'ADMIN001',
        updatedAt: new Date().toISOString()
      });
      console.log(`✓ Updated Firestore admin profile`);
    } else {
      console.log(`⚠ Admin profile not found in Firestore (UID: ${user.uid})`);
    }

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    if (error.code === 'auth/user-not-found') {
      console.error(`\nCould not find user with email ${OLD_EMAIL} or ${NEW_EMAIL}`);
      console.error('Please check Firebase Console for the correct email.');
    }
    process.exit(1);
  }
}

main().catch((e) => {
  console.error('ERROR:', e);
  process.exit(1);
});
