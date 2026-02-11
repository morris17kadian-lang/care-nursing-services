# Fygaro Payment Configuration Guide

## 🔐 Setup Steps

### 1. Get Your Fygaro Credentials

1. Go to [Fygaro Dashboard](https://www.fygaro.com/en/app/dashboard/)
2. Sign in to your merchant account
3. Navigate to **Settings** → **API Keys**
4. Copy your:
   - **Merchant ID**
   - **API Key** (keep this secret!)

### 2. Configure Backend Environment

Edit `/Users/Kadian/Desktop/876nurses/backend/.env`:

```bash
# Fygaro Payment Gateway
FYGARO_MERCHANT_ID=your_actual_merchant_id
FYGARO_API_KEY=REDACTED
FYGARO_BASE_URL=https://www.fygaro.com/api/v1
FYGARO_TEST_MODE=true  # Set to false for production
```

### 3. Start the Backend Server

```bash
cd /Users/Kadian/Desktop/876nurses/backend
npm start
```

The backend should start on port 3000 and show:
```
🚀 876 Nurses Email Service Started
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
...
Available endpoints:
  POST   /api/payments/initialize
  GET    /api/payments/verify/:transactionId
  POST   /api/payments/webhook
```

### 4. Test the Payment Flow

The payment flow now works as follows:

1. **Patient initiates payment** (BookScreen, InvoiceScreen, etc.)
2. **App calls backend** → `POST http://localhost:3000/api/payments/initialize`
3. **Backend calls Fygaro** → Securely with API key
4. **Backend returns payment URL** → App opens in WebView
5. **Patient completes payment** → On Fygaro's secure page
6. **App verifies payment** → `GET http://localhost:3000/api/payments/verify/:txnId`

## 🔄 What Changed

### ✅ Backend (New)
- `/backend/routes/paymentRoutes.js` - Secure payment API routes
- Payment credentials stay server-side (never exposed to client)
- Handles JSON/HTML response errors gracefully

### ✅ FygaroPaymentService.js
- Now calls backend instead of Fygaro directly
- Simplified - no more API keys in client code
- Secure architecture

### ✅ Backend Server
- Added payment routes at `/api/payments/*`
- Configured with environment variables

## 🧪 Testing

### Test Payment Initialization:
```bash
curl -X POST http://localhost:3000/api/payments/initialize \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 5000,
    "currency": "JMD",
    "customerEmail": "test@example.com",
    "customerName": "Test Patient",
    "description": "Test appointment deposit"
  }'
```

Expected response:
```json
{
  "success": true,
  "paymentUrl": "https://...",
  "sessionId": "...",
  "transactionId": "..."
}
```

## ⚠️ Important Notes

1. **Never commit real API keys** - The `.env` file should be in `.gitignore`
2. **Test mode** - Keep `FYGARO_TEST_MODE=true` during development
3. **Production** - Set `FYGARO_TEST_MODE=false` and use production API keys
4. **Backend must be running** - The app needs the backend at `http://localhost:3000`

## 🚨 Common Issues

### "Payment service not configured"
- Make sure you've added real Fygaro credentials to `.env`
- Restart the backend server after changing `.env`

### "Connection refused"
- Ensure backend is running on port 3000
- Check `npm start` in the backend directory

### "JSON Parse error"
- This is now handled by the backend
- Check backend logs for more details

## 📝 Next Steps

1. ✅ Configure your actual Fygaro credentials
2. ✅ Test with small amounts in test mode
3. ✅ Configure webhook URL in Fygaro dashboard (for production)
4. ✅ Switch to production mode when ready
