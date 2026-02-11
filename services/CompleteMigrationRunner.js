/**
 * Complete MongoDB to Firebase Migration Runner
 * Reads all MongoDB JSON exports and imports them into Firestore
 * Handles users separately (creates Firebase Auth accounts)
 * Migrates all other collections directly
 */

import fs from 'fs';
import path from 'path';
import FirebaseService from './FirebaseService.js';
import { auth } from '../config/firebase.js';
import { createUserWithEmailAndPassword } from 'firebase/auth';

const DB_EXPORT_DIR = path.join(process.cwd(), '876Nursesdatabase');

// Temporary password for migrated users (they'll reset on first login)
const TEMP_PASSWORD = 'TempPassword123!@#';

class CompleteMigrationRunner {
  constructor() {
    this.results = {
      users: { success: 0, failed: 0, skipped: 0 },
      nurses: { success: 0, failed: 0, skipped: 0 },
      admins: { success: 0, failed: 0, skipped: 0 },
      appointments: { success: 0, failed: 0 },
      invoices: { success: 0, failed: 0 },
      payslips: { success: 0, failed: 0 },
      shiftRequests: { success: 0, failed: 0 },
      others: { success: 0, failed: 0 }
    };
    this.errors = [];
  }

  /**
   * Read and parse a JSON file from the export directory
   */
  readJsonFile(filename) {
    try {
      const filePath = path.join(DB_EXPORT_DIR, filename);
      if (!fs.existsSync(filePath)) {
        console.log(`⚠️  File not found: ${filename}`);
        return [];
      }
      const content = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      console.error(`❌ Error reading ${filename}:`, error.message);
      this.errors.push({ file: filename, error: error.message });
      return [];
    }
  }

  /**
   * Create a Firebase Auth user and save profile to Firestore
   */
  async migrateUser(mongoUser, role) {
    try {
      // Extract email and create auth account
      const email = mongoUser.email?.toLowerCase() || mongoUser.username + '@876nurses.local';
      
      if (!email || !email.includes('@')) {
        console.log(`⏭️  Skipping user without valid email: ${mongoUser.username}`);
        return { status: 'skipped', reason: 'invalid_email' };
      }

      // Create Firebase Auth account with temporary password
      try {
        await createUserWithEmailAndPassword(auth, email, TEMP_PASSWORD);
        console.log(`✅ Created Firebase Auth account: ${email}`);
      } catch (authError) {
        if (authError.code === 'auth/email-already-exists') {
          console.log(`⏭️  Auth account already exists: ${email}`);
        } else if (authError.code === 'auth/email-already-in-use') {
          console.log(`⏭️  Auth account already in use: ${email}`);
        } else {
          throw authError;
        }
      }

      // Prepare user profile for Firestore
      const userProfile = {
        email: email,
        username: mongoUser.username || mongoUser.fullName?.split(' ')[0] || 'user',
        firstName: mongoUser.firstName || mongoUser.fullName?.split(' ')[0] || '',
        lastName: mongoUser.lastName || mongoUser.fullName?.split(' ')[1] || '',
        phone: mongoUser.phone || '',
        role: role,
        isActive: mongoUser.isActive !== false,
        emailVerified: false,
        profilePhoto: mongoUser.profilePhoto || null,
        
        // User-specific fields
        ...(mongoUser.address && { address: mongoUser.address }),
        ...(mongoUser.allergies && { allergies: mongoUser.allergies }),
        ...(mongoUser.medicalHistory && { medicalHistory: mongoUser.medicalHistory }),
        ...(mongoUser.ratings && { ratings: mongoUser.ratings }),
        
        // Nurse-specific fields
        ...(mongoUser.nurseCode && { nurseCode: mongoUser.nurseCode }),
        ...(mongoUser.specialization && { specialization: mongoUser.specialization }),
        ...(mongoUser.bankingDetails && { bankingDetails: mongoUser.bankingDetails }),
        ...(mongoUser.licenseNumber && { licenseNumber: mongoUser.licenseNumber }),
        ...(mongoUser.experience && { experience: mongoUser.experience }),
        
        // Admin-specific fields
        ...(mongoUser.adminCode && { adminCode: mongoUser.adminCode }),
        ...(mongoUser.adminLevel && { adminLevel: mongoUser.adminLevel }),
        ...(mongoUser.isSuperAdmin && { isSuperAdmin: mongoUser.isSuperAdmin }),
        
        // System fields
        mongoId: mongoUser._id?.$oid || mongoUser._id,
        migratedAt: new Date().toISOString(),
        createdAt: mongoUser.createdAt?.$date ? new Date(mongoUser.createdAt.$date) : new Date(),
        updatedAt: mongoUser.updatedAt?.$date ? new Date(mongoUser.updatedAt.$date) : new Date()
      };

      // Save to Firestore
      await FirebaseService.createUser(email, userProfile);
      console.log(`💾 Saved to Firestore: ${email} (${role})`);
      return { status: 'success' };
    } catch (error) {
      console.error(`❌ Error migrating user ${mongoUser.email || mongoUser.username}:`, error.message);
      this.errors.push({
        user: mongoUser.email || mongoUser.username,
        error: error.message
      });
      return { status: 'failed', reason: error.message };
    }
  }

