const functionsV1 = require('firebase-functions/v1');
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { onDocumentCreated, onDocumentUpdated } = require('firebase-functions/v2/firestore');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
const { defineSecret, defineString } = require('firebase-functions/params');

const isEmulator =
  process.env.FUNCTIONS_EMULATOR === 'true' ||
  !!process.env.FIREBASE_EMULATOR_HUB ||
  !!process.env.FIRESTORE_EMULATOR_HOST;

// Load .env only for local emulator/dev use.
if (isEmulator) {
  try {
    // eslint-disable-next-line global-require
    require('dotenv').config();
  } catch (_) {
    // optional
  }
}

// Secrets (recommended for production)
const GMAIL_USER_SECRET = defineSecret('GMAIL_USER');
const GMAIL_APP_PASSWORD_SECRET = defineSecret('GMAIL_APP_PASSWORD');

// Non-secret defaults (can also be overridden by env vars)
const GMAIL_FROM_EMAIL_PARAM = defineString('GMAIL_FROM_EMAIL', { default: '' });
const GMAIL_FROM_NAME_PARAM = defineString('GMAIL_FROM_NAME', { default: '876 Nurses Home Care Services' });

admin.initializeApp();

const ADMIN_NOTIFICATION_ROLES = {
  FULL_ACCESS: 'full_access',
  SCHEDULING_ONLY: 'scheduling_only',
  FINANCIAL_ONLY: 'financial_only',
};

const NOTIFICATION_CATEGORIES = {
  ALL: 'all',
  SCHEDULING: 'scheduling',
  FINANCIAL: 'financial',
};

const normalizeString = (value) => String(value || '').trim().toLowerCase();

const getRuntimeServiceAccountEmail = () => {
  const projectId = process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT;
  if (!projectId) return undefined;
  return `gcf-runtime@${projectId}.iam.gserviceaccount.com`;
};

const getDisplayName = (record) =>
  (
    record?.fullName ||
    record?.name ||
    `${record?.firstName || ''} ${record?.lastName || ''}`.trim() ||
    ''
  );

const inferRoleFromKnownStaff = (adminUser) => {
  const email = normalizeString(adminUser?.email);
  const name = normalizeString(getDisplayName(adminUser));

  if (email === 'prince@876nurses.com' || name.includes('prince')) {
    return ADMIN_NOTIFICATION_ROLES.SCHEDULING_ONLY;
  }

  return ADMIN_NOTIFICATION_ROLES.FULL_ACCESS;
};

const getEffectiveEmailNotificationRole = (adminUser) => {
  const explicitRole = normalizeString(adminUser?.emailNotificationRole);

  if (
    explicitRole === ADMIN_NOTIFICATION_ROLES.FULL_ACCESS ||
    explicitRole === ADMIN_NOTIFICATION_ROLES.SCHEDULING_ONLY ||
    explicitRole === ADMIN_NOTIFICATION_ROLES.FINANCIAL_ONLY
  ) {
    return explicitRole;
  }

  return inferRoleFromKnownStaff(adminUser);
};

const categoryAllowsRole = (category, role) => {
  switch (category) {
    case NOTIFICATION_CATEGORIES.SCHEDULING:
      return role === ADMIN_NOTIFICATION_ROLES.FULL_ACCESS || role === ADMIN_NOTIFICATION_ROLES.SCHEDULING_ONLY;
    case NOTIFICATION_CATEGORIES.FINANCIAL:
      return role === ADMIN_NOTIFICATION_ROLES.FULL_ACCESS || role === ADMIN_NOTIFICATION_ROLES.FINANCIAL_ONLY;
    case NOTIFICATION_CATEGORIES.ALL:
    default:
      return true;
  }
};

