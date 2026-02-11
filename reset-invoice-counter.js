const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = require('./firebase-service-key.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

async function resetInvoiceCounter() {
  try {
    console.log('🔄 Resetting invoice counter to 0001...');
    
    const counterRef = db.collection('counters').doc('nurseInvoiceNumber');
    
    // Reset counter to 0 (next invoice will be 0001)
    await counterRef.set({
      sequence: 0,
      lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
      resetAt: new Date().toISOString(),
      resetReason: 'Starting fresh invoice numbering sequence'
    });
    
    console.log('✅ Invoice counter reset successfully!');
    console.log('📊 Next invoice will be: NUR-INV-0001');
    
    // Verify the reset
    const counterDoc = await counterRef.get();
    if (counterDoc.exists) {
      const data = counterDoc.data();
      console.log('\n📋 Counter document after reset:');
      console.log(JSON.stringify(data, null, 2));
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error resetting counter:', error);
    process.exit(1);
  }
}

resetInvoiceCounter();
