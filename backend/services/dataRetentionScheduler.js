const cron = require('node-cron');
const { admin, getFirestore } = require('./firebaseAdmin');

const DEFAULT_RETENTION_YEARS = 7;
const COLLECTIONS = ['appointments', 'invoices', 'notifications'];

function parseDate(value) {
  if (!value) return null;
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
  if (typeof value === 'string') {
    const parsed = new Date(value);
    return isNaN(parsed.getTime()) ? null : parsed;
  }
  if (value instanceof Object) {
    if (typeof value.toDate === 'function') return value.toDate();
    if (typeof value.seconds === 'number') return new Date(value.seconds * 1000);
    if (value._seconds) return new Date(value._seconds * 1000);
  }
  return null;
}

function getCutoffDate() {
  const years = Number(process.env.DATA_RETENTION_YEARS || DEFAULT_RETENTION_YEARS);
  const cutoff = new Date();
  cutoff.setFullYear(cutoff.getFullYear() - years);
  return cutoff;
}

async function runRetentionJob(db) {
  const cutoff = getCutoffDate();
  const shouldDelete = process.env.ENABLE_RETENTION_DELETE === 'true';

  for (const collectionName of COLLECTIONS) {
    try {
      const snapshot = await db.collection(collectionName).get();
      const expired = snapshot.docs.filter((docSnap) => {
        const data = docSnap.data() || {};
        const createdAt = parseDate(data.createdAt || data.date || data.appointmentDate || data.issueDate);
        return createdAt && createdAt < cutoff;
      });

      if (expired.length === 0) continue;

      if (shouldDelete) {
        const batchSize = 450;
        for (let i = 0; i < expired.length; i += batchSize) {
          const batch = db.batch();
          expired.slice(i, i + batchSize).forEach((docSnap) => batch.delete(docSnap.ref));
          await batch.commit();
        }
      } else {
        const batch = db.batch();
        expired.slice(0, 450).forEach((docSnap) => {
          batch.update(docSnap.ref, {
            retentionFlaggedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        });
        await batch.commit();
      }
    } catch (error) {
      console.error('[RetentionCron] Failed for', collectionName, error.message);
    }
  }
}

function startDataRetentionScheduler() {
  const enabled = process.env.ENABLE_RETENTION_CRON === 'true';
  if (!enabled) {
    console.log('[RetentionCron] Scheduler disabled via ENABLE_RETENTION_CRON flag.');
    return;
  }

  const db = getFirestore();
  if (!db) {
    console.warn('[RetentionCron] Firebase not configured. Scheduler not started.');
    return;
  }

  const schedule = process.env.RETENTION_CRON_SCHEDULE || '30 2 * * *';
  const timezone = process.env.RETENTION_CRON_TIMEZONE || 'America/Jamaica';

  cron.schedule(schedule, () => {
    runRetentionJob(db).catch((error) => {
      console.error('[RetentionCron] Failed to run job:', error.message);
    });
  }, { timezone });

  if (process.env.RUN_RETENTION_CRON_ON_BOOT === 'true') {
    runRetentionJob(db).catch((error) => {
      console.error('[RetentionCron] Failed to run initial job:', error.message);
    });
  }

  console.log(`[RetentionCron] Scheduler started (schedule: "${schedule}" ${timezone}).`);
}

module.exports = {
  startDataRetentionScheduler,
};
