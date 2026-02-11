const { google } = require('googleapis');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
const config = require('../config/gmail-config');

/**
 * Gmail Service using OAuth 2.0 for secure email sending
 */
class GmailService {
  constructor() {
    this.oauth2Client = null;
    this.transporter = null;
    this.initialize();
  }

  /**
   * Initialize OAuth2 client
   */
  initialize() {
    try {
      const { clientId, clientSecret, redirectUri } = config.oauth2Credentials;

      // Create OAuth2 client
      this.oauth2Client = new google.auth.OAuth2(
        clientId,
        clientSecret,
        redirectUri
      );

      // Set refresh token
      this.oauth2Client.setCredentials({
        refresh_token: config.refreshToken
      });

      console.log('✅ Gmail OAuth2 client initialized');
    } catch (error) {
      console.error('❌ Error initializing Gmail OAuth2 client:', error);
    }
  }

  /**
   * Get access token from refresh token
   */
  async getAccessToken() {
    try {
      const { token } = await this.oauth2Client.getAccessToken();
      return token;
    } catch (error) {
      console.error('Error getting access token:', error);
      throw new Error(`Failed to get Gmail access token: ${error.message}`);
    }
  }

  /**
   * Create nodemailer transporter with OAuth2
   */
  async createTransporter() {
    try {
      const accessToken = await this.getAccessToken();

      return nodemailer.createTransport({
        service: 'gmail',
        auth: {
          type: 'OAuth2',
          user: config.emailAccount,
          clientId: config.oauth2Credentials.clientId,
          clientSecret: config.oauth2Credentials.clientSecret,
          refreshToken: config.refreshToken,
          accessToken: accessToken
        }
      });
    } catch (error) {
      console.error('Error creating transporter:', error);
      throw error;
    }
  }

