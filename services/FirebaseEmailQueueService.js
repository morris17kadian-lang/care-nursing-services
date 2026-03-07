import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';

class FirebaseEmailQueueService {
  static async enqueueEmail({ to, subject, html, text, attachments = [], meta = {} }) {
    const payload = {
      to: Array.isArray(to) ? to : [to],
      subject: subject || '',
      html: html || null,
      text: text || null,
      attachments: Array.isArray(attachments) ? attachments : [],
      meta: meta && typeof meta === 'object' ? meta : {},
      createdAt: serverTimestamp(),
      status: 'queued',
    };

    const mailRef = collection(db, 'mail');
    const docRef = await addDoc(mailRef, payload);
    return { success: true, id: docRef.id };
  }

  static buildInvoiceEmailHtml({ invoiceNumber, clientName, service, amount, date, appInvoiceUrl }) {
    const safeName = clientName || 'Client';
    const safeService = service || 'Professional Care';
    const safeDate = date || '';
    const safeInvoiceNumber = invoiceNumber || '';
    const safeAmount = Number.isFinite(amount) ? amount.toFixed(2) : String(amount || '');
    const hasAppInvoiceUrl = typeof appInvoiceUrl === 'string' && appInvoiceUrl.trim().length > 0;

    // Company details for footer
    const companyLegalName = '876 Nurses Home Care Services Limited';
    const companyAddress = '60 Knutsford Blvd, Panjam Building, 9th Floor - Regus, Kingston 5, Jamaica, West Indies';
    const companyWebsite = 'https://www.876nurses.com';
    const instagramUrl = 'https://instagram.com/876_nurses';
    const facebookUrl = 'https://facebook.com/876nurses';
    const whatsAppUrl = 'https://wa.me/8766189876';

    // Social icon URLs
    const instagramIconUrl = 'https://storage.googleapis.com/nurses-afb7e.firebasestorage.app/email-assets/icon-instagram.png';
    const facebookIconUrl = 'https://storage.googleapis.com/nurses-afb7e.firebasestorage.app/email-assets/icon-facebook.png';
    const whatsAppIconUrl = 'https://storage.googleapis.com/nurses-afb7e.firebasestorage.app/email-assets/icon-whatsapp.png';

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Invoice ${safeInvoiceNumber}</title>
        </head>
        <body style="margin:0;padding:0;background-color:#ffffff;font-family:Arial,sans-serif;color:#1f2a44;">
          <div style="max-width:600px;margin:0 auto;padding:32px 20px;line-height:1.7;">
            <p style="margin:0 0 16px 0;">Hi ${safeName},</p>
            <p style="margin:0 0 12px 0;">Your invoice <strong>${safeInvoiceNumber}</strong> from 876 Nurses Home Care Services is ready.</p>
            <p style="margin:0 0 8px 0;">Service: ${safeService}</p>
            <p style="margin:0 0 8px 0;">Date: ${safeDate}</p>
            <p style="margin:0 0 16px 0;">Amount: JMD $${safeAmount}</p>

            ${hasAppInvoiceUrl ? `<p style="margin:0 0 16px 0;"><a href="${appInvoiceUrl}" style="color:#2f62d7;text-decoration:underline;font-weight:700;">Click here to view invoice</a></p>` : ''}

            <!-- Footer with neutral styling -->
            <div style="margin-top:26px;">
              <div style="text-align:center;color:#9ca3af;font-size:11px;line-height:1.6;padding:10px 10px 0 10px;">
                <span style="white-space:nowrap;">This email was sent by: ${companyLegalName}</span><br />
                ${companyAddress}<br />
                <a href="${companyWebsite}" style="color:#9ca3af;text-decoration:underline;font-weight:600;">${companyWebsite.replace(/^https?:\/\//, '').replace(/\/$/, '')}</a>
              </div>

              <div style="border-top:1px solid #e5e7eb;margin:18px 0 16px 0;"></div>

              <table role="presentation" align="center" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">
                <tr>
                  <td align="center" style="padding:0 10px;">
                    <a href="${instagramUrl}" target="_blank" rel="noopener noreferrer"
                       style="display:inline-block;width:28px;height:28px;text-decoration:none;">
                      <img src="${instagramIconUrl}" width="28" height="28" alt="Instagram"
                           style="display:block;width:28px;height:28px;border:0;outline:none;text-decoration:none;border-radius:14px;" />
                    </a>
                  </td>
                  <td align="center" style="padding:0 10px;">
                    <a href="${facebookUrl}" target="_blank" rel="noopener noreferrer"
                       style="display:inline-block;width:28px;height:28px;text-decoration:none;">
                      <img src="${facebookIconUrl}" width="28" height="28" alt="Facebook"
                           style="display:block;width:28px;height:28px;border:0;outline:none;text-decoration:none;border-radius:14px;" />
                    </a>
                  </td>
                  <td align="center" style="padding:0 10px;">
                    <a href="${whatsAppUrl}" target="_blank" rel="noopener noreferrer"
                       style="display:inline-block;width:28px;height:28px;text-decoration:none;">
                      <img src="${whatsAppIconUrl}" width="28" height="28" alt="WhatsApp"
                           style="display:block;width:28px;height:28px;border:0;outline:none;text-decoration:none;border-radius:14px;" />
                    </a>
                  </td>
                </tr>
              </table>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  static async enqueueInvoiceEmail({ to, invoiceData, pdfUri, meta = {} }) {
    const invoiceNumber = invoiceData?.invoiceNumber || invoiceData?.invoiceId || invoiceData?.id;
    const invoiceIdForLink =
      invoiceData?.invoiceId ||
      invoiceData?.id ||
      invoiceData?.firestoreId ||
      invoiceNumber ||
      '';
    const appInvoiceUrl =
      invoiceData?.appInvoiceUrl ||
      invoiceData?.deepLink ||
      `nurses876://invoice/${encodeURIComponent(String(invoiceIdForLink))}`;

    const subject = `Invoice ${invoiceNumber || ''} - 876 Nurses Home Care Services`;
    const html = this.buildInvoiceEmailHtml({
      invoiceNumber,
      clientName: invoiceData?.clientName || invoiceData?.patientName,
      service: invoiceData?.service,
      amount: invoiceData?.amount || invoiceData?.total,
      date: invoiceData?.date,
      appInvoiceUrl,
    });

    const text = [
      `Invoice ${invoiceNumber || ''} from 876 Nurses Home Care Services`,
      '',
      `Hi ${invoiceData?.clientName || invoiceData?.patientName || 'Client'},`,
      '',
      'Thank you for choosing 876 Nurses. Please find your invoice details below.',
      '',
      `Invoice Number: ${invoiceNumber || ''}`,
      `Date: ${invoiceData?.date || ''}`,
      `Service: ${invoiceData?.service || 'Professional Care'}`,
      `Amount: JMD $${Number.isFinite(invoiceData?.amount || invoiceData?.total) ? (invoiceData?.amount || invoiceData?.total).toFixed(2) : '0.00'}`,
      '',
      `Click here to view invoice: ${appInvoiceUrl}`,
      '',
      'Need help? Email 876nurses@gmail.com',
      '876 Nurses Home Care Services · Kingston, Jamaica',
    ].filter(l => l !== null && l !== undefined).join('\n');

    return this.enqueueEmail({
      to,
      subject,
      html,
      text,
      attachments: [],
      meta: {
        type: 'invoice',
        invoiceNumber,
        appInvoiceUrl,
        ...meta,
      },
    });
  }
}

export default FirebaseEmailQueueService;
