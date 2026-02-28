const admin = require('firebase-admin');
const path = require('path');

const serviceAccountPath = path.join(__dirname, '..', 'firebase-service-key.json');
// eslint-disable-next-line import/no-dynamic-require, global-require
const serviceAccount = require(serviceAccountPath);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

function calculateDaysOverdueFromDate(dueDateInput) {
  const dueDate = new Date(String(dueDateInput || ''));
  if (Number.isNaN(dueDate.getTime())) return 1;
  const now = new Date();
  const diffMs = now.getTime() - dueDate.getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return days > 0 ? days : 1;
}

function buildAdminOverdueAlertHtml({ adminName, invoiceId, clientName, amountLabel, dueDateLabel, daysOverdue, appInvoiceManagementUrl }) {
  return `
    <div style="font-family: Arial, sans-serif; color:#1f2a44; line-height: 1.7; max-width: 600px; margin: 0 auto; padding: 24px 20px;">
      <p style="margin:0 0 14px 0;">Hi ${adminName},</p>
      <p style="margin:0 0 14px 0;">An invoice has become overdue and requires administrative attention.</p>
      <p style="margin:0 0 10px 0;">Client Name: ${clientName}</p>
      <p style="margin:0 0 10px 0;">Invoice Number: ${invoiceId}</p>
      <p style="margin:0 0 10px 0;">Amount Due: ${amountLabel}</p>
      <p style="margin:0 0 10px 0;">Due Date: ${dueDateLabel}</p>
      <p style="margin:0 0 14px 0;">This invoice is currently ${daysOverdue} day(s) past the due date. Please review the client’s account and take the necessary follow-up action in accordance with the organization’s billing policy.</p>
      <p style="margin:0 0 14px 0;"><a href="${appInvoiceManagementUrl}" style="color:#2f62d7;text-decoration:underline;font-weight:700;">Click here to view on Invoice Management</a></p>

      <div style="text-align:center;padding:18px 10px 0 10px;color:#9ca3af;font-size:12px;line-height:1.6;">
        876 Nurses Home Care Services · Kingston, Jamaica<br />
        Need help? Email <a href="mailto:876nurses@gmail.com" style="color:#6b7280;text-decoration:underline;">876nurses@gmail.com</a>
      </div>
    </div>
  `;
}