const getSchedulingAdmins = async () => {
  const snapshot = await admin.firestore().collection('admins').get();
  const all = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
  const selected = all
    .filter((u) => u && u.email && u.isActive !== false)
    .filter((u) => categoryAllowsRole(NOTIFICATION_CATEGORIES.SCHEDULING, getEffectiveEmailNotificationRole(u)))
    .map((u) => ({
      id: u.id,
      email: u.email,
      name: getDisplayName(u) || 'Admin',
      role: getEffectiveEmailNotificationRole(u),
    }));

  const byEmail = new Map();
  for (const u of selected) {
    const key = normalizeString(u.email);
    if (!key) continue;
    if (!byEmail.has(key)) byEmail.set(key, u);
  }

  if (!byEmail.has('prince@876nurses.com')) {
    byEmail.set('prince@876nurses.com', {
      id: 'prince',
      email: 'prince@876nurses.com',
      name: 'Prince',
      role: ADMIN_NOTIFICATION_ROLES.SCHEDULING_ONLY,
    });
  }

  return Array.from(byEmail.values());
};

const queueMailDoc = async ({ to, subject, html, text, meta }) => {
  const payload = {
    to: Array.isArray(to) ? to : [to],
    from: '876 Nurses <876nurses@gmail.com>',
    replyTo: '876nurses@gmail.com',
    subject,
    html,
    text,
    attachments: [],
    meta: meta && typeof meta === 'object' ? meta : {},
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    status: 'queued',
  };

  const ref = await admin.firestore().collection('mail').add(payload);
  return ref.id;
};

const asArray = (v) => (Array.isArray(v) ? v : []);

const normalizeCoverageStatus = (v) => String(v || '').trim().toLowerCase();

const indexCoverageRequestsById = (list) => {
  const map = new Map();
  asArray(list).forEach((entry) => {
    if (!entry || typeof entry !== 'object') return;
    const id = String(entry.id || '').trim();
    if (!id) return;
    map.set(id, entry);
  });
  return map;
};

const lookupNurseName = async (nurseId) => {
  const id = String(nurseId || '').trim();
  if (!id) return null;
  try {
    const snap = await admin.firestore().collection('nurses').doc(id).get();
    if (!snap.exists) return null;
    const data = snap.data() || {};
    return getDisplayName(data) || data?.fullName || data?.name || null;
  } catch (_) {
    return null;
  }
};

