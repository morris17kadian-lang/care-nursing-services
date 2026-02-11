import { auth } from '../config/firebase';
import FirebaseService from '../services/FirebaseService';
import {
  createUserWithEmailAndPassword,
  signOut,
} from 'firebase/auth';

/**
 * Migrate users from MongoDB to Firebase
 * Takes an array of user objects from MongoDB and creates them in Firebase Auth + Firestore
 * 
 * Usage:
 * const mongoUsers = [
 *   { _id: '123', username: 'john', email: 'john@example.com', password: 'hashed_pwd', ... },
 *   { _id: '456', username: 'nurse001', email: 'nurse@example.com', password: 'hashed_pwd', ... }
 * ];
 * 
 * await migrateUsers(mongoUsers, 'defaultPassword123');
 */

class UserMigrationService {
  /**
   * Migrate users from MongoDB to Firebase
   * @param {Array} mongoUsers - Array of user objects from MongoDB
   * @param {String} defaultPassword - Default password if MongoDB passwords can't be used (hashed)
   */
  static async migrateUsers(mongoUsers, defaultPassword = 'TemporaryPassword123!') {
    const results = {
      success: [],
      failed: [],
      skipped: [],
    };

    console.log(`🔄 Starting migration of ${mongoUsers.length} users...`);

    for (const mongoUser of mongoUsers) {
      try {
        // Validate required fields
        if (!mongoUser.email) {
          results.skipped.push({
            username: mongoUser.username || mongoUser._id,
            reason: 'No email found',
          });
          continue;
        }

        // Skip if user already exists (optional check)
        const existingUser = await FirebaseService.getUserByEmail(mongoUser.email);
        if (existingUser.success) {
          results.skipped.push({
            email: mongoUser.email,
            reason: 'User already exists in Firebase',
          });
          continue;
        }

        console.log(`📧 Creating Firebase Auth user: ${mongoUser.email}`);

        // Create Firebase Auth user
        // Note: If MongoDB uses hashed passwords, users will need to reset their password
        // We use a temporary password here
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          mongoUser.email,
          defaultPassword
        );

        const firebaseUid = userCredential.user.uid;

        // Prepare user data for Firestore
        const firestoreUserData = {
          id: firebaseUid,
          email: mongoUser.email,
          username: mongoUser.username || mongoUser.email.split('@')[0],
          firstName: mongoUser.firstName || mongoUser.fullName?.split(' ')[0] || '',
          lastName: mongoUser.lastName || mongoUser.fullName?.split(' ').slice(1).join(' ') || '',
          phone: mongoUser.phone || '',
          address: mongoUser.address || '',
          country: mongoUser.country || '',
          role: mongoUser.role || 'patient',
          profileImageUrl: mongoUser.profileImageUrl || null,
          createdAt: new Date(mongoUser.createdAt || new Date()).toISOString(),
          updatedAt: new Date().toISOString(),
          mongoId: mongoUser._id, // Keep original MongoDB ID for reference
          migratedFrom: 'mongodb',
          requiresPasswordReset: true, // User should reset password on first login
        };

        // Save to Firestore
        const firestoreResult = await FirebaseService.createUser(
          firebaseUid,
          firestoreUserData
        );

        if (firestoreResult.success) {
          results.success.push({
            email: mongoUser.email,
            firebaseUid,
            mongoId: mongoUser._id,
          });
          console.log(`✅ Successfully migrated: ${mongoUser.email}`);
        } else {
          results.failed.push({
            email: mongoUser.email,
            reason: firestoreResult.error,
            mongoId: mongoUser._id,
          });
          console.error(`❌ Failed to save to Firestore: ${mongoUser.email}`, firestoreResult.error);
        }

        // Sign out the created user
        await signOut(auth);
      } catch (error) {
        results.failed.push({
          email: mongoUser.email || mongoUser.username,
          reason: error.message,
          mongoId: mongoUser._id,
        });
        console.error(`❌ Error migrating user:`, error.message);
      }
    }

    console.log(`\n📊 Migration Complete!`);
    console.log(`✅ Success: ${results.success.length}`);
    console.log(`❌ Failed: ${results.failed.length}`);
    console.log(`⏭️ Skipped: ${results.skipped.length}`);

    return results;
  }

  /**
   * Export migration results to JSON
   */
  static exportResults(results) {
    return JSON.stringify(results, null, 2);
  }

  /**
   * Create sample MongoDB user data for testing
   */
  static getSampleMongoUsers() {
    return [
      {
        _id: '507f1f77bcf86cd799439011',
        username: 'john_nurse',
        email: 'john@876nurses.com',
        phone: '1876-555-0101',
        address: '123 Main St, Kingston',
        country: 'Jamaica',
        role: 'nurse',
        fullName: 'John Smith',
        createdAt: new Date('2024-01-15'),
      },
      {
        _id: '507f1f77bcf86cd799439012',
        username: 'admin001',
        email: 'admin@876nurses.com',
        phone: '1876-555-0102',
        address: '456 Office Ave, Kingston',
        country: 'Jamaica',
        role: 'admin',
        fullName: 'Admin User',
        createdAt: new Date('2024-01-01'),
      },
    ];
  }
}

export default UserMigrationService;
