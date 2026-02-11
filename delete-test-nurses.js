const admin = require('firebase-admin');
const serviceAccount = require('./firebase-service-key.json');

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();
const auth = admin.auth();

async function deleteTestNurses() {
  console.log('🔍 Finding test nurses...\n');

  try {
    // Get all nurses from Firestore
    const nursesSnapshot = await db.collection('nurses').get();
    
    if (nursesSnapshot.empty) {
      console.log('No nurses found in database.');
      return;
    }

    console.log(`Found ${nursesSnapshot.size} total nurses.\n`);
    console.log('📋 Current Nurses:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const nursesList = [];
    nursesSnapshot.forEach(doc => {
      const data = doc.data();
      nursesList.push({
        id: doc.id,
        code: data.nurseCode || data.code || data.username,
        name: data.fullName || data.name,
        email: data.email,
        createdAt: data.createdAt
      });
    });

    // Sort by nurse code
    nursesList.sort((a, b) => {
      const codeA = a.code || '';
      const codeB = b.code || '';
      return codeA.localeCompare(codeB);
    });

    // Display all nurses
    nursesList.forEach((nurse, index) => {
      console.log(`${index + 1}. ${nurse.code} - ${nurse.name}`);
      console.log(`   Email: ${nurse.email}`);
      console.log(`   ID: ${nurse.id}`);
      console.log('');
    });

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    // Identify likely test nurses (you can modify these patterns)
    const testPatterns = [
      /test/i,
      /demo/i,
      /sample/i,
      /NURSE00[6-9]/i,  // NURSE006, NURSE007, NURSE008, NURSE009
      /NURSE01[0-9]/i   // NURSE010 onwards
    ];

    const testNurses = nursesList.filter(nurse => {
      const searchString = `${nurse.code} ${nurse.name} ${nurse.email}`;
      return testPatterns.some(pattern => pattern.test(searchString));
    });

    if (testNurses.length === 0) {
      console.log('✅ No test nurses found matching common test patterns.');
      console.log('\nIf you want to delete specific nurses, please modify the testPatterns array in the script.\n');
      return;
    }

    console.log(`⚠️  Found ${testNurses.length} potential test nurse(s):\n`);
    testNurses.forEach((nurse, index) => {
      console.log(`${index + 1}. ${nurse.code} - ${nurse.name} (${nurse.email})`);
    });

    console.log('\n❌ Deleting test nurses...\n');

    // Delete each test nurse
    for (const nurse of testNurses) {
      try {
        // Delete from Firestore
        await db.collection('nurses').doc(nurse.id).delete();
        console.log(`✅ Deleted from Firestore: ${nurse.code} - ${nurse.name}`);

        // Try to delete from Firebase Auth
        try {
          await auth.deleteUser(nurse.id);
          console.log(`   ✅ Deleted from Auth: ${nurse.email}`);
        } catch (authError) {
          if (authError.code === 'auth/user-not-found') {
            console.log(`   ⚠️  No Auth account found for ${nurse.email}`);
          } else {
            console.log(`   ⚠️  Auth deletion failed: ${authError.message}`);
          }
        }
        console.log('');
      } catch (error) {
        console.error(`❌ Error deleting ${nurse.code}:`, error.message);
      }
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✨ Cleanup complete!');
    console.log(`\n📊 Summary:`);
    console.log(`   - Total nurses before: ${nursesSnapshot.size}`);
    console.log(`   - Test nurses deleted: ${testNurses.length}`);
    console.log(`   - Remaining nurses: ${nursesSnapshot.size - testNurses.length}`);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }

  process.exit(0);
}

// Run the cleanup
deleteTestNurses();
