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

function buildBackupCoverageHtml({
  adminName,
  recordTypeLabel,
  recordId,
  clientName,
  serviceLabel,
  requested,
  accepted,
  declined,
}) {
  const linesHtml = [];

  linesHtml.push(`<p style="margin:0 0 14px 0;">Hi ${adminName},</p>`);
  linesHtml.push(`<p style="margin:0 0 14px 0;">A backup coverage update was recorded in the system.</p>`);
  linesHtml.push(`<p style="margin:0 0 10px 0;"><strong>Client:</strong> ${clientName}</p>`);
  linesHtml.push(`<p style="margin:0 0 14px 0;"><strong>Service:</strong> ${serviceLabel}</p>`);

  if (requested) {
    linesHtml.push(`<p style="margin:0 0 6px 0;font-weight:700;">Backup Requested</p>`);
    linesHtml.push(
      `<p style="margin:0 0 10px 0;">Date: ${requested.dateLabel}<br />Requested By: ${requested.requestingNurse}<br />Target Backup Nurse: ${requested.targetBackupNurse}</p>`
    );
  }

  if (accepted) {
    linesHtml.push(`<p style="margin:0 0 6px 0;font-weight:700;">Backup Accepted</p>`);
    linesHtml.push(
      `<p style="margin:0 0 10px 0;">Date: ${accepted.dateLabel}<br />Requested By: ${accepted.requestingNurse}<br />Accepted By: ${accepted.acceptedBy}</p>`
    );
  }

  if (declined) {
    linesHtml.push(`<p style="margin:0 0 6px 0;font-weight:700;">Backup Declined</p>`);
    linesHtml.push(
      `<p style="margin:0 0 10px 0;">Date: ${declined.dateLabel}<br />Requested By: ${declined.requestingNurse}<br />Declined By: ${declined.declinedBy}</p>`
    );
  }

  linesHtml.push(
    '<div style="text-align:center;padding:18px 10px 0 10px;color:#9ca3af;font-size:12px;line-height:1.6;">' +
      '876 Nurses Home Care Services · Kingston, Jamaica<br />' +
      'Need help? Email <a href="mailto:876nurses@gmail.com" style="color:#6b7280;text-decoration:underline;">876nurses@gmail.com</a>' +
    '</div>'
  );

  return `
    <div style="font-family: Arial, sans-serif; color:#1f2a44; line-height:1.7; max-width:600px; margin:0 auto; padding:24px 20px;">
      ${linesHtml.join('\n')}
    </div>
  `;
}

function buildBackupCoverageText({
  adminName,
  recordTypeLabel,
  recordId,
  clientName,
  serviceLabel,
  requested,
  accepted,
  declined,
}) {
  const lines = [];
  lines.push(`Hi ${adminName},`, '');
  lines.push('A backup coverage update was recorded in the system.', '');
  lines.push(`Client: ${clientName}`);
  lines.push(`Service: ${serviceLabel}`);
  lines.push('');

  if (requested) {
    lines.push('Backup Requested');
    lines.push(`Date: ${requested.dateLabel}`);
    lines.push(`Requested By: ${requested.requestingNurse}`);
    lines.push(`Target Backup Nurse: ${requested.targetBackupNurse}`);
    lines.push('');
  }

  if (accepted) {
    lines.push('Backup Accepted');
    lines.push(`Date: ${accepted.dateLabel}`);
    lines.push(`Requested By: ${accepted.requestingNurse}`);
    lines.push(`Accepted By: ${accepted.acceptedBy}`);
    lines.push('');
  }

  if (declined) {
    lines.push('Backup Declined');
    lines.push(`Date: ${declined.dateLabel}`);
    lines.push(`Requested By: ${declined.requestingNurse}`);
    lines.push(`Declined By: ${declined.declinedBy}`);
    lines.push('');
  }

  lines.push('876 Nurses Home Care Services · Kingston, Jamaica');
  lines.push('Need help? Email 876nurses@gmail.com');
  return lines.join('\n');
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
  const adminName = process.argv[3] || 'Morris';
  const recordType = (process.argv[4] || 'shift').toLowerCase();
  const recordTypeLabel = recordType === 'appointment' ? 'Appointment' : 'Shift Request';
  const recordId = process.argv[5] || 'TEST-REC-0001';
  const clientName = process.argv[6] || 'Test Client';
  const serviceLabel = process.argv[7] || 'Home Care';
  const eventKind = (process.argv[8] || 'requested').toLowerCase(); // requested | accepted | declined | both

  const dateLabel = process.argv[9] || new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  const requestingNurse = process.argv[10] || 'Primary Nurse';
  const targetBackupNurse = process.argv[11] || 'Backup Nurse';
  const acceptedBy = process.argv[12] || 'Backup Nurse';
  const declinedBy = process.argv[13] || acceptedBy;

  const requested = (eventKind === 'requested' || eventKind === 'both')
    ? { dateLabel, requestingNurse, targetBackupNurse }
    : null;

  const accepted = (eventKind === 'accepted' || eventKind === 'both')
    ? { dateLabel, requestingNurse, acceptedBy }
    : null;

  const declined = (eventKind === 'declined' || eventKind === 'both')
    ? { dateLabel, requestingNurse, declinedBy }
    : null;

  const subject =
    eventKind === 'requested'
      ? `Backup Coverage Requested - ${recordTypeLabel} ${recordId}`
      : eventKind === 'accepted'
        ? `Backup Coverage Accepted - ${recordTypeLabel} ${recordId}`
        : eventKind === 'declined'
          ? `Backup Coverage Declined - ${recordTypeLabel} ${recordId}`
        : `Backup Coverage Update - ${recordTypeLabel} ${recordId}`;

  const html = buildBackupCoverageHtml({
    adminName,
    recordTypeLabel,
    recordId,
    clientName,
    serviceLabel,
    requested,
    accepted,
    declined,
  });

  const text = buildBackupCoverageText({
    adminName,
    recordTypeLabel,
    recordId,
    clientName,
    serviceLabel,
    requested,
    accepted,
    declined,
  });

  const id = await queueMail({
    to,
    subject,
    html,
    text,
    meta: {
      source: 'send-backup-coverage-test-email.js',
      type: 'backup-coverage-test',
      eventKind,
      recordType,
      recordId,
    },
  });

  console.log('✅ Queued backup coverage email:', id);
  console.log('📬 Recipient:', to);
  console.log('✉️ Subject:', subject);
}

main().catch((err) => {
  console.error('❌ Failed to queue backup coverage test email:', err);
  process.exit(1);
});
