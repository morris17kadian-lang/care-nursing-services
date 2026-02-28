# How to Upload Healthcare Images for Welcome Email

## Step 1: Save Your Images

Save your healthcare images in this folder (`email-images/`) with these exact names:

- **nurse-elderly-care.jpg** - Nurse with elderly patient (compassionate care)
- **hands-compassion.jpg** - Hands holding / compassion
- **middle-strip.jpg** - NEW middle photo for the 3-image strip
- **home-care-team.jpg** - Home care team with patient in bed
- **header-confetti.png** - Header background image

## Step 2: Upload to Firebase Storage

Once you've saved the images, run:

```bash
node upload-healthcare-images.js
```

This will:
1. Upload all 3 images to Firebase Storage
2. Make them publicly accessible
3. Print out the URLs you need

## Step 3: Update welcomeEmail.js

Copy the URLs printed by the script and update these lines in `services/welcomeEmail.js`:

```javascript
const nurseElderlyImage = 'YOUR_URL_HERE';
const handsCompassionImage = 'YOUR_URL_HERE';
const middleStripImage = 'YOUR_URL_HERE';
const homeCareTeamImage = 'YOUR_URL_HERE';
const headerConfettiImage = 'YOUR_URL_HERE';
```

## Image Requirements

- **Format:** JPG or PNG
- **Size:** Recommended max width 800px for email compatibility
- **File size:** Keep under 500KB per image for fast loading

## Quick Test

After updating the URLs, test by running:

```bash
node test-welcome-email-with-images.js
```

This will send a test email with your actual images!
