# How to Add Test User to OAuth Consent Screen

## 🚨 Current Issue
Getting "Access blocked" error because test user not added yet.

## Method 1: Direct Link (Try This First)
https://console.cloud.google.com/apis/credentials/consent/edit?project=secure-pillar-483322-d9

**On that page:**
1. Scroll to "Test users" section
2. Click "+ ADD USERS"
3. Enter: `876nurses@gmail.com`
4. Click "SAVE"
5. Click "SAVE AND CONTINUE" at bottom

## Method 2: Navigation (If link doesn't work)

### From Google Cloud Console Homepage:
1. Click the **hamburger menu** (☰) in top-left
2. Hover over **"APIs & Services"**
3. Click **"OAuth consent screen"**
4. Click the **"EDIT APP"** button (near top)
5. Click **"SAVE AND CONTINUE"** on App information page
6. Click **"SAVE AND CONTINUE"** on Scopes page
7. Now you should see **"Test users"** section
8. Click "+ ADD USERS"
9. Enter: `876nurses@gmail.com`
10. Click "ADD"
11. Click "SAVE AND CONTINUE"

## Method 3: Using URL Bar Directly

Copy and paste this EXACT URL into your browser:
```
https://console.cloud.google.com/apis/credentials/consent/edit?project=secure-pillar-483322-d9&authuser=0
```

## ✅ How to Verify Test User Was Added

After adding the test user, go back to:
https://console.cloud.google.com/apis/credentials/consent?project=secure-pillar-483322-d9

You should see:
- **Publishing status:** Testing
- **Test users:** 876nurses@gmail.com (with a trash icon to remove)

## 🎯 After Adding Test User

Run this command from the backend folder:
```bash
cd backend
npm run setup-oauth
```

Follow the OAuth flow - it should now work without "Access blocked" error!

## 📝 What's Happening?

Google requires OAuth apps in "Testing" mode to explicitly whitelist users.
Only whitelisted test users can authorize the app.
Once you add 876nurses@gmail.com, that account can complete OAuth.

## 🆘 Still Getting Redirected?

Try opening the link in an **incognito/private window**:
- Chrome: Cmd+Shift+N (Mac) or Ctrl+Shift+N (Windows)
- This prevents caching issues that might cause redirects
