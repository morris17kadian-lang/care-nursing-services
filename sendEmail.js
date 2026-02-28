const admin = require('firebase-admin');
const path = require('path');

/**
 * Enqueue an email by writing a document to Firestore collection `/mail`.
 * A deployed Firebase Cloud Function (`sendQueuedEmailOnCreate`) will send the email.
 *
 * Usage:
 *   node sendEmail.js recipient@example.com
 *   node sendEmail.js recipient@example.com "Subject here" "Hello from 876 Nurses"
 */

const serviceAccountPath = path.join(__dirname, 'firebase-service-key.json');
// eslint-disable-next-line import/no-dynamic-require, global-require
const serviceAccount = require(serviceAccountPath);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

async function enqueueEmail({ to, subject, text, html }) {
  const db = admin.firestore();
  const payload = {
    to: Array.isArray(to) ? to : [to],
    subject: subject || '',
    text: text || null,
    html: html || null,
    attachments: [],
    meta: { source: 'sendEmail.js' },
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    status: 'queued',
  };

  const ref = await db.collection('mail').add(payload);
  return ref.id;
}

async function main() {
  const to = process.argv[2];
  const subject = process.argv[3] || 'Test Email - Firebase Mail Queue';
  const text = process.argv[4] || 'Hello! This is a test email queued via Firestore.';

  if (!to) {
    console.error('❌ Missing recipient email');
    console.error('Usage: node sendEmail.js recipient@example.com "Subject" "Message"');
    process.exit(1);
  }

  const id = await enqueueEmail({
    to,
    subject,
    text,
    html: `<p>${String(text).replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>`,
  });

  console.log('✅ Email queued in Firestore /mail');
  console.log('Mail doc id:', id);
  console.log('Next: check Firebase Functions logs for sendQueuedEmailOnCreate.');
}

main().catch((err) => {
  console.error('❌ Failed to queue email:', err);
  process.exit(1);
});
