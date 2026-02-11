const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const emailRoutes = require('./routes/emailRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const { startOverdueInvoiceScheduler } = require('./services/overdueInvoiceScheduler');
const { startDataRetentionScheduler } = require('./services/dataRetentionScheduler');
const servicesRoutes = require('./routes/servicesRoutes');
const authRoutes = require('./routes/authRoutes');
const recurringShiftRoutes = require('./routes/recurringShiftRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: '876 Nurses Email Service'
  });
});

// Routes
app.use('/api/email', emailRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/services', servicesRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/shifts', recurringShiftRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`
🚀 876 Nurses Email Service Started
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📧 Service: Gmail API with OAuth 2.0
🌐 Port: ${PORT}
📍 Environment: ${process.env.NODE_ENV || 'development'}
⏰ Started: ${new Date().toISOString()}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Available endpoints:
  POST   /api/email/send-email
  POST   /api/email/send-bulk-emails
  POST   /api/email/test-email
  GET    /api/email/email-status
  POST   /api/payments/initialize
  GET    /api/payments/verify/:transactionId
  POST   /api/payments/webhook
  GET    /api/services/catalog
  POST   /api/shifts/recurring/:id/request-coverage
  PUT    /api/shifts/recurring/:id/coverage/:coverageRequestId/accept
  PUT    /api/shifts/recurring/:id/coverage/:coverageRequestId/decline
  PUT    /api/shifts/recurring/:id/clock-out
  GET    /health
  `);

  startOverdueInvoiceScheduler();
  startDataRetentionScheduler();
});

module.exports = app;
