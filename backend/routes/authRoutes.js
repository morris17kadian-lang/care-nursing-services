const express = require('express');
const router = express.Router();
const { getFirestore } = require('../services/firebaseAdmin');

const COLLECTION_LOOKUPS = [
  { collection: 'users', field: 'username', defaultRole: 'patient' },
  { collection: 'nurses', field: 'nurseCode', defaultRole: 'nurse' },
  { collection: 'admins', field: 'adminCode', defaultRole: 'admin' },
];

router.post('/lookup-username', async (req, res) => {
  const rawUsername = req.body?.username;
  if (!rawUsername || typeof rawUsername !== 'string') {
    return res.status(400).json({ success: false, error: 'Username is required' });
  }

  const username = rawUsername.trim();
  if (!username) {
    return res.status(400).json({ success: false, error: 'Username is required' });
  }

  try {
    const db = getFirestore();
    if (!db) {
      return res.status(500).json({ success: false, error: 'Firebase Admin is not configured' });
    }

    for (const target of COLLECTION_LOOKUPS) {
      const snapshot = await db
        .collection(target.collection)
        .where(target.field, '==', username)
        .limit(1)
        .get();

      if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        const data = doc.data() || {};
        return res.json({
          success: true,
          user: {
            id: doc.id,
            email: data.email || data.contactEmail || null,
            role: data.role || target.defaultRole,
            username: data.username || data[target.field] || username,
            nurseCode: data.nurseCode || null,
            adminCode: data.adminCode || null,
            phone: data.phone || data.contactPhone || null,
          },
          source: target.collection,
        });
      }
    }

    return res.status(404).json({ success: false, error: 'User not found' });
  } catch (error) {
    console.error('[AuthRoutes] Failed to lookup username:', error);
    return res.status(500).json({ success: false, error: 'Unable to lookup username at this time' });
  }
});

module.exports = router;