  /**
   * Send email using Gmail API directly
   */
  async sendEmail(emailData, retries = 0) {
    try {
      const { from, to, subject, html, text, attachments = [], replyTo } = emailData;

      // Validate required fields
      if (!to || !subject || (!html && !text)) {
        throw new Error('Missing required email fields (to, subject, html/text)');
      }

      // Construct email
      const toAddress = Array.isArray(to) ? to.join(', ') : to;
      const fromAddress = `${from.name || config.emailSettings.fromName} <${from.email || config.emailAccount}>`;
      
      // Create MIME message
      const boundaryAlt = `alt_${Date.now()}`;
      const boundaryRelated = `rel_${Date.now()}`;
      const headerLines = [
        `From: ${fromAddress}`,
        `To: ${toAddress}`,
        `Subject: =?utf-8?B?${Buffer.from(subject).toString('base64')}?=`,
        `MIME-Version: 1.0`,
        attachments.length > 0
          ? `Content-Type: multipart/related; boundary="${boundaryRelated}"`
          : `Content-Type: multipart/alternative; boundary="${boundaryAlt}"`
      ];

      const alternativeSection = [
        `--${boundaryAlt}`,
        `Content-Type: text/plain; charset="UTF-8"`,
        `Content-Transfer-Encoding: 7bit`,
        "",
        text || html.replace(/<[^>]*>/g, ''),
        "",
        `--${boundaryAlt}`,
        `Content-Type: text/html; charset="UTF-8"`,
        `Content-Transfer-Encoding: 7bit`,
        "",
        html,
        "",
        `--${boundaryAlt}--`
      ];

      const messageParts = [...headerLines, ""];

      if (attachments.length > 0) {
        messageParts.push(
          `--${boundaryRelated}`,
          `Content-Type: multipart/alternative; boundary="${boundaryAlt}"`,
          "",
          ...alternativeSection,
          ""
        );

        attachments.forEach((attachment) => {
          const contentBuffer = Buffer.isBuffer(attachment.content)
            ? attachment.content
            : Buffer.from(attachment.content, attachment.encoding || 'base64');
          const base64Content = contentBuffer.toString('base64');

          const attachmentHeaders = [
            `--${boundaryRelated}`,
            `Content-Type: ${attachment.contentType}; name="${attachment.filename}"`,
            `Content-Transfer-Encoding: base64`,
            `Content-Disposition: ${attachment.disposition || 'inline'}; filename="${attachment.filename}"`,
            ...(attachment.cid ? [`Content-ID: <${attachment.cid}>`] : [])
          ];

          messageParts.push(
            ...attachmentHeaders,
            "",
            base64Content,
            ""
          );
        });

        messageParts.push(`--${boundaryRelated}--`);
      } else {
        messageParts.push(...alternativeSection);
      }

      const message = messageParts.join('\n');
      const encodedMessage = Buffer.from(message)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      // Send using Gmail API
      const gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });
      const res = await gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: encodedMessage
        }
      });

      console.log('📧 Email sent successfully:', {
        messageId: res.data.id,
        to: toAddress,
        subject: subject
      });

      return {
        success: true,
        messageId: res.data.id,
        response: res.statusText,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('Error sending email:', error);

      // Retry logic
      if (retries < config.emailSettings.maxRetries) {
        console.log(`Retrying email send (attempt ${retries + 1}/${config.emailSettings.maxRetries})...`);
        await this.sleep(config.emailSettings.retryDelay);
        return this.sendEmail(emailData, retries + 1);
      }

      throw error;
    }
  }

  async sendWelcomeEmail({ email, name }) {
    if (!email) {
      throw new Error('Email is required for welcome emails');
    }

      // Load logo for inline CID embedding
      const logoPath = path.join(__dirname, '../../assets/Images/Nurses-logo.png');
      let logoAttachment = null;
      try {
        const logoBuffer = fs.readFileSync(logoPath);
        logoAttachment = {
          filename: 'Nurses-logo.png',
          contentType: 'image/png',
          content: logoBuffer,
          cid: 'nurses-logo'
        };
      } catch (error) {
        console.warn('Could not load logo image:', error.message);
      }

    const trimmedName = (name || '').trim();
    const firstName = trimmedName ? trimmedName.split(' ')[0] : 'there';
    const subject = 'Welcome to 876 Nurses!';
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Welcome to 876 Nurses</title>
          <style>
            @media only screen and (max-width: 600px) {
              .container { width: 100% !important; border-radius: 0 !important; }
              .hero { padding: 40px 20px !important; }
              .content { padding: 30px 20px !important; }
              .step-table { width: 100% !important; }
              .step-text { width: 100% !important; padding: 0 0 20px 0 !important; display: block !important; text-align: center !important; }
              .step-image { width: 100% !important; display: block !important; text-align: center !important; }
            }
          </style>
        </head>
        <body style="margin:0;padding:0;background-color:#f8f9fa;font-family:'Helvetica Neue', Helvetica, Arial, sans-serif;color:#243046;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f8f9fa;padding:20px 0;">
            <tr>
              <td align="center">
                <!-- Main Card -->
                <table width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px; max-width:600px; background-color:#ffffff; border-radius:24px; overflow:hidden; box-shadow:0 15px 45px rgba(0,0,0,0.07);">
                  <!-- Hero Section (Pink Background like image) -->
                  <tr>
                    <td align="center" style="background-color:#fce4ec; padding:70px 40px;">
                      <!-- Envelope Illustration (Mail showing out) -->
                      <div style="margin-bottom:20px;">
                        <table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">
                          <tr>
                            <td align="center" style="background-color:#0066cc; padding:35px 40px; border-radius:28px; box-shadow: 0 15px 30px rgba(0,102,204,0.25);">
                              <div style="background-color:#ffffff; padding:10px 24px; border-radius:8px; margin-bottom:20px; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
                                <div style="color:#0066cc; font-size:10px; font-weight:bold; letter-spacing:3.5px; font-family:Arial, sans-serif;">WELCOME</div>
                              </div>
                              <div style="font-size:70px; line-height:1; filter: grayscale(100%);">✉️</div>
                            </td>
                          </tr>
                        </table>
                      </div>
                      
                      <!-- Confetti Emojis centered below box -->
                      <div style="margin-bottom:35px; font-size:24px; letter-spacing:8px;">
                        ✨🎉🎊
                      </div>
                      
                      <h1 style="margin:0 0 10px 0; font-size:34px; color:#243046; font-weight:800;">Hi ${firstName},</h1>
                      <h2 style="margin:0 0 15px 0; font-size:28px; color:#0066cc; font-weight:700;">welcome to 876 Nurses!</h2>
                      <p style="margin:0; font-size:18px; color:#4e5975; font-weight:400;">Thank you for joining our care community!</p>
                    </td>
                  </tr>

                  <!-- Original Body Wording -->
                  <tr>
                    <td style="padding:50px 45px 10px 45px;">
                      <p style="margin:0 0 20px 0; font-size:17px; line-height:1.7; color:#4e5975;">
                        Thank you for joining <strong>876 Nurses Home Care Services.</strong> We’re honored to be a part of your care journey and can’t wait for you to experience the dedicated support of our nursing team.
                      </p>
                      <div style="background:#f4f6ff; border-radius:20px; padding:28px; margin:30px 0;">
                        <p style="margin:0; font-size:16px; color:#4e5975; line-height:1.8;">
                          • Explore personalized care plans and scheduling.<br/>
                          • Chat securely with our nurses and care coordinators.<br/>
                          • Track appointments, reminders, invoices, and notifications in one place.
                        </p>
                      </div>
                    </td>
                  </tr>

                  <!-- Login Steps Section -->
                  <tr>
                    <td style="padding:40px 45px;">
                      <h3 style="margin:0 0 40px 0; font-size:22px; color:#243046; text-align:center; font-weight:800; letter-spacing: -0.5px;">How to Log In</h3>
                      
                      <!-- Step 1 -->
                      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:40px;">
                        <tr>
                          <td width="65%" style="vertical-align:middle; padding-right:20px;" class="step-text">
                            <h4 style="margin:0 0 8px 0; font-size:19px; color:#0066cc; font-weight:700;">Step 1: Launch the App</h4>
                            <p style="margin:0; font-size:15px; line-height:1.6; color:#4e5975;">Open the 876 Nurses app on your mobile device or visit our website to get started.</p>
                          </td>
                          <td width="35%" align="right" class="step-image">
                            <div style="background-color:#e3f2fd; width:100px; height:100px; line-height:100px; border-radius:24px; text-align:center; font-size:45px;">📱</div>
                          </td>
                        </tr>
                      </table>

                      <!-- Step 2 -->
                      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:40px;">
                        <tr>
                          <td width="35%" align="left" class="step-image">
                            <div style="background-color:#e0f2f1; width:100px; height:100px; line-height:100px; border-radius:24px; text-align:center; font-size:45px;">🔑</div>
                          </td>
                          <td width="65%" style="vertical-align:middle; padding-left:20px;" class="step-text">
                            <h4 style="margin:0 0 8px 0; font-size:19px; color:#0066cc; font-weight:700;">Step 2: Sign In</h4>
                            <p style="margin:0; font-size:15px; line-height:1.6; color:#4e5975;">Enter your registered email address and the secure password you created during signup.</p>
                          </td>
                        </tr>
                      </table>

                      <!-- Step 3 -->
                      <table width="100%" cellpadding="0" cellspacing="0" border="0">
                        <tr>
                          <td width="65%" style="vertical-align:middle; padding-right:20px;" class="step-text">
                            <h4 style="margin:0 0 8px 0; font-size:19px; color:#0066cc; font-weight:700;">Step 3: Start Your Journey</h4>
                            <p style="margin:0; font-size:15px; line-height:1.6; color:#4e5975;">Access your dashboard to book services, chat with nurses, and manage your care plan.</p>
                          </td>
                          <td width="35%" align="right" class="step-image">
                            <div style="background-color:#fff3e0; width:100px; height:100px; line-height:100px; border-radius:24px; text-align:center; font-size:45px;">🚀</div>
                          </td>
                        </tr>
                      </table>

                      <div style="text-align:center; margin-top:50px;">
                        <a href="https://www.876nurses.com/login" style="display:inline-block; background:linear-gradient(135deg,#0066cc,#22d0cd); color:#ffffff; text-decoration:none; padding:18px 45px; border-radius:14px; font-weight:700; font-size:16px; box-shadow: 0 10px 20px rgba(0,102,204,0.15);">Sign In Now</a>
                      </div>
                    </td>
                  </tr>

                  <!-- App Section -->
                  <tr>
                    <td align="center" style="background-color:#fce4ec; padding:60px 40px;">
                      <h3 style="margin:0 0 25px 0; font-size:22px; color:#243046; font-weight:800;">Get Our Mobile App</h3>
                      <table cellpadding="0" cellspacing="0" border="0">
                        <tr>
                          <td style="padding:0 10px;">
                            <a href="#"><img src="https://upload.wikimedia.org/wikipedia/commons/thumb/3/3c/Download_on_the_App_Store_Badge.svg/2560px-Download_on_the_App_Store_Badge.svg.png" alt="App Store" style="height:40px; width:auto;" /></a>
                          </td>
                          <td style="padding:0 10px;">
                            <a href="#"><img src="https://upload.wikimedia.org/wikipedia/commons/thumb/7/78/Google_Play_Store_badge_EN.svg/2560px-Google_Play_Store_badge_EN.svg.png" alt="Google Play" style="height:40px; width:auto;" /></a>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>

                <!-- Footer -->
                <table width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px; max-width:600px; padding:50px 20px; text-align:center;">
                  <tr>
                    <td style="font-size:13px; color:#94a2c2; line-height:1.8; font-family: Arial, sans-serif;">
                      If you have any questions, feel free to message us at <a href="mailto:support@876nurses.com" style="color:#0066cc; text-decoration:none; font-weight:bold;">support@876nurses.com</a>.<br />
                      All rights reserved &copy; 2026 876 Nurses Home Care Services.<br /><br />
                      <a href="#" style="color:#0066cc; text-decoration:none;">Update email preferences</a> &nbsp; | &nbsp; <a href="#" style="color:#0066cc; text-decoration:none;">Unsubscribe</a><br />
                      876 Nurses Home Care Services · Kingston, Jamaica<br />
                      <a href="#" style="color:#0066cc; text-decoration:none;">Terms of use</a> &nbsp; | &nbsp; <a href="#" style="color:#0066cc; text-decoration:none;">Privacy Policy</a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `;
    const text = `Hi ${firstName},\n\nWelcome to 876 Nurses! We're honored to be a part of your care journey.\n\nHow to Log In:\n1. Launch the App: Open the 876 Nurses app or visit our website.\n2. Sign In: Enter your registered email and password.\n3. Start Your Journey: Access your dashboard and manage your care.\n\nDownload our mobile app on the App Store or Google Play.\n\nWith gratitude,\nThe 876 Nurses Team`;

    return this.sendEmail({
      from: {
        name: config.emailSettings.fromName,
        email: config.emailAccount
      },
      to: email,
      subject,
      html,
      text,
      attachments: logoAttachment ? [logoAttachment] : [],
      replyTo: config.emailSettings.replyTo
    });
  }

  /**
   * Send bulk emails (multiple recipients)
   */
  async sendBulkEmails(emails) {
    const results = [];

    for (const email of emails) {
      try {
        const result = await this.sendEmail(email);
        results.push({ ...result, email: email.to });
      } catch (error) {
        results.push({
          success: false,
          error: error.message,
          email: email.to
        });
      }
    }

    return results;
  }

  /**
   * Test email configuration
   */
  async testConfiguration(testEmail) {
    try {
      const result = await this.sendEmail({
        from: {
          name: config.emailSettings.fromName,
          email: config.emailAccount
        },
        to: testEmail,
        subject: '876 Nurses Email Service - Test Email',
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px;">
            <h2 style="color: #667eea;">✅ Email Service Test Successful</h2>
            <p>This is a test email from 876 Nurses Email Service.</p>
            <p><strong>Configuration Details:</strong></p>
            <ul>
              <li>Service: Gmail API with OAuth 2.0</li>
              <li>From: ${config.emailAccount}</li>
              <li>Timestamp: ${new Date().toISOString()}</li>
            </ul>
            <p>If you received this email, your Gmail API configuration is working correctly!</p>
          </div>
        `
      });

      return result;
    } catch (error) {
      throw new Error(`Email configuration test failed: ${error.message}`);
    }
  }

  /**
   * Helper: Sleep function for retry delays
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
module.exports = new GmailService();
