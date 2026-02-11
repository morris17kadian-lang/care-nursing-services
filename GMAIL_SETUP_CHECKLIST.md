# Gmail API Setup - Complete Checklist

## 📋 Setup Overview

This checklist walks you through setting up Gmail API with OAuth 2.0 for the 876 Nurses app.

**Estimated Time:** 15-20 minutes

---

## Phase 1: Google Cloud Console Setup (10 minutes)

### ☐ 1. Create Google Cloud Project

1. Go to: https://console.cloud.google.com/
2. Click "Select a project" (top navigation bar)
3. Click "NEW PROJECT"
4. **Project name:** `876 Nurses App`
5. Click "CREATE"
6. Wait for project creation (takes ~30 seconds)
7. Select your new project from the dropdown

### ☐ 2. Enable Gmail API

1. In the search bar, type "Gmail API"
2. Click on "Gmail API" in the results
3. Click the blue "ENABLE" button
4. Wait for it to activate

### ☐ 3. Configure OAuth Consent Screen

1. Go to: "APIs & Services" → "OAuth consent screen" (left sidebar)
2. Select **"External"** (unless you have Google Workspace, then choose Internal)
3. Click "CREATE"

**Fill in the form:**

| Field | Value |
|-------|-------|
| App name | `876 Nurses Email Service` |
| User support email | `876nurses@gmail.com` |
| App logo | (Optional) Upload your logo |
| Application home page | (Optional) Your website URL |
| Authorized domains | (Leave empty for now) |
| Developer contact email | `876nurses@gmail.com` |

4. Click "SAVE AND CONTINUE"

**Scopes:**

5. Click "ADD OR REMOVE SCOPES"
6. In the filter, search for: `gmail.send`
7. Check the box for: **`https://www.googleapis.com/auth/gmail.send`**
8. Click "UPDATE"
9. Click "SAVE AND CONTINUE"

**Test Users:**

10. Click "ADD USERS"
11. Enter: `876nurses@gmail.com`
12. Click "ADD"
13. Click "SAVE AND CONTINUE"
14. Review and click "BACK TO DASHBOARD"

### ☐ 4. Create OAuth 2.0 Credentials

1. Go to: "APIs & Services" → "Credentials"
2. Click "CREATE CREDENTIALS" → "OAuth 2.0 Client ID"
3. If prompted to configure consent screen, you already did in step 3

**Fill in the form:**

| Field | Value |
|-------|-------|
| Application type | **Web application** |
| Name | `876 Nurses Email Service` |

**Authorized redirect URIs:**

4. Click "ADD URI"
5. Enter: `http://localhost:3000/auth/google/callback`
6. For production, click "ADD URI" again and add your production URL: `https://your-domain.com/auth/google/callback`
7. Click "CREATE"

**Save Your Credentials:**

8. A popup appears with your credentials
9. **Copy and save these immediately:**
   - ✏️ Client ID: `XXXXX.apps.googleusercontent.com`
   - ✏️ Client Secret: `XXXXX`
10. Click "OK"

---

## Phase 2: Backend Setup (5 minutes)

### ☐ 5. Install Dependencies

```bash
cd backend
npm install
```

Wait for installation to complete (~2 minutes).

### ☐ 6. Configure Environment Variables

```bash
# Copy example file
cp .env.example .env

# Edit the file
nano .env
# or
code .env
```

**Fill in these values:**

```env
# Generate a secure API key (use the command below or create your own)
API_KEY=PASTE_YOUR_SECURE_KEY_HERE

# Paste your OAuth credentials from step 4
GMAIL_CLIENT_ID=PASTE_CLIENT_ID_HERE.apps.googleusercontent.com
GMAIL_CLIENT_SECRET=REDACTED
GMAIL_REDIRECT_URI=http://localhost:3000/auth/google/callback

# This will be filled in next step
GMAIL_REFRESH_TOKEN=

# Your Gmail account
GMAIL_ACCOUNT=876nurses@gmail.com
```

**Generate a secure API key:**
```bash
openssl rand -base64 32
```

Copy the output and paste as `API_KEY` value.

### ☐ 7. Get Refresh Token (Important!)

Run the OAuth setup script:

```bash
npm run setup-oauth
```

**Follow the prompts:**

1. A URL will appear - **copy the entire URL**
2. Open it in your browser
3. Sign in with `876nurses@gmail.com`
4. Click "Continue" when it says "Google hasn't verified this app"
5. Click "Continue" again
6. Grant permission by clicking "Allow"
7. You'll see a page that says "Cannot GET /auth/google/callback"
   - This is expected! Look at the URL bar
