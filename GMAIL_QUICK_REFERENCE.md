# 🎯 Gmail API Setup - Quick Reference

## What You're Setting Up

```
┌─────────────────┐
│  Mobile App     │ 
│  (React Native) │
└────────┬────────┘
         │ HTTP Request
         │ (with API Key)
         ▼
┌─────────────────┐
│  Backend Server │
│  (Node.js/      │
│   Express)      │
└────────┬────────┘
         │ OAuth 2.0
         │ Token Exchange
         ▼
┌─────────────────┐
│  Gmail API      │
│  (Google Cloud) │
└────────┬────────┘
         │ SMTP
         ▼
┌─────────────────┐
│  Patient Email  │
│  Inbox          │
└─────────────────┘
```

---

## 📁 Files Created

### Backend Files (New)
```
backend/
├── config/
│   └── gmail-config.js         ← OAuth credentials
├── services/
│   └── gmailService.js         ← Email sending logic
├── routes/
│   └── emailRoutes.js          ← API endpoints
├── scripts/
│   ├── setup-oauth.js          ← Get refresh token
│   └── test-email.js           ← Test configuration
├── server.js                   ← Express server
├── package.json                ← Dependencies
├── .env.example                ← Configuration template
├── .env                        ← Your secrets (create this)
├── README.md                   ← Detailed docs
└── quick-start.sh              ← Automated setup
```

### Mobile App Files (Modified)
```
services/
└── EmailService.js             ← Updated to call backend

docs/
├── EMAIL_SERVICE_SETUP.md      ← Mobile app config guide
└── GMAIL_SETUP_CHECKLIST.md    ← Step-by-step setup
```

---

## 🔑 What You Need to Get

### From Google Cloud Console

1. **Client ID**
   ```
   123456789-abc123.apps.googleusercontent.com
   ```

2. **Client Secret**
   ```
   GOCSPX-REDACTED
   ```

3. **Refresh Token** (via setup script)
   ```
   REFRESH_TOKEN_REDACTED...
   ```

### Generate Yourself

4. **API Key** (for mobile app authentication)
   ```bash
   openssl rand -base64 32
   ```
   Result: `abc123xyz456...`

---

## 🚀 Quick Start (TL;DR)

```bash
# 1. Install backend
cd backend
npm install

# 2. Copy environment file
cp .env.example .env

# 3. Edit .env with your credentials
# (Get from Google Cloud Console)

# 4. Get refresh token
npm run setup-oauth
# Follow prompts, paste refresh token in .env

# 5. Test it works
npm run test your-email@example.com

# 6. Start server
npm run dev

# 7. Update mobile app
# Edit services/EmailService.js:
#   backendUrl: 'http://localhost:3000'
#   apiKey: 'your-api-key-from-env'
#   enabled: true

# 8. Done! 🎉
```

---

## 📝 .env File Template

```env
# Required - Generate this
API_KEY=abc123xyz456...

# Required - Get from Google Cloud Console
GMAIL_CLIENT_ID=123456789-abc.apps.googleusercontent.com
GMAIL_CLIENT_SECRET=REDACTED
GMAIL_REDIRECT_URI=http://localhost:3000/auth/google/callback

# Required - Get via npm run setup-oauth
GMAIL_REFRESH_TOKEN=REDACTED

# Required - Your Gmail
GMAIL_ACCOUNT=876nurses@gmail.com

# Optional
PORT=3000
NODE_ENV=development
```

---

## 🧪 Testing Commands

```bash
# Test email service
npm run test your-email@example.com

# Start development server
npm run dev

# Setup OAuth (one-time)
npm run setup-oauth

# Check if running
curl http://localhost:3000/health
```

---

## 📱 Mobile App Configuration

### Development (Simulator)

```javascript
// services/EmailService.js
static defaultConfig = {
  backendUrl: 'http://localhost:3000',      // iOS
  // backendUrl: 'http://10.0.2.2:3000',   // Android
  apiKey: 'YOUR_API_KEY_HERE',
  enabled: true
};
```

### Development (Physical Device)

Find your computer's IP:
```bash
# Mac/Linux
ifconfig | grep "inet "

# Windows
ipconfig
```

Then use:
```javascript
backendUrl: 'http://192.168.1.XXX:3000'  // Your computer's IP
```

### Production

```javascript
backendUrl: 'https://your-backend.com'
```

---

## ✅ Verification Steps

**Backend:**
- [ ] `npm run dev` starts without errors
- [ ] `npm run test your-email@example.com` sends email
- [ ] Email arrives in inbox

**Mobile App:**
- [ ] App connects to backend (check console logs)
- [ ] Test email sends from app
- [ ] Password reset emails work
- [ ] Payment confirmation emails work

---

## 🆘 Common Issues

| Problem | Solution |
|---------|----------|
| "Invalid grant" | Run `npm run setup-oauth` again |
| "Network request failed" | Check `backendUrl` is correct |
| "Invalid API key" | Make sure API keys match |
| Emails in spam | Mark as "Not Spam" several times |
| Can't reach localhost | Use your computer's local IP |

---

## 📚 Documentation

- **Detailed Setup:** [GMAIL_SETUP_CHECKLIST.md](./GMAIL_SETUP_CHECKLIST.md)
- **Backend Docs:** [backend/README.md](./backend/README.md)
- **Mobile App Config:** [EMAIL_SERVICE_SETUP.md](./EMAIL_SERVICE_SETUP.md)
- **Google Cloud:** https://console.cloud.google.com/

---

## 🎯 Current Status

**Email Types Already Integrated:**

✅ Password Reset - `AuthContext.resetPassword()`
✅ Payment Confirmation - `InvoiceScreen.handlePaymentComplete()`
✅ Invoice Emails - `EmailService.sendInvoiceEmail()`
✅ Appointment Reminders - `EmailService.sendAppointmentReminder()`

**Ready to Use Once Backend is Running!**

---

## 📞 Support

Questions? Contact: 876nurses@gmail.com

Need help? Check the detailed guides or open an issue.
