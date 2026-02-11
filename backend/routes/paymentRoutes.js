const express = require('express');
const router = express.Router();
const { admin, getFirestore } = require('../services/firebaseAdmin');

/**
 * Payment Routes for Fygaro Integration
 * Securely handles payment initialization and verification
 */

// Fygaro configuration from environment variables
const FYGARO_CONFIG = {
  apiKey: process.env.FYGARO_API_KEY,
  apiSecret: process.env.FYGARO_API_SECRET,
  baseUrl: process.env.FYGARO_BASE_URL || 'https://www.fygaro.com/api/v1',
  testMode: process.env.FYGARO_TEST_MODE === 'true',
};

const FYGARO_WEBHOOK_UPDATES_ENABLED = process.env.ENABLE_FYGARO_WEBHOOK_UPDATES === 'true';
const FYGARO_SYNC_ENABLED = process.env.ENABLE_FYGARO_SYNC === 'true';

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

  return { updatedInvoices: uniqueRefs.length, updatedAppointments };
}

/**
 * POST /api/payments/initialize
 * Initialize a payment session with Fygaro
 */
router.post('/initialize', async (req, res) => {
  try {
    const {
      amount,
      currency = 'JMD',
      invoiceId,
      appointmentId,
      customerId,
      customerName,
      customerEmail,
      customerPhone,
      description,
      returnUrl,
      cancelUrl,
      metadata,
    } = req.body;

    // Validate required fields
    if (!amount || !customerEmail) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: amount and customerEmail are required'
      });
    }

    // Validate Fygaro credentials
    if (!FYGARO_CONFIG.apiKey || !FYGARO_CONFIG.apiSecret) {
      console.error('Fygaro credentials not configured');
      return res.status(500).json({
        success: false,
        error: 'Payment service not configured. Please contact support.'
      });
    }

    // Create payment payload for Fygaro
    const payload = {
      api_key: FYGARO_CONFIG.apiKey,
      amount: parseFloat(amount).toFixed(2),
      currency,
      description: description || 'Payment for 876 Nurses services',
      customer: {
        name: customerName,
        email: customerEmail,
        phone: customerPhone,
      },
      metadata: {
        invoiceId,
        appointmentId,
        customerId,
        ...metadata,
      },
      return_url: returnUrl || 'myapp://payment-success',
      cancel_url: cancelUrl || 'myapp://payment-cancel',
      test_mode: FYGARO_CONFIG.testMode,
    };

    console.log('Initializing Fygaro payment:', {
      amount: payload.amount,
      currency: payload.currency,
      customerEmail: payload.customer.email,
      testMode: payload.test_mode
    });

    // Call Fygaro API
    const response = await fetch(`${FYGARO_CONFIG.baseUrl}/payments/initialize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${FYGARO_CONFIG.apiSecret}`,
      },
      body: JSON.stringify(payload),
    });

    const contentType = response.headers.get('content-type');
    
    // Check if response is JSON
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      console.error('Fygaro API returned non-JSON response:', {
        status: response.status,
        contentType,
        textPreview: text.substring(0, 200)
      });
      
      return res.status(500).json({
        success: false,
        error: 'Payment service returned invalid response. Please verify your Fygaro API credentials and endpoint.'
      });
    }

    const result = await response.json();

    if (result.success || result.payment_url) {
      res.json({
        success: true,
        paymentUrl: result.payment_url || result.checkout_url,
        sessionId: result.session_id || result.id,
        transactionId: result.transaction_id,
        expiresAt: result.expires_at,
      });
    } else {
      console.error('Fygaro payment initialization failed:', result);
      res.status(400).json({
        success: false,
        error: result.message || 'Failed to initialize payment'
      });
    }
  } catch (error) {
    console.error('Payment initialization error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error during payment initialization'
    });
  }
});

/**
 * GET /api/payments/verify/:transactionId
 * Verify payment status with Fygaro
 */
router.get('/verify/:transactionId', async (req, res) => {
  try {
    const { transactionId } = req.params;

    if (!transactionId) {
      return res.status(400).json({
        success: false,
        error: 'Transaction ID is required'
      });
    }

    // Validate Fygaro credentials
    if (!FYGARO_CONFIG.apiKey || !FYGARO_CONFIG.apiSecret) {
      return res.status(500).json({
        success: false,
        error: 'Payment service not configured'
      });
    }

    console.log('Verifying Fygaro payment:', transactionId);

    // Verify payment through Fygaro API
    const response = await fetch(
      `${FYGARO_CONFIG.baseUrl}/payments/${transactionId}/verify`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${FYGARO_CONFIG.apiSecret}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const contentType = response.headers.get('content-type');
    
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      console.error('Fygaro verification returned non-JSON response:', {
        status: response.status,
        contentType,
        textPreview: text.substring(0, 200)
      });
      
      return res.status(500).json({
        success: false,
        error: 'Payment verification service returned invalid response'
      });
    }

    const result = await response.json();

    if (result.success || result.status === 'completed') {
      res.json({
        success: true,
        status: result.status,
        transactionId: result.transaction_id || transactionId,
        amount: result.amount,
        currency: result.currency,
        paidAt: result.paid_at,
        metadata: result.metadata,
      });
    } else {
      res.json({
        success: false,
        status: result.status || 'unknown',
        error: result.message || 'Payment verification failed'
      });
    }
  } catch (error) {
    console.error('Payment verification error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error during payment verification'
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

    const { transactionId, invoiceId, invoiceFirestoreId, appointmentId } = req.body || {};

    if (!transactionId) {
      return res.status(400).json({ success: false, error: 'transactionId is required' });
    }

    if (!FYGARO_CONFIG.apiKey || !FYGARO_CONFIG.apiSecret) {
      return res.status(500).json({ success: false, error: 'Payment service not configured' });
    }

    const verifyResponse = await fetch(
      `${FYGARO_CONFIG.baseUrl}/payments/${transactionId}/verify`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${FYGARO_CONFIG.apiSecret}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const contentType = verifyResponse.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await verifyResponse.text();
      return res.status(500).json({
        success: false,
        error: 'Payment verification service returned invalid response',
        status: verifyResponse.status,
        textPreview: text.substring(0, 200),
      });
    }

    const verifyResult = await verifyResponse.json();
    const statusValue = String(verifyResult?.status || '').toLowerCase();
    const isCompleted = verifyResult?.success || statusValue === 'completed' || statusValue === 'paid' || statusValue === 'success';

    if (!isCompleted) {
      return res.json({
        success: false,
        status: verifyResult?.status || 'unknown',
        error: verifyResult?.message || 'Payment not completed',
      });
    }

    const db = getFirestore();
    const result = await applyCompletedFygaroPayment(db, {
      invoiceId,
      invoiceFirestoreId,
      appointmentId,
      transactionId: verifyResult?.transaction_id || transactionId,
      webhookData: {
        ...verifyResult,
        transactionId: verifyResult?.transaction_id || transactionId,
        metadata: verifyResult?.metadata || {},
        amount: verifyResult?.amount,
        currency: verifyResult?.currency,
        paid_at: verifyResult?.paid_at,
        payment_method: verifyResult?.payment_method,
      },
    });

    return res.json({
      success: true,
      status: verifyResult?.status,
      transactionId: verifyResult?.transaction_id || transactionId,
      applied: result,
    });
  } catch (error) {
    console.error('Payment sync error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
});

module.exports = router;
