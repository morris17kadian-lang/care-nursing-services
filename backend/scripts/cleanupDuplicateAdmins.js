const { getFirestore } = require('../services/firebaseAdmin');

/**
 * Script to clean up duplicate admin accounts
 * Keeps the most complete record for each email address
 * Run: node backend/scripts/cleanupDuplicateAdmins.js
 */

async function cleanupDuplicateAdmins() {
  const db = getFirestore();
  
  if (!db) {
    console.error('❌ Failed to initialize Firestore. Check your firebase-service-key.json');
    process.exit(1);
  }

  try {
    console.log('🔍 Fetching all admin accounts...');
    const adminsRef = db.collection('admins');
    const snapshot = await adminsRef.get();

    if (snapshot.empty) {
      console.log('✅ No admin accounts found in the database.');
      return;
    }

    console.log(`📋 Found ${snapshot.size} admin account(s)...\n`);

    // Group admins by email
    const adminsByEmail = {};
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      const email = data.email?.toLowerCase();
      
      if (!email) {
        console.log(`⚠️  Skipping admin ${doc.id} - no email`);
        return;
      }

      if (!adminsByEmail[email]) {
        adminsByEmail[email] = [];
      }

      adminsByEmail[email].push({
        id: doc.id,
        ref: doc.ref,
        data: data,
      });
    });

    // Process each email group
    let totalDeleted = 0;
    let totalKept = 0;

    for (const [email, admins] of Object.entries(adminsByEmail)) {
      if (admins.length === 1) {
        console.log(`✓ ${email} - no duplicates (keeping ${admins[0].id})`);
        totalKept++;
        continue;
      }

      console.log(`\n🔍 Found ${admins.length} accounts for ${email}:`);
      admins.forEach((admin, i) => {
        console.log(`   ${i + 1}. ID: ${admin.id}`);
        console.log(`      Username: ${admin.data.username || 'N/A'}`);
        console.log(`      Role: ${admin.data.role || 'N/A'}`);
        console.log(`      Created: ${admin.data.createdAt?.toDate?.() || 'N/A'}`);
      });

      // Choose the best one to keep
      const bestAdmin = chooseBestAdmin(admins);
      const toDelete = admins.filter(a => a.id !== bestAdmin.id);

      console.log(`   ✓ Keeping: ${bestAdmin.id} (${bestAdmin.data.username || 'no username'})`);
      console.log(`   ✗ Deleting: ${toDelete.length} duplicate(s)`);

      // Delete the duplicates
      for (const admin of toDelete) {
        await admin.ref.delete();
        console.log(`      Deleted ${admin.id}`);
        totalDeleted++;
      }

      totalKept++;
    }

    console.log(`\n✅ Cleanup complete!`);
    console.log(`   Kept: ${totalKept} admin account(s)`);
    console.log(`   Deleted: ${totalDeleted} duplicate(s)`);

  } catch (error) {
    console.error('❌ Error cleaning up admins:', error);
    process.exit(1);
  }
}

/**
 * Choose the best admin record to keep from duplicates
 * Priority:
 * 1. Has username
 * 2. Has role defined
 * 3. Most complete data (more fields)
 * 4. Most recent createdAt
 */
function chooseBestAdmin(admins) {
  return admins.reduce((best, current) => {
    // Prefer admin with username
    if (current.data.username && !best.data.username) return current;
    if (!current.data.username && best.data.username) return best;

    // Prefer admin with defined role
    if (current.data.role && !best.data.role) return current;
    if (!current.data.role && best.data.role) return best;

    // Prefer admin with more fields
    const currentFields = Object.keys(current.data).length;
    const bestFields = Object.keys(best.data).length;
    if (currentFields > bestFields) return current;
    if (currentFields < bestFields) return best;

    // Prefer most recent
    const currentTime = current.data.createdAt?.toMillis?.() || 0;
    const bestTime = best.data.createdAt?.toMillis?.() || 0;
    if (currentTime > bestTime) return current;

    return best;
  });
}

// Run the script
cleanupDuplicateAdmins()
  .then(() => {
    console.log('\n✨ Script completed.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
