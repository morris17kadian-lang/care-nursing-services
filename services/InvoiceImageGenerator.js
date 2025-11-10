import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

class InvoiceImageGenerator {
  static async generateInvoiceImage(invoiceData) {
    try {
      console.log('🖼️ GENERATING PROFESSIONAL INVOICE...');
      
      // Generate HTML invoice and convert to PDF using Expo Print
      const pdfUri = await this.generatePDFInvoice(invoiceData);
      
      console.log('✅ INVOICE PDF GENERATED:', pdfUri);
      return pdfUri;
      
    } catch (error) {
      console.error('❌ Error generating invoice image:', error);
      throw error;
    }
  }

  static async shareInvoice(invoiceUri, clientName) {
    try {
      if (await Sharing.isAvailableAsync()) {
        const fileExtension = invoiceUri.includes('.pdf') ? 'PDF' : 'SVG';
        await Sharing.shareAsync(invoiceUri, {
          mimeType: invoiceUri.includes('.pdf') ? 'application/pdf' : 'image/svg+xml',
          dialogTitle: `CARE Invoice for ${clientName} (${fileExtension})`,
        });
      } else {
        console.log('Sharing not available on this platform');
      }
    } catch (error) {
      console.error('Error sharing invoice:', error);
      throw error;
    }
  }

  static async generatePDFInvoice(invoiceData) {
    try {
      const htmlContent = this.createInvoiceHTML(invoiceData);
      
      const { uri } = await Print.printToFileAsync({
        html: htmlContent,
        base64: false,
        width: 612, // A4 width in points
        height: 792, // A4 height in points
      });

      console.log('📄 PDF Invoice created:', uri);
      return uri;
      
    } catch (error) {
      console.error('❌ Error creating PDF invoice:', error);
      // Fallback to SVG file (which can be shared/viewed)
      return await this.generateSVGInvoice(invoiceData);
    }
  }