function buildAdminOverduePaidHtml({
  adminName,
  amountLabel,
  invoiceNumber,
  clientName,
  dueDateLabel,
  paymentDateLabel,
  paymentMethod,
  appInvoiceUrl,
}) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #1f2a44; margin:0; padding:0; background:#ffffff; }
        .container { max-width: 600px; margin: 0 auto; padding: 32px 20px; }
        .footer { text-align: center; padding: 18px 10px 0 10px; color: #9ca3af; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <p style="margin:0 0 12px 0;font-size:15px;line-height:1.7;">Hi ${adminName},</p>
        <p style="margin:0 0 14px 0;font-size:15px;line-height:1.7;">Payment has been received for an invoice that was previously overdue.</p>
        <p style="margin:0 0 10px 0;font-size:15px;line-height:1.7;">Client Name: ${clientName}</p>
        <p style="margin:0 0 10px 0;font-size:15px;line-height:1.7;">Invoice Number: ${invoiceNumber}</p>
        <p style="margin:0 0 10px 0;font-size:15px;line-height:1.7;">Amount Due: ${amountLabel}</p>
        <p style="margin:0 0 10px 0;font-size:15px;line-height:1.7;">Due Date: ${dueDateLabel}</p>
        <p style="margin:0 0 10px 0;font-size:15px;line-height:1.7;">Payment Date: ${paymentDateLabel}</p>
        <p style="margin:0 0 14px 0;font-size:15px;line-height:1.7;">Payment Method: ${paymentMethod}</p>
        <p style="margin:0 0 16px 0;font-size:15px;line-height:1.7;">The client’s account balance has been updated automatically and no further action is required unless additional follow-up is needed.</p>
        <p style="margin:0 0 16px 0;"><a href="${appInvoiceUrl}" style="color:#2f62d7;text-decoration:underline;font-weight:700;">Click here to view invoice</a></p>

        <div class="footer">
          876 Nurses Home Care Services · Kingston, Jamaica<br />
          Need help? Email <a href="mailto:876nurses@gmail.com" style="color:#6b7280;text-decoration:underline;">876nurses@gmail.com</a>
        </div>
      </div>
    </body>
    </html>
  `;
}

async function queueMail({ to, subject, html, text, meta }) {
  const payload = {
    to: [to],
    from: '876 Nurses <876nurses@gmail.com>',
    replyTo: '876nurses@gmail.com',
    subject,
    html,
    text,
    attachments: [],
    meta,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    status: 'queued',
  };

  const ref = await admin.firestore().collection('mail').add(payload);
  return ref.id;
}

async function main() {
  const to = process.argv[2] || 'morris.kadian@yahoo.com';
  const adminName = process.argv[3] || 'Sandrene';
  const invoiceId = process.argv[4] || 'NUR-INV-0021';
  const clientName = process.argv[5] || 'Kadian Thompson';
  const amount = Number(process.argv[6] || 12500);
  const dueDateLabel = process.argv[7] || 'Feb 20, 2026';
  const daysOverdue = Number(process.argv[8] || calculateDaysOverdueFromDate(dueDateLabel));
  const appInvoiceManagementUrl = process.argv[9] || `nurses876://invoice-management/${encodeURIComponent(invoiceId)}`;
  const paymentDateLabel = process.argv[10] || new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  const paymentMethod = process.argv[11] || 'Fygaro';
  const appInvoiceUrl = `nurses876://invoice/${encodeURIComponent(invoiceId)}`;

  const overdueId = await queueMail({
    to,
    subject: `Overdue Invoice Alert: ${invoiceId}`,
    html: buildAdminOverdueAlertHtml({
      adminName,
      invoiceId,
      clientName,
      amountLabel: `JMD $${amount.toFixed(2)}`,
      dueDateLabel,
      daysOverdue,
      appInvoiceManagementUrl,
    }),
    text: `Hi ${adminName},\n\nAn invoice has become overdue and requires administrative attention.\n\nClient Name: ${clientName}\nInvoice Number: ${invoiceId}\nAmount Due: JMD $${amount.toFixed(2)}\nDue Date: ${dueDateLabel}\n\nThis invoice is currently ${daysOverdue} day(s) past the due date. Please review the client’s account and take the necessary follow-up action in accordance with the organization’s billing policy.\n\nClick here to view on Invoice Management: ${appInvoiceManagementUrl}\n\nNeed help? Email 876nurses@gmail.com`,
    meta: { source: 'send-template-test-emails.js', type: 'admin-overdue-alert-test' },
  });

  const overduePaidId = await queueMail({
    to,
    subject: `Payment Confirmation - Overdue Invoice ${invoiceId}`,
    html: buildAdminOverduePaidHtml({
      adminName,
      amountLabel: `JMD $${amount.toFixed(2)}`,
      invoiceNumber: invoiceId,
      clientName,
      dueDateLabel,
      paymentDateLabel,
      paymentMethod,
      appInvoiceUrl,
    }),
    text: `Hi ${adminName},\n\nPayment has been received for an invoice that was previously overdue.\n\nClient Name: ${clientName}\nInvoice Number: ${invoiceId}\nAmount Due: JMD $${amount.toFixed(2)}\nDue Date: ${dueDateLabel}\nPayment Date: ${paymentDateLabel}\nPayment Method: ${paymentMethod}\n\nThe client’s account balance has been updated automatically and no further action is required unless additional follow-up is needed.\n\nClick here to view invoice: ${appInvoiceUrl}`,
    meta: { source: 'send-template-test-emails.js', type: 'admin-overdue-paid-test' },
  });

  console.log('✅ Queued admin overdue alert email:', overdueId);
  console.log('✅ Queued admin overdue paid confirmation email:', overduePaidId);
  console.log('📬 Recipient:', to);
}

main().catch((err) => {
  console.error('❌ Failed to queue test emails:', err);
  process.exit(1);
});
