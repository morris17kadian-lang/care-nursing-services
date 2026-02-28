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

async function uploadLogo() {
  const bucket = admin.storage().bucket();
  const logoPath = path.join(__dirname, 'functions', 'assets', 'Nurses-logo.png');
  
  if (!fs.existsSync(logoPath)) {
    console.error('❌ Logo not found at:', logoPath);
    process.exit(1);
  }

  const destination = 'email-assets/876nurses-logo.png';
  
  await bucket.upload(logoPath, {
    destination,
    metadata: {
      contentType: 'image/png',
      cacheControl: 'public, max-age=31536000',
    },
  });

  // Make the file publicly accessible
  await bucket.file(destination).makePublic();

  const publicUrl = `https://storage.googleapis.com/${bucket.name}/${destination}`;
  
  console.log('✅ Logo uploaded successfully!');
  console.log('📸 Public URL:', publicUrl);
  console.log('\nℹ️  Use this URL in your email templates.');
  
  return publicUrl;
}

uploadLogo()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Upload failed:', error);
    process.exit(1);
  });
