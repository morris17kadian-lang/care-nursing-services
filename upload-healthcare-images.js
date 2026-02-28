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

async function uploadHealthcareImages() {
  const bucket = admin.storage().bucket();
  const imagesDir = path.join(__dirname, 'email-images');
  
  // Create directory if it doesn't exist
  if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir);
    console.log('📁 Created email-images folder');
    console.log('');
    console.log('Please save your images in the "email-images" folder as:');
    console.log('  • nurse-elderly-care.jpg (nurse with elderly patient)');
    console.log('  • hands-compassion.jpg (hands holding/compassion)');
    console.log('  • middle-strip.jpg (NEW middle photo for 3-image strip)');
    console.log('  • home-care-team.jpg (home care team with patient)');
    console.log('');
    console.log('Then run this script again.');
    return;
  }
  
  const imageFiles = [
    { local: 'nurse-elderly-care.jpg', remote: 'nurse-elderly-care.jpg', desc: 'Nurse with elderly patient', contentType: 'image/jpeg' },
    { local: 'hands-compassion.jpg', remote: 'hands-compassion.jpg', desc: 'Hands holding/compassion', contentType: 'image/jpeg' },
    // Cache-busted filename (email clients can be aggressive about caching)
    { local: 'middle-strip.jpg', remote: 'middle-strip-v1.jpg', desc: 'Middle photo for 3-image strip', contentType: 'image/jpeg' },
    { local: 'home-care-team.jpg', remote: 'home-care-team.jpg', desc: 'Home care team with patient', contentType: 'image/jpeg' },
    { local: 'header-confetti.png', remote: 'header-confetti-v2.png', desc: 'Welcome header background (confetti)', contentType: 'image/png' },
  ];
  
  const uploadedUrls = {};
  
  for (const image of imageFiles) {
    const localPath = path.join(imagesDir, image.local);
    
    if (!fs.existsSync(localPath)) {
      console.log(`⚠️  ${image.local} not found - skipping`);
      continue;
    }
    
    console.log(`📤 Uploading ${image.local} (${image.desc})...`);
    
    const destination = `email-assets/${image.remote}`;
    
    try {
      await bucket.upload(localPath, {
        destination,
        metadata: {
          contentType: image.contentType || 'application/octet-stream',
          cacheControl: 'public, max-age=31536000',
        },
      });
      
      // Make the file publicly accessible
      await bucket.file(destination).makePublic();
      
      const publicUrl = `https://storage.googleapis.com/${bucket.name}/${destination}`;
      uploadedUrls[image.remote] = publicUrl;
      
      console.log(`✅ Uploaded: ${publicUrl}`);
    } catch (error) {
      console.error(`❌ Failed to upload ${image.local}:`, error.message);
    }
  }
  
  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📸 Image URLs for welcomeEmail.js:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  
  if (uploadedUrls['nurse-elderly-care.jpg']) {
    console.log(`const nurseElderlyImage = '${uploadedUrls['nurse-elderly-care.jpg']}';`);
  }
  if (uploadedUrls['hands-compassion.jpg']) {
    console.log(`const handsCompassionImage = '${uploadedUrls['hands-compassion.jpg']}';`);
  }
  if (uploadedUrls['middle-strip-v1.jpg']) {
    console.log(`const middleStripImage = '${uploadedUrls['middle-strip-v1.jpg']}';`);
  }
  if (uploadedUrls['home-care-team.jpg']) {
    console.log(`const homeCareTeamImage = '${uploadedUrls['home-care-team.jpg']}';`);
  }
  if (uploadedUrls['header-confetti-v2.png']) {
    console.log(`const headerConfettiImage = '${uploadedUrls['header-confetti-v2.png']}';`);
  }
  
  console.log('');
  console.log('Copy these lines and update services/welcomeEmail.js');
}

uploadHealthcareImages()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