  /**
   * Migrate appointment records
   */
  async migrateAppointments(appointments) {
    console.log(`\n📅 Migrating ${appointments.length} appointments...`);
    for (const apt of appointments) {
      try {
        const aptData = {
          ...apt,
          mongoId: apt._id?.$oid || apt._id,
          createdAt: apt.createdAt?.$date ? new Date(apt.createdAt.$date) : new Date(),
          updatedAt: apt.updatedAt?.$date ? new Date(apt.updatedAt.$date) : new Date()
        };
        delete aptData._id;
        delete aptData.__v;

        await FirebaseService.createAppointment(aptData);
        this.results.appointments.success++;
      } catch (error) {
        this.results.appointments.failed++;
        this.errors.push({ appointment: apt._id, error: error.message });
      }
    }
  }

  /**
   * Migrate invoice records
   */
  async migrateInvoices(invoices) {
    console.log(`\n📄 Migrating ${invoices.length} invoices...`);
    for (const inv of invoices) {
      try {
        const invData = {
          ...inv,
          mongoId: inv._id?.$oid || inv._id,
          createdAt: inv.createdAt?.$date ? new Date(inv.createdAt.$date) : new Date(),
          updatedAt: inv.updatedAt?.$date ? new Date(inv.updatedAt.$date) : new Date()
        };
        delete invData._id;
        delete invData.__v;

        await FirebaseService.createInvoice(invData);
        this.results.invoices.success++;
      } catch (error) {
        this.results.invoices.failed++;
        this.errors.push({ invoice: inv._id, error: error.message });
      }
    }
  }

  /**
   * Migrate payslip records
   */
  async migratePayslips(payslips) {
    console.log(`\n💰 Migrating ${payslips.length} payslips...`);
    for (const slip of payslips) {
      try {
        const slipData = {
          ...slip,
          mongoId: slip._id?.$oid || slip._id,
          createdAt: slip.createdAt?.$date ? new Date(slip.createdAt.$date) : new Date(),
          updatedAt: slip.updatedAt?.$date ? new Date(slip.updatedAt.$date) : new Date()
        };
        delete slipData._id;
        delete slipData.__v;

        await FirebaseService.createPayslip(slipData);
        this.results.payslips.success++;
      } catch (error) {
        this.results.payslips.failed++;
        this.errors.push({ payslip: slip._id, error: error.message });
      }
    }
  }

  /**
   * Migrate shift request records
   */
  async migrateShiftRequests(shifts) {
    console.log(`\n⏰ Migrating ${shifts.length} shift requests...`);
    for (const shift of shifts) {
      try {
        const shiftData = {
          ...shift,
          mongoId: shift._id?.$oid || shift._id,
          createdAt: shift.createdAt?.$date ? new Date(shift.createdAt.$date) : new Date(),
          updatedAt: shift.updatedAt?.$date ? new Date(shift.updatedAt.$date) : new Date()
        };
        delete shiftData._id;
        delete shiftData.__v;

        // Save to a generic 'shifts' collection in Firestore
        const { setDoc, doc } = await import('firebase/firestore');
        const { firestore } = await import('../config/firebase.js');
        
        await setDoc(
          doc(firestore, 'shifts', shiftData.mongoId),
          shiftData
        );
        this.results.shiftRequests.success++;
      } catch (error) {
        this.results.shiftRequests.failed++;
        this.errors.push({ shift: shift._id, error: error.message });
      }
    }
  }

