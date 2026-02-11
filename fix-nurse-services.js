const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = require('./firebase-service-key.json');

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function fixShift() {
  const shiftId = 'MRUmKVAkg236Zr9IdtDw'; // From user context
  const targetStaffCodes = ['NURSE001', 'NURSE002', 'NURSE003'];
  const services = [
    "Home Care Assistance",
    "Alternative Post-Op Care",
    "In-home Phlebotomy Service"
  ];
  
  try {
    // 1. Find the nurses
    console.log('Finding nurses...');
    const nursesRef = db.collection('nurses');
    const usersRef = db.collection('users');
    
    const nurseMap = {};
    
    // Try finding by nurseCode
    for (const code of targetStaffCodes) {
       // Search in nurses collection
       let snapshot = await nursesRef.where('nurseCode', '==', code).get();
       if (snapshot.empty) snapshot = await nursesRef.where('staffCode', '==', code).get();
       if (snapshot.empty) snapshot = await nursesRef.where('username', '==', code).get();
       
       // Search in users collection
       if (snapshot.empty) {
             snapshot = await usersRef.where('nurseCode', '==', code).get();
              if (snapshot.empty) snapshot = await usersRef.where('staffCode', '==', code).get();
              if (snapshot.empty) snapshot = await usersRef.where('username', '==', code).get();
       }

       if (!snapshot.empty) {
         nurseMap[code] = snapshot.docs[0].id;
         console.log(`Found ${code}: ${snapshot.docs[0].id}`);
       } else {
         console.log(`Could not find nurse with code ${code}`);
       }
    }
    
    // 2. Prepare updates
    const shiftRef = db.collection('shiftRequests').doc(shiftId);
    const doc = await shiftRef.get();
    if (!doc.exists) {
        console.log('Shift not found');
        return;
    }
    
    // Construct new maps
    const newNurseServices = {};
    const newAssignedNurses = [];
    const newNurseSchedule = {};
    
    const foundCodes = Object.keys(nurseMap);
    const foundIds = Object.values(nurseMap);
    
    // Map services
    targetStaffCodes.forEach((code, index) => {
        const uid = nurseMap[code];
        const srv = services[index] || "General Care";
        
        if (uid) {
            if (!newAssignedNurses.includes(uid)) {
                newAssignedNurses.push(uid);
            }
            // Add mapping for UID
            newNurseServices[uid] = srv;
            // Add mapping for Staff Code (to ensure lookup works if UI uses code)
            newNurseServices[code] = srv;
        }
    });

    // Map schedule (Round Robin for 7 days)
    if (foundIds.length > 0) {
        // Clear old schedule? Or overwrite. The prompt implies "Correct this" so we overwrite.
        // Let's create a schedule that uses these nurses.
        [0, 1, 2, 3, 4, 5, 6].forEach((day, index) => {
            const nurseIndex = index % foundIds.length;
            const uid = foundIds[nurseIndex];
            newNurseSchedule[String(day)] = uid;
        });
    }

    console.log('Updating shift with:', {
        nurseServices: newNurseServices,
        assignedNurses: newAssignedNurses,
        nurseSchedule: newNurseSchedule
    });

    await shiftRef.update({
        nurseServices: newNurseServices,
        assignedNurses: newAssignedNurses,
        nurseSchedule: newNurseSchedule,
        updatedAt: new Date().toISOString()
    });

    console.log('Update complete.');

  } catch (error) {
    console.error('Error:', error);
  }
}

fixShift();
