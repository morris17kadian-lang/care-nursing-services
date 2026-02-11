import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Email Service for sending emails via Gmail API or SMTP
 * This service handles all email communications for the app including:
 * - Invoice emails
 * - Payment confirmations
 * - Appointment reminders
 * - System notifications
 */
class EmailService {
  static GMAIL_CONFIG_KEY = '@care_gmail_config';
  
  // Default email configuration
  static defaultConfig = {
    fromEmail: '876nurses@gmail.com',
    fromName: '876 Nurses Home Care Services',
    replyTo: '876nurses@gmail.com',
    backendUrl: 'http://localhost:3000', // Update this for production
    apiKey: 'your-secure-api-key-here', // Update this to match backend .env
    enabled: false
  };

  /**
   * Save Gmail configuration
   * @param {Object} config - Gmail configuration
   */
  static async saveConfig(config) {
    try {
      await AsyncStorage.setItem(this.GMAIL_CONFIG_KEY, JSON.stringify(config));
      return { success: true };
    } catch (error) {
      console.error('Error saving email config:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get Gmail configuration
   */
  static async getConfig() {
    try {
      const stored = await AsyncStorage.getItem(this.GMAIL_CONFIG_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
      return this.defaultConfig;
    } catch (error) {
      console.error('Error loading email config:', error);
      return this.defaultConfig;
    }
  }

  /**
   * Send email via backend API
   * @param {Object} emailData - Email data
   */
  static async send(emailData) {
    try {
      const config = await this.getConfig();
      
      if (!config.enabled) {
        console.log('Email service is disabled');
        return { success: false, error: 'Email service is not enabled' };
      }

      const { to, subject, html, text, attachments = [] } = emailData;

      if (!to || !subject || (!html && !text)) {
        return { success: false, error: 'Missing required email fields' };
      }

      // Prepare email payload for backend
      const payload = {
        from: {
          email: config.fromEmail || this.defaultConfig.fromEmail,
          name: config.fromName || this.defaultConfig.fromName
        },
        to: Array.isArray(to) ? to : [to],
        replyTo: config.replyTo || this.defaultConfig.replyTo,
        subject,
        html: html || text,
        text: text || html,
        attachments
      };

      // Get backend URL from config or use default
      const backendUrl = config.backendUrl || 'http://localhost:3000';
      const apiKey = config.apiKey || 'your-secure-api-key-here';

      console.log('📧 Sending email via backend:', {
        to: payload.to,
        subject: payload.subject,
        from: payload.from.email
      });

      // Call backend API
      const response = await fetch(`${backendUrl}/api/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to send email');
      }

      return result;
    } catch (error) {
      console.error('Error sending email:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Send invoice email with PDF attachment
   */
  static async sendInvoiceEmail({ to, invoiceData, pdfUri }) {
    try {
      const subject = `Invoice ${invoiceData.invoiceNumber} - 876 Nurses Home Care Services`;
      
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .invoice-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
            .amount { font-size: 24px; color: #667eea; font-weight: bold; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
            .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Invoice from 876 Nurses</h1>
              <p>Professional Home Care Services</p>
            </div>
            <div class="content">
              <p>Dear ${invoiceData.clientName},</p>
              <p>Thank you for choosing 876 Nurses Home Care Services. Please find your invoice details below:</p>
              
              <div class="invoice-details">
                <div class="detail-row">
                  <span>Invoice Number:</span>
                  <strong>${invoiceData.invoiceNumber}</strong>
                </div>
                <div class="detail-row">
                  <span>Date:</span>
                  <strong>${invoiceData.date}</strong>
                </div>
                <div class="detail-row">
                  <span>Service:</span>
                  <strong>${invoiceData.service || invoiceData.services?.join(', ') || 'Professional Care'}</strong>
                </div>
                <div class="detail-row">
                  <span>Amount:</span>
                  <span class="amount">JMD $${(invoiceData.amount || invoiceData.total || 0).toFixed(2)}</span>
                </div>
                ${invoiceData.paymentStatus === 'partial' ? `
                  <div class="detail-row">
                    <span>Paid Amount:</span>
                    <strong style="color: #10B981;">JMD $${(invoiceData.paidAmount || 0).toFixed(2)}</strong>
                  </div>
                  <div class="detail-row">
                    <span>Outstanding:</span>
                    <strong style="color: #F59E0B;">JMD $${(invoiceData.outstandingAmount || 0).toFixed(2)}</strong>
                  </div>
                ` : ''}
              </div>

              ${invoiceData.paymentStatus !== 'paid' ? `
                <p style="text-align: center;">
                  <a href="#" class="button">Pay Invoice</a>
                </p>
              ` : `
                <p style="text-align: center; color: #10B981; font-weight: bold;">✓ PAID</p>
              `}

              <p>The detailed invoice is attached to this email as a PDF document.</p>
              
              <p>If you have any questions about this invoice, please don't hesitate to contact us.</p>
              
              <p>Best regards,<br>
              876 Nurses Home Care Services Team</p>
            </div>
            <div class="footer">
              <p>876 Nurses Home Care Services Limited</p>
              <p>60 Knutsford Blvd, Kingston 5, Jamaica</p>
              <p>Phone: (876) 618-9876 | Email: 876nurses@gmail.com</p>
              <p><a href="https://www.876nurses.com">www.876nurses.com</a></p>
            </div>
          </div>
        </body>
        </html>
      `;

      return await this.send({
        to,
        subject,
        html,
        attachments: pdfUri ? [{
          filename: `${invoiceData.invoiceNumber}.pdf`,
          path: pdfUri,
          contentType: 'application/pdf'
        }] : []
      });
    } catch (error) {
      console.error('Error sending invoice email:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send payment confirmation email
   */
  static async sendPaymentConfirmation({ to, paymentData, invoiceData }) {
    try {
      const subject = `Payment Confirmation - Invoice ${invoiceData.invoiceNumber}`;
      
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #10B981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .success-icon { font-size: 48px; margin-bottom: 10px; }
            .payment-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
            .amount { font-size: 24px; color: #10B981; font-weight: bold; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="success-icon">✓</div>
              <h1>Payment Successful!</h1>
              <p>Your payment has been processed</p>
            </div>
            <div class="content">
              <p>Dear ${invoiceData.clientName},</p>
              <p>We have successfully received your payment. Thank you for your prompt payment!</p>
              
              <div class="payment-details">
                <div class="detail-row">
                  <span>Payment Amount:</span>
                  <span class="amount">JMD $${(paymentData.amount || 0).toFixed(2)}</span>
                </div>
                <div class="detail-row">
                  <span>Transaction ID:</span>
                  <strong>${paymentData.transactionId}</strong>
                </div>
                <div class="detail-row">
                  <span>Payment Date:</span>
                  <strong>${new Date().toLocaleDateString()}</strong>
                </div>
                <div class="detail-row">
                  <span>Payment Method:</span>
                  <strong>${paymentData.method || 'Fygaro'}</strong>
                </div>
                <div class="detail-row">
                  <span>Invoice Number:</span>
                  <strong>${invoiceData.invoiceNumber}</strong>
                </div>
              </div>

              <p>This is your official payment confirmation. Please keep this email for your records.</p>
              
              <p>Best regards,<br>
              876 Nurses Home Care Services Team</p>
            </div>
            <div class="footer">
              <p>876 Nurses Home Care Services Limited</p>
              <p>60 Knutsford Blvd, Kingston 5, Jamaica</p>
              <p>Phone: (876) 618-9876 | Email: 876nurses@gmail.com</p>
            </div>
          </div>
        </body>
        </html>
      `;

      return await this.send({ to, subject, html });
    } catch (error) {
      console.error('Error sending payment confirmation:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send appointment reminder email
   */
  static async sendAppointmentReminder({ to, appointmentData }) {
    try {
      const subject = `Appointment Reminder - ${appointmentData.date} at ${appointmentData.time}`;
      
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .appointment-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .detail-row { padding: 10px 0; border-bottom: 1px solid #eee; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🗓️ Appointment Reminder</h1>
              <p>Don't forget your upcoming appointment</p>
            </div>
            <div class="content">
              <p>Dear ${appointmentData.patientName},</p>
              <p>This is a friendly reminder about your upcoming appointment with 876 Nurses Home Care Services.</p>
              
              <div class="appointment-details">
                <div class="detail-row">
                  <strong>Date:</strong> ${appointmentData.date}
                </div>
                <div class="detail-row">
                  <strong>Time:</strong> ${appointmentData.time}
                </div>
                <div class="detail-row">
                  <strong>Service:</strong> ${appointmentData.service}
                </div>
                <div class="detail-row">
                  <strong>Location:</strong> ${appointmentData.address}
                </div>
                ${appointmentData.notes ? `
                  <div class="detail-row">
                    <strong>Notes:</strong> ${appointmentData.notes}
                  </div>
                ` : ''}
              </div>

              <p>If you need to reschedule or cancel this appointment, please contact us as soon as possible.</p>
              
              <p>We look forward to providing you with excellent care!</p>
              
              <p>Best regards,<br>
              876 Nurses Home Care Services Team</p>
            </div>
            <div class="footer">
              <p>876 Nurses Home Care Services Limited</p>
              <p>Phone: (876) 618-9876 | Email: 876nurses@gmail.com</p>
            </div>
          </div>
        </body>
        </html>
      `;

      return await this.send({ to, subject, html });
    } catch (error) {
      console.error('Error sending appointment reminder:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Test email configuration
   */
  static async testConfiguration(testEmail) {
    try {
      const config = await this.getConfig();
      
      return await this.send({
        to: testEmail || config.fromEmail,
        subject: 'Test Email - 876 Nurses Email Service',
        html: `
          <h2>Email Service Test</h2>
          <p>This is a test email from 876 Nurses Home Care Services.</p>
          <p>If you received this email, your email service is configured correctly!</p>
          <p><strong>Configuration:</strong></p>
          <ul>
            <li>From: ${config.fromEmail}</li>
            <li>Name: ${config.fromName}</li>
            <li>Status: ${config.enabled ? 'Enabled' : 'Disabled'}</li>
          </ul>
          <p>Timestamp: ${new Date().toISOString()}</p>
        `
      });
    } catch (error) {
      console.error('Error testing email configuration:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send password reset email
   */
  static async sendPasswordReset({ to, resetLink, userName }) {
    try {
      const subject = 'Password Reset Request - 876 Nurses';
      
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .reset-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; }
            .button { display: inline-block; padding: 15px 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
            .security-notice { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔐 Password Reset Request</h1>
              <p>876 Nurses Home Care Services</p>
            </div>
            <div class="content">
              <p>Hello${userName ? ' ' + userName : ''},</p>
              <p>We received a request to reset your password for your 876 Nurses account.</p>
              
              <div class="reset-box">
                <p>Click the button below to reset your password:</p>
                <a href="${resetLink}" class="button">Reset Password</a>
                <p style="margin-top: 20px; font-size: 12px; color: #666;">
                  This link will expire in 1 hour for security reasons.
                </p>
              </div>

              <div class="security-notice">
                <strong>⚠️ Security Notice</strong>
                <p>If you didn't request this password reset, please ignore this email. Your password will remain unchanged.</p>
                <p>For security reasons, we never ask for your password via email.</p>
              </div>
              
              <p>If the button doesn't work, copy and paste this link into your browser:</p>
              <p style="word-break: break-all; color: #667eea;">${resetLink}</p>
              
              <p>Best regards,<br>
              876 Nurses Home Care Services Team</p>
            </div>
            <div class="footer">
              <p>876 Nurses Home Care Services Limited</p>
              <p>60 Knutsford Blvd, Kingston 5, Jamaica</p>
              <p>Phone: (876) 618-9876 | Email: 876nurses@gmail.com</p>
              <p>This is an automated message, please do not reply to this email.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      return await this.send({ to, subject, html });
    } catch (error) {
      console.error('Error sending password reset email:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send password changed confirmation email
   */
  static async sendPasswordChanged({ to, userName }) {
    try {
      const subject = 'Password Changed Successfully - 876 Nurses';
      
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #10B981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .success-icon { font-size: 48px; margin-bottom: 10px; }
            .info-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .security-notice { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="success-icon">✓</div>
              <h1>Password Changed</h1>
              <p>Your password has been updated</p>
            </div>
            <div class="content">
              <p>Hello${userName ? ' ' + userName : ''},</p>
              <p>This email confirms that your password for your 876 Nurses account has been successfully changed.</p>
              
              <div class="info-box">
                <p><strong>Changed:</strong> ${new Date().toLocaleString()}</p>
                <p><strong>Account:</strong> ${to}</p>
              </div>

              <div class="security-notice">
                <strong>⚠️ Didn't make this change?</strong>
                <p>If you didn't change your password, please contact us immediately at (876) 618-9876 or 876nurses@gmail.com.</p>
                <p>Your account security is our priority.</p>
              </div>
              
              <p>Best regards,<br>
              876 Nurses Home Care Services Team</p>
            </div>
            <div class="footer">
              <p>876 Nurses Home Care Services Limited</p>
              <p>60 Knutsford Blvd, Kingston 5, Jamaica</p>
              <p>Phone: (876) 618-9876 | Email: 876nurses@gmail.com</p>
            </div>
          </div>
        </body>
        </html>
      `;

      return await this.send({ to, subject, html });
    } catch (error) {
      console.error('Error sending password changed email:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send welcome email
   */
  static async sendWelcomeEmail({ email, name }) {
    try {
      const config = await this.getConfig();
      const backendUrl = config.backendUrl || 'http://localhost:3000';
      const apiKey = config.apiKey || 'your-secure-api-key-here';

      if (!config.enabled) {
        console.log('Email service is disabled');
        return { success: false, error: 'Email service is not enabled' };
      }

      const response = await fetch(`${backendUrl}/api/send-welcome-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey
        },
        body: JSON.stringify({ email, name })
      });

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error sending welcome email:', error);
      return { success: false, error: error.message };
    }
  }
}

export default EmailService;
