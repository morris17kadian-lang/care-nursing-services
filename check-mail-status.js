// check-mail-status.js - updated
const admin = require('firebase-admin');
const serviceAccount = require('./firebase-service-key.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'nurses-afb7e',
  });
}

const db = admin.firestore();

async function checkMailStatus() {
  const snap = await db.collection('mail').orderBy('createdAt', 'desc').limit(8).get();
  snap.forEach(doc => {
    const d = doc.data();
    console.log('ID:', doc.id);
    console.log('status:', d.status);
    console.log('to:', JSON.stringify(d.to));
    console.log('subject:', d.subject || d.message?.subject);
    console.log('result:', JSON.stringify(d.result || null, null, 2));
    console.log('error:', d.error || null);
    console.log('---');
  });
  process.exit(0);
}

checkMailStatus().catch(e => { console.error(e); process.exit(1); });
