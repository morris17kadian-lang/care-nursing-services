const admin = require('firebase-admin');
const os = require('os');
const path = require('path');
const fs = require('fs');
const puppeteer = require('puppeteer');

// Initialize Firebase Admin
if (!admin.apps.length) {
  const serviceAccount = require('./firebase-service-key.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: 'nurses-afb7e.firebasestorage.app',
  });
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function nl2br(value) {
  return escapeHtml(value).replace(/\r\n|\r|\n/g, '<br />');
}

function fileSafe(value) {
  return String(value || '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9._-]/g, '')
    .slice(0, 80);
}

function buildMedicalReportPdfHtml({
  companyLegalName,
  companyAddress,
  companyWebsite,
  patientName,
  patientDob,
  reportDate,
  patientEmail,
  patientPhone,
  patientAddress,
  medicalHistory,
  nurseNotes,
  nurseSignature,
  recommendations,
  logoDataUri,
}) {
  return `<!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Medical Reports of Patients</title>
        <style>
          * { box-sizing: border-box; }
          body { font-family: Arial, sans-serif; color: #1f2a44; background: #ffffff; margin: 0; padding: 0; }
          .page { padding: 28px 26px; max-width: 650px; margin: 0 auto; }
          .header { text-align: center; margin-bottom: 12px; }
          .logo { width: 90px; height: 70px; margin: 0 auto 6px; display: block; }
          .title { font-size: 18px; font-weight: 700; color: #2f62d7; margin: 0; text-align: center; }
          .bar { height: 2px; background: #2f62d7; margin: 10px 0 18px 0; }
          .section-title { font-size: 14px; font-weight: 700; color: #1f2a44; margin-top: 10px; margin-bottom: 8px; }
          .info-row { display: flex; margin-bottom: 6px; font-size: 13px; }
          .info-label { width: 140px; font-weight: 600; color: #1f2a44; }
          .info-value { flex: 1; color: #1f2a44; }
          .notes-box { border: 1px solid #d1d5db; border-radius: 8px; padding: 12px; background: #f3f4f6; min-height: 80px; margin-bottom: 14px; }
          .notes-text { font-size: 13px; line-height: 1.4; color: #1f2a44; }
          .spacer { height: 10px; }
          .footer { margin-top: 18px; font-size: 11px; color: #6b7280; text-align: center; line-height: 1.5; border-top: 1px solid #e5e7eb; padding-top: 14px; }
        </style>
      </head>
      <body>
        <div class="page">
          <div class="header">
            ${logoDataUri ? `<img class="logo" src="${logoDataUri}" alt="876 Nurses" />` : ''}
            <h1 class="title">Medical Reports of Patients</h1>
          </div>
          <div class="bar"></div>

          <div class="section-title">Patient Information:</div>
          <div class="info-row">
            <span class="info-label">Name:</span>
            <span class="info-value">${escapeHtml(patientName)}</span>
          </div>
          ${patientDob ? `<div class="info-row"><span class="info-label">Date of Birth:</span><span class="info-value">${escapeHtml(patientDob)}</span></div>` : ''}
          <div class="info-row">
            <span class="info-label">Date of Report:</span>
            <span class="info-value">${escapeHtml(reportDate)}</span>
          </div>
          ${patientEmail ? `<div class="info-row"><span class="info-label">Email:</span><span class="info-value">${escapeHtml(patientEmail)}</span></div>` : ''}
          ${patientPhone ? `<div class="info-row"><span class="info-label">Phone:</span><span class="info-value">${escapeHtml(patientPhone)}</span></div>` : ''}
          ${patientAddress ? `<div class="info-row"><span class="info-label">Address:</span><span class="info-value">${escapeHtml(patientAddress)}</span></div>` : ''}

          <div class="spacer"></div>
          <div class="section-title">Medical History:</div>
          <div class="notes-box">
            <div class="notes-text">${nl2br(medicalHistory)}</div>
          </div>

          <div class="section-title">Nurse's Notes:</div>
          <div class="notes-box">
            <div class="notes-text">${nl2br(nurseNotes)}</div>
          </div>

          <div class="spacer"></div>
          <div class="section-title">Recommendations:</div>
          <div class="notes-box">
            <div class="notes-text">${nl2br(recommendations)}</div>
          </div>

          <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e5e7eb;">
            <div style="font-size: 13px; font-weight: 600; color: #1f2a44; margin-bottom: 4px;">Prepared by:</div>
            <div style="font-size: 13px; color: #1f2a44;">${escapeHtml(nurseSignature)}</div>
          </div>
        </div>
      </body>
    </html>`;
}

async function renderPdfFromHtml({ html, outPath }) {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    await page.emulateMediaType('screen');
    await page.pdf({
      path: outPath,
      format: 'Letter',
      printBackground: true,
    });
  } finally {
    await browser.close();
  }
}