  // SVG-based invoice (more reliable fallback)
  static async generateSVGInvoice(invoiceData) {
    try {
      const svgContent = this.createSVGInvoice(invoiceData);
      
      const fileName = `CARE_Invoice_${invoiceData.invoiceNumber}_${Date.now()}.svg`;
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;
      
      await FileSystem.writeAsStringAsync(fileUri, svgContent, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      
      console.log('📄 SVG Invoice created:', fileUri);
      return fileUri;
      
    } catch (error) {
      console.error('❌ Error creating SVG invoice:', error);
      throw error;
    }
  }

  static createSVGInvoice(invoiceData) {
    const width = 794;
    const height = 1123;
    
    const formatDate = (dateString) => {
      if (!dateString) return 'N/A';
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
    };

    const formatCurrency = (amount) => {
      if (!amount && amount !== 0) return 'J$0.00';
      return `J$${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
    };

    // Create service rows for SVG
    let serviceRowsY = 420;
    const serviceRowsHTML = invoiceData.items.map((item, index) => {
      const currentY = serviceRowsY + (index * 80);
      const serviceDates = item.serviceDates || formatDate(invoiceData.serviceDate);
      const nurseNames = item.nurseNames || invoiceData.nurseName || 'Care Professional';
      
      return `
        <!-- Service Row ${index + 1} -->
        <rect x="60" y="${currentY}" width="674" height="80" fill="#ffffff" stroke="#ddd"/>
        <text x="80" y="${currentY + 25}" class="body-text" font-size="14" fill="#333">${item.description}</text>
        <text x="80" y="${currentY + 45}" class="body-text" font-size="12" fill="#666">${item.detailedDescription || 'Professional healthcare services'}</text>
        <text x="80" y="${currentY + 65}" class="body-text" font-size="11" fill="#888">Dates: ${serviceDates} | Nurse: ${nurseNames}</text>
        <text x="500" y="${currentY + 35}" class="body-text" font-size="14" fill="#333">${item.quantity}</text>
        <text x="580" y="${currentY + 35}" class="body-text" font-size="14" fill="#333">${formatCurrency(item.price)}</text>
        <text x="710" y="${currentY + 35}" class="amount-text" font-size="16" text-anchor="end">${formatCurrency(item.total)}</text>
      `;
    }).join('');

    const totalSectionY = serviceRowsY + (invoiceData.items.length * 80) + 60;
    const paymentSectionY = totalSectionY + 160;
    const footerY = paymentSectionY + 260;
    
    return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <style>
      .header-text { font-family: Arial, sans-serif; font-weight: bold; }
      .body-text { font-family: Arial, sans-serif; }
      .amount-text { font-family: Arial, sans-serif; font-weight: bold; fill: #2196F3; }
      .primary-color { fill: #2196F3; }
    </style>
  </defs>
  
  <!-- Background -->
  <rect width="100%" height="100%" fill="#ffffff"/>
  
  <!-- Header -->
  <rect x="0" y="0" width="100%" height="120" fill="#f8f9fa"/>
  <text x="60" y="50" class="header-text primary-color" font-size="36">CARE</text>
  <text x="60" y="80" class="body-text" font-size="16" fill="#666">Nursing Services &amp; More</text>
  <text x="60" y="100" class="body-text" font-size="12" fill="#666">Phone: 876-288-7304 | Email: care@nursingcareja.com</text>
  
  <!-- Invoice Header -->
  <text x="650" y="50" class="header-text primary-color" font-size="32" text-anchor="end">INVOICE</text>
  <text x="650" y="80" class="header-text" font-size="18" fill="#333" text-anchor="end">#${invoiceData.invoiceNumber}</text>
  <text x="650" y="100" class="body-text" font-size="14" fill="#666" text-anchor="end">${formatDate(invoiceData.date)}</text>
  
  <!-- Bill To Section -->
  <rect x="60" y="140" width="320" height="140" fill="#f8f9fa" stroke="#2196F3" stroke-width="1"/>
  <text x="80" y="165" class="header-text primary-color" font-size="14">BILL TO:</text>
  <line x1="80" y1="170" x2="200" y2="170" stroke="#2196F3" stroke-width="1"/>
  <text x="80" y="195" class="header-text" font-size="16" fill="#333">${invoiceData.billTo?.name || 'N/A'}</text>
  <text x="80" y="215" class="body-text" font-size="13" fill="#666">${invoiceData.billTo?.address || 'N/A'}</text>
  <text x="80" y="235" class="body-text" font-size="13" fill="#666">${invoiceData.billTo?.phone || ''}</text>
  <text x="80" y="255" class="body-text" font-size="13" fill="#666">${invoiceData.billTo?.email || ''}</text>
  
  <!-- Service Information -->
  <rect x="400" y="140" width="334" height="140" fill="#f8f9fa" stroke="#2196F3" stroke-width="1"/>
  <text x="420" y="165" class="header-text primary-color" font-size="14">SERVICE INFORMATION:</text>
  <line x1="420" y1="170" x2="600" y2="170" stroke="#2196F3" stroke-width="1"/>
  <text x="420" y="190" class="body-text" font-size="13" fill="#666">Service Date: ${formatDate(invoiceData.serviceDate)}</text>
  <text x="420" y="210" class="body-text" font-size="13" fill="#666">Total Sessions: ${invoiceData.totalSessions || 1}</text>
  <text x="420" y="230" class="body-text" font-size="13" fill="#666">Nurse: ${invoiceData.nurseName || 'Care Professional'}</text>
  <text x="420" y="250" class="body-text" font-size="13" fill="#666">Status: Completed</text>
  <text x="420" y="270" class="body-text" font-size="13" fill="#666">Due Date: ${formatDate(invoiceData.dueDate)}</text>
  
  <!-- Services Table Header -->
  <rect x="60" y="320" width="674" height="40" fill="#2196F3"/>
  <text x="80" y="345" class="header-text" font-size="14" fill="white">SERVICE DESCRIPTION</text>
  <text x="500" y="345" class="header-text" font-size="14" fill="white">QTY</text>
  <text x="580" y="345" class="header-text" font-size="14" fill="white">RATE</text>
  <text x="710" y="345" class="header-text" font-size="14" fill="white" text-anchor="end">AMOUNT</text>
  
  <!-- Service Rows -->
  ${serviceRowsHTML}
  
  <!-- Total Section -->
  <rect x="500" y="${totalSectionY}" width="234" height="120" fill="#f8f9fa" stroke="#ddd"/>
  <text x="520" y="${totalSectionY + 25}" class="body-text" font-size="14" fill="#333">Subtotal:</text>
  <text x="710" y="${totalSectionY + 25}" class="body-text" font-size="14" fill="#333" text-anchor="end">${formatCurrency(invoiceData.subtotal)}</text>
  <text x="520" y="${totalSectionY + 50}" class="body-text" font-size="14" fill="#333">Tax (Healthcare):</text>
  <text x="710" y="${totalSectionY + 50}" class="body-text" font-size="14" fill="#333" text-anchor="end">${formatCurrency(invoiceData.tax || 0)}</text>
  <line x1="520" y1="${totalSectionY + 65}" x2="710" y2="${totalSectionY + 65}" stroke="#2196F3" stroke-width="2"/>
  <text x="520" y="${totalSectionY + 90}" class="header-text primary-color" font-size="18">TOTAL DUE:</text>
  <text x="710" y="${totalSectionY + 90}" class="amount-text" font-size="20" text-anchor="end">${formatCurrency(invoiceData.total)}</text>
  
  <!-- Payment Instructions -->
  <rect x="60" y="${paymentSectionY}" width="674" height="220" fill="#f8f9fa" stroke="#2196F3" stroke-width="2"/>
  <text x="80" y="${paymentSectionY + 25}" class="header-text primary-color" font-size="16">PAYMENT INSTRUCTIONS</text>
  <line x1="80" y1="${paymentSectionY + 30}" x2="300" y2="${paymentSectionY + 30}" stroke="#2196F3" stroke-width="2"/>
  
  <!-- Payment Terms -->
  <text x="80" y="${paymentSectionY + 55}" class="body-text" font-size="12" fill="#666">Payment due within 24 hours | Include invoice #${invoiceData.invoiceNumber} in reference</text>
  
  <!-- Banking Details -->
  <text x="80" y="${paymentSectionY + 80}" class="header-text" font-size="13" fill="#333">CARE Banking Details:</text>
  
  <text x="80" y="${paymentSectionY + 100}" class="header-text" font-size="11" fill="#333">Bank:</text>
  <text x="180" y="${paymentSectionY + 100}" class="body-text" font-size="11" fill="#666">National Commercial Bank (NCB)</text>
  <text x="400" y="${paymentSectionY + 100}" class="header-text" font-size="11" fill="#333">Branch:</text>
  <text x="480" y="${paymentSectionY + 100}" class="body-text" font-size="11" fill="#666">Knutsford Branch</text>
  
  <text x="80" y="${paymentSectionY + 120}" class="header-text" font-size="11" fill="#333">Account Holder:</text>
  <text x="180" y="${paymentSectionY + 120}" class="body-text" font-size="11" fill="#666">CARE.CARE</text>
  <text x="400" y="${paymentSectionY + 120}" class="header-text" font-size="11" fill="#333">Account Type:</text>
  <text x="480" y="${paymentSectionY + 120}" class="body-text" font-size="11" fill="#666">NCB Saving</text>
  
  <text x="80" y="${paymentSectionY + 140}" class="header-text" font-size="11" fill="#333">JMD Account:</text>
  <text x="180" y="${paymentSectionY + 140}" class="body-text" font-size="11" fill="#666">JMD354756226</text>
  <text x="400" y="${paymentSectionY + 140}" class="header-text" font-size="11" fill="#333">USD Account:</text>
  <text x="480" y="${paymentSectionY + 140}" class="body-text" font-size="11" fill="#666">USD354756234</text>
  
  <text x="80" y="${paymentSectionY + 160}" class="header-text" font-size="11" fill="#333">Swift Code:</text>
  <text x="180" y="${paymentSectionY + 160}" class="body-text" font-size="11" fill="#666">JNCBXX</text>
  <text x="400" y="${paymentSectionY + 160}" class="header-text" font-size="11" fill="#333">Contact:</text>
  <text x="480" y="${paymentSectionY + 160}" class="body-text" font-size="11" fill="#666">876-288-7304</text>
  
  <text x="80" y="${paymentSectionY + 180}" class="header-text" font-size="11" fill="#333">Email:</text>
  <text x="180" y="${paymentSectionY + 180}" class="body-text" font-size="10" fill="#666">care@nursingcareja.com</text>
  
  <!-- Footer -->
  <text x="397" y="${footerY + 20}" class="header-text primary-color" font-size="16" text-anchor="middle">Thank you for choosing CARE Nursing Services &amp; More</text>
  <text x="397" y="${footerY + 40}" class="body-text" font-size="10" fill="#999" text-anchor="middle">This invoice was generated electronically and is valid without signature.</text>
  <text x="397" y="${footerY + 55}" class="body-text" font-size="10" fill="#999" text-anchor="middle">Professional healthcare services provided with care and compassion.</text>
  <text x="397" y="${footerY + 70}" class="body-text" font-size="10" fill="#999" text-anchor="middle">For questions about this invoice, please contact us at 876-288-7304</text>
</svg>`;
  }

  static createInvoiceHTML(invoiceData) {
    const formatDate = (dateString) => {
      if (!dateString) return 'N/A';
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
    };

    const formatCurrency = (amount) => {
      if (!amount && amount !== 0) return 'J$0.00';
      return `J$${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
    };

    // Generate service rows HTML
    const serviceRowsHTML = invoiceData.items.map(item => `
      <tr class="service-row">
        <td>
          <div class="service-description">${item.description}</div>
          <div class="service-details">${item.detailedDescription || 'Professional healthcare services provided'}</div>
          ${item.serviceDates ? `<div class="service-dates"><strong>Service Dates:</strong> ${item.serviceDates}</div>` : ''}
          ${item.nurseNames ? `<div class="service-nurse"><strong>Nurse(s):</strong> ${item.nurseNames}</div>` : ''}
        </td>
        <td class="center-align"><strong>${item.quantity}</strong></td>
        <td class="center-align"><strong>${formatCurrency(item.price)}</strong></td>
        <td class="amount-col"><strong>${formatCurrency(item.total)}</strong></td>
      </tr>
    `).join('');

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            line-height: 1.5;
            color: #333;
            background: white;
            padding: 40px;
            width: 612px;
            min-height: 792px;
        }
        
        .invoice-container {
            width: 100%;
            position: relative;
        }
        
        .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 40px;
            border-bottom: 3px solid #2196F3;
            padding-bottom: 20px;
        }
        
        .company-info {
            flex: 1;
        }
        
        .company-name {
            font-size: 36px;
            font-weight: bold;
            color: #2196F3;
            margin-bottom: 8px;
            letter-spacing: 3px;
        }
        
        .company-tagline {
            font-size: 16px;
            color: #666;
            font-style: italic;
            margin-bottom: 15px;
        }
        
        .company-details {
            font-size: 12px;
            color: #666;
            line-height: 1.6;
        }
        
        .invoice-header {
            text-align: right;
        }
        
        .invoice-title {
            font-size: 40px;
            font-weight: bold;
            color: #2196F3;
            margin-bottom: 10px;
        }
        
        .invoice-number {
            font-size: 18px;
            font-weight: bold;
            color: #333;
            margin-bottom: 5px;
        }
        
        .invoice-date {
            font-size: 14px;
            color: #666;
        }
        
        .billing-section {
            display: flex;
            justify-content: space-between;
            margin: 20px 0;
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            border: 1px solid #e9ecef;
        }
        
        .bill-to, .service-period {
            flex: 1;
            padding: 0 10px;
        }
        
        .service-period {
            margin-left: 30px;
            border-left: 2px solid #2196F3;
            padding-left: 20px;
        }
        
        .section-title {
            font-size: 14px;
            font-weight: bold;
            color: #2196F3;
            margin-bottom: 15px;
            text-transform: uppercase;
            letter-spacing: 1px;
            border-bottom: 1px solid #2196F3;
            padding-bottom: 5px;
        }
        
        .client-name {
            font-size: 18px;
            font-weight: bold;
            color: #333;
            margin-bottom: 8px;
            margin-top: 5px;
        }
        
        .client-details, .service-details-info {
            font-size: 14px;
            color: #666;
            line-height: 1.8;
            margin-top: 5px;
        }
        
        .client-details div, .service-details-info div {
            margin-bottom: 4px;
        }
        
        .services-section {
            margin: 40px 0;
        }
        
        .services-table {
            width: 100%;
            border-collapse: collapse;
            box-shadow: 0 4px 15px rgba(0,0,0,0.1);
            border-radius: 8px;
            overflow: hidden;
            margin: 20px 0;
        }
        
        .table-header {
            background: linear-gradient(135deg, #2196F3, #1976D2);
            color: white;
        }
        
        .table-header th {
            padding: 18px 15px;
            text-align: left;
            font-size: 14px;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 1px;
            border-right: 1px solid rgba(255,255,255,0.2);
        }
        
        .table-header th:last-child {
            border-right: none;
        }
        
        .table-header .center-align {
            text-align: center;
        }
        
        .table-header .amount-col {
            text-align: right;
        }
        
        .service-row {
            background: white;
            border-bottom: 1px solid #eee;
        }
        
        .service-row:last-child {
            border-bottom: none;
        }
        
        .service-row td {
            padding: 15px 12px;
            font-size: 14px;
            vertical-align: top;
            border-right: 1px solid #f0f0f0;
        }
        
        .service-row td:last-child {
            border-right: none;
        }
        
        .center-align {
            text-align: center;
            font-weight: 600;
        }
        
        .amount-col {
            text-align: right;
            font-weight: 600;
        }
        
        .service-description {
            font-weight: 600;
            color: #333;
            font-size: 16px;
            margin-bottom: 8px;
        }
        
        .service-details {
            font-size: 13px;
            color: #666;
            margin-bottom: 10px;
            font-style: italic;
            line-height: 1.4;
        }
        
        .service-dates, .service-nurse {
            font-size: 12px;
            color: #555;
            margin: 6px 0;
            background: #f8f9fa;
            padding: 4px 8px;
            border-radius: 4px;
            display: inline-block;
        }
        
        .session-summary {
            margin-top: 12px;
            font-size: 12px;
            color: #555;
            background: #f0f7ff;
            padding: 10px;
            border-radius: 6px;
            border-left: 3px solid #2196F3;
        }
        
        .session-list {
            margin: 8px 0 0 15px;
            padding: 0;
            list-style-type: disc;
        }
        
        .session-list li {
            margin: 5px 0;
            font-size: 11px;
            color: #666;
            line-height: 1.4;
        }
        
        .amount-cell {
            text-align: right;
            font-weight: bold;
            color: #2196F3;
            font-size: 18px;
            background: #f8f9fa;
            padding: 20px 15px !important;
        }
        
        .total-section {
            margin-top: 40px;
            display: flex;
            justify-content: flex-end;
        }
        
        .total-box {
            width: 350px;
            background: linear-gradient(135deg, #f8f9fa, #e9ecef);
            border-radius: 8px;
            padding: 25px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.1);
        }
        
        .total-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 12px;
            font-size: 14px;
        }
        
        .grand-total {
            border-top: 2px solid #2196F3;
            padding-top: 15px;
            margin-top: 15px;
            font-size: 20px;
            font-weight: bold;
        }
        
        .total-label {
            color: #333;
        }
        
        .total-amount {
            color: #2196F3;
            font-weight: bold;
        }
        
        .payment-section {
            margin-top: 25px;
            background: #f8f9fa;
            padding: 25px;
            border-radius: 8px;
            border-left: 5px solid #2196F3;
            border: 1px solid #e9ecef;
        }
        
        .payment-title {
            font-size: 16px;
            font-weight: bold;
            color: #2196F3;
            margin-bottom: 25px;
            text-transform: uppercase;
            letter-spacing: 1px;
            border-bottom: 2px solid #2196F3;
            padding-bottom: 8px;
        }
        
        .payment-details {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 20px;
        }
        
        .payment-item {
            font-size: 13px;
            background: white;
            padding: 12px;
            border-radius: 6px;
            border-left: 3px solid #2196F3;
        }
        
        .payment-label {
            font-weight: bold;
            color: #333;
            margin-bottom: 4px;
        }
        
        .payment-value {
            color: #666;
            font-size: 14px;
        }
        
        .banking-info {
            background: white;
            padding: 20px;
            border-radius: 8px;
            margin-top: 15px;
            border: 1px solid #ddd;
        }
        
        .banking-title {
            font-size: 14px;
            font-weight: bold;
            color: #2196F3;
            margin-bottom: 15px;
            text-transform: uppercase;
        }
        
        .banking-details {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
        }
        
        .banking-item {
            font-size: 12px;
        }
        
        .banking-label {
            font-weight: bold;
            color: #333;
            margin-bottom: 2px;
        }
        
        .banking-value {
            color: #666;
        }
        
        .invoice-notes {
            margin-top: 30px;
            background: #fffbf0;
            padding: 20px;
            border-radius: 8px;
            border-left: 4px solid #ffa726;
        }
        
        .notes-title {
            font-size: 14px;
            font-weight: bold;
            color: #e65100;
            margin-bottom: 10px;
        }
        
        .notes-text {
            font-size: 12px;
            color: #555;
            line-height: 1.6;
        }
        
        .footer {
            margin-top: 50px;
            text-align: center;
            border-top: 1px solid #eee;
            padding-top: 20px;
        }
        
        .footer-text {
            font-size: 11px;
            color: #999;
            margin: 3px 0;
        }
        
        .thank-you {
            font-size: 16px;
            color: #2196F3;
            font-weight: bold;
            margin-bottom: 10px;
        }
        
        .page-break {
            page-break-after: always;
        }
    </style>
</head>
<body>
    <div class="invoice-container">
        <div class="header">
            <div class="company-info">
                <div class="company-name">CARE</div>
                <div class="company-tagline">Nursing Services & More</div>
                <div class="company-details">
                    Professional Healthcare Services<br>
                    Phone: 876-288-7304<br>
                    Email: care@nursingcareja.com
                </div>
            </div>
            <div class="invoice-header">
                <div class="invoice-title">INVOICE</div>
                <div class="invoice-number">#${invoiceData.invoiceNumber}</div>
                <div class="invoice-date">${formatDate(invoiceData.date)}</div>
            </div>
        </div>
        
        <div class="billing-section">
            <div class="bill-to">
                <div class="section-title">Bill To</div>
                <div class="client-name">${invoiceData.billTo?.name || 'N/A'}</div>
                <div class="client-details">
                    <div>${invoiceData.billTo?.address || 'N/A'}</div>
                    <div>${invoiceData.billTo?.phone || ''}</div>
                    <div>${invoiceData.billTo?.email || ''}</div>
                </div>
            </div>
            <div class="service-period">
                <div class="section-title">Service Information</div>
                <div class="service-details-info">
                    <div><strong>Service Date:</strong> ${formatDate(invoiceData.serviceDate) || formatDate(invoiceData.date)}</div>
                    <div><strong>Total Sessions:</strong> ${invoiceData.totalSessions || 1}</div>
                    <div><strong>Nurse:</strong> ${invoiceData.nurseName || 'Care Professional'}</div>
                    <div><strong>Payment Method:</strong> ${invoiceData.paymentMethod || 'Bank Transfer'}</div>
                    <div><strong>Due Date:</strong> ${formatDate(invoiceData.dueDate)}</div>
                </div>
            </div>
        </div>
        
        <div class="services-section">
            <table class="services-table">
                <thead class="table-header">
                    <tr>
                        <th>Service Description</th>
                        <th class="center-align">Quantity</th>
                        <th class="center-align">Unit Price</th>
                        <th class="amount-col">Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${serviceRowsHTML}
                </tbody>
            </table>
        </div>
        
        <div class="total-section">
            <div class="total-box">
                <div class="total-row">
                    <span class="total-label">Subtotal:</span>
                    <span class="total-amount">${formatCurrency(invoiceData.subtotal)}</span>
                </div>
                <div class="total-row">
                    <span class="total-label">Tax (Healthcare Services):</span>
                    <span class="total-amount">${formatCurrency(invoiceData.tax || 0)}</span>
                </div>
                <div class="total-row grand-total">
                    <span class="total-label">TOTAL DUE:</span>
                    <span class="total-amount">${formatCurrency(invoiceData.total)}</span>
                </div>
            </div>
        </div>
        
        <div class="payment-section">
            <div class="payment-title">Payment Instructions</div>
            <div class="payment-details">
                <div class="payment-item">
                    <div class="payment-label">Payment Terms:</div>
                    <div class="payment-value">Payment due within 24 hours</div>
                </div>
                <div class="payment-item">
                    <div class="payment-label">Accepted Methods:</div>
                    <div class="payment-value">Bank Transfer, Cash, Cheque</div>
                </div>
                <div class="payment-item">
                    <div class="payment-label">Invoice Reference:</div>
                    <div class="payment-value">${invoiceData.invoiceNumber}</div>
                </div>
                <div class="payment-item">
                    <div class="payment-label">Contact for Queries:</div>
                    <div class="payment-value">876-288-7304</div>
                </div>
            </div>
            
            <div class="banking-info">
                <div class="banking-title">CARE Banking Details</div>
                <div class="banking-details">
                    <div class="banking-item">
                        <div class="banking-label">Bank Name:</div>
                        <div class="banking-value">National Commercial Bank (NCB)</div>
                    </div>
                    <div class="banking-item">
                        <div class="banking-label">Branch:</div>
                        <div class="banking-value">Knutsford Branch</div>
                    </div>
                    <div class="banking-item">
                        <div class="banking-label">Account Type:</div>
                        <div class="banking-value">NCB Saving Account</div>
                    </div>
                    <div class="banking-item">
                        <div class="banking-label">Account Holder:</div>
                        <div class="banking-value">CARE.CARE</div>
                    </div>
                    <div class="banking-item">
                        <div class="banking-label">JMD Account:</div>
                        <div class="banking-value">JMD354756226</div>
                    </div>
                    <div class="banking-item">
                        <div class="banking-label">USD Account:</div>
                        <div class="banking-value">USD354756234</div>
                    </div>
                    <div class="banking-item">
                        <div class="banking-label">Swift Code:</div>
                        <div class="banking-value">JNCBXX</div>
                    </div>
                    <div class="banking-item">
                        <div class="banking-label">Bank Code:</div>
                        <div class="banking-value">02</div>
                    </div>
                    <div class="banking-item">
                        <div class="banking-label">Business Phone:</div>
                        <div class="banking-value">876-288-7304</div>
                    </div>
                    <div class="banking-item">
                        <div class="banking-label">Business Email:</div>
                        <div class="banking-value">care@nursingcareja.com</div>
                    </div>
                    <div class="banking-item">
                        <div class="banking-label">Registration:</div>
                        <div class="banking-value">Licensed Healthcare Provider</div>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="invoice-notes">
            <div class="notes-title">Payment Terms & Notes</div>
            <div class="notes-text">
                • Payment is due within 24 hours of invoice date<br>
                • Please include invoice number <strong>${invoiceData.invoiceNumber}</strong> in payment reference<br>
                • All services have been completed by licensed healthcare professionals<br>
                • For questions about this invoice, please contact us at 876-288-7304<br>
                ${invoiceData.isRecurring ? '• This client is on automatic recurring billing for continued services' : ''}
            </div>
        </div>
        
        <div class="footer">
            <div class="thank-you">Thank you for choosing CARE Nursing Services & More</div>
            <div class="footer-text">This invoice was generated electronically and is valid without signature.</div>
            <div class="footer-text">Professional healthcare services provided with care and compassion.</div>
            <div class="footer-text">License Number: [Healthcare License] | Registration: [Professional Registration]</div>
        </div>
    </div>
</body>
</html>`;
  }

  // Alternative: HTML-to-Image approach
  static async generateHTMLInvoice(invoiceData) {
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { 
            font-family: Arial, sans-serif; 
            margin: 0; 
            padding: 40px;
            width: 794px;
            height: 1123px;
            background: white;
        }
        .header { 
            text-align: left; 
            margin-bottom: 40px; 
        }
        .company-name { 
            font-size: 24px; 
            font-weight: bold; 
            color: #2196F3; 
            margin: 0;
        }
        .company-subtitle { 
            font-size: 16px; 
            color: #666; 
            margin: 5px 0 0 0;
        }
        .invoice-header {
            display: flex;
            justify-content: space-between;
            margin: 40px 0;
        }
        .invoice-title {
            font-size: 20px;
            font-weight: bold;
            color: #333;
        }
        .invoice-details {
            text-align: right;
        }
        .invoice-number {
            font-size: 16px;
            font-weight: bold;
            color: #333;
        }
        .invoice-date {
            font-size: 14px;
            color: #666;
            margin-top: 5px;
        }
        .bill-to {
            margin: 40px 0;
        }
        .bill-to-header {
            font-size: 14px;
            font-weight: bold;
            color: #333;
            margin-bottom: 15px;
        }
        .client-name {
            font-size: 16px;
            font-weight: bold;
            color: #333;
            margin-bottom: 5px;
        }
        .client-address {
            font-size: 14px;
            color: #666;
        }
        .services-table {
            width: 100%;
            border-collapse: collapse;
            margin: 40px 0;
        }
        .services-header {
            background: #f5f5f5;
            border: 1px solid #ddd;
        }
        .services-header th {
            padding: 15px;
            text-align: left;
            font-size: 14px;
            font-weight: bold;
            color: #333;
        }
        .service-row td {
            padding: 20px 15px;
            border: 1px solid #ddd;
            font-size: 14px;
            color: #333;
        }
        .amount-cell {
            text-align: right;
        }
        .total-section {
            margin-top: 40px;
            text-align: right;
        }
        .total-row {
            background: #f5f5f5;
            border: 1px solid #ddd;
            padding: 15px;
            margin-top: 10px;
        }
        .total-label {
            font-size: 16px;
            font-weight: bold;
            color: #333;
            display: inline-block;
            width: 100px;
        }
        .total-amount {
            font-size: 16px;
            font-weight: bold;
            color: #2196F3;
        }
        .payment-instructions {
            margin-top: 60px;
        }
        .payment-title {
            font-size: 12px;
            font-weight: bold;
            color: #333;
            margin-bottom: 10px;
        }
        .payment-detail {
            font-size: 11px;
            color: #666;
            margin: 3px 0;
        }
        .footer {
            position: absolute;
            bottom: 40px;
            left: 40px;
            right: 40px;
        }
        .footer-text {
            font-size: 10px;
            color: #999;
            margin: 2px 0;
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="company-name">CARE</div>
        <div class="company-subtitle">Nursing Services & More</div>
    </div>
    
    <div class="invoice-header">
        <div class="invoice-title">INVOICE</div>
        <div class="invoice-details">
            <div class="invoice-number">#${invoiceData.invoiceNumber}</div>
            <div class="invoice-date">${invoiceData.date}</div>
        </div>
    </div>
    
    <div class="bill-to">
        <div class="bill-to-header">BILL TO:</div>
        <div class="client-name">${invoiceData.billTo?.name || 'N/A'}</div>
        <div class="client-address">${invoiceData.billTo?.address || 'N/A'}</div>
    </div>
    
    <table class="services-table">
        <tr class="services-header">
            <th>DESCRIPTION</th>
            <th class="amount-cell">QTY</th>
            <th class="amount-cell">RATE</th>
            <th class="amount-cell">TOTAL</th>
        </tr>
        ${invoiceData.items?.map(item => `
        <tr class="service-row">
            <td>${item.description || 'Healthcare Services'}</td>
            <td class="amount-cell">${item.quantity || 1}</td>
            <td class="amount-cell">J$${item.price?.toLocaleString() || '0'}</td>
            <td class="amount-cell">J$${item.total?.toLocaleString() || '0'}</td>
        </tr>
        `).join('') || `
        <tr class="service-row">
            <td>Healthcare Services</td>
            <td class="amount-cell">1</td>
            <td class="amount-cell">J$${invoiceData.total?.toLocaleString() || '0'}</td>
            <td class="amount-cell">J$${invoiceData.total?.toLocaleString() || '0'}</td>
        </tr>
        `}
    </table>
    
    <div class="total-section">
        <div class="total-row">
            <span class="total-label">TOTAL</span>
            <span class="total-amount">J$${invoiceData.total?.toLocaleString() || '0'}</span>
        </div>
    </div>
    
    <div class="payment-instructions">
        <div class="payment-title">PAYMENT INSTRUCTIONS:</div>
        <div class="payment-detail">Bank: NCB Saving</div>
        <div class="payment-detail">Account: JMD354756226 / USD354756234</div>
        <div class="payment-detail">Payee: CARE.CARE</div>
    </div>
    
    <div class="footer">
        <div class="footer-text">Thank you for choosing CARE Nursing Services & More</div>
        <div class="footer-text">Phone: 876-288-7304 | Email: care@nursingcareja.com</div>
    </div>
</body>
</html>`;

    // Save HTML file
    const fileName = `invoice_${invoiceData.invoiceNumber}_${Date.now()}.html`;
    const fileUri = `${FileSystem.documentDirectory}${fileName}`;
    
    await FileSystem.writeAsStringAsync(fileUri, htmlContent, {
      encoding: FileSystem.EncodingType.UTF8,
    });
    
    return fileUri;
  }
}

export default InvoiceImageGenerator;