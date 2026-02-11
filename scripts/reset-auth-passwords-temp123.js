/*
  Bulk reset Firebase Auth passwords to a known value.

  - Reads emails from Mongo export JSON files under ./876Nursesdatabase
  - For each email, updates the Firebase Auth password

  Usage:
    node scripts/reset-auth-passwords-temp123.js

  Notes:
    - Requires firebase-admin service account JSON.
    - Looks for GOOGLE_APPLICATION_CREDENTIALS or ./firebase-service-key.json
*/

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const NEW_PASSWORD = 'temp123';

function loadJsonArray(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    throw new Error(`Expected array in ${filePath}`);
  }
  return parsed;
}

function extractEmails(records) {
  const emails = [];
  for (const r of records) {
    if (!r || typeof r !== 'object') continue;
    const email = (r.email || r.Email || '').toString().trim().toLowerCase();
    if (email && email.includes('@')) emails.push(email);
  }
  return emails;
}

async function main() {
  if (NEW_PASSWORD.length < 6) {
    throw new Error('Password must be at least 6 characters');
  }

  const keyPath =
    process.env.GOOGLE_APPLICATION_CREDENTIALS ||
    path.join(process.cwd(), 'firebase-service-key.json');

  if (!fs.existsSync(keyPath)) {
    throw new Error(
      `Firebase service account key not found at ${keyPath}. Set GOOGLE_APPLICATION_CREDENTIALS or add firebase-service-key.json.`
    );
  }

  const svc = require(keyPath);
  admin.initializeApp({ credential: admin.credential.cert(svc) });

  const exportDir = path.join(process.cwd(), '876Nursesdatabase');
  const files = [
    'care_database.admins.json',
    'care_database.nurses.json',
    'care_database.users.json',
  ].map((f) => path.join(exportDir, f));

  const allEmails = new Set();
  for (const f of files) {
    if (!fs.existsSync(f)) {
      console.warn(`WARN: Missing export file: ${f}`);
      continue;
    }
    const rows = loadJsonArray(f);
    for (const e of extractEmails(rows)) allEmails.add(e);
  }

  const emailList = Array.from(allEmails).sort();
  console.log(`Found ${emailList.length} unique emails in exports.`);

  let updated = 0;
  let missing = 0;
  let failed = 0;

  const missingEmails = [];
  const failedEmails = [];

  for (const email of emailList) {
    try {
      const user = await admin.auth().getUserByEmail(email);
      await admin.auth().updateUser(user.uid, { password: NEW_PASSWORD });
      updated++;
      if (updated % 10 === 0) {
        console.log(`Updated ${updated}/${emailList.length}...`);
      }
    } catch (err) {
      const code = err?.code || '';
      if (code === 'auth/user-not-found') {
        missing++;
        missingEmails.push(email);
      } else {
        failed++;
        failedEmails.push({ email, code: code || 'unknown', message: err?.message || String(err) });
      }
    }
  }

  console.log('\nDone.');
  console.log(`Password set to: ${NEW_PASSWORD}`);
  console.log(`Updated: ${updated}`);
  console.log(`Missing (no Firebase Auth user): ${missing}`);
  console.log(`Failed: ${failed}`);

  if (missingEmails.length) {
    console.log('\nMissing emails:');
    for (const e of missingEmails) console.log(`- ${e}`);
  }

  if (failedEmails.length) {
    console.log('\nFailed emails:');
    for (const f of failedEmails) console.log(`- ${f.email} (${f.code}): ${f.message}`);
  }
}

main().catch((e) => {
  console.error('ERROR:', e);
  process.exit(1);
});