async function sendTestMedicalReportAttachmentEmail() {
  const toEmail = process.argv[2] || 'morris.kadian@yahoo.com';
  const firstName = process.argv[3] || 'Morris';

  const subject = 'Medical Report - Test Attachment (876 Nurses)';

  // Company details (match neutral footer styling used elsewhere)
  const companyLegalName = '876 Nurses Home Care Services Limited';
  const companyAddress = '60 Knutsford Blvd, Panjam Building, 9th Floor - Regus, Kingston 5, Jamaica, West Indies';
  const companyWebsite = 'https://www.876nurses.com';
  const instagramUrl = 'https://instagram.com/876_nurses';
  const facebookUrl = 'https://facebook.com/876nurses';
  const whatsAppUrl = 'https://wa.me/8766189876';

  const instagramIconUrl = 'https://storage.googleapis.com/nurses-afb7e.firebasestorage.app/email-assets/icon-instagram.png';
  const facebookIconUrl = 'https://storage.googleapis.com/nurses-afb7e.firebasestorage.app/email-assets/icon-facebook.png';
  const whatsAppIconUrl = 'https://storage.googleapis.com/nurses-afb7e.firebasestorage.app/email-assets/icon-whatsapp.png';

  // Short email body (no medical notes embedded)
  const html = `<!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Medical Report Ready</title>
      </head>
      <body style="margin:0;padding:0;background-color:#ffffff;font-family:Arial,sans-serif;color:#111827;">
        <div style="max-width:600px;margin:0 auto;padding:28px 20px;line-height:1.7;">
          <p style="margin:0 0 14px 0;">Hi ${escapeHtml(firstName)},</p>
          <p style="margin:0 0 10px 0;">Your medical report is ready for viewing.</p>
          <p style="margin:0 0 14px 0;">Please see the attached PDF.</p>

          <div style="margin-top:26px;">
            <div style="text-align:center;color:#9ca3af;font-size:11px;line-height:1.6;padding:10px 10px 0 10px;">
              <span style="white-space:nowrap;">This email was sent by: ${escapeHtml(companyLegalName)}</span><br />
              ${escapeHtml(companyAddress)}<br />
              <a href="${escapeHtml(companyWebsite)}" style="color:#9ca3af;text-decoration:underline;font-weight:600;">${escapeHtml(
                companyWebsite.replace(/^https?:\/\//, '').replace(/\/$/, '')
              )}</a>
            </div>

            <div style="border-top:1px solid #e5e7eb;margin:18px 0 16px 0;"></div>

            <table role="presentation" align="center" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">
              <tr>
                <td align="center" style="padding:0 10px;">
                  <a href="${escapeHtml(instagramUrl)}" target="_blank" rel="noopener noreferrer"
                    style="display:inline-block;width:28px;height:28px;text-decoration:none;">
                    <img src="${escapeHtml(instagramIconUrl)}" width="28" height="28" alt="Instagram"
                      style="display:block;width:28px;height:28px;border:0;outline:none;text-decoration:none;border-radius:14px;" />
                  </a>
                </td>
                <td align="center" style="padding:0 10px;">
                  <a href="${escapeHtml(facebookUrl)}" target="_blank" rel="noopener noreferrer"
                    style="display:inline-block;width:28px;height:28px;text-decoration:none;">
                    <img src="${escapeHtml(facebookIconUrl)}" width="28" height="28" alt="Facebook"
                      style="display:block;width:28px;height:28px;border:0;outline:none;text-decoration:none;border-radius:14px;" />
                  </a>
                </td>
                <td align="center" style="padding:0 10px;">
                  <a href="${escapeHtml(whatsAppUrl)}" target="_blank" rel="noopener noreferrer"
                    style="display:inline-block;width:28px;height:28px;text-decoration:none;">
                    <img src="${escapeHtml(whatsAppIconUrl)}" width="28" height="28" alt="WhatsApp"
                      style="display:block;width:28px;height:28px;border:0;outline:none;text-decoration:none;border-radius:14px;" />
                  </a>
                </td>
              </tr>
            </table>
          </div>
        </div>
      </body>
    </html>`;

  const text = [
    `Hi ${firstName},`,
    '',
    'Your medical report is ready for viewing.',
    'Please see the attached PDF.',
    '',
    `This email was sent by: ${companyLegalName}`,
    companyAddress,
    `Website: ${companyWebsite}`,
    `Instagram: ${instagramUrl}`,
    `WhatsApp: ${whatsAppUrl}`,
  ].join('\n');

  // Build a PDF that matches the in-app medical report preview layout.
  // CLI args (optional):
  //   node test-medical-report-attachment-email.js toEmail firstName patientName reportDate patientDob
  const patientName = process.argv[4] || 'Test Patient';
  const reportDate = process.argv[5] || new Date().toISOString().slice(0, 10);
  const patientDob = process.argv[6] || '1990-01-01';
  const patientEmail = process.argv[7] || '';
  const patientPhone = process.argv[8] || '';
  const patientAddress = process.argv[9] || '';
  const medicalHistory = process.argv[10] || 'Hypertension\nDiabetes\nNo known drug allergies.';
  const nurseNotes = process.argv[11] || 'Patient stable.\nVitals within normal limits.\nContinue prescribed medication.';
  const nurseSignature = process.argv[12] || 'Nurse Jane Smith, RN';
  const recommendations = process.argv[13] || 'Continue current medication regimen.\nSchedule follow-up appointment in 2 weeks.\nMonitor blood pressure daily.';

  // Load the logo from the assets directory and convert to base64 data URI
  const getLogoDataUri = () => {
    try {
      const logoPath = path.join(__dirname, 'assets', 'Images', 'Nurses-logo.png');
      const logoBuffer = fs.readFileSync(logoPath);
      const base64Logo = logoBuffer.toString('base64');
      return `data:image/png;base64,${base64Logo}`;
    } catch (error) {
      console.warn('Unable to load logo:', error?.message || error);
      return null;
    }
  };

  const logoDataUri = getLogoDataUri();

  const reportPdfHtml = buildMedicalReportPdfHtml({
    companyLegalName,
    companyAddress,
    companyWebsite,
    patientName,
    patientDob,
    reportDate,
    patientEmail,
    patientPhone,
    patientAddress,
    medicalHistory,
    nurseNotes,
    nurseSignature,
    recommendations,
    logoDataUri,
  });

  const tempPdfPath = path.join(os.tmpdir(), `medical-report-test-${Date.now()}.pdf`);
  // Ensure temp directory exists (mostly defensive)
  try {
    fs.mkdirSync(path.dirname(tempPdfPath), { recursive: true });
  } catch (_) {
    // ignore
  }

  await renderPdfFromHtml({ html: reportPdfHtml, outPath: tempPdfPath });

  // Upload to Storage
  const bucket = admin.storage().bucket();
  const baseFileName = `Medical-Report-${fileSafe(patientName) || 'Patient'}-${fileSafe(reportDate) || 'Report'}.pdf`;
  const storagePath = `medical-reports/test/${Date.now()}-${baseFileName}`;

  await bucket.upload(tempPdfPath, {
    destination: storagePath,
    metadata: {
      contentType: 'application/pdf',
    },
  });

  // Queue Firestore /mail document
  const mailDoc = {
    to: Array.isArray(toEmail) ? toEmail : [toEmail],
    subject,
    html,
    text,
    attachments: [
      {
        storagePath,
        filename: baseFileName,
        contentType: 'application/pdf',
      },
    ],
    meta: {
      type: 'medical_report_test',
      reportStoragePath: storagePath,
      testTimestamp: new Date().toISOString(),
    },
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    status: 'queued',
  };

  const docRef = await admin.firestore().collection('mail').add(mailDoc);

  console.log(`✅ Medical report test email queued: ${docRef.id}`);
  console.log(`📧 To: ${toEmail}`);
  console.log(`📎 Attachment storagePath: ${storagePath}`);
}

sendTestMedicalReportAttachmentEmail().catch((err) => {
  console.error('❌ Failed to queue medical report attachment email:', err);
  process.exitCode = 1;
});