const buildCoverageEmail = async ({
  adminName,
  recordTypeLabel,
  recordId,
  recordData,
  requestedEntries,
  acceptedEntries,
  declinedEntries,
}) => {
  const clientName =
    recordData?.clientName ||
    recordData?.patientName ||
    recordData?.name ||
    recordData?.clientSnapshot?.name ||
    recordData?.patientSnapshot?.name ||
    'Client';

  const serviceLabel = recordData?.service || recordData?.serviceName || recordData?.careType || 'Care';

  const linesHtml = [];
  const linesText = [];

  linesHtml.push(`<p style="margin:0 0 14px 0;">Hi ${adminName},</p>`);
  linesText.push(`Hi ${adminName},`, '');

  linesHtml.push(`<p style="margin:0 0 14px 0;">A backup coverage update was recorded in the system.</p>`);
  linesText.push('A backup coverage update was recorded in the system.', '');

  linesHtml.push(`<p style="margin:0 0 10px 0;"><strong>Client:</strong> ${clientName}</p>`);
  linesHtml.push(`<p style="margin:0 0 14px 0;"><strong>Service:</strong> ${serviceLabel}</p>`);

  linesText.push(`Client: ${clientName}`);
  linesText.push(`Service: ${serviceLabel}`);
  linesText.push('');

  for (const entry of requestedEntries) {
    const dateLabel = entry?.date || entry?.requestedForDate || entry?.dayKey || 'N/A';
    const requestingNurse = entry?.requestingNurseName || entry?.requestedByNurseName || 'N/A';
    const backupTarget = entry?.targetBackupNurseName || entry?.backupNurseName || 'Backup Nurse';

    linesHtml.push(`<p style="margin:0 0 6px 0;font-weight:700;">Backup Requested</p>`);
    linesHtml.push(`<p style="margin:0 0 10px 0;">Date: ${dateLabel}<br />Requested By: ${requestingNurse}<br />Target Backup Nurse: ${backupTarget}</p>`);

    linesText.push('Backup Requested');
    linesText.push(`Date: ${dateLabel}`);
    linesText.push(`Requested By: ${requestingNurse}`);
    linesText.push(`Target Backup Nurse: ${backupTarget}`);
    linesText.push('');
  }

  for (const entry of acceptedEntries) {
    const dateLabel = entry?.date || entry?.requestedForDate || entry?.dayKey || 'N/A';
    const requestingNurse = entry?.requestingNurseName || entry?.requestedByNurseName || 'N/A';
    const acceptedById = entry?.acceptedBy || entry?.acceptedById || entry?.responseById || null;
    const acceptedByStaffCode = entry?.acceptedByStaffCode || entry?.acceptedByCode || null;
    const acceptedByName =
      entry?.acceptedByName ||
      (acceptedById ? (await lookupNurseName(acceptedById)) : null) ||
      acceptedByStaffCode ||
      acceptedById ||
      'N/A';

    linesHtml.push(`<p style="margin:0 0 6px 0;font-weight:700;">Backup Accepted</p>`);
    linesHtml.push(`<p style="margin:0 0 10px 0;">Date: ${dateLabel}<br />Requested By: ${requestingNurse}<br />Accepted By: ${acceptedByName}</p>`);

    linesText.push('Backup Accepted');
    linesText.push(`Date: ${dateLabel}`);
    linesText.push(`Requested By: ${requestingNurse}`);
    linesText.push(`Accepted By: ${acceptedByName}`);
    linesText.push('');
  }

  for (const entry of declinedEntries) {
    const dateLabel = entry?.date || entry?.requestedForDate || entry?.dayKey || 'N/A';
    const requestingNurse = entry?.requestingNurseName || entry?.requestedByNurseName || 'N/A';
    const declinedById = entry?.declinedBy || entry?.declinedById || entry?.responseById || null;
    const declinedByStaffCode = entry?.declinedByStaffCode || entry?.declinedByCode || null;
    const declinedByName =
      entry?.declinedByName ||
      (declinedById ? (await lookupNurseName(declinedById)) : null) ||
      declinedByStaffCode ||
      declinedById ||
      'N/A';

    linesHtml.push(`<p style=\"margin:0 0 6px 0;font-weight:700;\">Backup Declined</p>`);
    linesHtml.push(`<p style=\"margin:0 0 10px 0;\">Date: ${dateLabel}<br />Requested By: ${requestingNurse}<br />Declined By: ${declinedByName}</p>`);

    linesText.push('Backup Declined');
    linesText.push(`Date: ${dateLabel}`);
    linesText.push(`Requested By: ${requestingNurse}`);
    linesText.push(`Declined By: ${declinedByName}`);
    linesText.push('');
  }

  linesHtml.push(
    '<div style="text-align:center;padding:18px 10px 0 10px;color:#9ca3af;font-size:12px;line-height:1.6;">' +
      '876 Nurses Home Care Services · Kingston, Jamaica<br />' +
      'Need help? Email <a href="mailto:876nurses@gmail.com" style="color:#6b7280;text-decoration:underline;">876nurses@gmail.com</a>' +
    '</div>'
  );
  linesText.push('876 Nurses Home Care Services · Kingston, Jamaica');
  linesText.push('Need help? Email 876nurses@gmail.com');

  const html = `
    <div style="font-family: Arial, sans-serif; color:#1f2a44; line-height:1.7; max-width:600px; margin:0 auto; padding:24px 20px;">
      ${linesHtml.join('\n')}
    </div>
  `;

  const text = linesText.join('\n');
  return { html, text };
};