8. **Copy the `code` parameter from the URL:**
   ```
   http://localhost:3000/auth/google/callback?code=4/XXXX-LONG-CODE-HERE&scope=...
   ```
   Copy everything after `code=` up to the `&scope`
9. Paste this code into the terminal
10. Press Enter
11. **You'll see your refresh token!**
12. Copy the entire refresh token (starts with `1//` usually)
13. Add it to your `.env` file:
    ```env
    GMAIL_REFRESH_TOKEN=REDACTED
    ```

---

## Phase 3: Testing (3 minutes)

### ☐ 8. Test Email Service

```bash
npm run test your-personal-email@example.com
```

**Expected output:**
```
📧 Testing Email Service...
Sending test email to: your-personal-email@example.com

✅ Test email sent successfully!

Details:
  Message ID: <abc123@gmail.com>
  Timestamp: 2026-01-04T10:30:00.000Z

Check your inbox to confirm receipt.
```

**Check your email inbox!** You should receive a test email.

### ☐ 9. Start Backend Server

```bash
# Development mode (auto-reload on changes)
npm run dev

# Or production mode
npm start
```

**Expected output:**
```
🚀 876 Nurses Email Service Started
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📧 Service: Gmail API with OAuth 2.0
🌐 Port: 3000
📍 Environment: development
⏰ Started: 2026-01-04T10:30:00.000Z
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Keep this terminal running!

---

## Phase 4: Connect Mobile App (2 minutes)

### ☐ 10. Configure React Native App

**Option A: Quick Config (Development)**

Edit `services/EmailService.js` line 15:

```javascript
static defaultConfig = {
  fromEmail: '876nurses@gmail.com',
  fromName: '876 Nurses Home Care Services',
  replyTo: '876nurses@gmail.com',
  backendUrl: 'http://localhost:3000',  // iOS Simulator
  // backendUrl: 'http://10.0.2.2:3000', // Android Emulator
  // backendUrl: 'http://YOUR_LOCAL_IP:3000', // Physical device
  apiKey: 'PASTE_YOUR_API_KEY_FROM_ENV_FILE',
  enabled: true  // Enable emails!
};
```

**Option B: Production Config**

```javascript
backendUrl: 'https://your-backend-domain.com',
```

### ☐ 11. Test from Mobile App

Add this test button to any admin screen:

```javascript
import EmailService from '../services/EmailService';

const testEmail = async () => {
  const result = await EmailService.testConfiguration('your-email@example.com');
  Alert.alert(
    result.success ? 'Success!' : 'Failed',
    result.success ? 'Check your email!' : result.error
  );
};

// In your render:
<Button title="Test Email" onPress={testEmail} />
```

Run the app and click the test button. Check your email!

---

## ✅ Verification Checklist

Make sure all these work:

- [ ] Backend server starts without errors
- [ ] Test email sent successfully via terminal
- [ ] Test email received in inbox (check spam folder too)
- [ ] Mobile app connects to backend
- [ ] Test email sent from mobile app
- [ ] Password reset emails work (try forgot password)
- [ ] Payment confirmation emails work (make a test payment)

---

## 🚨 Troubleshooting

### "Invalid grant" error
- Your refresh token expired
- Run `npm run setup-oauth` again

### "Access denied" error  
- OAuth consent screen not approved
- Make sure you added test user (876nurses@gmail.com)
- Verify scope includes `gmail.send`

### "Network request failed" from mobile app
- Check backend is running (`npm run dev`)
- Verify `backendUrl` is correct
- For physical device, use computer's local IP, not localhost

### Emails going to spam
- Normal for new accounts
- Mark as "Not Spam" a few times
- Consider SPF/DKIM records for production

### Rate limit exceeded
- Free Gmail: ~500 emails/day
- Wait 24 hours or use Google Workspace

---

## 🎉 Success!

If all tests pass, your email service is ready!

**What's working now:**
- ✅ Password reset emails
- ✅ Payment confirmation emails  
- ✅ Invoice emails
- ✅ Appointment reminder emails

---

## 📚 Next Steps

1. **Deploy backend to production** (Heroku, AWS, DigitalOcean)
2. **Update production redirect URI** in Google Cloud Console
3. **Update mobile app** with production backend URL
4. **Monitor email delivery** and adjust as needed
5. **Set up email templates** customization if needed

---

## 🆘 Still Having Issues?

1. Check backend logs for errors
2. Verify all credentials in `.env` are correct
3. Make sure Gmail API is enabled in Google Cloud
4. Review [backend/README.md](./backend/README.md) for detailed docs
5. Contact: 876nurses@gmail.com

---

**Completed:** ___/11 steps

**Status:** □ Not Started  □ In Progress  ☑ Complete
