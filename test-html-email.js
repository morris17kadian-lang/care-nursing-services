const admin = require('firebase-admin');
const path = require('path');

const serviceAccountPath = path.join(__dirname, 'firebase-service-key.json');
const serviceAccount = require(serviceAccountPath);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

async function testHTMLEmail() {
  const db = admin.firestore();
  const payload = {
    to: ['morris17kadian@gmail.com'],
    subject: 'HTML Test Email - 876 Nurses',
    text: 'This is plain text fallback. If you see only this, HTML is not working.',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8" />
          <title>HTML Test</title>
        </head>
        <body style="margin:0;padding:0;background-color:#2f62d7;font-family:Arial,sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#2f62d7;padding:40px 0;">
            <tr>
              <td align="center" style="padding:0 16px;">
                <table width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;background:#ffffff;border-radius:18px;overflow:hidden;">
                  <tr>
                    <td align="center" style="padding:36px 40px;">
                      <h1 style="margin:0;font-size:34px;font-weight:800;color:#14213d;">HTML Email Test</h1>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:0 40px 30px 40px;">
                      <p style="margin:0 0 14px 0;font-size:16px;line-height:1.65;color:#1f2a44;">
                        If you see this message with:
                      </p>
                      <ul style="color:#1f2a44;font-size:16px;line-height:1.65;">
                        <li>Blue background</li>
                        <li>White rounded card</li>
                        <li>Styled heading</li>
                        <li>Proper formatting</li>
                      </ul>
                      <p style="margin:14px 0 0 0;font-size:16px;line-height:1.65;color:#1f2a44;">
                        Then HTML emails ARE working! 🎉
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `,
    attachments: [],
    meta: { source: 'html-test-script' },
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    status: 'queued',
  };

  const ref = await db.collection('mail').add(payload);
  console.log('✅ HTML test email queued in Firestore');
  console.log('📧 Document ID:', ref.id);
  console.log('📬 Sent to: morris17kadian@gmail.com');
  console.log('\n⏳ Check your email in a few seconds to see if HTML renders properly.');
  console.log('   If you only see plain text, the deployed function doesn\'t support HTML.');
}

testHTMLEmail()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Error:', err);
    process.exit(1);
  });
