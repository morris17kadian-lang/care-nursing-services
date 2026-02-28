const { google } = require('googleapis');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
const { Resvg } = require('@resvg/resvg-js');
const config = require('../config/gmail-config');

// Inline SVG hero banner encoded as base64 so we can render it to PNG for inline email embedding
const WELCOME_BANNER_SVG_BASE64 = 'PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMzQ4IiBoZWlnaHQ9IjU4OCIgdmlld0JveD0iMCAwIDEzNDggNTg4Ij4KICA8ZGVmcz4KICAgIDxsaW5lYXJHcmFkaWVudCBpZD0iYmciIHgxPSIwJSIgeTE9IjAlIiB4Mj0iMTAwJSIgeTI9IjAlIj4KICAgICAgPHN0b3Agb2Zmc2V0PSIwJSIgc3RvcC1jb2xvcj0iIzBjMmNkNiIgLz4KICAgICAgPHN0b3Agb2Zmc2V0PSIxMDAlIiBzdG9wLWNvbG9yPSIjMWE2YmZmIiAvPgogICAgPC9saW5lYXJHcmFkaWVudD4KICAgIDxsaW5lYXJHcmFkaWVudCBpZD0iY29uZmV0dGktb3JhbmdlIiB4MT0iMCUiIHkxPSIwJSIgeDI9IjEwMCUiIHkyPSIxMDAlIj4KICAgICAgPHN0b3Agb2Zmc2V0PSIwJSIgc3RvcC1jb2xvcj0iI2ZmYmUzZCIgLz4KICAgICAgPHN0b3Agb2Zmc2V0PSIxMDAlIiBzdG9wLWNvbG9yPSIjZmY2YjAwIiAvPgogICAgPC9saW5lYXJHcmFkaWVudD4KICAgIDxsaW5lYXJHcmFkaWVudCBpZD0iY29uZmV0dGktcGluayIgeDE9IjAlIiB5MT0iMCUiIHgyPSIxMDAlIiB5Mj0iMTAwJSI+CiAgICAgIDxzdG9wIG9mZnNldD0iMCUiIHN0b3AtY29sb3I9IiNmZjdhZDEiIC8+CiAgICAgIDxzdG9wIG9mZnNldD0iMTAwJSIgc3RvcC1jb2xvcj0iI2ZmMmM3YSIgLz4KICAgIDwvbGluZWFyR3JhZGllbnQ+CiAgICA8bGluZWFyR3JhZGllbnQgaWQ9ImNvbmZldHRpLXllbGxvdyIgeDE9IjAlIiB5MT0iMCUiIHgyPSIxMDAlIiB5Mj0iMTAwJSI+CiAgICAgIDxzdG9wIG9mZnNldD0iMCUiIHN0b3AtY29sb3I9IiNmZmYxNzYiIC8+CiAgICAgIDxzdG9wIG9mZnNldD0iMTAwJSIgc3RvcC1jb2xvcj0iI2ZmYzEwNyIgLz4KICAgIDwvbGluZWFyR3JhZGllbnQ+CiAgICA8ZmlsdGVyIGlkPSJzaGFkb3ciIHg9Ii0yMCUiIHk9Ii0yMCUiIHdpZHRoPSIxNDAlIiBoZWlnaHQ9IjE0MCUiPgogICAgICA8ZmVEcm9wU2hhZG93IGR4PSIwIiBkeT0iMTgiIHN0ZERldmlhdGlvbj0iMjAiIGZsb29kLWNvbG9yPSIjMDQxMDQ2IiBmbG9vZC1vcGFjaXR5PSIwLjQ1IiAvPgogICAgPC9maWx0ZXI+CiAgPC9kZWZzPgogIDxyZWN0IHdpZHRoPSIxMzQ4IiBoZWlnaHQ9IjU4OCIgcng9IjM2IiBmaWxsPSJ1cmwoI2JnKSIgLz4KICA8ZyBmaWx0ZXI9InVybCgjc2hhZG93KSI+CiAgICA8dGV4dCB4PSI2NzQiIHk9IjM2MCIgZm9udC1zaXplPSIyNTAiIGZvbnQtd2VpZ2h0PSI4MDAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiNmZmZmZmYiIGZvbnQtZmFtaWx5PSInTW9udHNlcnJhdCcsICdBcmlhbCBCbGFjaycsICdIZWx2ZXRpY2EgTmV1ZScsIHNhbnMtc2VyaWYiIGxldHRlci1zcGFjaW5nPSI1Ij5XRUxDT01FPC90ZXh0PgogIDwvZz4KICA8ZyBvcGFjaXR5PSIwLjkiPgogICAgPHJlY3QgeD0iMTIwIiB5PSI2MCIgd2lkdGg9IjIwIiBoZWlnaHQ9IjcwIiByeD0iOCIgZmlsbD0idXJsKCNjb25mZXR0aS15ZWxsb3cpIiB0cmFuc2Zvcm09InJvdGF0ZSgtMjAgMTMwIDk1KSIgLz4KICAgIDxyZWN0IHg9IjI2MCIgeT0iMTIwIiB3aWR0aD0iMTgiIGhlaWdodD0iNjAiIHJ4PSI4IiBmaWxsPSJ1cmwoI2NvbmZldHRpLW9yYW5nZSkiIHRyYW5zZm9ybT0icm90YXRlKDI1IDI2OSAxNTApIiAvPgogICAgPHJlY3QgeD0iNDMwIiB5PSI4MCIgd2lkdGg9IjE2IiBoZWlnaHQ9IjU1IiByeD0iNyIgZmlsbD0idXJsKCNjb25mZXR0aS1waW5rKSIgdHJhbnNmb3JtPSJyb3RhdGUoLTEyIDQzOCAxMDcpIiAvPgogICAgPHJlY3QgeD0iNjAwIiB5PSI0MCIgd2lkdGg9IjE4IiBoZWlnaHQ9IjYwIiByeD0iOCIgZmlsbD0idXJsKCNjb25mZXR0aS15ZWxsb3cpIiB0cmFuc2Zvcm09InJvdGF0ZSgxOCA2MDkgNzApIiAvPgogICAgPHJlY3QgeD0iNzgwIiB5PSI3MCIgd2lkdGg9IjE2IiBoZWlnaHQ9IjU1IiByeD0iNyIgZmlsbD0idXJsKCNjb25mZXR0aS1vcmFuZ2UpIiB0cmFuc2Zvcm09InJvdGF0ZSgtMTYgNzg4IDk3KSIgLz4KICAgIDxyZWN0IHg9IjkzMCIgeT0iNDUiIHdpZHRoPSIxOCIgaGVpZ2h0PSI2NSIgcng9IjgiIGZpbGw9InVybCgjY29uZmV0dGktcGluaykiIHRyYW5zZm9ybT0icm90YXRlKDIyIDkzOSA3NykiIC8+CiAgICA8cmVjdCB4PSIxMDgwIiB5PSI5MCIgd2lkdGg9IjE2IiBoZWlnaHQ9IjU1IiByeD0iNyIgZmlsbD0idXJsKCNjb25mZXR0aS15ZWxsb3cpIiB0cmFuc2Zvcm09InJvdGF0ZSgtMTggMTA4OCAxMTkpIiAvPgogICAgPHJlY3QgeD0iMTIyMCIgeT0iNjAiIHdpZHRoPSIxOCIgaGVpZ2h0PSI2NSIgcng9IjgiIGZpbGw9InVybCgjY29uZmV0dGktb3JhbmdlKSIgdHJhbnNmb3JtPSJyb3RhdGUoMTYgMTIyOSA5MikiIC8+CiAgICA8cmVjdCB4PSIyMDAiIHk9IjQwMCIgd2lkdGg9IjE4IiBoZWlnaHQ9IjY1IiByeD0iOCIgZmlsbD0idXJsKCNjb25mZXR0aS1waW5rKSIgdHJhbnNmb3JtPSJyb3RhdGUoLTMyIDIwOSA0MzIpIiAvPgogICAgPHJlY3QgeD0iMzYwIiB5PSI0MzAiIHdpZHRoPSIxNiIgaGVpZ2h0PSI1NSIgcng9IjciIGZpbGw9InVybCgjY29uZmV0dGkteWVsbG93KSIgdHJhbnNmb3JtPSJyb3RhdGUoMjggMzY4IDQ1OCkiIC8+CiAgICA8cmVjdCB4PSI1NDAiIHk9IjQyMCIgd2lkdGg9IjE4IiBoZWlnaHQ9IjY1IiByeD0iOCIgZmlsbD0idXJsKCNjb25mZXR0aS1vcmFuZ2UpIiB0cmFuc2Zvcm09InJvdGF0ZSgtMTggNTQ5IDQ1MikiIC8+CiAgICA8cmVjdCB4PSI3MDAiIHk9IjQzMCIgd2lkdGg9IjE2IiBoZWlnaHQ9IjU1IiByeD0iNyIgZmlsbD0idXJsKCNjb25mZXR0aS1waW5rKSIgdHJhbnNmb3JtPSJyb3RhdGUoMTggNzA4IDQ1OCkiIC8+CiAgICA8cmVjdCB4PSI4NjAiIHk9IjQyMCIgd2lkdGg9IjE4IiBoZWlnaHQ9IjY1IiByeD0iOCIgZmlsbD0idXJsKCNjb25mZXR0aS15ZWxsb3cpIiB0cmFuc2Zvcm09InJvdGF0ZSgtMTQgODY5IDQ1MikiIC8+CiAgICA8cmVjdCB4PSIxMDIwIiB5PSI0MzAiIHdpZHRoPSIxNiIgaGVpZ2h0PSI1NSIgcng9IjciIGZpbGw9InVybCgjY29uZmV0dGktb3JhbmdlKSIgdHJhbnNmb3JtPSJyb3RhdGUoMjQgMTAyOCA0NTkpIiAvPgogICAgPHJlY3QgeD0iMTE4MCIgeT0iNDEwIiB3aWR0aD0iMTgiIGhlaWdodD0iNjUiIHJ4PSI4IiBmaWxsPSJ1cmwoI2NvbmZldHRpLXBpbmspIiB0cmFuc2Zvcm09InJvdGF0ZSgtMjQgMTE4OSA0NDIpIiAvPgogIDwvZz4KPC9zdmc+Cg==';
const WELCOME_BANNER_DATA_URI = `data:image/svg+xml;base64,${WELCOME_BANNER_SVG_BASE64}`;
let welcomeBannerPngBuffer = null;