const detectCoverageChanges = (beforeData, afterData) => {
  const beforeList = asArray(beforeData?.coverageRequests || beforeData?.backupCoverageRequests);
  const afterList = asArray(afterData?.coverageRequests || afterData?.backupCoverageRequests);

  const beforeById = indexCoverageRequestsById(beforeList);
  const afterById = indexCoverageRequestsById(afterList);

  const requestedEntries = [];
  const acceptedEntries = [];
  const declinedEntries = [];

  for (const [id, entryAfter] of afterById.entries()) {
    const entryBefore = beforeById.get(id);

    const statusAfter = normalizeCoverageStatus(entryAfter?.status);
    const statusBefore = normalizeCoverageStatus(entryBefore?.status);

    if (!entryBefore && statusAfter === 'pending') {
      requestedEntries.push(entryAfter);
    }

    if (statusAfter === 'accepted' && statusBefore !== 'accepted') {
      acceptedEntries.push(entryAfter);
    }

    if (
      (statusAfter === 'declined' || statusAfter === 'rejected' || statusAfter === 'denied') &&
      statusBefore !== statusAfter
    ) {
      declinedEntries.push(entryAfter);
    }
  }

  return { requestedEntries, acceptedEntries, declinedEntries };
};

const getGmailConfig = () => {
  // Prefer secrets; fall back to process.env for local emulator/dev.
  const user = (GMAIL_USER_SECRET.value && GMAIL_USER_SECRET.value()) || process.env.GMAIL_USER || '';
  const appPassword =
    (GMAIL_APP_PASSWORD_SECRET.value && GMAIL_APP_PASSWORD_SECRET.value()) ||
    process.env.GMAIL_APP_PASSWORD ||
    '';

  const fromEmail = process.env.GMAIL_FROM_EMAIL || GMAIL_FROM_EMAIL_PARAM.value() || user;
  const fromName = process.env.GMAIL_FROM_NAME || GMAIL_FROM_NAME_PARAM.value() || '876 Nurses Home Care Services';

  return {
    user,
    appPassword,
    fromEmail,
    fromName,
  };
};

const createTransporter = () => {
  const { user, appPassword } = getGmailConfig();
  if (!user || !appPassword) return null;

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user,
      pass: appPassword,
    },
  });
};

const sendMail = async ({ to, subject, html, text, attachments = [] }) => {
  const { fromEmail, fromName } = getGmailConfig();
  const transporter = createTransporter();
  if (!transporter) {
    throw new Error('Gmail config missing. Set env: GMAIL_USER and GMAIL_APP_PASSWORD');
  }

  const toList = Array.isArray(to) ? to : [to];
  const cleanedTo = toList.map((v) => String(v || '').trim()).filter(Boolean);
  if (cleanedTo.length === 0) throw new Error('Missing "to"');
  if (!subject) throw new Error('Missing "subject"');
  if (!html && !text) throw new Error('Missing "html" or "text"');

  const info = await transporter.sendMail({
    from: fromName ? `\"${fromName}\" <${fromEmail}>` : fromEmail,
    to: cleanedTo.join(','),
    subject: String(subject),
    text: text ? String(text) : undefined,
    html: html ? String(html) : undefined,
    attachments: Array.isArray(attachments) ? attachments : [],
  });

  return {
    messageId: info.messageId || null,
    accepted: info.accepted || [],
    rejected: info.rejected || [],
    response: info.response || null,
  };
};

