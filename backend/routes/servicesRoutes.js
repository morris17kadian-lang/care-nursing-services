const express = require('express');
const router = express.Router();
const { getFirestore } = require('../services/firebaseAdmin');

// GET /api/services/catalog - returns the latest services catalog for all clients
router.get('/catalog', async (req, res) => {
  try {
    const db = getFirestore();
    if (!db) {
      return res.status(500).json({
        success: false,
        error: 'Firebase Admin is not configured. Please verify the service account file.',
      });
    }

    const snapshot = await db.collection('services').orderBy('title', 'asc').get();
    const services = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    return res.json({ success: true, services });
  } catch (error) {
    console.error('[ServicesRoutes] Failed to fetch services catalog:', error);
    return res.status(500).json({
      success: false,
      error: 'Unable to fetch services catalog at this time',
    });
  }
});

module.exports = router;
