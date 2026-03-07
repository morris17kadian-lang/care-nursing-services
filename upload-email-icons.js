const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const serviceAccountPath = path.join(__dirname, 'firebase-service-key.json');
const serviceAccount = require(serviceAccountPath);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: 'nurses-afb7e.firebasestorage.app',
  });
}

async function uploadEmailIcons() {
  const bucket = admin.storage().bucket();

  const iconFiles = [
    {
      local: path.join(__dirname, 'functions', 'assets', 'icon-instagram.png'),
      remote: 'email-assets/icon-instagram.png',
      contentType: 'image/png',
    },
    {
      local: path.join(__dirname, 'functions', 'assets', 'icon-facebook.png'),
      remote: 'email-assets/icon-facebook.png',
      contentType: 'image/png',
    },
    {
      local: path.join(__dirname, 'functions', 'assets', 'icon-whatsapp.png'),
      remote: 'email-assets/icon-whatsapp.png',
      contentType: 'image/png',
    },
  ];

  const uploadedUrls = {};

  for (const icon of iconFiles) {
    if (!fs.existsSync(icon.local)) {
      console.log(`⚠️  Not found: ${path.relative(__dirname, icon.local)}`);
      continue;
    }

    console.log(`📤 Uploading ${path.basename(icon.local)}...`);

    try {
      await bucket.upload(icon.local, {
        destination: icon.remote,
        metadata: {
          contentType: icon.contentType,
          cacheControl: 'public, max-age=31536000',
        },
      });

      await bucket.file(icon.remote).makePublic();

      const publicUrl = `https://storage.googleapis.com/${bucket.name}/${icon.remote}`;
      uploadedUrls[path.basename(icon.remote)] = publicUrl;
      console.log(`✅ Uploaded: ${publicUrl}`);
    } catch (error) {
      console.error(`❌ Failed to upload ${path.basename(icon.local)}:`, error.message);
    }
  }

  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔗 Icon URLs (paste into templates if needed)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');

  if (uploadedUrls['icon-instagram.png']) console.log(`Instagram: ${uploadedUrls['icon-instagram.png']}`);
  if (uploadedUrls['icon-facebook.png']) console.log(`Facebook:  ${uploadedUrls['icon-facebook.png']}`);
  if (uploadedUrls['icon-whatsapp.png']) console.log(`WhatsApp:  ${uploadedUrls['icon-whatsapp.png']}`);
}

uploadEmailIcons()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