const sendMailWithAttachments = async ({ to, subject, html, text, attachments = [] }) => {
  const { fromEmail, fromName } = getGmailConfig();
  const transporter = createTransporter();
  if (!transporter) {
    throw new Error('Gmail config missing. Set env: GMAIL_USER and GMAIL_APP_PASSWORD');
  }

  const toList = Array.isArray(to) ? to : [to];
  const cleanedTo = toList.map((v) => String(v || '').trim()).filter(Boolean);
  if (cleanedTo.length === 0) throw new Error('Missing "to"');
  if (!subject) throw new Error('Missing "subject"');
  if (!html && !text) throw new Error('Missing "html" or "text"');

  const safeAttachments = Array.isArray(attachments) ? attachments : [];
  const mailAttachments = [];

  for (const att of safeAttachments) {
    if (!att || typeof att !== 'object') continue;
    const storagePath = att.storagePath;
    if (!storagePath) continue;

    const filename = att.filename || 'attachment';
    const contentType = att.contentType || undefined;

    const bucket = admin.storage().bucket();
    const file = bucket.file(storagePath);
    const [buf] = await file.download();

    mailAttachments.push({
      filename,
      content: buf,
      contentType,
    });
  }

  const info = await transporter.sendMail({
    from: fromName ? `\"${fromName}\" <${fromEmail}>` : fromEmail,
    to: cleanedTo.join(','),
    subject: String(subject),
    text: text ? String(text) : undefined,
    html: html ? String(html) : undefined,
    attachments: mailAttachments,
  });

  return {
    messageId: info.messageId || null,
    accepted: info.accepted || [],
    rejected: info.rejected || [],
    response: info.response || null,
  };
};

// 1) Welcome email: fully server-side, no app/dev-server required.
const sendWelcomeEmailOnAuthCreateHandler = async (user) => {
  if (!user || !user.email) return null;

  const displayName = user.displayName || 'there';
  const subject = 'Welcome to 876 Nurses';
  const firstName = String(displayName).trim().split(' ')[0] || 'there';
  const text = `Hi ${firstName},\n\nWelcome to 876 Nurses Home Care Services.\n\nQuick Tip: Download the 876 Nurses mobile app and turn on notifications so you never miss an update.\n\nRegards,\n876 Nurses`;

  // Inline logo (CID) for email clients that block external images.
  let logoAttachment = null;
  try {
    const logoPath = path.join(__dirname, 'assets', 'Nurses-logo.png');
    const logoBuffer = fs.readFileSync(logoPath);
    logoAttachment = {
      filename: 'Nurses-logo.png',
      contentType: 'image/png',
      content: logoBuffer,
      cid: 'nurses-logo',
    };
  } catch (_) {
    // optional
  }

  const logoBlock = logoAttachment
    ? '<img src="cid:nurses-logo" alt="876 Nurses Home Care Services" style="display:block;width:86px;height:auto;border:none;outline:none;" />'
    : '<div style="font-size:18px;font-weight:800;color:#14213d;letter-spacing:0.2px;">876 Nurses</div>';

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Welcome to 876 Nurses</title>
      </head>
      <body style="margin:0;padding:0;background-color:#2f62d7;font-family:Arial, sans-serif; color:#1f2a44;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#2f62d7; padding:40px 0;">
          <tr>
            <td align="center" style="padding:0 16px;">
              <table width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;background:#ffffff;border-radius:18px;overflow:hidden;">
                <tr>
                  <td align="center" style="padding:36px 40px 14px 40px;">
                    ${logoBlock}
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding:0 40px 22px 40px;">
                    <h1 style="margin:0;font-size:34px;line-height:1.15;font-weight:800;color:#14213d;">Welcome to 876 Nurses!</h1>
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 40px 10px 40px;">
                    <p style="margin:0 0 14px 0;font-size:16px;line-height:1.65;">Hi ${firstName},</p>
                    <p style="margin:0 0 14px 0;font-size:16px;line-height:1.65;">
                      We’re so glad you found us, and we’re confident this is the start of a long-lasting friendship.
                      Our team is here to support you every step of the way.
                    </p>
                    <p style="margin:0 0 18px 0;font-size:16px;line-height:1.65;">
                      If you’re feeling a little nervous getting started, don’t worry — we’ll be with you throughout your care journey.
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 40px 26px 40px;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#e9f0ff;border-radius:14px;">
                      <tr>
                        <td style="padding:18px 18px 18px 18px;">
                          <div style="font-size:16px;font-weight:800;color:#1f2a44;margin:0 0 6px 0;">Quick Tip</div>
                          <div style="font-size:14px;line-height:1.6;color:#2a3558;">
                            Turn on notifications so you never miss appointment updates and care reminders.
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding:0 40px 40px 40px;">
                    <a href="https://www.876nurses.com/login" style="display:inline-block;background:#2f62d7;color:#ffffff;text-decoration:none;padding:14px 22px;border-radius:12px;font-weight:800;font-size:15px;">Sign in</a>
                  </td>
                </tr>
              </table>
              <table width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;">
                <tr>
                  <td align="center" style="padding:18px 10px 0 10px;color:#d7e3ff;font-size:12px;line-height:1.6;">
                    876 Nurses Home Care Services · Kingston, Jamaica<br />
                    Need help? Email <a href="mailto:support@876nurses.com" style="color:#ffffff;text-decoration:underline;">support@876nurses.com</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;

  await sendMail({ to: user.email, subject, text, html, attachments: [logoAttachment].filter(Boolean) });
  return null;
};

