const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

// Initialize Firebase Admin
if (!admin.apps.length) {
  const serviceAccount = require('./firebase-service-key.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: 'nurses-afb7e.firebasestorage.app'
  });
}

// Build password reset email HTML (matching functions/index.js)
function buildPasswordResetEmail({ firstName, resetLink }) {
  const safeName = String(firstName || 'there').trim();
  const safeLink = String(resetLink || '#').trim();

  // Company details
  const companyLegalName = '876 Nurses Home Care Services Limited';
  const companyAddress = '60 Knutsford Blvd, Panjam Building, 9th Floor - Regus, Kingston 5, Jamaica, West Indies';
  const companyWebsite = 'https://www.876nurses.com';
  const instagramUrl = 'https://instagram.com/876_nurses';
  const facebookUrl = 'https://facebook.com/876nurses';
  const whatsAppUrl = 'https://wa.me/8766189876';

  // Use publicly hosted icon URLs instead of CID attachments
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

  const text = `Password Reset Request\n\nHi ${safeName},\n\nWe received a request to reset your password for your 876 Nurses account.\n\nTo reset your password, use the reset link in this email.\n\nIf you didn't request this reset, please ignore this email.\n\nThis email was sent by: ${companyLegalName}\n${companyAddress}\nWebsite: ${companyWebsite}\nInstagram: ${instagramUrl}\nWhatsApp: ${whatsAppUrl}`;

  return { subject, html, text };
}

async function sendTestPasswordResetEmail() {
  const toEmail = process.argv[2] || 'morris.kadian@yahoo.com';
  const firstName = 'Test User';
  const resetLink = 'https://example.com/reset-password?token=test123';

  const { subject, html, text } = buildPasswordResetEmail({ firstName, resetLink });

  // Queue to Firestore /mail collection (using direct URLs for icons, no attachments needed)
  const mailDoc = {
    to: toEmail,
    from: '876 Nurses <876nurses@gmail.com>',
    replyTo: '876nurses@gmail.com',
    subject,
    html,
    text,
    meta: {
      type: 'password_reset_test',
      testTimestamp: new Date().toISOString(),
    },
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    status: 'queued',
  };

  const docRef = await admin.firestore().collection('mail').add(mailDoc);
  
  console.log(`✅ Password reset test email queued: ${docRef.id}`);
  console.log(`📧 To: ${toEmail}`);
}

sendTestPasswordResetEmail().catch(console.error);
