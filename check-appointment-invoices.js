/**
 * Check Appointment Invoice Numbers
 * 
 * This script checks appointments collection for embedded invoice data
 * to understand where the duplicate NUR-INV-0001 numbers are coming from.
 */

const admin = require('firebase-admin');

// Load service account key
const serviceAccount = require('./firebase-service-key.json');

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function checkAppointmentInvoices() {
  console.log('🔍 Checking appointment invoice numbers...\n');

  try {
    // Query appointments collection
    const appointmentsRef = db.collection('appointments');
    const snapshot = await appointmentsRef.get();

    console.log(`📊 Found ${snapshot.size} appointments in database\n`);

    const appointmentsWithInvoices = [];
    const invoiceNumbers = new Map(); // Track invoice number occurrences

    snapshot.forEach((doc) => {
      const data = doc.data();
      
      // Check various invoice-related fields
      const invoiceId = data.invoiceId || data.invoiceNumber || data.invoice?.invoiceId;
      
      if (invoiceId) {
        const apptInfo = {
          id: doc.id,
          invoiceId,
          clientName: data.clientName || data.patientName || 'Unknown',
          service: data.service || data.serviceType || 'Unknown',
          date: data.date || data.scheduledDate || data.appointmentDate || 'Unknown',
          status: data.status || 'Unknown',
          isRecurring: data.isRecurring || data.recurring || data.adminRecurring || false,
          recurringPeriodStart: data.recurringPeriodStart || null,
          recurringPeriodEnd: data.recurringPeriodEnd || null
        };

        appointmentsWithInvoices.push(apptInfo);

        // Track invoice number occurrences
        if (!invoiceNumbers.has(invoiceId)) {
          invoiceNumbers.set(invoiceId, []);
        }
        invoiceNumbers.get(invoiceId).push(apptInfo);
      }
    });

    console.log(`✅ Found ${appointmentsWithInvoices.length} appointments with invoice numbers\n`);

    // Check for duplicates
    const duplicates = Array.from(invoiceNumbers.entries())
      .filter(([_, appts]) => appts.length > 1);

    if (duplicates.length > 0) {
      console.log(`⚠️  Found ${duplicates.length} duplicate invoice numbers:\n`);
      
      duplicates.forEach(([invoiceId, appts]) => {
        console.log(`📋 Invoice: ${invoiceId} (appears ${appts.length} times)`);
        appts.forEach((appt, index) => {
          console.log(`   ${index + 1}. ${appt.clientName} - ${appt.service}`);
          console.log(`      Date: ${appt.date}`);
          console.log(`      Status: ${appt.status}`);
          console.log(`      Recurring: ${appt.isRecurring}`);
          if (appt.recurringPeriodStart) {
            console.log(`      Period: ${appt.recurringPeriodStart} to ${appt.recurringPeriodEnd || 'Ongoing'}`);
          }
          console.log(`      Document ID: ${appt.id}`);
        });
        console.log('');
      });
    } else {
      console.log('✅ No duplicate invoice numbers found in appointments\n');
    }

    // Show recent invoices
    if (appointmentsWithInvoices.length > 0) {
      console.log('📄 Recent appointment invoices:');
      appointmentsWithInvoices
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 10)
        .forEach(appt => {
          console.log(`   ${appt.invoiceId} - ${appt.clientName} (${appt.date})`);
        });
    }

    // Now check invoices collection
    console.log('\n🔍 Checking invoices collection...\n');
    const invoicesRef = db.collection('invoices');
    const invoiceSnapshot = await invoicesRef.get();

    console.log(`📊 Found ${invoiceSnapshot.size} invoices in invoices collection\n`);

    if (invoiceSnapshot.size > 0) {
      const invoiceList = [];
      invoiceSnapshot.forEach((doc) => {
        const data = doc.data();
        invoiceList.push({
          id: doc.id,
          invoiceId: data.invoiceId,
          clientName: data.clientName || data.patientName || 'Unknown',
          date: data.date || data.createdAt || 'Unknown',
          status: data.status || 'Unknown'
        });
      });

      console.log('Recent invoices in invoices collection:');
      invoiceList
        .sort((a, b) => {
          const dateA = new Date(a.date?.toDate ? a.date.toDate() : a.date);
          const dateB = new Date(b.date?.toDate ? b.date.toDate() : b.date);
          return dateB - dateA;
        })
        .slice(0, 10)
        .forEach(inv => {
          const dateStr = inv.date?.toDate ? inv.date.toDate().toISOString().split('T')[0] : inv.date;
          console.log(`   ${inv.invoiceId} - ${inv.clientName} (${dateStr})`);
        });
    }

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }

  console.log('\n✅ Check completed');
  process.exit(0);
}

// Run the check
checkAppointmentInvoices();
