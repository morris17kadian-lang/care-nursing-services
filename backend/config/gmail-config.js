/**
 * Gmail API Configuration
 * Follow these steps to set up:
 * 
 * 1. Go to: https://console.cloud.google.com/
 * 2. Create a new project: "876 Nurses App"
 * 3. Enable Gmail API:
 *    - Go to "APIs & Services" → "Library"
 *    - Search "Gmail API" and enable it
 * 4. Create OAuth 2.0 Credentials:
 *    - Go to "APIs & Services" → "Credentials"
 *    - Click "Create Credentials" → "OAuth 2.0 Client ID"
 *    - Configure OAuth consent screen first if prompted
 *    - Application type: "Web application"
 *    - Name: "876 Nurses Email Service"
 *    - Authorized redirect URIs: Add your backend URL + /auth/google/callback
 *      Example: http://localhost:3000/auth/google/callback
 *    - Download the JSON credentials
 * 5. Get Refresh Token (one-time setup):
 *    - Use the provided setup script or follow OAuth flow
 *    - Save the refresh token securely
 */

module.exports = {
  // OAuth 2.0 Credentials from Google Cloud Console
  oauth2Credentials: {
    clientId: process.env.GMAIL_CLIENT_ID || 'YOUR_CLIENT_ID_HERE',
    clientSecret: process.env.GMAIL_CLIENT_SECRET || 'YOUR_CLIENT_SECRET_HERE',
    redirectUri: process.env.GMAIL_REDIRECT_URI || 'http://localhost:3000/auth/google/callback'
  },

  // Refresh token (obtain this through OAuth flow once)
  refreshToken: process.env.GMAIL_REFRESH_TOKEN || 'YOUR_REFRESH_TOKEN_HERE',

  // Gmail account to send from
  emailAccount: process.env.GMAIL_ACCOUNT || '876nurses@gmail.com',

  // Email settings
  emailSettings: {
    fromName: '876 Nurses Home Care Services',
    replyTo: '876nurses@gmail.com',
    maxRetries: 3,
    retryDelay: 1000 // milliseconds
  }
};
