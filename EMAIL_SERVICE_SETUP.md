# Email Service Setup Guide - React Native App

## Overview
This guide shows you how to configure the 876 Nurses mobile app to connect to the Gmail API backend for sending emails.

## Prerequisites
✅ Backend server set up and running (see [backend/README.md](../backend/README.md))
✅ Gmail OAuth 2.0 configured
✅ Backend server accessible from your mobile app

## Step 1: Configure Backend URL

The app needs to know where your email backend is running.

### For Development (localhost testing)

If testing on an emulator:
```javascript
backendUrl: 'http://localhost:3000'  // iOS Simulator
backendUrl: 'http://10.0.2.2:3000'   // Android Emulator
```

If testing on a physical device, you need your computer's local IP:
```javascript
backendUrl: 'http://192.168.1.XXX:3000'  // Replace XXX with your computer's IP
```

To find your local IP:
- **Mac**: System Preferences → Network → look for "IP Address"
- **Windows**: `ipconfig` in Command Prompt
- **Linux**: `ifconfig` or `ip addr`

### For Production

Use your deployed backend URL:
```javascript
backendUrl: 'https://your-backend-url.com'
```

## Step 2: Update Email Configuration in App

You can configure the email service in two ways:

### Option A: Update Default Config (Recommended for Production)

Edit [services/EmailService.js](./services/EmailService.js) line 15:

```javascript
static defaultConfig = {
  fromEmail: '876nurses@gmail.com',
  fromName: '876 Nurses Home Care Services',
  replyTo: '876nurses@gmail.com',
  backendUrl: 'YOUR_BACKEND_URL_HERE',  // Update this!
  apiKey: 'YOUR_API_KEY_HERE',          // Must match backend .env API_KEY
  enabled: true                          // Set to true to enable emails
};
```

### Option B: Configure via Settings Screen (Recommended for Testing)

Add this to your Settings screen to allow admins to configure:

```javascript
import EmailService from '../services/EmailService';

// In your settings component
const configureEmailService = async () => {
  await EmailService.saveConfig({
    backendUrl: 'http://192.168.1.100:3000',  // Your backend URL
    apiKey: 'your-secure-api-key-here',        // Your API key
    enabled: true
  });
  
  // Test the configuration
  const result = await EmailService.testConfiguration('test@example.com');
  if (result.success) {
    Alert.alert('Success', 'Email service configured successfully!');
  } else {
    Alert.alert('Error', result.error);
  }
};
```

## Step 3: Test Email Service

### Quick Test Script

Create a test screen or add to an existing admin screen:

```javascript
import EmailService from '../services/EmailService';

const testEmailService = async () => {
  try {
    // Test configuration
    const result = await EmailService.testConfiguration('your-email@example.com');
    
    if (result.success) {
      Alert.alert(
        'Email Test Successful!',
        `Check your inbox at your-email@example.com\n\nMessage ID: ${result.messageId}`
      );
    } else {
      Alert.alert('Email Test Failed', result.error);
    }
  } catch (error) {
    Alert.alert('Error', error.message);
  }
};

// Add a test button
<TouchableOpacity onPress={testEmailService}>
  <Text>Test Email Service</Text>
</TouchableOpacity>
```

### Test Each Email Type

#### 1. Test Password Reset Email
```javascript
// Already integrated in AuthContext
// Just use the forgot password feature on SplashScreen
```

#### 2. Test Payment Confirmation Email
```javascript
// Already integrated in InvoiceScreen
// Make a test payment to trigger
```

#### 3. Test Invoice Email
```javascript
await EmailService.sendInvoiceEmail({
  to: 'patient@example.com',
  invoiceData: {
    invoiceNumber: 'INV-001',
    date: new Date().toLocaleDateString(),
    clientName: 'Test Patient',
    service: 'Home Care Visit',
    amount: 500,
    paidAmount: 0,
    outstandingAmount: 500,
    paymentStatus: 'pending'
  },
  pdfUri: null  // Optional PDF attachment
});
```

## Step 4: Production Deployment Checklist

Before going live, verify:

- [ ] Backend deployed and accessible (not localhost)
- [ ] Gmail OAuth 2.0 properly configured in Google Cloud Console
- [ ] Production domain added to OAuth redirect URIs
- [ ] `backendUrl` in app points to production server
- [ ] `apiKey` matches production backend API key
- [ ] `enabled: true` in email config
- [ ] Tested all email types:
  - [ ] Password reset emails
  - [ ] Payment confirmation emails
  - [ ] Invoice emails
  - [ ] Appointment reminder emails
- [ ] Email deliverability tested (check spam folders)
- [ ] Rate limiting configured appropriately
- [ ] Monitoring set up for failed emails

## Step 5: Enable Email Service

Once everything is tested:

```javascript
// Update defaultConfig in EmailService.js
enabled: true
```

Or via settings:

```javascript
await EmailService.saveConfig({
  ...existingConfig,
  enabled: true
});
```

## Troubleshooting

### "Email service is not enabled"
- Set `enabled: true` in configuration

### "Network request failed"
- Check `backendUrl` is correct
- Ensure backend server is running
- For physical devices, verify device can reach the backend
- Check firewall/network settings

### "Invalid API key"
- Verify `apiKey` in app matches `API_KEY` in backend `.env`

### "Failed to send email"
- Check backend logs for detailed error
- Verify Gmail OAuth tokens are valid
- Check Gmail API is enabled in Google Cloud Console

### Testing on Physical Device
If your phone can't reach `localhost:3000`:
1. Find your computer's local IP address
2. Update `backendUrl` to `http://YOUR_LOCAL_IP:3000`
3. Ensure phone and computer are on same WiFi network
4. Check firewall allows connections on port 3000

### CORS Errors
Add your app's origin to backend `.env`:
```env
ALLOWED_ORIGINS=http://localhost:19000,http://localhost:19001
```

## Current Email Integration Status

✅ **Already Integrated:**
- Password reset emails (AuthContext)
- Payment confirmation emails (InvoiceScreen)
- Invoice emails (InvoiceService)
- Appointment reminder emails (template ready)

📧 **Email Types Available:**
1. `sendInvoiceEmail()` - Invoice with PDF
2. `sendPaymentConfirmation()` - Payment receipts
3. `sendAppointmentReminder()` - Appointment notifications
4. `sendPasswordReset()` - Password reset links
5. `sendPasswordChanged()` - Password change confirmations

## Security Best Practices

1. **Never commit API keys** - Use environment variables
2. **Use HTTPS in production** - Encrypt data in transit
3. **Rotate API keys regularly** - Update both backend and app
4. **Monitor failed attempts** - Set up logging/alerts
5. **Rate limit appropriately** - Prevent abuse
6. **Validate email addresses** - Prevent sending to invalid emails

## Support

Need help? Check:
- Backend logs: `cd backend && npm run dev`
- Mobile app console: Look for `📧 Sending email` logs
- Backend README: [backend/README.md](../backend/README.md)

For issues: contact 876nurses@gmail.com
