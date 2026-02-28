const admin = require('firebase-admin');
const path = require('path');

/**
 * Queue a test invoice email by writing a document to Firestore collection `/mail`.
 * A deployed Firebase Cloud Function will send the email.
 *
 * Usage:
 *   node test-invoice-email.js recipient@example.com
 *   node test-invoice-email.js recipient@example.com "NUR-INV-0123" "Jane Doe" "Wound Care" 7500 "2026-02-26"
 */

const serviceAccountPath = path.join(__dirname, 'firebase-service-key.json');
// eslint-disable-next-line import/no-dynamic-require, global-require
const serviceAccount = require(serviceAccountPath);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: 'nurses-afb7e.firebasestorage.app',
  });
}

function buildInvoiceEmailHtml({ invoiceNumber, clientName, logoDataUri, appInvoiceUrl }) {
  const safeName = clientName || 'Client';
  const safeInvoiceNumber = invoiceNumber || '';
  const hasAppInvoiceUrl = typeof appInvoiceUrl === 'string' && appInvoiceUrl.trim().length > 0;

  const watermarkStyle = logoDataUri
    ? `background-image:url('${logoDataUri}');background-position:center center;background-repeat:no-repeat;background-size:280px 280px;`
    : '';

  return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Invoice ${safeInvoiceNumber}</title>
        </head>
        <body style="margin:0;padding:0;background-color:#ffffff;font-family:Arial,sans-serif;color:#1f2a44;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#ffffff;padding:40px 0;">
            <tr>
              <td align="center" style="padding:0 16px;">
                <table width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;">
                  <tr>
                    <td style="padding:32px 20px;position:relative;min-height:360px;${watermarkStyle}">
                      <!-- Overlay to reduce watermark opacity -->
                      <div style="position:absolute;top:0;left:0;right:0;bottom:0;background:rgba(255,255,255,0.92);z-index:0;pointer-events:none;"></div>
                      
                      <div style="position:relative;z-index:1;">
                        <p style="margin:0 0 24px 0;font-size:15px;line-height:1.7;color:#1f2a44;">Hi ${safeName},</p>

                        <p style="margin:0 0 16px 0;font-size:15px;line-height:1.7;color:#1f2a44;">Your invoice <strong>${safeInvoiceNumber}</strong> from 876 Nurses Home Care Services is ready.</p>

                        ${hasAppInvoiceUrl ? `
                        <p style="margin:0 0 18px 0;font-size:15px;line-height:1.7;color:#1f2a44;">
                          <a href="${appInvoiceUrl}" style="color:#2f62d7;text-decoration:underline;font-weight:700;">Click here to view invoice</a>
                        </p>
                        ` : ''}
                      </div>
                    </td>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>

          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#ffffff;">
            <tr>
              <td align="center" style="padding:0 16px;">
                <table width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;">
                  <tr>
                    <td align="center" style="padding:18px 10px 0 10px;color:#9ca3af;font-size:12px;line-height:1.6;">
                      876 Nurses Home Care Services · Kingston, Jamaica<br />
                      Need help? Email <a href="mailto:876nurses@gmail.com" style="color:#6b7280;text-decoration:underline;">876nurses@gmail.com</a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
  `;
}

async function main() {
  const to = process.argv[2];
  const invoiceNumber = process.argv[3] || 'NUR-INV-0001';
  const clientName = process.argv[4] || 'Kadian Thompson';
  const service = process.argv[5] || 'Home Nursing Care';
  const amountRaw = process.argv[6];
  const date = process.argv[7] || new Date().toISOString().slice(0, 10);
  const appInvoiceUrl = process.argv[8] || `nurses876://invoice/${encodeURIComponent(invoiceNumber)}`;

  if (!to) {
    console.error('❌ Missing recipient email');
    console.error('Usage: node test-invoice-email.js recipient@example.com');
    process.exit(1);
  }

  const amount = amountRaw !== undefined ? Number(amountRaw) : 12500;

  console.log('🧪 Queuing test invoice email...');
  console.log('To:', to);
  console.log('Invoice:', invoiceNumber);

  const subject = `Invoice ${invoiceNumber} - 876 Nurses Home Care Services`;

  let logoDataUri = null;
  try {
    const logoPath = path.join(__dirname, 'assets', 'Images', 'Nurses-logo.png');
    const logoBase64 = require('fs').readFileSync(logoPath).toString('base64');
    logoDataUri = `data:image/png;base64,${logoBase64}`;
  } catch (_) {
    // optional
  }

  const html = buildInvoiceEmailHtml({
    invoiceNumber,
    clientName,
    logoDataUri,
    appInvoiceUrl,
  });

  const db = admin.firestore();
  const payload = {
    to: [to],
    from: '876 Nurses <876nurses@gmail.com>',
    replyTo: '876nurses@gmail.com',
    subject,
    html,
    text: `Invoice ${invoiceNumber} from 876 Nurses Home Care Services\n\nHi ${clientName},\n\nThank you for choosing 876 Nurses.\n\nInvoice Number: ${invoiceNumber}\nDate: ${date}\nService: ${service}\nAmount: JMD $${Number.isFinite(amount) ? amount.toFixed(2) : '0.00'}\nClick here to view invoice: ${appInvoiceUrl}\n\nNeed help? Email 876nurses@gmail.com\n876 Nurses Home Care Services · Kingston, Jamaica`,
    attachments: [],
    meta: { source: 'test-invoice-email.js', type: 'invoice', invoiceNumber, appInvoiceUrl },
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    status: 'queued',
  };

  const ref = await db.collection('mail').add(payload);

  console.log('✅ Invoice email queued successfully!');
  console.log('📋 Document ID:', ref.id);
  console.log('📬 The email should arrive shortly at:', to);
}

main().catch((err) => {
  console.error('❌ Failed to queue invoice email:', err);
  process.exit(1);
});