// 2) Generic callable for app-triggered transactional emails (invoice, notifications, etc.)
//    Still server-side: once deployed, it does NOT depend on your laptop.
const sendTransactionalEmailHandler = async (data, context) => {
  if (!context.auth) {
    throw new HttpsError('unauthenticated', 'Must be signed in to send email');
  }

  const { to, subject, html, text } = data || {};

  try {
    const result = await sendMail({ to, subject, html, text });
    return { success: true, ...result };
  } catch (err) {
    throw new HttpsError('internal', err.message || 'Failed to send email');
  }
};

// 3) Optional Firestore mail-queue pattern (works like the Firebase "Trigger Email" extension)
//    App writes docs to /mail and function sends + updates status.
const sendQueuedEmailOnCreateHandler = async (snap) => {
  const doc = snap.data() || {};
  const to = doc.to;
  const subject = doc.subject;
  const html = doc.html;
  const text = doc.text;
  const attachments = doc.attachments;

  const ref = snap.ref;
  await ref.set(
    {
      status: 'processing',
      processedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  try {
    const result = await sendMailWithAttachments({ to, subject, html, text, attachments });
    await ref.set(
      {
        status: 'sent',
        sentAt: admin.firestore.FieldValue.serverTimestamp(),
        result,
      },
      { merge: true }
    );
  } catch (err) {
    await ref.set(
      {
        status: 'error',
        error: err.message || String(err),
        errorAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  }

  return null;
};

// Export functions — Gen 2 (Cloud Run-based, no App Engine required)
exports.sendWelcomeEmailOnAuthCreate = functionsV1
  .region('us-central1')
  .runWith({ secrets: [GMAIL_USER_SECRET, GMAIL_APP_PASSWORD_SECRET] })
  .auth.user()
  .onCreate(async (user) => {
    try {
      await sendWelcomeEmailOnAuthCreateHandler(user);
    } catch (err) {
      console.error('Welcome email failed (non-blocking):', err);
    }
    return null;
  });

exports.sendTransactionalEmail = onCall(
  { secrets: [GMAIL_USER_SECRET, GMAIL_APP_PASSWORD_SECRET] },
  async (request) => {
    return sendTransactionalEmailHandler(request.data, { auth: request.auth });
  }
);

exports.sendQueuedEmailOnCreate = onDocumentCreated(
  { document: 'mail/{mailId}', secrets: [GMAIL_USER_SECRET, GMAIL_APP_PASSWORD_SECRET] },
  async (event) => {
    return sendQueuedEmailOnCreateHandler(event.data);
  }
);

// 4) Coverage notifications: email scheduling admins when backup coverage is requested/accepted.
exports.notifySchedulingAdminsOnShiftCoverageUpdate = onDocumentUpdated(
  { document: 'shiftRequests/{shiftRequestId}', region: 'us-central1', serviceAccount: getRuntimeServiceAccountEmail() },
  async (event) => {
    const beforeData = event.data?.before?.data?.() || {};
    const afterData = event.data?.after?.data?.() || {};
    const shiftRequestId = event.params?.shiftRequestId;

    const { requestedEntries, acceptedEntries, declinedEntries } = detectCoverageChanges(beforeData, afterData);
    if (requestedEntries.length === 0 && acceptedEntries.length === 0 && declinedEntries.length === 0) return null;

    const admins = await getSchedulingAdmins();
    if (!admins.length) return null;

    const recordTypeLabel = 'Shift Request';
    const recordId = shiftRequestId || event.data?.after?.id || 'Unknown';

    const kind =
      requestedEntries.length > 0 && (acceptedEntries.length > 0 || declinedEntries.length > 0)
        ? 'backup_coverage_update'
        : acceptedEntries.length > 0
          ? 'backup_coverage_accepted'
          : declinedEntries.length > 0
            ? 'backup_coverage_declined'
            : 'backup_coverage_requested';

    const subject =
      kind === 'backup_coverage_requested'
        ? `Backup Coverage Requested - ${recordTypeLabel} ${recordId}`
        : kind === 'backup_coverage_accepted'
          ? `Backup Coverage Accepted - ${recordTypeLabel} ${recordId}`
          : kind === 'backup_coverage_declined'
            ? `Backup Coverage Declined - ${recordTypeLabel} ${recordId}`
          : `Backup Coverage Update - ${recordTypeLabel} ${recordId}`;

    await Promise.allSettled(
      admins.map(async (adminUser) => {
        const { html, text } = await buildCoverageEmail({
          adminName: adminUser.name,
          recordTypeLabel,
          recordId,
          recordData: afterData,
          requestedEntries,
          acceptedEntries,
          declinedEntries,
        });

        return queueMailDoc({
          to: adminUser.email,
          subject,
          html,
          text,
          meta: {
            type: kind,
            recordType: 'shiftRequests',
            recordId,
            recipientRole: adminUser.role,
          },
        });
      })
    );

    return null;
  }
);

exports.notifySchedulingAdminsOnAppointmentCoverageUpdate = onDocumentUpdated(
  { document: 'appointments/{appointmentId}', region: 'us-central1', serviceAccount: getRuntimeServiceAccountEmail() },
  async (event) => {
    const beforeData = event.data?.before?.data?.() || {};
    const afterData = event.data?.after?.data?.() || {};
    const appointmentId = event.params?.appointmentId;

    const { requestedEntries, acceptedEntries, declinedEntries } = detectCoverageChanges(beforeData, afterData);
    if (requestedEntries.length === 0 && acceptedEntries.length === 0 && declinedEntries.length === 0) return null;

    const admins = await getSchedulingAdmins();
    if (!admins.length) return null;

    const recordTypeLabel = 'Appointment';
    const recordId = appointmentId || event.data?.after?.id || 'Unknown';

    const kind =
      requestedEntries.length > 0 && (acceptedEntries.length > 0 || declinedEntries.length > 0)
        ? 'backup_coverage_update'
        : acceptedEntries.length > 0
          ? 'backup_coverage_accepted'
          : declinedEntries.length > 0
            ? 'backup_coverage_declined'
            : 'backup_coverage_requested';

    const subject =
      kind === 'backup_coverage_requested'
        ? `Backup Coverage Requested - ${recordTypeLabel} ${recordId}`
        : kind === 'backup_coverage_accepted'
          ? `Backup Coverage Accepted - ${recordTypeLabel} ${recordId}`
          : kind === 'backup_coverage_declined'
            ? `Backup Coverage Declined - ${recordTypeLabel} ${recordId}`
          : `Backup Coverage Update - ${recordTypeLabel} ${recordId}`;

    await Promise.allSettled(
      admins.map(async (adminUser) => {
        const { html, text } = await buildCoverageEmail({
          adminName: adminUser.name,
          recordTypeLabel,
          recordId,
          recordData: afterData,
          requestedEntries,
          acceptedEntries,
          declinedEntries,
        });

        return queueMailDoc({
          to: adminUser.email,
          subject,
          html,
          text,
          meta: {
            type: kind,
            recordType: 'appointments',
            recordId,
            recipientRole: adminUser.role,
          },
        });
      })
    );

    return null;
  }
);
