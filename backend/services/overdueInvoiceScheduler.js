const cron = require('node-cron');
const { admin, getFirestore } = require('./firebaseAdmin');
const gmailService = require('./gmailService');

const COLLECTION_INVOICES = 'invoices';
const COLLECTION_ADMINS = 'admins';
const COLLECTION_NOTIFICATIONS = 'notifications';
const TARGET_ADMIN_NAME = 'Sandrene Brown Rhooms';

function formatCurrency(value, currency = 'JMD') {
  const amount = Number(value) || 0;
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(amount);
  } catch (error) {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

function parseDate(value) {
  if (!value) return null;

  if (value instanceof Date) {
    return isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === 'string') {
    const parsed = new Date(value);
    return isNaN(parsed.getTime()) ? null : parsed;
  }

  if (value instanceof Object) {
    if (typeof value.toDate === 'function') {
      const parsed = value.toDate();
      return isNaN(parsed.getTime()) ? null : parsed;
    }

    if (typeof value.seconds === 'number') {
      return new Date(value.seconds * 1000);
    }

    if (value._seconds) {
      return new Date(value._seconds * 1000);
    }
  }

  return null;
}

function normalizeName(value) {
  return String(value || '').trim().toLowerCase();
}

function getDisplayName(record) {
  return (
    record?.fullName ||
    record?.name ||
    `${record?.firstName || ''} ${record?.lastName || ''}`.trim()
  );
}

function isTargetAdmin(adminUser) {
  const name = normalizeName(getDisplayName(adminUser));
  return name === normalizeName(TARGET_ADMIN_NAME);
}

function shouldNotify(invoice, now) {
  const last = parseDate(invoice.lastOverdueNotificationAt || invoice.lastOverdueNotifiedAt);
  if (!last) return true;

  const hoursSinceLast = (now.getTime() - last.getTime()) / (1000 * 60 * 60);
  return hoursSinceLast >= 24;
}

async function fetchAdmins(db) {
  const snapshot = await db.collection(COLLECTION_ADMINS).get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

async function createNotification(db, data) {
  await db.collection(COLLECTION_NOTIFICATIONS).add({
    ...data,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    read: false,
  });
}

async function resolveUserContact(db, userId) {
  if (!userId) return null;

  const collections = ['users', 'patients', 'admins'];
  for (const collectionName of collections) {
    try {
      const docSnap = await db.collection(collectionName).doc(String(userId)).get();
      if (docSnap.exists) {
        const data = docSnap.data() || {};
        return {
          id: docSnap.id,
          email: data.email || data.userEmail || data.clientEmail || data.patientEmail || null,
          name: data.fullName || data.name || `${data.firstName || ''} ${data.lastName || ''}`.trim() || null,
          pushTokens: collectPushTokens(data),
        };
      }
    } catch (error) {
      // ignore and continue
    }
  }
  return null;
}

function collectPushTokens(data) {
  if (!data) return [];
  const tokens = new Set();
  const add = (value) => {
    if (!value) return;
    if (Array.isArray(value)) {
      value.forEach(add);
      return;
    }
    if (typeof value === 'string') {
      tokens.add(value);
    }
  };

  add(data.expoPushToken);
  add(data.pushToken);
  add(data.fcmToken);
  add(data.pushTokens);

  return Array.from(tokens).filter((token) => token && token.startsWith('ExponentPushToken'));
}

function collectFcmTokens(data) {
  if (!data) return [];
  const tokens = new Set();
  const add = (value) => {
    if (!value) return;
    if (Array.isArray(value)) {
      value.forEach(add);
      return;
    }
    if (typeof value === 'string') {
      tokens.add(value);
    }
  };

  add(data.fcmToken);
  add(data.fcmTokens);
  add(data.pushToken);
  add(data.pushTokens);
  add(data.deviceToken);
  add(data.deviceTokens);

  return Array.from(tokens).filter((token) => token && !token.startsWith('ExponentPushToken'));
}

async function sendExpoPush(tokens, title, body, data = {}) {
  if (!tokens || tokens.length === 0) return;

  const messages = tokens.map((token) => ({
    to: token,
    title,
    body,
    data,
    sound: 'default',
  }));

  try {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });
  } catch (error) {
    console.error('[OverdueCron] Failed to send push notification:', error.message);
  }
}

