# 876Nurses Mobile App

A complete mobile application for 876Nurses built with React Native and Expo.

## Features

- **Home Screen**: Hero section with logo, CEO image, quick actions, contact info, opening hours, and why choose CARE
- **Services Screen**: Browse all nursing services organized by category with detailed modals
- **Book Appointment**: Complete booking form with service selection, date/time pickers, and form validation
- **Contact Screen**: Direct call/email/Instagram links, opening hours, location, and emergency information
- **Bottom Tab Navigation**: Easy navigation between all screens
- **Brand Matching**: Custom gradient colors (#0a7fb8 to #22d0cd) matching the CARE logo

## Prerequisites

- Node.js 18+ (LTS recommended)
- Expo CLI (bundled with project)

## Installation

```bash
cd 876nurses
npm install
```

## Running the App

### Start Development Server

```bash
npm start
```

Then:
- Press `w` to open in web browser
- Press `i` to open iOS simulator (requires Xcode on Mac)
- Press `a` to open Android emulator (requires Android Studio)
- Scan QR code with Expo Go app on your physical device

### Platform-Specific Commands

```bash
npm run ios       # Open in iOS simulator
npm run android   # Open in Android emulator
npm run web       # Open in web browser
```

## Project Structure

```
876nurses/
├── screens/
│   ├── HomeScreen.js       # Main landing page
│   ├── ServicesScreen.js   # Services catalog with details
│   ├── BookScreen.js       # Appointment booking form
│   └── ContactScreen.js    # Contact information & hours
├── components/
│   └── Cards.js            # Reusable UI components
├── assets/
│   └── Images/             # Logo and CEO images
├── constants.js            # Colors, gradients, services data
├── App.js                  # Navigation setup
├── app.json                # Expo configuration
├── package.json            # Dependencies
└── babel.config.js         # Babel configuration
```

## Customization

### Update Colors

Edit `constants.js` to adjust the brand colors:

```javascript
export const COLORS = {
  primary: '#0a7fb8',
  accent: '#22d0cd',
  // ...
};
```

### Update Services

Modify the `SERVICES` array in `constants.js` to add/remove services.

### Update Contact Info

Change contact details in `CONTACT_INFO` object in `constants.js`.

## Building for Production

### Using Expo EAS Build

```bash
npm install -g eas-cli
eas login
eas build:configure
eas build --platform ios
eas build --platform android
```

### Submit to App Stores

```bash
eas submit --platform ios
eas submit --platform android
```

## Technologies

- **React Native** - Cross-platform mobile framework
- **Expo** - Development platform and tools
- **React Navigation** - Bottom tabs navigation
- **Expo Linear Gradient** - Gradient backgrounds
- **Expo Google Fonts** - Poppins font family
- **Vector Icons** - Material Community Icons

## Support

For issues or questions about the app, contact:
- Email: nursingservicesandmorecare@gmail.com
- Phone: 876-288-7304
- Instagram: @carenursingservices
# 876Nurses
