# 876 Nurses Email Service Backend

Production-ready email service using Gmail API with OAuth 2.0 authentication.

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Google Cloud Setup

#### A. Create Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" → "New Project"
3. Name: "876 Nurses App"
4. Click "Create"

#### B. Enable Gmail API
1. In your project, go to "APIs & Services" → "Library"
2. Search for "Gmail API"
3. Click "Enable"

#### C. Configure OAuth Consent Screen
1. Go to "APIs & Services" → "OAuth consent screen"
2. Select "External" (or "Internal" if you have Google Workspace)
3. Fill in:
   - App name: "876 Nurses Email Service"
   - User support email: 876nurses@gmail.com
   - Developer contact: 876nurses@gmail.com
4. Click "Save and Continue"
5. Scopes: Add `https://www.googleapis.com/auth/gmail.send`
6. Test users: Add 876nurses@gmail.com
7. Click "Save and Continue"

#### D. Create OAuth 2.0 Credentials
1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth 2.0 Client ID"
3. Application type: "Web application"
4. Name: "876 Nurses Email Service"
5. Authorized redirect URIs: Add `http://localhost:3000/auth/google/callback`
   - For production, add your production URL too
6. Click "Create"
7. **Save your Client ID and Client Secret!**

### 3. Environment Configuration

```bash
# Copy example env file
cp .env.example .env

# Edit .env with your credentials
nano .env
```

Add your credentials:
```env
GMAIL_CLIENT_ID=YOUR_CLIENT_ID.apps.googleusercontent.com
GMAIL_CLIENT_SECRET=REDACTED
GMAIL_REDIRECT_URI=http://localhost:3000/auth/google/callback
```

### 4. Get Refresh Token

Run the OAuth setup script:

```bash
npm run setup-oauth
```

Follow the instructions:
1. Open the URL in your browser
2. Sign in with `876nurses@gmail.com`
3. Grant permissions
4. Copy the authorization code from the redirect URL
5. Paste it in the terminal
6. Copy the refresh token to your `.env` file

### 5. Test Email Service

```bash
npm run test your-email@example.com
```

If successful, you'll receive a test email!

### 6. Start Server

```bash
# Development with auto-reload
npm run dev

# Production
npm start
```

Server runs on `http://localhost:3000`

## 📡 API Endpoints

### Send Single Email
```bash
POST /api/send-email
Headers:
  x-api-key: your-secure-api-key-here
  Content-Type: application/json
Body:
{
  "from": {
    "name": "876 Nurses",
    "email": "876nurses@gmail.com"
  },
  "to": "patient@example.com",
  "subject": "Your Invoice",
  "html": "<h1>Hello!</h1>",
  "replyTo": "876nurses@gmail.com"
}
```

### Send Bulk Emails
```bash
POST /api/send-bulk-emails
Headers:
  x-api-key: your-secure-api-key-here
  Content-Type: application/json
Body:
{
  "emails": [
    { "to": "user1@example.com", "subject": "Test", "html": "<p>Hi</p>" },
    { "to": "user2@example.com", "subject": "Test", "html": "<p>Hi</p>" }
  ]
}
```

### Test Configuration
```bash
POST /api/test-email
Headers:
  x-api-key: your-secure-api-key-here
  Content-Type: application/json
Body:
{
  "testEmail": "your-email@example.com"
}
```

### Check Service Status
```bash
GET /api/email-status
Headers:
  x-api-key: your-secure-api-key-here
```

## 🔒 Security

- **API Key Authentication**: All endpoints require `x-api-key` header
- **Rate Limiting**: 100 requests per 15 minutes per IP
- **OAuth 2.0**: Secure token-based authentication with Google
- **CORS**: Configurable allowed origins
- **Helmet**: Security headers enabled

## 🔧 Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `PORT` | Server port | No (default: 3000) |
| `NODE_ENV` | Environment | No (default: development) |
| `API_KEY` | API authentication key | Yes |
| `GMAIL_CLIENT_ID` | OAuth Client ID | Yes |
| `GMAIL_CLIENT_SECRET` | OAuth Client Secret | Yes |
| `GMAIL_REDIRECT_URI` | OAuth Redirect URI | Yes |
| `GMAIL_REFRESH_TOKEN` | OAuth Refresh Token | Yes |
| `GMAIL_ACCOUNT` | Gmail sender account | Yes |
| `ALLOWED_ORIGINS` | CORS allowed origins | No |

## 📝 Troubleshooting

### "Invalid grant" error
- Your refresh token may have expired
- Run `npm run setup-oauth` again to get a new token

### "Access denied" error
- Check OAuth consent screen is approved
- Verify scopes include `gmail.send`
- Ensure test users include your Gmail account

### Email not sending
- Verify Gmail API is enabled
- Check credentials in `.env` are correct
- Run `npm run test your-email@example.com` to diagnose

### Rate limits
- Gmail API has daily send limits
- Free tier: ~500 emails/day
- Workspace accounts: Higher limits

## 🚢 Production Deployment

### Heroku

```bash
heroku create 876nurses-email-service
heroku config:set GMAIL_CLIENT_ID=xxx
heroku config:set GMAIL_CLIENT_SECRET=REDACTED
heroku config:set GMAIL_REFRESH_TOKEN=REDACTED
heroku config:set API_KEY=your-secure-key
git push heroku main
```

### AWS/DigitalOcean

1. Deploy Node.js app
2. Set environment variables
3. Update `GMAIL_REDIRECT_URI` in Google Cloud Console
4. Add production domain to CORS `ALLOWED_ORIGINS`

## 📚 Additional Resources

- [Gmail API Documentation](https://developers.google.com/gmail/api)
- [OAuth 2.0 Guide](https://developers.google.com/identity/protocols/oauth2)
- [Nodemailer Docs](https://nodemailer.com/)

## 💬 Support

For issues or questions, contact: 876nurses@gmail.com