  /**
   * Run complete migration
   */
  async runMigration() {
    console.log('🚀 Starting Complete MongoDB to Firebase Migration...\n');
    console.log(`📂 Reading from: ${DB_EXPORT_DIR}\n`);

    try {
      // Step 1: Migrate Users (creates Firebase Auth accounts)
      console.log('👥 Step 1: Migrating Patient Users...');
      const users = this.readJsonFile('care_database.users.json');
      for (const user of users) {
        const result = await this.migrateUser(user, 'patient');
        if (result.status === 'success') this.results.users.success++;
        else if (result.status === 'skipped') this.results.users.skipped++;
        else this.results.users.failed++;
      }

      // Step 2: Migrate Nurses (creates Firebase Auth accounts)
      console.log('\n💉 Step 2: Migrating Nurses...');
      const nurses = this.readJsonFile('care_database.nurses.json');
      for (const nurse of nurses) {
        const result = await this.migrateUser(nurse, 'nurse');
        if (result.status === 'success') this.results.nurses.success++;
        else if (result.status === 'skipped') this.results.nurses.skipped++;
        else this.results.nurses.failed++;
      }

      // Step 3: Migrate Admins (creates Firebase Auth accounts)
      console.log('\n🔑 Step 3: Migrating Admins...');
      const admins = this.readJsonFile('care_database.admins.json');
      for (const admin of admins) {
        const result = await this.migrateUser(admin, 'admin');
        if (result.status === 'success') this.results.admins.success++;
        else if (result.status === 'skipped') this.results.admins.skipped++;
        else this.results.admins.failed++;
      }

      // Step 4: Migrate Appointments
      const appointments = this.readJsonFile('care_database.appointments.json');
      await this.migrateAppointments(appointments);

      // Step 5: Migrate Invoices
      const invoices = this.readJsonFile('care_database.invoices.json');
      await this.migrateInvoices(invoices);

      // Step 6: Migrate Payslips
      const payslips = this.readJsonFile('care_database.payslips.json');
      await this.migratePayslips(payslips);

      // Step 7: Migrate Shift Requests
      const shifts = this.readJsonFile('care_database.shiftRequests.json');
      await this.migrateShiftRequests(shifts);

      this.printResults();
    } catch (error) {
      console.error('❌ Migration failed:', error);
      throw error;
    }
  }

  /**
   * Print migration results summary
   */
  printResults() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 MIGRATION RESULTS SUMMARY');
    console.log('='.repeat(60) + '\n');

    console.log('👥 Users (Patients):');
    console.log(`   ✅ Success: ${this.results.users.success}`);
    console.log(`   ⏭️  Skipped: ${this.results.users.skipped}`);
    console.log(`   ❌ Failed: ${this.results.users.failed}`);

    console.log('\n💉 Nurses:');
    console.log(`   ✅ Success: ${this.results.nurses.success}`);
    console.log(`   ⏭️  Skipped: ${this.results.nurses.skipped}`);
    console.log(`   ❌ Failed: ${this.results.nurses.failed}`);

    console.log('\n🔑 Admins:');
    console.log(`   ✅ Success: ${this.results.admins.success}`);
    console.log(`   ⏭️  Skipped: ${this.results.admins.skipped}`);
    console.log(`   ❌ Failed: ${this.results.admins.failed}`);

    console.log('\n📅 Appointments:');
    console.log(`   ✅ Success: ${this.results.appointments.success}`);
    console.log(`   ❌ Failed: ${this.results.appointments.failed}`);

    console.log('\n📄 Invoices:');
    console.log(`   ✅ Success: ${this.results.invoices.success}`);
    console.log(`   ❌ Failed: ${this.results.invoices.failed}`);

    console.log('\n💰 Payslips:');
    console.log(`   ✅ Success: ${this.results.payslips.success}`);
    console.log(`   ❌ Failed: ${this.results.payslips.failed}`);

    console.log('\n⏰ Shift Requests:');
    console.log(`   ✅ Success: ${this.results.shiftRequests.success}`);
    console.log(`   ❌ Failed: ${this.results.shiftRequests.failed}`);

    console.log('\n' + '='.repeat(60));
    const totalSuccess = Object.values(this.results).reduce((sum, item) => sum + item.success, 0);
    const totalFailed = Object.values(this.results).reduce((sum, item) => sum + item.failed, 0);
    console.log(`📈 Total: ${totalSuccess} successful, ${totalFailed} failed`);
    console.log('='.repeat(60) + '\n');

    if (this.errors.length > 0) {
      console.log('\n⚠️  Errors encountered:');
      this.errors.slice(0, 10).forEach(err => {
        console.log(`   - ${JSON.stringify(err)}`);
      });
      if (this.errors.length > 10) {
        console.log(`   ... and ${this.errors.length - 10} more errors`);
      }
    }

    console.log('\n✨ Migration complete!\n');
  }
}

// Run migration if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const runner = new CompleteMigrationRunner();
  runner.runMigration().catch(console.error);
}

export default CompleteMigrationRunner;
