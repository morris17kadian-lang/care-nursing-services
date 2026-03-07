const { google } = require('googleapis');
const path = require('path');

// Path to your service account key file
const KEYFILEPATH = path.join(__dirname, 'firebase-service-key.json');

// The email address of the user you want to send as (must be authorized)
const SENDER_EMAIL = '876nurses.notify@gmail.com'; // <-- Change this to your Gmail address

// Scopes required for Gmail API
const SCOPES = ['https://www.googleapis.com/auth/gmail.send'];

const auth = new google.auth.GoogleAuth({
  keyFile: KEYFILEPATH,
  scopes: SCOPES,
});

async function sendEmail() {
  const gmail = google.gmail({ version: 'v1', auth });

  // Create email message
  const message = [
    `From: "Your Name" <${SENDER_EMAIL}>`,
    'To: morris.kadian@yahoo.com', // <-- Change this to recipient
    'Subject: Test Email from Gmail API',
    '',
    'Hello, this is a test email sent using Gmail API!',
  ].join('\n');

  // Encode message in base64
  const encodedMessage = Buffer.from(message)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  // Send email
  const res = await gmail.users.messages.send({
    userId: 'me',
    requestBody: {
      raw: encodedMessage,
    },
  });

  console.log('Email sent:', res.data);
}

sendEmail().catch(console.error);
