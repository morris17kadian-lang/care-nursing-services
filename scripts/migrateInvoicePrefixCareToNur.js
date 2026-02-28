#!/usr/bin/env node

/**
 * Migrates legacy invoice IDs from CARE-INV-* to NUR-INV-* in Firestore.
 *
 * By default this runs in DRY-RUN mode (no writes).
 * To apply changes, pass: --apply
 *
 * Usage:
 *   node scripts/migrateInvoicePrefixCareToNur.js            # dry-run
 *   node scripts/migrateInvoicePrefixCareToNur.js --apply    # writes
 *
 * Auth:
 * - Preferred: put firebase-service-key.json in project root
 * - Or set GOOGLE_APPLICATION_CREDENTIALS to a service account JSON
 */

const fs = require('fs');
const path = require('path');
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');

function readJsonIfExists(filePath) {
  try {
    if (!fs.existsSync(filePath)) return null;
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function getArgValue(name) {
  // Supports: --name=value and --name value
  const eqPrefix = `--${name}=`;
  const eqHit = args.find((a) => typeof a === 'string' && a.startsWith(eqPrefix));
  if (eqHit) return eqHit.slice(eqPrefix.length);

  const idx = args.findIndex((a) => a === `--${name}`);
  if (idx >= 0 && typeof args[idx + 1] === 'string') return args[idx + 1];

  return null;
}

function detectProjectId() {
  const fromArgs = getArgValue('projectId') || getArgValue('project-id') || getArgValue('project');
  if (fromArgs) return fromArgs;

  const fromEnv =
    process.env.FIREBASE_PROJECT_ID ||
    process.env.GOOGLE_CLOUD_PROJECT ||
    process.env.GCLOUD_PROJECT;
  if (fromEnv) return fromEnv;

  // Try .firebaserc
  const firebasercPath = path.join(__dirname, '..', '.firebaserc');
  const firebaserc = readJsonIfExists(firebasercPath);
  const projects = firebaserc && typeof firebaserc === 'object' ? firebaserc.projects : null;
  if (projects && typeof projects === 'object') {
    if (typeof projects.default === 'string' && projects.default.trim()) return projects.default.trim();

    // If there's only one project entry (common), use it.
    const entries = Object.entries(projects).filter(([, v]) => typeof v === 'string' && v.trim());
    if (entries.length === 1) return entries[0][1].trim();

    // Prefer prod if present.
    if (typeof projects.prod === 'string' && projects.prod.trim()) return projects.prod.trim();

    // Otherwise take the first valid.
    if (entries.length > 0) return entries[0][1].trim();
  }

  return null;
}

function normalizeInvoiceId(value) {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  if (/^CARE-INV-/i.test(trimmed)) return trimmed.replace(/^CARE-INV-/i, 'NUR-INV-');
  return trimmed;
}

async function initializeFirebase() {
  try {
    const serviceAccountPath = path.join(__dirname, '..', 'firebase-service-key.json');

    const detectedProjectId = detectProjectId();
    if (detectedProjectId) {
      // Help google-auth-library & Firestore resolve project id in more environments.
      process.env.GCLOUD_PROJECT = process.env.GCLOUD_PROJECT || detectedProjectId;
      process.env.GOOGLE_CLOUD_PROJECT = process.env.GOOGLE_CLOUD_PROJECT || detectedProjectId;
    }

    if (fs.existsSync(serviceAccountPath)) {
      const serviceAccount = require(serviceAccountPath);
      const projectId = detectedProjectId || serviceAccount.project_id || serviceAccount.projectId || undefined;
      const app = initializeApp({ credential: cert(serviceAccount), projectId });
      return getFirestore(app);
    }

    const app = detectedProjectId ? initializeApp({ projectId: detectedProjectId }) : initializeApp();
    return getFirestore(app);
  } catch (error) {
    console.error('❌ Firebase initialization failed:', error.message);
    console.log('\n⚠️  To use this script, you need to either:');
    console.log('1) Save a service account as firebase-service-key.json in the project root, OR');
    console.log('2) export GOOGLE_APPLICATION_CREDENTIALS=$(pwd)/firebase-service-key.json');
    console.log('\nAlso ensure your project id is available via one of:');
    console.log('- .firebaserc (projects.default / projects.prod)');
    console.log('- env: GOOGLE_CLOUD_PROJECT or GCLOUD_PROJECT');
    console.log('- CLI: --projectId nurses-afb7e');
    process.exitCode = 1;
    return null;
  }
}

async function migrateCollection({ db, collectionName, fields }) {
  console.log(`\n🔧 Scanning ${collectionName}...`);
  const ref = db.collection(collectionName);
  const snapshot = await ref.get();

  if (snapshot.empty) {
    console.log('  ℹ️  No documents found.');
    return { scanned: 0, changed: 0 };
  }

  let scanned = 0;
  let changed = 0;

  let batch = db.batch();
  let batchOps = 0;

  const commitBatch = async () => {
    if (!APPLY) return;
    if (batchOps === 0) return;
    await batch.commit();
    batch = db.batch();
    batchOps = 0;
  };

  for (const docSnap of snapshot.docs) {
    scanned += 1;
    const data = docSnap.data() || {};

    const updates = {};
    for (const field of fields) {
      const current = data[field];
      const normalized = normalizeInvoiceId(current);
      if (typeof current === 'string' && normalized !== current) {
        updates[field] = normalized;
      }
    }

    if (Object.keys(updates).length > 0) {
      changed += 1;
      const before = fields.map((f) => `${f}=${String(data[f] || '')}`).join(' | ');
      const after = fields.map((f) => `${f}=${String(updates[f] || data[f] || '')}`).join(' | ');
      console.log(`  - ${docSnap.id}: ${before}  ->  ${after}`);

      if (APPLY) {
        batch.update(docSnap.ref, updates);
        batchOps += 1;
        if (batchOps >= 400) {
          await commitBatch();
        }
      }
    }
  }

  await commitBatch();

  console.log(`  ✅ ${collectionName}: scanned=${scanned}, changed=${changed}, mode=${APPLY ? 'APPLY' : 'DRY-RUN'}`);
  return { scanned, changed };
}

async function main() {
  console.log(`Invoice prefix migration: CARE-INV -> NUR-INV (${APPLY ? 'APPLY' : 'DRY-RUN'})`);

  const db = await initializeFirebase();
  if (!db) return;

  // NOTE: We intentionally only touch the explicit invoice id fields.
  // If you store invoice IDs in other places, add them here.
  const targets = [
    { collectionName: 'invoices', fields: ['invoiceId', 'invoiceNumber'] },
    { collectionName: 'appointments', fields: ['invoiceId'] },
  ];

  for (const target of targets) {
    // eslint-disable-next-line no-await-in-loop
    await migrateCollection({ db, ...target });
  }

  console.log('\nDone.');
}

main().catch((e) => {
  console.error('❌ Migration failed:', e);
  process.exitCode = 1;
});
