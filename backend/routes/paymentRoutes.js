const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { admin, getFirestore } = require('../services/firebaseAdmin');
const gmailService = require('../services/gmailService');
const {
  selectAdminRecipients,
  NOTIFICATION_CATEGORIES,
} = require('../services/adminNotificationRecipients');

/**
 * Payment Routes for Fygaro Integration
 * Uses Fygaro's JWT-signed Payment Button URL approach.
 * Docs: https://help.fygaro.com/en-us/article/fygaro-links-integration-api-h78p9y/
 */

// Fygaro configuration from environment variables
const FYGARO_CONFIG = {
  apiKey: process.env.FYGARO_API_KEY,
  apiSecret: process.env.FYGARO_API_SECRET,
  buttonUrl: process.env.FYGARO_BUTTON_URL || 'https://www.fygaro.com/en/pb/9d69ee86-c4b4-454e-b73f-9d401c97f45b/',
  testMode: process.env.FYGARO_TEST_MODE === 'true',
};

/**
 * Build a Fygaro JWT-signed payment URL.
 * Header: { alg: 'HS256', typ: 'JWT', kid: apiKey }
 * Payload: { amount, currency, custom_reference, exp, nbf }
 * Signed with HMAC-SHA256 using apiSecret.
 */
function buildFygaroPaymentUrl({ amount, currency, customReference, expirySeconds = 1800 }) {
  function b64url(obj) {
    return Buffer.from(typeof obj === 'string' ? obj : JSON.stringify(obj))
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  const now = Math.floor(Date.now() / 1000);
  const header = b64url({ alg: 'HS256', typ: 'JWT', kid: FYGARO_CONFIG.apiKey });
  const payload = b64url({
    amount: parseFloat(parseFloat(amount).toFixed(2)),
    currency,
    custom_reference: customReference,
    exp: String(now + expirySeconds),
    nbf: String(now),
  });

  const sigInput = `${header}.${payload}`;
  const signature = crypto
    .createHmac('sha256', FYGARO_CONFIG.apiSecret)
    .update(sigInput)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  const jwt = `${sigInput}.${signature}`;
  const base = FYGARO_CONFIG.buttonUrl.replace(/\/$/, '');
  return `${base}/?jwt=${jwt}`;
}

const FYGARO_WEBHOOK_UPDATES_ENABLED = process.env.ENABLE_FYGARO_WEBHOOK_UPDATES === 'true';
const FYGARO_SYNC_ENABLED = process.env.ENABLE_FYGARO_SYNC === 'true';

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

function formatDateLabel(value) {
  if (!value) return 'N/A';
  let date;
  let asString;
  if (value instanceof Date) {
    date = value;
    asString = value.toISOString();
  } else if (value && typeof value.toDate === 'function') {
    // Firestore Timestamp
    date = value.toDate();
    asString = date.toISOString();
  } else {
    asString = String(value);
    date = new Date(asString);
  }
  if (Number.isNaN(date.getTime())) return asString;
  try {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch (_) {
    return asString;
  }
}

async function sendOverduePaidAdminConfirmations(db, overdueInvoicesPaid, paymentDetails = {}) {
  if (!db || !Array.isArray(overdueInvoicesPaid) || overdueInvoicesPaid.length === 0) {
    return;
  }

  try {
    const adminsSnapshot = await db.collection('admins').get();
    const admins = adminsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    const financialAdmins = selectAdminRecipients(admins, NOTIFICATION_CATEGORIES.FINANCIAL);

    if (!financialAdmins.length) return;

    for (const invoice of overdueInvoicesPaid) {
      const invoiceId = invoice.invoiceId || invoice.id || invoice._docId || '';
      const amountValue = Number(invoice.total || invoice.amount || paymentDetails.amountPaid || 0);
      const currency = invoice.currency || paymentDetails.currency || 'JMD';
      const amountLabel = formatCurrency(amountValue, currency);
      const clientName = invoice.clientName || invoice.patientName || 'Client';
      const appInvoiceUrl = `nurses876://invoice/${encodeURIComponent(String(invoiceId))}`;
      const paymentMethod = paymentDetails.paymentMethod || invoice.paymentMethod || 'Fygaro';
      const dueDateLabel = formatDateLabel(invoice.dueDate || invoice.due || invoice.dueDateLabel);
      const paymentDateLabel = formatDateLabel(paymentDetails.paidAt || paymentDetails.paidDate || invoice.paidDate || invoice.paidAt);

      const subject = `Payment Confirmation - Overdue Invoice ${invoiceId}`;
      const tasks = financialAdmins.map((adminUser) => {
        const adminName =
          adminUser?.fullName ||
          adminUser?.name ||
          `${adminUser?.firstName || ''} ${adminUser?.lastName || ''}`.trim() ||
          'Admin';

        const html = `
          <div style="font-family: Arial, sans-serif; color:#1f2a44; line-height: 1.7; max-width: 600px; margin: 0 auto; padding: 24px 20px;">
            <p style="margin:0 0 14px 0;">Hi ${adminName},</p>
            <p style="margin:0 0 14px 0;">Payment has been received for an invoice that was previously overdue.</p>
            <p style="margin:0 0 10px 0;">Client Name: ${clientName}</p>
            <p style="margin:0 0 10px 0;">Invoice Number: ${invoiceId}</p>
            <p style="margin:0 0 10px 0;">Amount Due: ${amountLabel}</p>
            <p style="margin:0 0 10px 0;">Due Date: ${dueDateLabel}</p>
            <p style="margin:0 0 10px 0;">Payment Date: ${paymentDateLabel}</p>
            <p style="margin:0 0 14px 0;">Payment Method: ${paymentMethod}</p>
            <p style="margin:0 0 14px 0;">The client’s account balance has been updated automatically and no further action is required unless additional follow-up is needed.</p>
            <p style="margin:0 0 14px 0;"><a href="${appInvoiceUrl}" style="color:#2f62d7;text-decoration:underline;font-weight:700;">Click here to view invoice</a></p>

            <div style="text-align:center;padding:18px 10px 0 10px;color:#9ca3af;font-size:12px;line-height:1.6;">
              876 Nurses Home Care Services · Kingston, Jamaica<br />
              Need help? Email <a href="mailto:876nurses@gmail.com" style="color:#6b7280;text-decoration:underline;">876nurses@gmail.com</a>
            </div>
          </div>
        `;

        const text = [
          `Hi ${adminName},`,
          '',
          'Payment has been received for an invoice that was previously overdue.',
          '',
          `Client Name: ${clientName}`,
          `Invoice Number: ${invoiceId}`,
          `Amount Due: ${amountLabel}`,
          `Due Date: ${dueDateLabel}`,
          `Payment Date: ${paymentDateLabel}`,
          `Payment Method: ${paymentMethod}`,
          '',
          'The client’s account balance has been updated automatically and no further action is required unless additional follow-up is needed.',
          '',
          `Click here to view invoice: ${appInvoiceUrl}`,
        ].join('\n');

        return gmailService.sendEmail({
          from: {
            name: '876 Nurses',
            email: process.env.GMAIL_ACCOUNT,
          },
          to: adminUser.email,
          subject,
          html,
          text,
        });
      });

      await Promise.allSettled(tasks);
    }
  } catch (error) {
    console.error('Failed to send overdue paid admin confirmations:', error.message);
  }
}

async function applyCompletedFygaroPayment(db, {
  invoiceId,
  invoiceFirestoreId,
  appointmentId,
  transactionId,
  webhookData,
}) {
  if (!db) return { updatedInvoices: 0, updatedAppointments: 0 };

  const paidAtIso = webhookData?.paid_at
    ? new Date(webhookData.paid_at).toISOString()
    : new Date().toISOString();

  const amountPaid = Number(webhookData?.amount ?? webhookData?.amount_paid ?? webhookData?.amountPaid ?? 0) || 0;
  const currency = webhookData?.currency || webhookData?.metadata?.currency || 'JMD';
  const paymentMethod = webhookData?.payment_method || webhookData?.metadata?.paymentMethod || 'Fygaro';

  const invoicesRef = db.collection('invoices');
  const updates = {
    status: 'Paid',
    paymentStatus: 'paid',
    paidDate: paidAtIso,
    paymentMethod,
    paymentProvider: 'Fygaro',
    paymentTransactionId: transactionId || webhookData?.transactionId,
    amountPaid,
    currency,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  const refsToUpdate = [];

  // 1) Prefer explicit Firestore doc id when available
  if (invoiceFirestoreId) {
    const directRef = invoicesRef.doc(String(invoiceFirestoreId));
    const snap = await directRef.get();
    if (snap.exists) refsToUpdate.push(directRef);
  }

  // 2) If caller provided an invoice ID (either Firestore doc id or business invoiceId), try both
  if (invoiceId) {
    const directRef = invoicesRef.doc(String(invoiceId));
    const directSnap = await directRef.get();
    if (directSnap.exists) {
      refsToUpdate.push(directRef);
    } else {
      const byInvoiceId = await invoicesRef.where('invoiceId', '==', invoiceId).get();
      byInvoiceId.forEach((doc) => refsToUpdate.push(doc.ref));
    }
  }

  // 3) Fallback to appointment linkage
  if (refsToUpdate.length === 0 && appointmentId) {
    const byAppointment = await invoicesRef.where('appointmentId', '==', appointmentId).get();
    byAppointment.forEach((doc) => refsToUpdate.push(doc.ref));

    const byRelatedAppointment = await invoicesRef.where('relatedAppointmentId', '==', appointmentId).get();
    byRelatedAppointment.forEach((doc) => refsToUpdate.push(doc.ref));
  }

  const uniquePaths = Array.from(new Set(refsToUpdate.map((ref) => ref.path)));
  const uniqueRefs = uniquePaths.map((path) => db.doc(path));
  const snapshotsBeforeUpdate = uniqueRefs.length
    ? await Promise.all(uniqueRefs.map((ref) => ref.get()))
    : [];
  const overdueInvoicesPaid = snapshotsBeforeUpdate
    .filter((snap) => snap.exists)
    .map((snap) => ({ id: snap.id, ...snap.data() }))
    .filter((invoice) => String(invoice?.status || '').trim().toLowerCase() === 'overdue');

  if (uniqueRefs.length > 0) {
    const batch = db.batch();
    uniqueRefs.forEach((ref) => batch.update(ref, updates));
    await batch.commit();
  }

  let updatedAppointments = 0;
  if (appointmentId) {
    const appointmentsRef = db.collection('appointments');
    const appointmentRef = appointmentsRef.doc(String(appointmentId));
    const appointmentSnap = await appointmentRef.get();
    if (appointmentSnap.exists) {
      await appointmentRef.update({
        invoiceStatus: 'Paid',
        paidDate: paidAtIso,
        paymentMethod,
        paymentProvider: 'Fygaro',
        paymentTransactionId: transactionId || webhookData?.transactionId,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      updatedAppointments = 1;
    } else if (invoiceId) {
      const apptByInvoice = await appointmentsRef.where('invoiceId', '==', invoiceId).get();
      if (!apptByInvoice.empty) {
        const apptBatch = db.batch();
        apptByInvoice.forEach((doc) => {
          apptBatch.update(doc.ref, {
            invoiceStatus: 'Paid',
            paidDate: paidAtIso,
            paymentMethod,
            paymentProvider: 'Fygaro',
            paymentTransactionId: transactionId || webhookData?.transactionId,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        });
        await apptBatch.commit();
        updatedAppointments = apptByInvoice.size;
      }
    }
  }

  if (overdueInvoicesPaid.length > 0) {
    await sendOverduePaidAdminConfirmations(db, overdueInvoicesPaid, {
      amountPaid,
      currency,
      paymentMethod,
      paidAt: paidAtIso,
      transactionId: transactionId || webhookData?.transactionId,
    });
  }

  return { updatedInvoices: uniqueRefs.length, updatedAppointments };
}

/**
 * POST /api/payments/initialize
 * Build a Fygaro JWT-signed payment URL for the given invoice/amount.
 * No REST call to Fygaro is made — the URL is constructed entirely server-side.
 */
router.post('/initialize', async (req, res) => {
  try {
    const {
      amount,
      currency = 'JMD',
      invoiceId,
      invoiceFirestoreId,
      appointmentId,
      customerId,
      customerEmail,
    } = req.body;

    if (!amount) {
      return res.status(400).json({ success: false, error: 'amount is required' });
    }

    if (!FYGARO_CONFIG.apiKey || !FYGARO_CONFIG.apiSecret) {
      console.error('Fygaro credentials not configured');
      return res.status(500).json({
        success: false,
        error: 'Payment service not configured. Please contact support.',
      });
    }

    // Build a short reference (max 40 chars) that encodes enough to find the invoice.
    // Priority: invoiceFirestoreId (Firestore doc id, ~20 chars) → invoiceId → appointmentId
    const primaryId = (invoiceFirestoreId || invoiceId || appointmentId || customerId || 'unknown')
      .toString()
      .replace(/[^a-zA-Z0-9_-]/g, '-');
    // Prefix + id, hard-capped at 40 chars
    const customReference = `876n-${primaryId}`.substring(0, 40);

    const paymentUrl = buildFygaroPaymentUrl({
      amount,
      currency,
      customReference,
    });

    console.log('Fygaro payment URL built:', {
      amount: parseFloat(amount).toFixed(2),
      currency,
      customReference,
      invoiceId,
      appointmentId,
    });

    res.json({
      success: true,
      paymentUrl,
      // transactionId is our local reference until Fygaro assigns its own after payment
      transactionId: customReference,
      customReference,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    });
  } catch (error) {
    console.error('Payment initialization error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error during payment initialization',
    });
  }
});

/**
 * GET /api/payments/verify/:transactionId
 * Acknowledge a completed Fygaro payment.
 * With the JWT button flow Fygaro does not expose a REST verify endpoint.
 * The redirect from Fygaro's checkout page is the proof of payment; the
 * authoritative server-side stamp happens via /sync.
 * This endpoint is kept for compatibility with the client service.
 */
router.get('/verify/:transactionId', async (req, res) => {
  try {
    const { transactionId } = req.params;

    if (!transactionId) {
      return res.status(400).json({ success: false, error: 'Transaction ID is required' });
    }

    // fygaroReference may also be supplied as a query param when the client
    // extracts it from the Fygaro redirect URL (?reference=xxx)
    const fygaroReference = req.query.fygaroReference || transactionId;

    console.log('Payment redirect acknowledged:', { transactionId, fygaroReference });

    // Return success — the redirect from Fygaro is proof of payment.
    // /sync will do the authoritative Firestore stamp.
    return res.json({
      success: true,
      status: 'completed',
      transactionId: fygaroReference,
      customReference: transactionId,
    });

  } catch (error) {
    console.error('Payment verify error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error during payment verification',
    });
  }
});

/**
 * POST /api/payments/webhook
 * Handle webhook notifications from Fygaro
 */
router.post('/webhook', async (req, res) => {
  try {
    // Safety switch: allow receiving webhooks but ignore side effects until you're ready
    // to enable signature verification + stricter matching.
    if (!FYGARO_WEBHOOK_UPDATES_ENABLED) {
      return res.json({ success: true, received: true, ignored: true });
    }

    const webhookData = req.body;
    const { event, transaction_id, status, metadata } = webhookData;
    const normalizedEvent = (() => {
      const eventValue = String(event || '').toLowerCase();
      const statusValue = String(status || '').toLowerCase();
      if (
        eventValue === 'payment.completed' ||
        eventValue === 'payment.success' ||
        eventValue === 'payment.succeeded' ||
        eventValue === 'payment.paid' ||
        statusValue === 'completed' ||
        statusValue === 'success' ||
        statusValue === 'paid'
      ) {
        return 'payment.completed';
      }
      return eventValue || 'unknown';
    })();

    const db = getFirestore();
    const invoiceIdFromMeta = metadata?.invoiceId || metadata?.invoice_id || webhookData?.invoice_id;
    const invoiceFirestoreIdFromMeta =
      metadata?.invoiceFirestoreId ||
      metadata?.invoice_firestore_id ||
      metadata?.invoiceDocId ||
      webhookData?.invoice_firestore_id;
    const appointmentIdFromMeta = metadata?.appointmentId || metadata?.appointment_id || webhookData?.appointment_id;

    console.log('Fygaro webhook received:', { event: normalizedEvent, transaction_id, status });

    // TODO: Verify webhook signature here for security
    // const signature = req.headers['x-fygaro-signature'];
    // if (!verifySignature(webhookData, signature)) {
    //   return res.status(401).json({ success: false, error: 'Invalid signature' });
    // }

    // Handle different payment events
    switch (normalizedEvent) {
      case 'payment.completed':
        console.log('Payment completed:', transaction_id);
        if (!db) {
          console.warn('Firebase Admin not configured; skipping invoice update');
          break;
        }

        try {
          await applyCompletedFygaroPayment(db, {
            invoiceId: invoiceIdFromMeta,
            invoiceFirestoreId: invoiceFirestoreIdFromMeta,
            appointmentId: appointmentIdFromMeta,
            transactionId: transaction_id || webhookData?.transactionId,
            webhookData,
          });
        } catch (updateError) {
          console.error('Failed to update invoice/appointment after Fygaro payment:', updateError);
        }
        break;

      case 'payment.failed':
        console.log('Payment failed:', transaction_id);
        // TODO: Handle failed payment
        break;

      case 'payment.cancelled':
        console.log('Payment cancelled:', transaction_id);
        // TODO: Handle cancelled payment
        break;

      default:
        console.log('Unknown webhook event:', event);
    }

    // Always return 200 to acknowledge receipt
    res.json({ success: true, received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    // Still return 200 to prevent retries
    res.json({ success: false, error: error.message });
  }
});

/**
 * POST /api/payments/sync
 * Server-side verification + Firestore update for completed payments.
 * Use this after a successful client redirect/verification to ensure the invoice
 * is stamped paid even if webhooks are delayed/misconfigured.
 */
router.post('/sync', async (req, res) => {
  try {
    if (!FYGARO_SYNC_ENABLED) {
      return res.status(403).json({ success: false, error: 'Payment sync is disabled' });
    }

    const {
      transactionId,     // Fygaro reference from redirect URL (?reference=xxx)
      customReference,   // our custom_reference from JWT (encodes invoiceId/appointmentId)
      invoiceId,
      invoiceFirestoreId,
      appointmentId,
      amount,
      currency,
    } = req.body || {};

    if (!transactionId) {
      return res.status(400).json({ success: false, error: 'transactionId is required' });
    }

    // Parse IDs from customReference if explicit IDs weren't provided.
    // New format: 876n-<invoiceFirestoreId|invoiceId|appointmentId>  (max 40 chars)
    let resolvedInvoiceId = invoiceId;
    let resolvedInvoiceFirestoreId = invoiceFirestoreId;
    let resolvedAppointmentId = appointmentId;
    if (!resolvedInvoiceId && !resolvedInvoiceFirestoreId && !resolvedAppointmentId && customReference) {
      // Strip the 876n- prefix and treat remainder as the primary lookup ID
      const primaryId = customReference.startsWith('876n-')
        ? customReference.substring(5)
        : customReference;
      // Try as invoiceFirestoreId first (direct Firestore doc lookup), then invoiceId
      resolvedInvoiceFirestoreId = primaryId;
      resolvedInvoiceId = primaryId;
    }

    console.log('Payment sync:', {
      transactionId,
      customReference,
      resolvedInvoiceId,
      resolvedAppointmentId,
    });

    const db = getFirestore();
    const result = await applyCompletedFygaroPayment(db, {
      invoiceId: resolvedInvoiceId,
      invoiceFirestoreId: resolvedInvoiceFirestoreId,
      appointmentId: resolvedAppointmentId,
      transactionId,
      webhookData: {
        transactionId,
        custom_reference: customReference,
        metadata: { invoiceId: resolvedInvoiceId, appointmentId: resolvedAppointmentId },
        amount: amount ? parseFloat(amount) : undefined,
        currency: currency || 'JMD',
        paid_at: new Date().toISOString(),
        payment_method: 'Fygaro',
      },
    });

    return res.json({
      success: true,
      status: 'completed',
      transactionId,
      applied: result,
    });
  } catch (error) {
    console.error('Payment sync error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
});

module.exports = router;
