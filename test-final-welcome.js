const admin = require('firebase-admin');
const path = require('path');

const serviceAccountPath = path.join(__dirname, 'firebase-service-key.json');
const serviceAccount = require(serviceAccountPath);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

async function testFinalWelcomeEmail() {
  const db = admin.firestore();
  
  const firstName = 'Kadian';
  const logoUrl = 'https://storage.googleapis.com/nurses-afb7e.firebasestorage.app/email-assets/876nurses-logo.png';
  const logoBlock = `<img src="${logoUrl}" alt="876 Nurses" style="display:block;width:80px;height:auto;border:none;outline:none;" />`;
  
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
                  <td style="padding:0 40px 30px 40px;">
                    <p style="margin:0 0 14px 0;font-size:16px;line-height:1.65;">Hi ${firstName} 👋</p>
                    <p style="margin:0;font-size:16px;line-height:1.65;">
                      Your trusted partner for compassionate, professional home healthcare. Whether you need skilled nursing, personal care, or companionship, our dedicated team is ready to provide quality care in the comfort of your home.
                    </p>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding:0 40px 40px 40px;">
                    <a href="876nurses://login" style="display:inline-block;background:#2f62d7;color:#ffffff;text-decoration:none;padding:14px 22px;border-radius:12px;font-weight:800;font-size:15px;">Open App</a>
                  </td>
                </tr>
              </table>
              <table width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;">
                <tr>
                  <td align="center" style="padding:18px 10px 0 10px;color:#d7e3ff;font-size:12px;line-height:1.6;">
                    876 Nurses Home Care Services · Kingston, Jamaica<br />
                    Need help? Email <a href="mailto:876nurses@gmail.com" style="color:#ffffff;text-decoration:underline;">876nurses@gmail.com</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;

  const payload = {
    to: ['morris17kadian@gmail.com'],
    subject: 'Welcome to 876 Nurses - Final Design',
    text: `Hi ${firstName},\n\nWelcome to 876 Nurses Home Care Services. Your trusted partner for compassionate, professional home healthcare.\n\nRegards,\n876 Nurses`,
    html,
    attachments: [],
    meta: { source: 'final-welcome-test' },
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    status: 'queued',
  };

  const ref = await db.collection('mail').add(payload);
  console.log('✅ Final welcome email queued!');
  console.log('📧 Document ID:', ref.id);
  console.log('\n📬 Check your email for:');
  console.log('   ✓ Smaller logo (80px)');
  console.log('   ✓ Waving emoji 👋 in greeting');
  console.log('   ✓ Nursing-focused welcome message');
  console.log('   ✓ "Open App" button (deep link)');
  console.log('   ✓ Support email: 876nurses@gmail.com');
}

testFinalWelcomeEmail()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Error:', err);
    process.exit(1);
  });
