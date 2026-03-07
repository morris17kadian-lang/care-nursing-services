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

// Brand/contact info (kept non-secret, configurable via env)
const COMPANY_LEGAL_NAME_PARAM = defineString('COMPANY_LEGAL_NAME', {
  default: '876 Nurses Home Care Services Limited',
});
const COMPANY_ADDRESS_PARAM = defineString('COMPANY_ADDRESS', {
  default: 'Kingston, Jamaica',
});
const COMPANY_WEBSITE_PARAM = defineString('COMPANY_WEBSITE', {
  default: 'https://www.876nurses.com',
});
const COMPANY_INSTAGRAM_URL_PARAM = defineString('COMPANY_INSTAGRAM_URL', {
  default: 'https://instagram.com/876_nurses',
});
const COMPANY_FACEBOOK_URL_PARAM = defineString('COMPANY_FACEBOOK_URL', {
  default: 'https://facebook.com',
});
const COMPANY_WHATSAPP_URL_PARAM = defineString('COMPANY_WHATSAPP_URL', {
  default: 'https://wa.me/8766189876',
});

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

const queueMailDoc = async ({ to, subject, html, text, meta, attachments }) => {
  const payload = {
    to: Array.isArray(to) ? to : [to],
    from: '876 Nurses <876nurses@gmail.com>',
    replyTo: '876nurses@gmail.com',
    subject,
    html,
    text,
    attachments: Array.isArray(attachments) ? attachments : [],
    meta: meta && typeof meta === 'object' ? meta : {},
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    status: 'queued',
  };

  const ref = await admin.firestore().collection('mail').add(payload);
  return ref.id;
};

const getSocialIconAttachments = () => {
  const attachments = [];
  
  const igPath = path.join(__dirname, 'assets', 'icon-instagram.png');
  if (fs.existsSync(igPath)) {
    attachments.push({
      filename: 'icon-instagram.png',
      path: igPath,
      contentType: 'image/png',
      cid: 'icon-instagram',
    });
  }

  const fbPath = path.join(__dirname, 'assets', 'icon-facebook.png');
  if (fs.existsSync(fbPath)) {
    attachments.push({
      filename: 'icon-facebook.png',
      path: fbPath,
      contentType: 'image/png',
      cid: 'icon-facebook',
    });
  }

  const waPath = path.join(__dirname, 'assets', 'icon-whatsapp.png');
  if (fs.existsSync(waPath)) {
    attachments.push({
      filename: 'icon-whatsapp.png',
      path: waPath,
      contentType: 'image/png',
      cid: 'icon-whatsapp',
    });
  }

  return attachments;
};

const asArray = (v) => (Array.isArray(v) ? v : []);

const isValidEmail = (email) => {
  const value = String(email || '').trim();
  if (!value) return false;
  // Basic validation; Auth will do stricter validation.
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
};

const extractFirstName = (name) => {
  const value = String(name || '').trim();
  if (!value) return '';
  return value.split(/\s+/)[0] || '';
};

const lookupProfileNameByEmail = async (email) => {
  const normalizedEmail = normalizeString(email);
  if (!normalizedEmail) return '';

  const tryCollection = async (collectionName) => {
    try {
      const snap = await admin
        .firestore()
        .collection(collectionName)
        .where('email', '==', normalizedEmail)
        .limit(1)
        .get();
      if (snap.empty) return '';
      const data = snap.docs[0].data() || {};
      return getDisplayName(data) || '';
    } catch (_) {
      return '';
    }
  };

  // Prefer role-specific profiles.
  const fromAdmins = await tryCollection('admins');
  if (fromAdmins) return fromAdmins;

  const fromNurses = await tryCollection('nurses');
  if (fromNurses) return fromNurses;

  const fromUsers = await tryCollection('users');
  if (fromUsers) return fromUsers;

  return '';
};