async function sendFcmPush(tokens, title, body, data = {}) {
  if (!tokens || tokens.length === 0) return;

  try {
    const messaging = admin.messaging();
    await messaging.sendMulticast({
      tokens,
      notification: { title, body },
      data: Object.fromEntries(
        Object.entries(data || {}).map(([key, value]) => [key, String(value)])
      ),
    });
  } catch (error) {
    console.error('[OverdueCron] Failed to send FCM push notification:', error.message);
  }
}

async function sendOverdueEmail({ to, subject, html }) {
  if (!to) return;
  try {
    await gmailService.sendEmail({
      from: {
        name: '876 Nurses',
        email: process.env.GMAIL_ACCOUNT,
      },
      to,
      subject,
      html,
    });
  } catch (error) {
    console.error('[OverdueCron] Failed to send overdue email:', error.message);
  }
}

function isInvoiceOverdue(invoice, now) {
  const dueDate = parseDate(invoice.dueDate || invoice.due_date);
  if (!dueDate) return false;

  const status = (invoice.status || '').toLowerCase();
  if (status === 'paid') return false;

  return dueDate.getTime() < now.getTime();
}

async function runOverdueJob(db) {
  const now = new Date();
  console.log(`[OverdueCron] Running overdue check at ${now.toISOString()}`);

  const invoicesSnapshot = await db.collection(COLLECTION_INVOICES).get();
  const overdueInvoices = invoicesSnapshot.docs
    .map(doc => ({ id: doc.id, ...doc.data() }))
    .filter(invoice => isInvoiceOverdue(invoice, now))
    .filter(invoice => shouldNotify(invoice, now));

  if (overdueInvoices.length === 0) {
    console.log('[OverdueCron] No overdue invoices need notifications.');
    return;
  }

  const admins = await fetchAdmins(db);

  for (const invoice of overdueInvoices) {
    try {
      const invoiceId = invoice.invoiceId || invoice.id;
      const amount = Number(invoice.total || invoice.amount || 0);
      const currency = invoice.currency || invoice.currencyCode || 'JMD';
      const amountLabel = formatCurrency(amount, currency);
      const patientId = invoice.patientId || invoice.clientId || invoice.userId;
      const clientName = invoice.clientName || invoice.patientName || 'Unknown Client';
      const clientEmail = invoice.clientEmail || invoice.patientEmail;
      const clientContact = patientId ? await resolveUserContact(db, patientId) : null;
      const resolvedClientEmail = clientEmail || clientContact?.email;
      const resolvedClientName = clientName || clientContact?.name || 'Unknown Client';

      if (patientId) {
        await createNotification(db, {
          userId: patientId,
          title: 'Payment Overdue',
          message: `Your payment for invoice ${invoiceId} (${amountLabel}) is overdue. Please settle your account.`,
          type: 'overdue_payment',
          priority: 'high',
          data: {
            invoiceId,
            amount,
            dueDate: invoice.dueDate || invoice.due_date,
            currency,
          },
        });

        await sendExpoPush(
          clientContact?.pushTokens,
          'Payment Overdue',
          `Invoice ${invoiceId} (${amountLabel}) is overdue. Please settle your account.`,
          { invoiceId, amount, currency }
        );

        await sendFcmPush(
          collectFcmTokens(clientContact),
          'Payment Overdue',
          `Invoice ${invoiceId} (${amountLabel}) is overdue. Please settle your account.`,
          { invoiceId, amount, currency }
        );

        await sendOverdueEmail({
          to: resolvedClientEmail,
          subject: `Overdue Invoice ${invoiceId}`,
          html: `
            <div style="font-family: Arial, sans-serif; line-height: 1.6;">
              <h2 style="color: #d32f2f;">Payment Overdue</h2>
              <p>Hi ${resolvedClientName},</p>
              <p>Your invoice <strong>${invoiceId}</strong> for <strong>${amountLabel}</strong> is now overdue.</p>
              <p>Please settle your balance at your earliest convenience.</p>
              <p>Thank you,<br/>876 Nurses</p>
            </div>
          `,
        });
      }

      for (const adminUser of admins) {
        if (!isTargetAdmin(adminUser)) {
          continue;
        }
        await createNotification(db, {
          userId: adminUser.id,
          title: 'Overdue Payment Alert',
          message: `Invoice ${invoiceId} for ${clientName} is overdue (${amountLabel}).`,
          type: 'overdue_payment_admin',
          priority: 'high',
          data: {
            invoiceId,
            clientName,
            amount,
            currency,
            patientId,
          },
        });

        const adminTokens = collectPushTokens(adminUser);
        await sendExpoPush(
          adminTokens,
          'Overdue Payment Alert',
          `Invoice ${invoiceId} for ${clientName} is overdue (${amountLabel}).`,
          { invoiceId, amount, currency, patientId }
        );

        await sendFcmPush(
          collectFcmTokens(adminUser),
          'Overdue Payment Alert',
          `Invoice ${invoiceId} for ${clientName} is overdue (${amountLabel}).`,
          { invoiceId, amount, currency, patientId }
        );

        await sendOverdueEmail({
          to: adminUser.email,
          subject: `Overdue Invoice Alert: ${invoiceId}`,
          html: `
            <div style="font-family: Arial, sans-serif; line-height: 1.6;">
              <h2 style="color: #d32f2f;">Overdue Invoice Alert</h2>
              <p>Invoice <strong>${invoiceId}</strong> for <strong>${clientName}</strong> is overdue.</p>
              <p>Amount: <strong>${amountLabel}</strong></p>
              <p>Please follow up with the client.</p>
            </div>
          `,
        });
      }

      const invoiceRef = db.collection(COLLECTION_INVOICES).doc(invoice.id);
      const nextStatus = (invoice.status || '').toLowerCase() === 'paid'
        ? invoice.status
        : 'Overdue';

      await invoiceRef.set({
        status: nextStatus,
        lastOverdueNotificationAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
    } catch (error) {
      console.error(`[OverdueCron] Failed to process invoice ${invoice.invoiceId || invoice.id}:`, error.message);
    }
  }

  console.log(`[OverdueCron] Sent notifications for ${overdueInvoices.length} invoices.`);
}

function startOverdueInvoiceScheduler() {
  const enabled = process.env.ENABLE_OVERDUE_CRON !== 'false';
  if (!enabled) {
    console.log('[OverdueCron] Scheduler disabled via ENABLE_OVERDUE_CRON flag.');
    return;
  }

  const db = getFirestore();
  if (!db) {
    console.warn('[OverdueCron] Firebase not configured. Scheduler not started.');
    return;
  }

  const schedule = process.env.OVERDUE_CRON_SCHEDULE || '0 12 * * *';
  const timezone = process.env.OVERDUE_CRON_TIMEZONE || 'America/Jamaica';

  cron.schedule(schedule, () => {
    runOverdueJob(db).catch(error => {
      console.error('[OverdueCron] Failed to run job:', error.message);
    });
  }, {
    timezone,
  });

  if (process.env.RUN_OVERDUE_CRON_ON_BOOT === 'true') {
    runOverdueJob(db).catch(error => {
      console.error('[OverdueCron] Failed to run initial job:', error.message);
    });
  }

  console.log(`[OverdueCron] Scheduler started (schedule: "${schedule}" ${timezone}).`);
}

module.exports = {
  startOverdueInvoiceScheduler,
};
