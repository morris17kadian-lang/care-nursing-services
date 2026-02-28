const express = require('express');
const router = express.Router();
const gmailService = require('../services/gmailService');

/**
 * Middleware to verify API key (add your own authentication)
 */
const authenticateRequest = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  const expectedKey = process.env.API_KEY || 'your-secure-api-key-here';

  if (!apiKey || apiKey !== expectedKey) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized - Invalid API key'
    });
  }

  next();
};

/**
 * POST /api/email/send-email
 * Send a single email
 */
router.post('/send-email', authenticateRequest, async (req, res) => {
  try {
    const { from, to, subject, html, text, attachments, replyTo } = req.body;

    // Validate required fields
    if (!to || !subject || (!html && !text)) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: to, subject, and html or text'
      });
    }

    // Send email
    const result = await gmailService.sendEmail({
      from,
      to,
      subject,
      html,
      text,
      attachments,
      replyTo
    });

    res.json(result);
  } catch (error) {
    console.error('Email route error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/email/send-welcome-email
 * Send a welcome email to a newly registered user
 */
router.post('/send-welcome-email', authenticateRequest, async (req, res) => {
  try {
    const { email, name } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'email is required'
      });
    }

    const result = await gmailService.sendWelcomeEmail({ email, name });

    res.json(result);
  } catch (error) {
    console.error('Welcome email error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/email/send-bulk-emails
 * Send multiple emails
 */
router.post('/send-bulk-emails', authenticateRequest, async (req, res) => {
  try {
    const { emails } = req.body;

    if (!Array.isArray(emails) || emails.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'emails must be a non-empty array'
      });
    }

    const results = await gmailService.sendBulkEmails(emails);

    res.json({
      success: true,
      results,
      sent: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length
    });
  } catch (error) {
    console.error('Bulk email route error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/email/test-email
 * Test email configuration
 */
router.post('/test-email', authenticateRequest, async (req, res) => {
  try {
    const { testEmail } = req.body;

    if (!testEmail) {
      return res.status(400).json({
        success: false,
        error: 'testEmail is required'
      });
    }

    const result = await gmailService.testConfiguration(testEmail);

    res.json(result);
  } catch (error) {
    console.error('Test email error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/email/email-status
 * Check email service status
 */
router.get('/email-status', authenticateRequest, async (req, res) => {
  try {
    res.json({
      success: true,
      status: 'operational',
      service: 'Gmail API with OAuth 2.0',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