const buildPasswordResetEmail = ({ firstName, resetLink }) => {
  const safeName = String(firstName || '').trim() || 'there';
  const safeLink = String(resetLink || '').trim();

  const companyLegalName =
    process.env.COMPANY_LEGAL_NAME || COMPANY_LEGAL_NAME_PARAM.value() || '876 Nurses Home Care Services Limited';
  const companyAddress = process.env.COMPANY_ADDRESS || COMPANY_ADDRESS_PARAM.value() || 'Kingston, Jamaica';
  const companyWebsite = process.env.COMPANY_WEBSITE || COMPANY_WEBSITE_PARAM.value() || 'https://www.876nurses.com';
  const instagramUrl =
    process.env.COMPANY_INSTAGRAM_URL || COMPANY_INSTAGRAM_URL_PARAM.value() || 'https://instagram.com/876_nurses';
  const facebookUrl = process.env.COMPANY_FACEBOOK_URL || COMPANY_FACEBOOK_URL_PARAM.value() || 'https://facebook.com';
  const whatsAppUrl =
    process.env.COMPANY_WHATSAPP_URL || COMPANY_WHATSAPP_URL_PARAM.value() || 'https://wa.me/8766189876';

  // Use publicly hosted icon URLs
  const instagramIconUrl = 'https://storage.googleapis.com/nurses-afb7e.firebasestorage.app/email-assets/icon-instagram.png';
  const facebookIconUrl = 'https://storage.googleapis.com/nurses-afb7e.firebasestorage.app/email-assets/icon-facebook.png';
  const whatsAppIconUrl = 'https://storage.googleapis.com/nurses-afb7e.firebasestorage.app/email-assets/icon-whatsapp.png';

  const subject = 'Password Reset Request - 876 Nurses';
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #1f2a44; margin:0; padding:0; background:#ffffff; }
        .container { max-width: 600px; margin: 0 auto; padding: 32px 20px; }
        a { text-decoration:underline; font-weight:700; }
      </style>
    </head>
    <body>
      <div class="container">
        <p style="margin:0 0 12px 0;">Hi ${safeName},</p>
        <p style="margin:0 0 12px 0;">We received a request to reset your password for your 876 Nurses account.</p>
        <p style="margin:0 0 12px 0;"><a href="${safeLink}">Reset your password</a></p>
        <p style="margin:0 0 12px 0;">If you didn't request this reset, please ignore this email.</p>

        <!-- Footer with neutral styling -->
        <div style="margin-top:26px;">
          <div style="text-align:center;color:#9ca3af;font-size:11px;line-height:1.6;padding:10px 10px 0 10px;">
            <span style="white-space:nowrap;">This email was sent by: ${companyLegalName}</span><br />
            ${companyAddress}<br />
            <a href="${companyWebsite}" style="color:#9ca3af;text-decoration:underline;font-weight:600;">${companyWebsite
              .replace(/^https?:\/\//, '')
              .replace(/\/$/, '')}</a>
          </div>

          <div style="border-top:1px solid #e5e7eb;margin:18px 0 16px 0;"></div>

          <table role="presentation" align="center" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">
            <tr>
              <td align="center" style="padding:0 10px;">
                <a href="${instagramUrl}" target="_blank" rel="noopener noreferrer"
                   style="display:inline-block;width:28px;height:28px;text-decoration:none;">
                  <img src="${instagramIconUrl}" width="28" height="28" alt="Instagram"
                       style="display:block;width:28px;height:28px;border:0;outline:none;text-decoration:none;border-radius:14px;" />
                </a>
              </td>
              <td align="center" style="padding:0 10px;">
                <a href="${facebookUrl}" target="_blank" rel="noopener noreferrer"
                   style="display:inline-block;width:28px;height:28px;text-decoration:none;">
                  <img src="${facebookIconUrl}" width="28" height="28" alt="Facebook"
                       style="display:block;width:28px;height:28px;border:0;outline:none;text-decoration:none;border-radius:14px;" />
                </a>
              </td>
              <td align="center" style="padding:0 10px;">
                <a href="${whatsAppUrl}" target="_blank" rel="noopener noreferrer"
                   style="display:inline-block;width:28px;height:28px;text-decoration:none;">
                  <img src="${whatsAppIconUrl}" width="28" height="28" alt="WhatsApp"
                       style="display:block;width:28px;height:28px;border:0;outline:none;text-decoration:none;border-radius:14px;" />
                </a>
              </td>
            </tr>
          </table>
        </div>
      </div>
    </body>
    </html>
  `;

  // Do not include the raw Firebase reset URL in the plain-text body to avoid
  // exposing the Firebase project-id link in email content.
  const text = `Password Reset Request\n\nHi ${safeName},\n\nWe received a request to reset your password for your 876 Nurses account.\n\nTo reset your password, use the reset link in this email.\n\nIf you didn't request this reset, please ignore this email.\n\nThis email was sent by: ${companyLegalName}\n${companyAddress}\nWebsite: ${companyWebsite}\nInstagram: ${instagramUrl}\nWhatsApp: ${whatsAppUrl}`;

  return { subject, html, text };
};

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

  // Get company details for footer
  const companyLegalName =
    process.env.COMPANY_LEGAL_NAME ||
    COMPANY_LEGAL_NAME_PARAM.value() ||
    '876 Nurses Home Care Services Limited';
  const companyAddress =
    process.env.COMPANY_ADDRESS ||
    COMPANY_ADDRESS_PARAM.value() ||
    '60 Knutsford Blvd, Panjam Building, 9th Floor - Regus, Kingston 5, Jamaica, West Indies';
  const companyWebsite =
    process.env.COMPANY_WEBSITE || COMPANY_WEBSITE_PARAM.value() || 'https://www.876nurses.com';
  const instagramUrl =
    process.env.COMPANY_INSTAGRAM_URL || COMPANY_INSTAGRAM_URL_PARAM.value() || 'https://instagram.com/876_nurses';
  const facebookUrl =
    process.env.COMPANY_FACEBOOK_URL || COMPANY_FACEBOOK_URL_PARAM.value() || 'https://facebook.com/876nurses';
  const whatsAppUrl =
    process.env.COMPANY_WHATSAPP_URL || COMPANY_WHATSAPP_URL_PARAM.value() || 'https://wa.me/8766189876';

  // Use publicly hosted icon URLs
  const instagramIconUrl = 'https://storage.googleapis.com/nurses-afb7e.firebasestorage.app/email-assets/icon-instagram.png';
  const facebookIconUrl = 'https://storage.googleapis.com/nurses-afb7e.firebasestorage.app/email-assets/icon-facebook.png';
  const whatsAppIconUrl = 'https://storage.googleapis.com/nurses-afb7e.firebasestorage.app/email-assets/icon-whatsapp.png';

  linesHtml.push(
    '<div style="margin-top:26px;">' +
      '<div style="text-align:center;color:#9ca3af;font-size:11px;line-height:1.6;padding:10px 10px 0 10px;">' +
        '<span style="white-space:nowrap;">This email was sent by: ' + companyLegalName + '</span><br />' +
        companyAddress + '<br />' +
        '<a href="' + companyWebsite + '" style="color:#9ca3af;text-decoration:underline;font-weight:600;">' +
          companyWebsite.replace(/^https?:\/\//, '').replace(/\/$/, '') +
        '</a>' +
      '</div>' +
      '<div style="border-top:1px solid #e5e7eb;margin:18px 0 16px 0;"></div>' +
      '<table role="presentation" align="center" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">' +
        '<tr>' +
          '<td align="center" style="padding:0 10px;">' +
            '<a href="' + instagramUrl + '" target="_blank" rel="noopener noreferrer" style="display:inline-block;width:28px;height:28px;text-decoration:none;">' +
              '<img src="' + instagramIconUrl + '" width="28" height="28" alt="Instagram" style="display:block;width:28px;height:28px;border:0;outline:none;text-decoration:none;border-radius:14px;" />' +
            '</a>' +
          '</td>' +
          '<td align="center" style="padding:0 10px;">' +
            '<a href="' + facebookUrl + '" target="_blank" rel="noopener noreferrer" style="display:inline-block;width:28px;height:28px;text-decoration:none;">' +
              '<img src="' + facebookIconUrl + '" width="28" height="28" alt="Facebook" style="display:block;width:28px;height:28px;border:0;outline:none;text-decoration:none;border-radius:14px;" />' +
            '</a>' +
          '</td>' +
          '<td align="center" style="padding:0 10px;">' +
            '<a href="' + whatsAppUrl + '" target="_blank" rel="noopener noreferrer" style="display:inline-block;width:28px;height:28px;text-decoration:none;">' +
              '<img src="' + whatsAppIconUrl + '" width="28" height="28" alt="WhatsApp" style="display:block;width:28px;height:28px;border:0;outline:none;text-decoration:none;border-radius:14px;" />' +
            '</a>' +
          '</td>' +
        '</tr>' +
      '</table>' +
    '</div>'
  );
  linesText.push('This email was sent by: ' + companyLegalName);
  linesText.push(companyAddress);
  linesText.push('Website: ' + companyWebsite);

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

const sendMail = async ({
  to,
  subject,
  html,
  text,
  attachments = [],
  fromEmailOverride,
  fromNameOverride,
}) => {
  const { fromEmail: defaultFromEmail, fromName: defaultFromName } = getGmailConfig();
  const transporter = createTransporter();
  if (!transporter) {
    throw new Error('Gmail config missing. Set env: GMAIL_USER and GMAIL_APP_PASSWORD');
  }

  const fromEmail = String(fromEmailOverride || '').trim() || defaultFromEmail;
  const fromName = String(fromNameOverride || '').trim() || defaultFromName;

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

const sendMailWithAttachments = async ({
  to,
  subject,
  html,
  text,
  attachments = [],
  fromEmailOverride,
  fromNameOverride,
}) => {
  const { fromEmail: defaultFromEmail, fromName: defaultFromName } = getGmailConfig();
  const transporter = createTransporter();
  if (!transporter) {
    throw new Error('Gmail config missing. Set env: GMAIL_USER and GMAIL_APP_PASSWORD');
  }

  const fromEmail = String(fromEmailOverride || '').trim() || defaultFromEmail;
  const fromName = String(fromNameOverride || '').trim() || defaultFromName;

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

  const companyLegalName =
    process.env.COMPANY_LEGAL_NAME || COMPANY_LEGAL_NAME_PARAM.value() || '876 Nurses Home Care Services Limited';
  const companyAddress = process.env.COMPANY_ADDRESS || COMPANY_ADDRESS_PARAM.value() || 'Kingston, Jamaica';
  const companyWebsite = process.env.COMPANY_WEBSITE || COMPANY_WEBSITE_PARAM.value() || 'https://www.876nurses.com';
  const instagramUrl =
    process.env.COMPANY_INSTAGRAM_URL || COMPANY_INSTAGRAM_URL_PARAM.value() || 'https://instagram.com/876_nurses';
  const facebookUrl = process.env.COMPANY_FACEBOOK_URL || COMPANY_FACEBOOK_URL_PARAM.value() || 'https://facebook.com/876nurses';
  const whatsAppUrl =
    process.env.COMPANY_WHATSAPP_URL || COMPANY_WHATSAPP_URL_PARAM.value() || 'https://wa.me/8766189876';

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
                  <td align="center" style="padding:18px 16px 18px 16px;">
                    <div style="text-align:center;color:#d7e3ff;font-size:12px;line-height:1.6;">
                      This email was sent by: ${companyLegalName}<br />
                      ${companyAddress}<br />
                      <a href="${companyWebsite}" style="color:#d7e3ff;text-decoration:underline;font-weight:600;">${companyWebsite
                        .replace(/^https?:\/\//, '')
                        .replace(/\/$/, '')}</a>
                    </div>

                    <div style="border-top:1px solid rgba(255,255,255,0.25);margin:16px 0 14px 0;"></div>

                    <table role="presentation" align="center" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">
                      <tr>
                        <td align="center" style="padding:0 10px;">
                          <a href="${instagramUrl}" target="_blank" rel="noopener noreferrer"
                             style="display:inline-block;width:28px;height:28px;text-decoration:none;">
                            <img src="cid:icon-instagram" width="28" height="28" alt="Instagram"
                                 style="display:block;width:28px;height:28px;border:0;outline:none;text-decoration:none;border-radius:14px;" />
                          </a>
                        </td>
                        <td align="center" style="padding:0 10px;">
                          <a href="${facebookUrl}" target="_blank" rel="noopener noreferrer"
                             style="display:inline-block;width:28px;height:28px;text-decoration:none;">
                            <img src="cid:icon-facebook" width="28" height="28" alt="Facebook"
                                 style="display:block;width:28px;height:28px;border:0;outline:none;text-decoration:none;border-radius:14px;" />
                          </a>
                        </td>
                        <td align="center" style="padding:0 10px;">
                          <a href="${whatsAppUrl}" target="_blank" rel="noopener noreferrer"
                             style="display:inline-block;width:28px;height:28px;text-decoration:none;">
                            <img src="cid:icon-whatsapp" width="28" height="28" alt="WhatsApp"
                                 style="display:block;width:28px;height:28px;border:0;outline:none;text-decoration:none;border-radius:14px;" />
                          </a>
                        </td>
                      </tr>
                    </table>

                    <div style="margin-top:14px;color:#d7e3ff;font-size:12px;line-height:1.6;text-align:center;">
                      Need help? Email <a href="mailto:support@876nurses.com" style="color:#ffffff;text-decoration:underline;">support@876nurses.com</a>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;

  const attachments = [logoAttachment].filter(Boolean);

  try {
    const igPath = path.join(__dirname, 'assets', 'icon-instagram.png');
    const igBuf = fs.readFileSync(igPath);
    attachments.push({
      filename: 'icon-instagram.png',
      contentType: 'image/png',
      content: igBuf,
      cid: 'icon-instagram',
    });
  } catch (_) {
    // optional
  }

  try {
    const fbPath = path.join(__dirname, 'assets', 'icon-facebook.png');
    const fbBuf = fs.readFileSync(fbPath);
    attachments.push({
      filename: 'icon-facebook.png',
      contentType: 'image/png',
      content: fbBuf,
      cid: 'icon-facebook',
    });
  } catch (_) {
    // optional
  }

  try {
    const waPath = path.join(__dirname, 'assets', 'icon-whatsapp.png');
    const waBuf = fs.readFileSync(waPath);
    attachments.push({
      filename: 'icon-whatsapp.png',
      contentType: 'image/png',
      content: waBuf,
      cid: 'icon-whatsapp',
    });
  } catch (_) {
    // optional
  }

  await sendMail({ to: user.email, subject, text, html, attachments });
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
    return null;
  });

exports.sendTransactionalEmail = onCall(
  { 
    region: 'us-central1',
    secrets: [GMAIL_USER_SECRET, GMAIL_APP_PASSWORD_SECRET] 
  },
  async (request) => {
    return sendTransactionalEmailHandler(request.data, { auth: request.auth });
  }
);

// 2b) Custom password reset email
// Firebase Auth built-in templates cannot send from a custom mailbox like 876nurses.notify.
// This callable generates a password reset link server-side and emails it using the same Gmail transport.
exports.requestPasswordResetEmail = onCall(
  {
    region: 'us-central1',
    serviceAccount: getRuntimeServiceAccountEmail(),
    secrets: [GMAIL_USER_SECRET, GMAIL_APP_PASSWORD_SECRET],
  },
  async (request) => {
    const email = String(request?.data?.email || '').trim().toLowerCase();

    if (!isValidEmail(email)) {
      throw new HttpsError('invalid-argument', 'A valid email address is required');
    }

    // Avoid user enumeration: always return success even if the user does not exist.
    try {
      let displayName = '';
      try {
        const userRecord = await admin.auth().getUserByEmail(email);
        displayName = userRecord?.displayName || '';
      } catch (_) {
        // ignore
      }

      if (!displayName) {
        displayName = await lookupProfileNameByEmail(email);
      }

      const firstName = extractFirstName(displayName) || 'there';

      // NOTE: Link domain is controlled by Firebase Auth settings / custom domains.
      // We keep the URL hidden behind link text in HTML to avoid showing project IDs in the email body.
      const resetLink = await admin.auth().generatePasswordResetLink(email);

      const { subject, html, text } = buildPasswordResetEmail({ firstName, resetLink });

      const fromEmailOverride = process.env.PASSWORD_RESET_FROM_EMAIL || '';
      const fromNameOverride = process.env.PASSWORD_RESET_FROM_NAME || '';

      await sendMail({
        to: email,
        subject,
        html,
        text,
        fromEmailOverride,
        fromNameOverride,
      });

      console.log('Custom password reset email sent:', { to: email, subject });
    } catch (err) {
      console.error('Custom password reset email failed (non-blocking):', err);
      // Still return success to avoid leaking details.
    }

    return { success: true };
  }
);

exports.sendQueuedEmailOnCreate = onDocumentCreated(
  {
    document: 'mail/{mailId}',
    region: 'us-central1',
    serviceAccount: getRuntimeServiceAccountEmail(),
    secrets: [GMAIL_USER_SECRET, GMAIL_APP_PASSWORD_SECRET],
  },
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
