const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore, Timestamp } = require('firebase-admin/firestore');
const fs = require('fs');
const path = require('path');

// Initialize Firebase Admin SDK
let db;

const extractId = (value) => {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  if (typeof value === 'object') {
    if (value.id) return value.id;
    if (value._id) return value._id;
    if (value.$oid) return value.$oid;
    if (value.value) return value.value;
  }
  return null;
};

const pickFirstDefined = (...values) => {
  for (const value of values) {
    if (value === undefined || value === null) continue;
    if (typeof value === 'string' && value.trim() === '') continue;
    return value;
  }
  return null;
};

const splitName = (value) => {
  if (!value || typeof value !== 'string') {
    return { firstName: null, lastName: null };
  }
  const parts = value.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: null, lastName: null };
  const [firstName, ...rest] = parts;
  return {
    firstName: firstName || null,
    lastName: rest.length > 0 ? rest.join(' ') : null,
  };
};

const buildNameFields = (data = {}, fallbackLabel = 'Unknown User') => {
  const rawFullName = pickFirstDefined(
    data.fullName,
    data.displayName,
    data.name,
    [data.firstName, data.lastName].filter(Boolean).join(' ').trim(),
    fallbackLabel
  );

  const normalizedFullName = typeof rawFullName === 'string' ? rawFullName.trim() : null;
  const { firstName, lastName } = splitName(normalizedFullName || '');

  return {
    fullName: normalizedFullName,
    firstName: pickFirstDefined(data.firstName, firstName),
    lastName: pickFirstDefined(data.lastName, lastName),
    displayName: pickFirstDefined(data.displayName, normalizedFullName),
  };
};

