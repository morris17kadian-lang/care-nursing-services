# Firebase Functions (Email)

This project sends emails from Firebase Cloud Functions so emails do **not** depend on a laptop/dev server.

## Setup (Gmail App Password)

Runtime: this functions project targets Node.js 20 (Firebase Functions requirement).

1. Create/choose a Gmail account for sending.
2. Enable 2‑Step Verification and generate an **App Password**.
3. Local emulator only (optional): create `functions/.env` and use
	[functions/.env.example](functions/.env.example) as a template.

4. Production deploy: set Firebase Functions **secrets** (recommended):

```bash
firebase use prod
firebase functions:secrets:set GMAIL_USER
firebase functions:secrets:set GMAIL_APP_PASSWORD
```

Optionally set (non-secret):

```bash
firebase functions:config:set email.from_name="876 Nurses Home Care Services" email.from_email="your-sender@gmail.com"
```

5. Deploy:

```bash
firebase deploy --only functions
```

## What runs

- `sendWelcomeEmailOnAuthCreate`: sends a welcome email when a Firebase Auth user is created.
- `sendTransactionalEmail` (callable): app can call to send invoice/notification emails.
- `sendQueuedEmailOnCreate`: app can write documents to Firestore collection `mail` to enqueue emails.
