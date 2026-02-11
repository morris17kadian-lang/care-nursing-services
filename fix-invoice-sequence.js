/**
 * Fix Invoice Number Sequence
 * 
 * This script checks for duplicate invoice numbers and resequences them.
 * It's particularly useful for recurring shifts that may have generated
 * duplicate invoice numbers due to race conditions.
 */

const admin = require('firebase-admin');
const fs = require('fs');

// Load service account key
const serviceAccount = require('./firebase-service-key.json');

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Extract sequence number from invoice ID
function extractSequence(invoiceId) {
  if (typeof invoiceId !== 'string') return null;
  const match = invoiceId.match(/^NUR-INV-(\d+)$/i);
  if (!match) return null;
  const parsed = parseInt(match[1], 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

// Main function
async function fixInvoiceSequence() {
  console.log('🔍 Checking invoice sequence...\n');

  try {
    // Get all invoices
    const invoicesRef = db.collection('invoices');
    const snapshot = await invoicesRef.orderBy('createdAt', 'asc').get();

    if (snapshot.empty) {
      console.log('No invoices found.');
      return;
    }

    const invoices = [];
    const sequenceMap = new Map(); // Track sequence -> invoices with that sequence

    snapshot.forEach((doc) => {
      const data = doc.data();
      const sequence = extractSequence(data.invoiceId);
      
      if (sequence !== null) {
        invoices.push({
          id: doc.id,
          ...data,
          sequence
        });

        // Track duplicates
        if (!sequenceMap.has(sequence)) {
          sequenceMap.set(sequence, []);
        }
        sequenceMap.get(sequence).push({
          id: doc.id,
          invoiceId: data.invoiceId,
          date: data.date || data.createdAt,
          clientName: data.clientName || data.patientName || 'Unknown'
        });
      }
    });

    // Sort by creation date to maintain chronological order
    invoices.sort((a, b) => {
      const dateA = new Date(a.createdAt || a.date || 0);
      const dateB = new Date(b.createdAt || b.date || 0);
      return dateA - dateB;
    });

    console.log(`📊 Found ${invoices.length} invoices\n`);

    // Check for duplicates
    const duplicates = Array.from(sequenceMap.entries())
      .filter(([seq, items]) => items.length > 1);

    if (duplicates.length === 0) {
      console.log('✅ No duplicate invoice numbers found!');
      
      // Check current counter status
      const counterRef = db.collection('counters').doc('nurseInvoiceNumber');
      const counterSnap = await counterRef.get();
      
      if (counterSnap.exists) {
        const currentSeq = counterSnap.data().sequence;
        const highestSeq = Math.max(...invoices.map(inv => inv.sequence));
        
        console.log(`\n📈 Counter Status:`);
        console.log(`   Current: ${currentSeq}`);
        console.log(`   Highest in use: ${highestSeq}`);
        
        if (currentSeq < highestSeq) {
          console.log(`\n⚠️  Warning: Counter (${currentSeq}) is behind highest invoice (${highestSeq})`);
          console.log(`   This could cause future duplicates.`);
          
          // Update counter to highest sequence
          await counterRef.update({
            sequence: highestSeq,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            fixedBy: 'fix-invoice-sequence.js',
            fixedAt: admin.firestore.FieldValue.serverTimestamp()
          });
          
          console.log(`✅ Counter updated to ${highestSeq}`);
        }
      } else {
        const highestSeq = Math.max(...invoices.map(inv => inv.sequence));
        console.log(`\n⚠️  Counter document doesn't exist. Creating with sequence: ${highestSeq}`);
        
        await counterRef.set({
          sequence: highestSeq,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          createdBy: 'fix-invoice-sequence.js',
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        console.log(`✅ Counter created with sequence ${highestSeq}`);
      }
      
      return;
    }

    // Display duplicates
    console.log(`⚠️  Found ${duplicates.length} duplicate invoice number(s):\n`);
    duplicates.forEach(([seq, items]) => {
      console.log(`  Sequence ${seq} (NUR-INV-${String(seq).padStart(4, '0')}):`);
      items.forEach((item, idx) => {
        console.log(`    ${idx + 1}. ${item.clientName} - ${item.date}`);
        console.log(`       Doc ID: ${item.id}`);
      });
      console.log('');
    });

    // Ask for confirmation
    console.log('🔧 Resequencing duplicate invoices...\n');

    let nextSequence = Math.max(...invoices.map(inv => inv.sequence)) + 1;
    const updates = [];

    for (const [seq, items] of duplicates) {
      // Keep the first one with this sequence, resequence the rest
      for (let i = 1; i < items.length; i++) {
        const newInvoiceId = `NUR-INV-${String(nextSequence).padStart(4, '0')}`;
        console.log(`  Updating: ${items[i].invoiceId} → ${newInvoiceId}`);
        console.log(`    Client: ${items[i].clientName}`);
        console.log(`    Date: ${items[i].date}`);
        console.log('');
        
        updates.push({
          id: items[i].id,
          oldInvoiceId: items[i].invoiceId,
          newInvoiceId,
          newSequence: nextSequence
        });
        
        nextSequence++;
      }
    }

    // Apply updates
    console.log(`\n💾 Applying ${updates.length} update(s)...\n`);
    
    for (const update of updates) {
      const invoiceRef = db.collection('invoices').doc(update.id);
      await invoiceRef.update({
        invoiceId: update.newInvoiceId,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        fixedBy: 'fix-invoice-sequence.js',
        fixedAt: admin.firestore.FieldValue.serverTimestamp(),
        originalInvoiceId: update.oldInvoiceId
      });
      console.log(`✅ Updated ${update.oldInvoiceId} → ${update.newInvoiceId}`);
    }

    // Update counter
    const counterRef = db.collection('counters').doc('nurseInvoiceNumber');
    await counterRef.set({
      sequence: nextSequence - 1,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      fixedBy: 'fix-invoice-sequence.js',
      fixedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    console.log(`\n✅ Invoice sequence fixed successfully!`);
    console.log(`📈 Counter updated to: ${nextSequence - 1}`);
    console.log(`\n🎉 All done! Your invoice numbers are now sequential.`);

  } catch (error) {
    console.error('❌ Error fixing invoice sequence:', error);
    process.exit(1);
  }
}

// Run the script
fixInvoiceSequence()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