const formatAddress = (address) => {
  if (!address) return null;
  if (typeof address === 'string') {
    const trimmed = address.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (typeof address === 'object') {
    const { street, line1, line2, city, parish, state, postalCode, zip, country } = address;
    const parts = [street || line1, line2, city, parish || state, postalCode || zip, country]
      .map(part => (typeof part === 'string' ? part.trim() : null))
      .filter(Boolean);
    return parts.join(', ') || null;
  }
  return null;
};

async function initializeFirebase() {
  try {
    const serviceAccountPath = path.join(__dirname, '../firebase-service-key.json');
    
    if (fs.existsSync(serviceAccountPath)) {
      const serviceAccount = require(serviceAccountPath);
      const app = initializeApp({
        credential: cert(serviceAccount)
      });
      db = getFirestore(app);
      console.log('✅ Firebase initialized with service account');
      return true;
    } else {
      // Fallback to default credentials
      const app = initializeApp();
      db = getFirestore(app);
      console.log('✅ Firebase initialized with default credentials');
      return true;
    }
  } catch (error) {
    console.error('❌ Firebase initialization failed:', error.message);
    console.log('\n⚠️  To use this script, you need to:');
    console.log('1. Download Firebase service account key from Console > Project Settings > Service Accounts');
    console.log('2. Save it as firebase-service-key.json in the project root');
    return false;
  }
}

async function normalizeInvoices() {
  console.log('\n🔧 Normalizing Invoices...');
  const invoicesRef = db.collection('invoices');
  const snapshot = await invoicesRef.get();
  
  if (snapshot.empty) {
    console.log('  ℹ️  No invoices found.');
    return;
  }

  const batch = db.batch();
  let updateCount = 0;

  snapshot.forEach(doc => {
    const data = doc.data();
    const updates = {};
    let needsUpdate = false;

    // 1. Fix ID mismatch: relatedAppointmentId vs appointmentId
    if (data.appointmentId && !data.relatedAppointmentId) {
      updates.relatedAppointmentId = data.appointmentId;
      needsUpdate = true;
    } else if (!data.appointmentId && data.relatedAppointmentId) {
      updates.appointmentId = data.relatedAppointmentId;
      needsUpdate = true;
    }

    // 2. Ensure string ID exists
    if (!data.id) {
      updates.id = doc.id;
      needsUpdate = true;
    }

    if (needsUpdate) {
      batch.update(doc.ref, updates);
      updateCount++;
    }
  });

  if (updateCount > 0) {
    await batch.commit();
    console.log(`  ✅ Updated ${updateCount} invoices.`);
  } else {
    console.log('  ✅ All invoices are already normalized.');
  }
}

async function normalizeAppointments() {
  console.log('\n🔧 Normalizing Appointments...');
  const appointmentsRef = db.collection('appointments');
  const snapshot = await appointmentsRef.get();
  
  if (snapshot.empty) {
    console.log('  ℹ️  No appointments found.');
    return;
  }

  const batch = db.batch();
  let updateCount = 0;

  snapshot.forEach(doc => {
    const data = doc.data();
    const updates = {};
    let needsUpdate = false;

    const canonicalId = extractId(data.id) || extractId(data._id) || extractId(data.appointmentId) || doc.id;
    if (canonicalId && data.id !== canonicalId) {
      updates.id = canonicalId;
      needsUpdate = true;
    }
    if (canonicalId && data._id !== canonicalId) {
      updates._id = canonicalId;
      needsUpdate = true;
    }
    if (canonicalId && data.appointmentId !== canonicalId) {
      updates.appointmentId = canonicalId;
      needsUpdate = true;
    }

    const patientId = extractId(data.patientId) || extractId(data.patient) || extractId(data.clientId);
    if (patientId && data.patientId !== patientId) {
      updates.patientId = patientId;
      needsUpdate = true;
    }

    const clientId = extractId(data.clientId) || patientId;
    if (clientId && data.clientId !== clientId) {
      updates.clientId = clientId;
      needsUpdate = true;
    }

    const nurseId = extractId(data.nurseId) || extractId(data.nurse) || extractId(data.assignedNurse);
    if (nurseId && data.nurseId !== nurseId) {
      updates.nurseId = nurseId;
      needsUpdate = true;
    }

    const assignedNurseId = extractId(data.assignedNurseId) || extractId(data.assignedNurse);
    if (assignedNurseId && data.assignedNurseId !== assignedNurseId) {
      updates.assignedNurseId = assignedNurseId;
      needsUpdate = true;
    }

    // 1. Fix Service Type: service vs serviceType vs appointmentType
    const serviceValue = data.service || data.serviceType || data.appointmentType;
    if (serviceValue) {
      if (!data.service) { updates.service = serviceValue; needsUpdate = true; }
      if (!data.serviceType) { updates.serviceType = serviceValue; needsUpdate = true; }
    }

    // 2. Fix Date: date vs scheduledDate
    // Convert Firestore Timestamp to Date object for comparison/formatting if needed
    const dateValue = data.date || data.scheduledDate;
    if (dateValue) {
      if (!data.date) { updates.date = dateValue; needsUpdate = true; }
      if (!data.scheduledDate) { updates.scheduledDate = dateValue; needsUpdate = true; }
    }

    // 3. Fix Time: time vs scheduledTime
    const timeValue = data.time || data.scheduledTime;
    if (timeValue) {
      if (!data.time) { updates.time = timeValue; needsUpdate = true; }
      if (!data.scheduledTime) { updates.scheduledTime = timeValue; needsUpdate = true; }
    }

    // 4. Fix Patient ID: patientId vs patient (object)
    if (!data.patientId && data.patient && typeof data.patient === 'string') {
       updates.patientId = data.patient;
       needsUpdate = true;
    } else if (!data.patientId && data.patient && data.patient.id) {
       updates.patientId = data.patient.id;
       needsUpdate = true;
    }

    const clientName = pickFirstDefined(data.clientName, data.patientName, data.client?.name, data.patient?.name);
    if (clientName && data.clientName !== clientName) {
      updates.clientName = clientName;
      needsUpdate = true;
    }

    const clientEmail = pickFirstDefined(data.clientEmail, data.patientEmail, data.patient?.email, data.client?.email);
    if (clientEmail && data.clientEmail !== clientEmail) {
      updates.clientEmail = clientEmail;
      needsUpdate = true;
    }

    const clientPhone = pickFirstDefined(data.clientPhone, data.patientPhone, data.patient?.phone, data.client?.phone);
    if (clientPhone && data.clientPhone !== clientPhone) {
      updates.clientPhone = clientPhone;
      needsUpdate = true;
    }

    const rawAddress = pickFirstDefined(data.clientAddress, data.address, data.patientAddress, data.patient?.address, data.client?.address, data.location?.address, data.location?.formattedAddress);
    if (rawAddress && data.clientAddress !== rawAddress) {
      updates.clientAddress = rawAddress;
      needsUpdate = true;
    }

    const hasRecurringPattern = Boolean(
      data.isRecurring ||
      data.adminRecurring ||
      data.recurringScheduleId ||
      data.recurringSchedule ||
      (Array.isArray(data.recurringDaysOfWeek) && data.recurringDaysOfWeek.length > 0)
    );

    if (hasRecurringPattern && data.isRecurring !== true) {
      updates.isRecurring = true;
      needsUpdate = true;
    }

    if (hasRecurringPattern && Array.isArray(data.recurringDaysOfWeek) && !Array.isArray(data.recurringDaysOfWeekList)) {
      updates.recurringDaysOfWeekList = data.recurringDaysOfWeek;
      needsUpdate = true;
    }

    if (data.isShiftRequest === true && data.isShift !== true) {
      updates.isShift = true;
      needsUpdate = true;
    }

    if (needsUpdate) {
      batch.update(doc.ref, updates);
      updateCount++;
    }
  });

  if (updateCount > 0) {
    await batch.commit();
    console.log(`  ✅ Updated ${updateCount} appointments.`);
  } else {
    console.log('  ✅ All appointments are already normalized.');
  }
}

async function normalizeShiftRequests() {
  console.log('\n🔧 Normalizing Shift Requests...');
  const shiftsRef = db.collection('shiftRequests');
  const snapshot = await shiftsRef.get();
  
  if (snapshot.empty) {
    console.log('  ℹ️  No shift requests found.');
    return;
  }

  const batch = db.batch();
  let updateCount = 0;

  snapshot.forEach(doc => {
    const data = doc.data();
    const updates = {};
    let needsUpdate = false;

    // 1. Ensure isShift flag
    if (data.isShift !== true) {
      updates.isShift = true;
      needsUpdate = true;
    }

    // 2. Normalize Client Contact Info (flatten structure)
    if (!data.clientEmail && (data.patient?.email || data.client?.email)) {
      updates.clientEmail = data.patient?.email || data.client?.email;
      needsUpdate = true;
    }
    if (!data.clientPhone && (data.patient?.phone || data.client?.phone)) {
      updates.clientPhone = data.patient?.phone || data.client?.phone;
      needsUpdate = true;
    }
    if (!data.clientAddress && (data.patient?.address || data.client?.address)) {
      updates.clientAddress = data.patient?.address || data.client?.address;
      needsUpdate = true;
    }

    // 3. Normalize Location
    if (!data.clientLocation && (data.location?.address || data.locationDetails)) {
       updates.clientLocation = data.location?.address || data.locationDetails;
       needsUpdate = true;
    }

    // 4. Ensure string ID exists
    if (!data.id) {
      updates.id = doc.id;
      needsUpdate = true;
    }

    if (needsUpdate) {
      batch.update(doc.ref, updates);
      updateCount++;
    }
  });

  if (updateCount > 0) {
    await batch.commit();
    console.log(`  ✅ Updated ${updateCount} shift requests.`);
  } else {
    console.log('  ✅ All shift requests are already normalized.');
  }
}

async function normalizeUsers() {
  console.log('\n🔧 Normalizing Users (patients)...');
  const usersRef = db.collection('users');
  const snapshot = await usersRef.get();

  if (snapshot.empty) {
    console.log('  ℹ️  No users found.');
    return;
  }

  const batch = db.batch();
  let updateCount = 0;

  snapshot.forEach(doc => {
    const data = doc.data();
    const updates = {};
    let needsUpdate = false;

    const canonicalId = extractId(data.id) || extractId(data._id) || doc.id;
    if (canonicalId && data.id !== canonicalId) { updates.id = canonicalId; needsUpdate = true; }
    if (canonicalId && data._id !== canonicalId) { updates._id = canonicalId; needsUpdate = true; }

    if (!data.role) { updates.role = 'patient'; needsUpdate = true; }

    const { fullName, firstName, lastName, displayName } = buildNameFields(data, data.username || data.email || 'Patient');
    if (fullName && data.fullName !== fullName) { updates.fullName = fullName; needsUpdate = true; }
    if (firstName && data.firstName !== firstName) { updates.firstName = firstName; needsUpdate = true; }
    if (lastName && data.lastName !== lastName) { updates.lastName = lastName; needsUpdate = true; }
    if (displayName && data.displayName !== displayName) { updates.displayName = displayName; needsUpdate = true; }
    if (!data.name && fullName) { updates.name = fullName; needsUpdate = true; }

    const username = pickFirstDefined(data.username, data.email, canonicalId);
    if (username && data.username !== username) { updates.username = username; needsUpdate = true; }

    const contactEmail = pickFirstDefined(data.contactEmail, data.email);
    if (contactEmail && data.contactEmail !== contactEmail) { updates.contactEmail = contactEmail; needsUpdate = true; }

    const addressSource = pickFirstDefined(
      data.address,
      data.clientAddress,
      data.location,
      data.patientAddress,
      data.location?.address
    );
    const addressString = formatAddress(addressSource);
    if (addressString && data.addressString !== addressString) {
      updates.addressString = addressString;
      needsUpdate = true;
    }

    if (data.isActive === undefined) { updates.isActive = true; needsUpdate = true; }
    if (typeof data.isAvailable === 'undefined') { updates.isAvailable = false; needsUpdate = true; }

    if (needsUpdate) {
      batch.update(doc.ref, updates);
      updateCount++;
    }
  });

  if (updateCount > 0) {
    await batch.commit();
    console.log(`  ✅ Updated ${updateCount} users.`);
  } else {
    console.log('  ✅ All users are already normalized.');
  }
}

async function normalizeStaffCollection({ collectionName, defaultRole, codeField }) {
  console.log(`\n🔧 Normalizing ${collectionName}...`);
  const ref = db.collection(collectionName);
  const snapshot = await ref.get();

  if (snapshot.empty) {
    console.log(`  ℹ️  No documents found in '${collectionName}'.`);
    return;
  }

  const batch = db.batch();
  let updateCount = 0;

  snapshot.forEach(doc => {
    const data = doc.data();
    const updates = {};
    let needsUpdate = false;

    const canonicalId = extractId(data.id) || extractId(data._id) || doc.id;
    if (canonicalId && data.id !== canonicalId) { updates.id = canonicalId; needsUpdate = true; }
    if (canonicalId && data._id !== canonicalId) { updates._id = canonicalId; needsUpdate = true; }

    if (defaultRole && data.role !== defaultRole) { updates.role = defaultRole; needsUpdate = true; }

    const { fullName, firstName, lastName, displayName } = buildNameFields(data, data.email || data[codeField] || 'Staff Member');
    if (fullName && data.fullName !== fullName) { updates.fullName = fullName; needsUpdate = true; }
    if (firstName && data.firstName !== firstName) { updates.firstName = firstName; needsUpdate = true; }
    if (lastName && data.lastName !== lastName) { updates.lastName = lastName; needsUpdate = true; }
    if (displayName && data.displayName !== displayName) { updates.displayName = displayName; needsUpdate = true; }
    if (!data.name && fullName) { updates.name = fullName; needsUpdate = true; }

    const codeValue = pickFirstDefined(
      data[codeField],
      data.code,
      data.username,
      data.email,
      canonicalId
    );
    if (codeValue && data[codeField] !== codeValue) { updates[codeField] = codeValue; needsUpdate = true; }
    if (codeValue && data.code !== codeValue) { updates.code = codeValue; needsUpdate = true; }
    if (!data.username && codeValue) { updates.username = codeValue; needsUpdate = true; }

    const contactEmail = pickFirstDefined(data.contactEmail, data.email);
    if (contactEmail && data.contactEmail !== contactEmail) { updates.contactEmail = contactEmail; needsUpdate = true; }

    if (data.isActive === undefined) { updates.isActive = true; needsUpdate = true; }

    if (collectionName === 'nurses') {
      const normalizedStatus = data.status || (data.isAvailable === false ? 'unavailable' : 'available');
      if (data.status !== normalizedStatus) { updates.status = normalizedStatus; needsUpdate = true; }
      if (typeof data.isAvailable === 'undefined') { updates.isAvailable = normalizedStatus === 'available'; needsUpdate = true; }
    }

    const bankingDetails = data.bankingDetails || {};
    const normalizedBanking = {
      bankName: pickFirstDefined(bankingDetails.bankName, data.bankName, 'Not provided'),
      accountNumber: pickFirstDefined(bankingDetails.accountNumber, data.accountNumber, 'Not provided'),
      accountHolderName: pickFirstDefined(bankingDetails.accountHolderName, data.accountHolderName, fullName || codeValue),
      bankBranch: pickFirstDefined(bankingDetails.bankBranch, data.bankBranch, 'Not provided'),
      currency: pickFirstDefined(bankingDetails.currency, data.currency, 'JMD'),
    };

    const needsBankingUpdate = ['bankName', 'accountNumber', 'accountHolderName', 'bankBranch', 'currency'].some(
      key => bankingDetails[key] !== normalizedBanking[key]
    );

    if (needsBankingUpdate || !data.bankingDetails) {
      updates.bankingDetails = normalizedBanking;
      needsUpdate = true;
    }

    ['bankName', 'accountNumber', 'accountHolderName', 'bankBranch'].forEach(key => {
      const value = normalizedBanking[key];
      if (data[key] !== value) {
        updates[key] = value;
        needsUpdate = true;
      }
    });

    if (needsUpdate) {
      batch.update(doc.ref, updates);
      updateCount++;
    }
  });

  if (updateCount > 0) {
    await batch.commit();
    console.log(`  ✅ Updated ${updateCount} documents in '${collectionName}'.`);
  } else {
    console.log(`  ✅ All documents in '${collectionName}' are already normalized.`);
  }
}

async function normalizeProfileEditRequests() {
  console.log('\n🔧 Normalizing Profile Edit Requests...');
  const ref = db.collection('profileEditRequests');
  const snapshot = await ref.get();

  if (snapshot.empty) {
    console.log('  ℹ️  No profile edit requests found.');
    return;
  }

  const batch = db.batch();
  let updateCount = 0;

  snapshot.forEach(doc => {
    const data = doc.data();
    const updates = {};
    let needsUpdate = false;

    const canonicalId = extractId(data.id) || extractId(data._id) || doc.id;
    if (canonicalId && data.id !== canonicalId) { updates.id = canonicalId; needsUpdate = true; }
    if (canonicalId && data._id !== canonicalId) { updates._id = canonicalId; needsUpdate = true; }

    if (!data.status) { updates.status = 'pending'; needsUpdate = true; }

    const nurseId = extractId(data.nurseId) || extractId(data.nurse) || extractId(data.nurseProfile);
    if (nurseId && data.nurseId !== nurseId) { updates.nurseId = nurseId; needsUpdate = true; }

    const nurseName = pickFirstDefined(data.nurseName, data.nurse?.fullName, data.nurse?.name);
    if (nurseName && data.nurseName !== nurseName) { updates.nurseName = nurseName; needsUpdate = true; }

    const nurseCode = pickFirstDefined(data.nurseCode, data.nurse?.nurseCode, data.nurse?.code);
    if (nurseCode && data.nurseCode !== nurseCode) { updates.nurseCode = nurseCode; needsUpdate = true; }

    const requestedBy = extractId(data.requestedBy) || extractId(data.requestedByUser);
    if (requestedBy && data.requestedBy !== requestedBy) { updates.requestedBy = requestedBy; needsUpdate = true; }

    if (!data.createdAt) { updates.createdAt = Timestamp.now(); needsUpdate = true; }
    if (!data.updatedAt) { updates.updatedAt = Timestamp.now(); needsUpdate = true; }

    if (needsUpdate) {
      batch.update(doc.ref, updates);
      updateCount++;
    }
  });

  if (updateCount > 0) {
    await batch.commit();
    console.log(`  ✅ Updated ${updateCount} profile edit requests.`);
  } else {
    console.log('  ✅ All profile edit requests are already normalized.');
  }
}

async function reportServicesCollection() {
  console.log('\n🔎 Checking Services collection state...');
  try {
    const snapshot = await db.collection('services').limit(1).get();
    if (snapshot.empty) {
      console.log('  ℹ️  No documents found in Firestore services collection. Mobile app currently relies on AsyncStorage catalog.');
    } else {
      console.log('  ✅ Services collection exists with at least one document.');
    }
  } catch (error) {
    console.log('  ⚠️  Unable to inspect services collection:', error.message);
  }
}

async function fixCollectionNames() {
  console.log('\n🔧 Checking for lowercase collection names...');
  
  // Check for 'profileeditrequests' (lowercase)
  const oldCollectionRef = db.collection('profileeditrequests');
  const oldSnapshot = await oldCollectionRef.get();

  if (!oldSnapshot.empty) {
    console.log(`  ⚠️  Found ${oldSnapshot.size} documents in 'profileeditrequests'. Migrating to 'profileEditRequests'...`);
    
    const newCollectionRef = db.collection('profileEditRequests');
    const batch = db.batch();
    let count = 0;

    for (const doc of oldSnapshot.docs) {
      const data = doc.data();
      // Copy to new collection
      batch.set(newCollectionRef.doc(doc.id), data);
      // Delete from old collection
      batch.delete(doc.ref);
      count++;
    }

    await batch.commit();
    console.log(`  ✅ Migrated ${count} documents to 'profileEditRequests'.`);
  } else {
    console.log("  ✅ No lowercase 'profileeditrequests' collection found.");
  }
}

async function run() {
  console.log('🚀 Starting Backend Normalization Script...\n');
  
  const initialized = await initializeFirebase();
  if (!initialized) process.exit(1);

  try {
    await normalizeInvoices();
    await normalizeAppointments();
    await normalizeShiftRequests();
    await normalizeUsers();
    await normalizeStaffCollection({ collectionName: 'nurses', defaultRole: 'nurse', codeField: 'nurseCode' });
    await normalizeStaffCollection({ collectionName: 'admins', defaultRole: 'admin', codeField: 'adminCode' });
    await normalizeProfileEditRequests();
    await fixCollectionNames();
    await reportServicesCollection();
    console.log('\n✨ Normalization complete!');
  } catch (error) {
    console.error('\n❌ Error during normalization:', error);
  }
}

run();
