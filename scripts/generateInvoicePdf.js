/**
 * Generates a branded invoice PDF using Puppeteer, rendering the exact same
 * HTML template as InvoiceImageGenerator.createInvoiceHTML (the admin invoice view).
 *
 * Usage (Node.js, CommonJS):
 *   const { generateInvoicePdf } = require('./scripts/generateInvoicePdf');
 *   const buffer = await generateInvoicePdf({ invoiceNumber, clientName, service, amount, date });
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

function formatJmd(amount) {
  const n = Number(amount);
  const safe = Number.isFinite(n) ? n : 0;
  return `J$${safe.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function buildInvoiceHTML({ invoiceNumber, clientName, clientEmail, service, amount, date, dueDate, logoDataUri }) {
  const safeInvoiceNumber = String(invoiceNumber || '');
  const safeName = String(clientName || 'N/A');
  const safeEmail = String(clientEmail || 'N/A');
  const safeService = String(service || 'Professional Care');
  const safeDate = String(date || '');
  const safeDueDate = String(dueDate || date || '');
  const safeAmount = formatJmd(amount);

  const logoHtml = logoDataUri
    ? `<img class="headerLogo" src="${logoDataUri}" />`
    : `<div class="logoText">876 Nurses</div>`;

  return `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      @page { size: letter; margin: 0; }
      html, body { width: 612px; min-height: 792px; }
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
        color: #1f2937;
        background: #ffffff;
        padding: 28px;
        width: 612px;
        min-height: 792px;
      }
      .invoicePreviewCard { border: 1px solid #e5e7eb; border-radius: 12px; padding: 18px; position: relative; z-index: 1; }
      .headerLogoWrap { display: flex; justify-content: center; align-items: center; margin-bottom: 10px; }
      .headerLogo { height: 34px; width: auto; object-fit: contain; }
      .logoText { font-size: 22px; font-weight: 800; color: #111827; letter-spacing: 1px; }
      .pdfHeaderTop { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; }
      .logoBox { width: 140px; }
      .pdfInvoiceInfo { text-align: right; flex: 1; }
      .pdfInvoiceTitle { font-size: 28px; font-weight: 800; color: #111827; letter-spacing: 1px; }
      .pdfInvoiceNumber { font-size: 16px; font-weight: 700; margin-top: 6px; color: #111827; }
      .pdfInvoiceDate { font-size: 12px; color: #6b7280; margin-top: 4px; }
      .pdfBlueLine { height: 1px; background: #e5e7eb; margin-top: 12px; margin-bottom: 0; }
      .pdfClientRow { display: flex; justify-content: space-between; margin-top: 18px; gap: 18px; }
      .pdfBillTo, .pdfServiceProvider { flex: 1; }
      .pdfSectionTitle { font-size: 12px; font-weight: 800; color: #374151; margin-bottom: 10px; letter-spacing: 0.5px; }
      .pdfClientName { font-size: 16px; font-weight: 800; color: #111827; margin-bottom: 6px; }
      .pdfClientInfo { font-size: 12px; color: #374151; margin-bottom: 4px; line-height: 1.35; }
      .pdfProviderInfo { font-size: 12px; color: #374151; margin-bottom: 4px; line-height: 1.35; }
      .pdfProviderName { font-size: 12px; font-weight: 700; color: #111827; margin-bottom: 6px; }
      .pdfTable { margin-top: 18px; border: 1px solid #e5e7eb; border-radius: 10px; overflow: hidden; }
      table { width: 100%; border-collapse: collapse; }
      thead { background: #f3f4f6; }
      th { color: #111827; font-size: 12px; font-weight: 800; text-align: left; padding: 10px; border-bottom: 1px solid #e5e7eb; }
      th.num, td.num { text-align: right; }
      td { font-size: 12px; color: #111827; padding: 10px; border-top: 1px solid #e5e7eb; vertical-align: top; }
      .pdfBottomSection { display: flex; justify-content: space-between; gap: 18px; margin-top: 18px; }
      .pdfPaymentSection { flex: 1; border: 1px solid #e5e7eb; border-radius: 10px; padding: 12px; }
      .pdfPaymentTitle { font-size: 13px; font-weight: 800; color: #111827; margin-bottom: 8px; }
      .pdfPaymentInfo { font-size: 12px; color: #374151; margin-bottom: 4px; line-height: 1.35; }
      .pdfTotalsSection { width: 220px; border: 1px solid #e5e7eb; border-radius: 10px; padding: 12px; }
      .pdfTotalRow { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 8px; }
      .pdfFinalTotalRow { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 8px; }
      .pdfTotalLabel { font-size: 12px; color: #374151; }
      .pdfTotalValue { font-size: 12px; font-weight: 700; color: #111827; }
      .pdfFinalTotalLabel { font-size: 12px; font-weight: 800; color: #111827; }
      .pdfFinalTotalAmount { font-size: 14px; font-weight: 900; color: #111827; }
    </style>
  </head>
  <body>
    <div class="invoicePreviewCard">
      <div class="headerLogoWrap">${logoHtml}</div>
      <div class="pdfHeaderTop">
        <div class="logoBox"></div>
        <div class="pdfInvoiceInfo">
          <div class="pdfInvoiceTitle">INVOICE</div>
          <div class="pdfInvoiceNumber">${safeInvoiceNumber}</div>
          <div class="pdfInvoiceDate">Issue Date: ${safeDate}</div>
          <div class="pdfInvoiceDate">Due Date: ${safeDueDate}</div>
        </div>
      </div>
      <div class="pdfBlueLine"></div>

      <div class="pdfClientRow">
        <div class="pdfBillTo">
          <div class="pdfSectionTitle">BILL TO:</div>
          <div class="pdfClientName">${safeName}</div>
          <div class="pdfClientInfo">${safeEmail}</div>
          <div class="pdfClientInfo">N/A</div>
          <div class="pdfClientInfo">N/A</div>
        </div>
        <div class="pdfServiceProvider">
          <div class="pdfSectionTitle">SERVICE PROVIDED BY:</div>
          <div class="pdfProviderName">876 Nurses Home Care Services Limited</div>
          <div class="pdfProviderInfo">60 Knutsford Blvd, Panjam Building, 9th Floor - Regus, Kingston 5, Jamaica, West Indies</div>
          <div class="pdfProviderInfo">Phone: (876) 618-9876</div>
          <div class="pdfProviderInfo">Email: 876nurses@gmail.com</div>
          <div class="pdfProviderInfo">Web: www.876nurses.com</div>
        </div>
      </div>

      <div class="pdfTable">
        <table>
          <thead>
            <tr>
              <th style="width:55%">Service Description</th>
              <th class="num" style="width:15%">Hours</th>
              <th class="num" style="width:15%">Rate</th>
              <th class="num" style="width:15%">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>${safeService}</td>
              <td class="num">1</td>
              <td class="num">${safeAmount}</td>
              <td class="num">${safeAmount}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="pdfBottomSection">
        <div class="pdfPaymentSection">
          <div class="pdfPaymentTitle">Payment Information</div>
          <div class="pdfPaymentInfo">Payment Method: Bank Transfer</div>
          <div class="pdfPaymentInfo">Invoice Reference: ${safeInvoiceNumber}</div>
          <div class="pdfPaymentInfo">Contact: 876-288-7304</div>
          <div class="pdfPaymentInfo">Email: info@876nurses.com</div>
        </div>
        <div class="pdfTotalsSection">
          <div class="pdfTotalRow">
            <div class="pdfTotalLabel">Deposit:</div>
            <div class="pdfTotalValue">${safeAmount}</div>
          </div>
          <div class="pdfBlueLine"></div>
          <div class="pdfFinalTotalRow" style="margin-top:8px">
            <div class="pdfFinalTotalLabel">Total Amount:</div>
            <div class="pdfFinalTotalAmount">${safeAmount}</div>
          </div>
        </div>
      </div>
    </div>
  </body>
</html>`;
}

async function generateInvoicePdf(invoiceData) {
  const logoPath = path.join(__dirname, '..', 'assets', 'Images', 'Nurses-logo.png');
  let logoDataUri = null;
  if (fs.existsSync(logoPath)) {
    const logoBase64 = fs.readFileSync(logoPath).toString('base64');
    logoDataUri = `data:image/png;base64,${logoBase64}`;
  }

  const html = buildInvoiceHTML({ ...invoiceData, logoDataUri });

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({
      format: 'Letter',
      printBackground: true,
      margin: { top: '0px', right: '0px', bottom: '0px', left: '0px' },
    });
    return pdfBuffer;
  } finally {
    await browser.close();
  }
}

module.exports = { generateInvoicePdf, buildInvoiceHTML };
