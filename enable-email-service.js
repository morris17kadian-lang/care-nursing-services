/**
 * Script to enable email service for the app
 * This will save the email configuration to AsyncStorage
 * Run this with: node enable-email-service.js
 */

// Simple AsyncStorage mock for Node.js
const fs = require('fs');
const path = require('path');

// Store directory (create in project root)
const STORAGE_DIR = path.join(__dirname, '.async-storage-mock');
const GMAIL_CONFIG_KEY = '@876_gmail_config';

// Ensure storage directory exists
if (!fs.existsSync(STORAGE_DIR)) {
  fs.mkdirSync(STORAGE_DIR, { recursive: true });
}

// Mock AsyncStorage
const AsyncStorage = {
  setItem: async (key, value) => {
    const filePath = path.join(STORAGE_DIR, key.replace(/[@/]/g, '_'));
    fs.writeFileSync(filePath, value, 'utf8');
    console.log(`✅ Saved to ${filePath}`);
  },
  getItem: async (key) => {
    const filePath = path.join(STORAGE_DIR, key.replace(/[@/]/g, '_'));
    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath, 'utf8');
    }
    return null;
  }
};

async function enableEmailService() {
  console.log('🔧 Enabling Email Service...\n');

  // Email configuration
  const emailConfig = {
    fromEmail: '876nurses@gmail.com',
    fromName: '876 Nurses Home Care Services',
    replyTo: '876nurses@gmail.com',
    backendUrl: 'http://localhost:3000', // Change to production URL when deployed
    apiKey: 'your-secure-api-key-here', // Should match backend .env API_KEY
    enabled: true // ✅ Enable emails
  };

  console.log('📧 Email Configuration:');
  console.log(JSON.stringify(emailConfig, null, 2));
  console.log('');

  // Save configuration
  await AsyncStorage.setItem(GMAIL_CONFIG_KEY, JSON.stringify(emailConfig));

  console.log('\n✅ Email service enabled successfully!');
  console.log('\n📝 Note: Make sure your backend is running and configured with:');
  console.log('   - Gmail OAuth credentials in backend/.env');
  console.log('   - API_KEY matching the apiKey above');
  console.log('   - Port 3000 (or update backendUrl in config)');
  console.log('\n💡 To test email sending, run:');
  console.log('   cd backend && node scripts/test-welcome-email.js');
}

// Run the script
enableEmailService().catch(console.error);