function getWelcomeBannerPngBuffer() {
  if (welcomeBannerPngBuffer) {
    return welcomeBannerPngBuffer;
  }

  try {
    const svgMarkup = Buffer.from(WELCOME_BANNER_SVG_BASE64, 'base64');
    const resvg = new Resvg(svgMarkup, {
      fitTo: {
        mode: 'width',
        value: 1348
      }
    });
    welcomeBannerPngBuffer = resvg.render().asPng();
  } catch (error) {
    console.error('Failed to render welcome hero banner PNG:', error);
    welcomeBannerPngBuffer = null;
  }

  return welcomeBannerPngBuffer;
}

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

    const logoBlock = logoAttachment
      ? '<img src="cid:nurses-logo" alt="876 Nurses Home Care Services" style="display:block;width:86px;height:auto;border:none;outline:none;" />'
      : '<div style="font-size:18px;font-weight:800;color:#14213d;letter-spacing:0.2px;">876 Nurses</div>';

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
              .pad { padding-left: 22px !important; padding-right: 22px !important; }
              .h1 { font-size: 30px !important; }
            }
          </style>
        </head>
        <body style="margin:0;padding:0;background-color:#2f62d7;font-family:Arial, sans-serif;color:#1f2a44;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#2f62d7;padding:40px 0;">
            <tr>
              <td align="center">
                <!-- Main Card -->
                <table width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px; max-width:600px; background-color:#ffffff; border-radius:18px; overflow:hidden; box-shadow:0 14px 40px rgba(0,0,0,0.12);" class="container">
                  <tr>
                    <td align="center" style="padding:36px 40px 14px 40px;" class="pad">
                      ${logoBlock}
                    </td>
                  </tr>

                  <tr>
                    <td align="center" style="padding:0 40px 22px 40px;" class="pad">
                      <h1 class="h1" style="margin:0;font-size:34px;line-height:1.15;font-weight:800;color:#14213d;">Welcome to 876 Nurses!</h1>
                    </td>
                  </tr>

                  <tr>
                    <td style="padding:0 40px 10px 40px;" class="pad">
                      <p style="margin:0 0 14px 0;font-size:16px;line-height:1.65;">Hi ${firstName},</p>
                      <p style="margin:0 0 14px 0;font-size:16px;line-height:1.65;">
                        We’re so glad you found us, and we’re confident this is the start of a long-lasting friendship.
                        Our team is here to support you every step of the way.
                      </p>
                      <p style="margin:0 0 18px 0;font-size:16px;line-height:1.65;">
                        If you’re feeling a little nervous getting started, don’t worry — we’ll be with you throughout your care journey.
                      </p>
                    </td>
                  </tr>

                  <tr>
                    <td style="padding:0 40px 26px 40px;" class="pad">
                      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#e9f0ff;border-radius:14px;">
                        <tr>
                          <td style="padding:18px;">
                            <div style="font-size:16px;font-weight:800;color:#1f2a44;margin:0 0 6px 0;">Quick Tip</div>
                            <div style="font-size:14px;line-height:1.6;color:#2a3558;">
                              Turn on notifications so you never miss appointment updates and care reminders.
                            </div>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <tr>
                    <td align="center" style="padding:0 40px 40px 40px;" class="pad">
                      <a href="https://www.876nurses.com/login" style="display:inline-block;background:#2f62d7;color:#ffffff;text-decoration:none;padding:14px 22px;border-radius:12px;font-weight:800;font-size:15px;">Sign in</a>
                    </td>
                  </tr>
                </table>

                <!-- Footer -->
                <table width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px; max-width:600px; padding:18px 20px 0 20px; text-align:center;">
                  <tr>
                    <td style="font-size:12px; color:#d7e3ff; line-height:1.6; font-family: Arial, sans-serif;">
                      876 Nurses Home Care Services · Kingston, Jamaica<br />
                      Need help? Email <a href="mailto:support@876nurses.com" style="color:#ffffff; text-decoration:underline;">support@876nurses.com</a>
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

    const attachments = [logoAttachment].filter(Boolean);

    return this.sendEmail({
      from: {
        name: config.emailSettings.fromName,
        email: config.emailAccount
      },
      to: email,
      subject,
      html,
      text,
      attachments,
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
