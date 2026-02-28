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
  
  // Note: You'll need to place the healthcare images in an 'email-images' folder
  // For now, I'll create placeholders for the image upload structure
  
  console.log('📸 Please save your healthcare images as:');
  console.log('   - email-images/nurse-elderly-care.jpg (Image 2)');
  console.log('   - email-images/hands-compassion.jpg (Image 3)');
  console.log('   - email-images/home-care-team.jpg (Image 5)');
  console.log('');
  console.log('Once saved, these will be uploaded to Firebase Storage.');
  console.log('');
  console.log('For now, creating image folder structure...');
  
  const imagesDir = path.join(__dirname, 'email-images');
  if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir);
    console.log('✅ Created email-images folder');
  } else {
    console.log('✅ email-images folder already exists');
  }
  
  console.log('');
  console.log('💡 Using placeholder URLs for now.');
  console.log('   You can replace these with your actual image URLs once uploaded.');
}

uploadHealthcareImages()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
