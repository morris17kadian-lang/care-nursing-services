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

            <p style="margin:18px 0 0 0;color:#9ca3af;font-size:12px;line-height:1.6;text-align:center;">
              876 Nurses Home Care Services · Kingston, Jamaica<br />
              Need help? Email <a href="mailto:876nurses@gmail.com" style="color:#6b7280;text-decoration:underline;">876nurses@gmail.com</a>
            </p>
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
