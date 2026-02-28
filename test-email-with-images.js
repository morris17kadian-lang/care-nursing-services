const admin = require('firebase-admin');
const path = require('path');

const serviceAccountPath = path.join(__dirname, 'firebase-service-key.json');
const serviceAccount = require(serviceAccountPath);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

async function testEmailWithImages() {
  const db = admin.firestore();
  
  const firstName = 'Kadian';
  const logoUrl = 'https://storage.googleapis.com/nurses-afb7e.firebasestorage.app/email-assets/876nurses-logo.png';
  const logoBlock = `<img src="${logoUrl}" alt="876 Nurses" style="display:block;width:80px;height:auto;border:none;outline:none;" />`;
  
  // Placeholder images - replace with actual URLs after uploading
  const nurseElderlyImage = 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400';
  const handsCompassionImage = 'https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=400';
  const homeCareTeamImage = 'https://images.unsplash.com/photo-1551190822-a9333d879b1f?w=400';
  
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
                  <td align="center" style="padding:36px 24px 14px 24px;">
                    ${logoBlock}
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding:0 24px 22px 24px;">
                    <h1 style="margin:0;font-size:34px;line-height:1.15;font-weight:800;color:#14213d;">Welcome to 876 Nurses!</h1>
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 24px 20px 24px;">
                    <p style="margin:0 0 16px 0;font-size:16px;line-height:1.65;">Hi ${firstName}, 👋</p>
                    <p style="margin:0 0 16px 0;font-size:16px;line-height:1.65;">
                      We're honoured you've chosen to join our community focused on bringing quality healthcare, compassionate nursing support, and personalized care right to the comfort of your home.
                    </p>
                    <p style="margin:0 0 16px 0;font-size:16px;line-height:1.65;">
                      Whether you're here as a client seeking care, a family member supporting a loved one, or a healthcare professional, this app is designed to make your journey easier and more connected.
                    </p>
                    
                    <h2 style="margin:24px 0 12px 0;font-size:20px;font-weight:700;color:#14213d;">✨ What You Can Do in the App</h2>
                    
                    <p style="margin:0 0 8px 0;font-size:15px;line-height:1.6;"><strong>📋 Book & Manage Care Services</strong><br/>
                    Schedule in-home nursing support — from daily care to post-op recovery, chronic illness assistance, physiotherapy, wound care, and more — all with just a few taps.</p>
                    
                    <p style="margin:0 0 8px 0;font-size:15px;line-height:1.6;"><strong>📍 Track Appointments & Care Plans</strong><br/>
                    View upcoming visits, manage reminders, and stay on top of your care plans with our intuitive dashboard.</p>
                    
                    <p style="margin:0 0 8px 0;font-size:15px;line-height:1.6;"><strong>💬 Get Support & Updates</strong><br/>
                    Receive direct updates, care tips, and important health notifications from our team of trained nurses.</p>
                    
                    <p style="margin:0 0 8px 0;font-size:15px;line-height:1.6;"><strong>📖 Learn & Empower Yourself</strong><br/>
                    Explore helpful resources and guides inspired by real nursing practices to support your health and wellbeing.</p>
                    
                    <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;"><strong>👥 Connect with Care Providers</strong><br/>
                    View profiles of the nursing professionals ready to serve you, and feel confident knowing your care is delivered by skilled, compassionate staff.</p>
                    
                    <h2 style="margin:24px 0 12px 0;font-size:20px;font-weight:700;color:#14213d;">🚀 Getting Started</h2>
                    
                    <p style="margin:0 0 6px 0;font-size:15px;line-height:1.6;"><strong>Complete Your Profile</strong><br/>
                    Add your preferences and health profile so we can tailor care to your needs.</p>
                    
                    <p style="margin:0 0 6px 0;font-size:15px;line-height:1.6;"><strong>Explore Services</strong><br/>
                    Browse available home nursing services — from companion care to acute condition support.</p>
                    
                    <p style="margin:0 0 6px 0;font-size:15px;line-height:1.6;"><strong>Set Reminders & Alerts</strong><br/>
                    Never miss a visit or medication schedule.</p>
                    
                    <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;"><strong>Turn On Notifications</strong><br/>
                    Stay informed with real-time updates.</p>
                    
                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0;">
                      <tr>
                        <td width="33.33%" style="padding:0 4px 0 0;">
                          <img src="${nurseElderlyImage}" alt="Compassionate Care" style="width:100%;height:auto;display:block;border-radius:8px;" />
                        </td>
                        <td width="33.33%" style="padding:0 4px;">
                          <img src="${handsCompassionImage}" alt="Caring Hands" style="width:100%;height:auto;display:block;border-radius:8px;" />
                        </td>
                        <td width="33.33%" style="padding:0 4px 0 0;">
                          <img src="${homeCareTeamImage}" alt="Professional Home Care" style="width:100%;height:auto;display:block;border-radius:8px;" />
                        </td>
                      </tr>
                    </table>
                    
                    <h2 style="margin:24px 0 12px 0;font-size:20px;font-weight:700;color:#14213d;">🤝 Our Promise to You</h2>
                    
                    <p style="margin:0 0 16px 0;font-size:16px;line-height:1.65;">
                      At 876NURSES, we are committed to providing compassionate, professional, and personalized home health care that uplifts your comfort and wellbeing. Our team strives to make every experience safe, supportive, and respectful.
                    </p>
                    
                    <p style="margin:0 0 8px 0;font-size:16px;line-height:1.65;">
                      Thank you for trusting us with your care.<br/>
                      Let's make your health journey easier — starting now!
                    </p>
                    
                    <div style="text-align:center;margin:20px 0;">
                      <img src="${nurseElderlyImage}" alt="Welcome to 876 Nurses" style="width:100%;max-width:400px;height:auto;display:inline-block;border-radius:12px;" />
                    </div>
                    
                    <p style="margin:0;font-size:16px;line-height:1.65;font-weight:600;">
                      🌟 Welcome aboard!
                    </p>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding:0 24px 40px 24px;">
                    <a href="876nurses://login" style="display:inline-block;background:#2f62d7;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:30px;font-weight:800;font-size:15px;">Open App</a>
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
    subject: 'Welcome to 876 Nurses - With Images',
    text: `Hi ${firstName},\n\nWe're honoured you've chosen to join our community.\n\n🌟 Welcome aboard!`,
    html,
    attachments: [],
    meta: { source: 'image-layout-test' },
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    status: 'queued',
  };

  const ref = await db.collection('mail').add(payload);
  console.log('✅ Test email with images queued!');
  console.log('📧 Document ID:', ref.id);
  console.log('');
  console.log('🖼️  Email includes:');
  console.log('   • 3 images in a row above "Our Promise to You"');
  console.log('   • 1 image above "Welcome aboard!"');
  console.log('   • Pill-shaped "Open App" button (border-radius: 30px)');
  console.log('');
  console.log('📝 Note: Using placeholder images from Unsplash');
  console.log('   Replace the URLs in welcomeEmail.js with your uploaded images');
}

testEmailWithImages()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Error:', err);
    process.exit(1);
  });
