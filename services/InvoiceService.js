import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';
import InvoiceImageGenerator from './InvoiceImageGenerator';

class InvoiceService {
  static STORAGE_KEY = '@care_invoices';
  static INVOICE_COUNTER_KEY = '@care_invoice_counter';
  
  // Helper function to format dates consistently
  static formatDateForInvoice(dateString) {
    if (!dateString) return new Date().toLocaleDateString('en-US');
    
    try {
      // If already in "MMM DD, YYYY" format, return as is
      if (typeof dateString === 'string' && /^[A-Z][a-z]{2}\s\d{1,2},\s\d{4}$/.test(dateString)) {
        return dateString;
      }
      
      // Try to parse as Date
      const date = new Date(dateString);
      if (!isNaN(date.getTime())) {
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
      }
      
      // If can't parse, return today's date
      return new Date().toLocaleDateString('en-US');
    } catch (error) {
      return new Date().toLocaleDateString('en-US');
    }
  }
  
  // Service rates configuration - SYNCED WITH ACTUAL SERVICE PRICES
  static SERVICE_RATES = {
    // Clinical Services
    'Dressings': 6750,
    'Medication Administration': 5275,
    'NG Tubes': 12800,
    'Urinary Catheter': 11300,
    'IV Access': 9800,
    'Tracheostomy Care': 14300,
    'Blood Draws': 6025,
    'Wound Care': 10550,
    'Injection Services': 5275,
    
    // Therapy
    'Physiotherapy': 12050,
    'Physical Therapy': 12050, // Alias
    
    // Home Care (hourly rates)
    'Home Nursing': 18100,
    'Elderly Care': 16575,
    
    // Support Services
    'Hospital Sitter': 15075,
    'Post-Surgery Care': 22575,
    'Post-Surgical Care': 22575, // Alias
    'Palliative Care': 19575,
    
    // Monitoring
    'Vital Signs': 4525,
    'Health Assessments': 13575,
    'Health Assessment': 13575, // Alias
    'Diabetic Care': 8300,
    
    // Legacy/Generic services (fallback)
    'Home Visit': 18100,
    'Health Monitoring': 8300,
    'General Nursing': 18100,
    'Emergency Care': 22575,
    'Consultation': 13575
  };

  // Company information
  static COMPANY_INFO = {
    name: 'CARE Medical Services',
    address: '456 Oak Ave, Town, State 67890',
    phone: '+1 (555) 987-6543',
    email: 'billing@care.com',
    website: 'www.care.com',
    paymentInfo: 'NCB Account #123456789\nE-Transfer: billing@care.com\nCash accepted for home visits'
  };

  /**
   * Get service price - tries to match service name, falls back to default
   */
  static getServicePrice(serviceName) {
    if (!serviceName) return 18100; // Default to Home Nursing rate
    
    // Direct match
    if (this.SERVICE_RATES[serviceName]) {
      return this.SERVICE_RATES[serviceName];
    }
    
    // Case-insensitive match
    const serviceKey = Object.keys(this.SERVICE_RATES).find(
      key => key.toLowerCase() === serviceName.toLowerCase()
    );
    
    if (serviceKey) {
      return this.SERVICE_RATES[serviceKey];
    }
    
    // Partial match (e.g., "Wound Care" matches "wound")
    const partialMatch = Object.keys(this.SERVICE_RATES).find(
      key => key.toLowerCase().includes(serviceName.toLowerCase()) ||
             serviceName.toLowerCase().includes(key.toLowerCase())
    );
    
    if (partialMatch) {
      return this.SERVICE_RATES[partialMatch];
    }
    
    // Default fallback
    console.warn(`⚠️ No price found for service: ${serviceName}, using default rate`);
    return 18100;
  }

  /**
   * Generate unique invoice ID
   */
  static async generateInvoiceId() {
    try {
      const counterStr = await AsyncStorage.getItem(this.INVOICE_COUNTER_KEY);
      let counter = counterStr ? parseInt(counterStr) : 0;
      counter++;
      
      await AsyncStorage.setItem(this.INVOICE_COUNTER_KEY, counter.toString());
      return `CARE-INV-${counter.toString().padStart(4, '0')}`;
    } catch (error) {
      console.error('Error generating invoice ID:', error);
      return `CARE-INV-${Date.now()}`;
    }
  }

  /**
   * Generate invoice HTML template
   */
  static generateInvoiceHTML(invoiceData) {
    const {
      invoiceId,
      clientName,
      clientEmail,
      clientPhone,
      clientAddress,
      nurseName,
      service,
      date,
      hours,
      rate,
      total,
      issueDate,
      dueDate
    } = invoiceData;

    // Format currency as Jamaican dollars
    const formatJMD = (amount) => `J$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Invoice ${invoiceId}</title>
        <style>
          body {
            font-family: 'Arial', sans-serif;
            margin: 0;
            padding: 20px;
            color: #333;
            line-height: 1.6;
          }
          .invoice-container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            padding: 40px;
            border-radius: 8px;
            box-shadow: 0 0 10px rgba(0,0,0,0.1);
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 40px;
            border-bottom: 3px solid #00D4FF;
            padding-bottom: 20px;
          }
          .company-info {
            flex: 1;
          }
          .company-name {
            font-size: 28px;
            font-weight: bold;
            color: #00D4FF;
            margin-bottom: 10px;
          }
          .company-details {
            font-size: 14px;
            color: #666;
            line-height: 1.4;
          }
          .invoice-title {
            text-align: right;
            flex: 1;
          }
          .invoice-number {
            font-size: 24px;
            font-weight: bold;
            color: #333;
            margin-bottom: 10px;
          }
          .invoice-dates {
            font-size: 14px;
            color: #666;
          }
          .billing-section {
            display: flex;
            justify-content: space-between;
            margin-bottom: 40px;
          }
          .bill-to, .service-provider {
            flex: 1;
            margin-right: 20px;
          }
          .section-title {
            font-size: 16px;
            font-weight: bold;
            color: #333;
            margin-bottom: 10px;
            text-transform: uppercase;
          }
          .section-content {
            font-size: 14px;
            color: #666;
            line-height: 1.5;
          }
          .service-details {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
          }
          .service-details th {
            background-color: #f8f9fa;
            border: 1px solid #dee2e6;
            padding: 15px;
            text-align: left;
            font-weight: bold;
            color: #333;
          }
          .service-details td {
            border: 1px solid #dee2e6;
            padding: 15px;
            color: #666;
          }
          .total-section {
            text-align: right;
            margin-bottom: 40px;
          }
          .total-row {
            display: flex;
            justify-content: flex-end;
            margin-bottom: 10px;
          }
          .total-label {
            width: 150px;
            font-weight: bold;
            color: #333;
          }
          .total-amount {
            width: 100px;
            text-align: right;
            color: #333;
          }
          .grand-total {
            border-top: 2px solid #00D4FF;
            padding-top: 10px;
            font-size: 18px;
            font-weight: bold;
            color: #00D4FF;
          }
          .payment-info {
            background-color: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 30px;
          }
          .payment-title {
            font-size: 16px;
            font-weight: bold;
            color: #333;
            margin-bottom: 10px;
          }
          .payment-details {
            font-size: 14px;
            color: #666;
            white-space: pre-line;
          }
          .footer {
            text-align: center;
            font-size: 12px;
            color: #999;
            border-top: 1px solid #eee;
            padding-top: 20px;
          }
          @media print {
            body { margin: 0; }
            .invoice-container { 
              box-shadow: none; 
              padding: 20px;
            }
          }
        </style>
      </head>
      <body>
        <div class="invoice-container">
          <div class="header">
            <div class="company-info">
              <div class="company-name">${this.COMPANY_INFO.name}</div>
              <div class="company-details">
                ${this.COMPANY_INFO.address}<br>
                Phone: ${this.COMPANY_INFO.phone}<br>
                Email: ${this.COMPANY_INFO.email}<br>
                Web: ${this.COMPANY_INFO.website}
              </div>
            </div>
            <div class="invoice-title">
              <div class="invoice-number">INVOICE</div>
              <div class="invoice-number">${invoiceId}</div>
              <div class="invoice-dates">
                Issue Date: ${issueDate}<br>
                Due Date: ${dueDate}
              </div>
            </div>
          </div>

          <div class="billing-section">
            <div class="bill-to">
              <div class="section-title">Bill To:</div>
              <div class="section-content">
                <strong>${clientName}</strong><br>
                ${clientEmail}<br>
                ${clientPhone}<br>
                ${clientAddress}
              </div>
            </div>
            <div class="service-provider">
              <div class="section-title">Service Provider:</div>
              <div class="section-content">
                <strong>${nurseName}</strong><br>
                Registered Nurse<br>
                ${this.COMPANY_INFO.name}
              </div>
            </div>
          </div>

          <table class="service-details">
            <thead>
              <tr>
                <th>Service Description</th>
                <th>Date</th>
                <th>Hours</th>
                <th>Rate</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>${service}</td>
                <td>${date}</td>
                <td>${hours || 1}</td>
                <td>${formatJMD(rate)}</td>
                <td>${formatJMD(total)}</td>
              </tr>
            </tbody>
          </table>

          <div class="total-section">
            <div class="total-row">
              <div class="total-label">Subtotal:</div>
              <div class="total-amount">${formatJMD(total)}</div>
            </div>
            <div class="total-row grand-total">
              <div class="total-label">Total Amount:</div>
              <div class="total-amount">${formatJMD(total)}</div>
            </div>
          </div>

          <div class="payment-info">
            <div class="payment-title">Payment Information</div>
            <div class="payment-details">${this.COMPANY_INFO.paymentInfo}</div>
          </div>

          <div class="footer">
            <p>Thank you for choosing ${this.COMPANY_INFO.name}!</p>
            <p>For questions regarding this invoice, please contact us at ${this.COMPANY_INFO.email}</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Set up automatic email invoicing for recurring patients
   */
  static async setupRecurringInvoiceSchedule(clientData, frequency = 'monthly') {
    try {
      const scheduleData = {
        clientId: clientData.id,
        clientName: clientData.name || clientData.clientName,
        email: clientData.email,
        serviceType: clientData.serviceType || clientData.service,
        frequency: frequency, // 'weekly', 'monthly', 'quarterly'
        isActive: true,
        lastSent: null,
        nextScheduled: this.calculateNextInvoiceDate(frequency),
        createdAt: new Date().toISOString(),
        recurringSettings: {
          autoGenerate: true,
          autoEmail: true,
          emailTemplate: 'recurring_invoice',
          rate: clientData.rate || this.SERVICE_RATES[clientData.serviceType] || 50
        }
      };

      // Save to AsyncStorage
      const existingSchedules = await this.getRecurringSchedules();
      const updatedSchedules = existingSchedules.filter(s => s.clientId !== clientData.id);
      updatedSchedules.push(scheduleData);
      
      await AsyncStorage.setItem('@care_recurring_schedules', JSON.stringify(updatedSchedules));
      
      console.log('📅 Recurring invoice schedule set up for:', clientData.name);
      return scheduleData;
    } catch (error) {
      console.error('Error setting up recurring invoice schedule:', error);
      throw error;
    }
  }

  /**
   * Calculate next invoice date based on frequency
   */
  static calculateNextInvoiceDate(frequency) {
    const now = new Date();
    switch (frequency.toLowerCase()) {
      case 'weekly':
        return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
      case 'monthly':
        return new Date(now.setMonth(now.getMonth() + 1)).toISOString();
      case 'quarterly':
        return new Date(now.setMonth(now.getMonth() + 3)).toISOString();
      case 'yearly':
        return new Date(now.setFullYear(now.getFullYear() + 1)).toISOString();
      default:
        return new Date(now.setMonth(now.getMonth() + 1)).toISOString();
    }
  }

  /**
   * Get all recurring invoice schedules
   */
  static async getRecurringSchedules() {
    try {
      const schedules = await AsyncStorage.getItem('@care_recurring_schedules');
      return schedules ? JSON.parse(schedules) : [];
    } catch (error) {
      console.error('Error getting recurring schedules:', error);
      return [];
    }
  }

  /**
   * Process due recurring invoices
   */
  static async processDueRecurringInvoices() {
    try {
      const schedules = await this.getRecurringSchedules();
      const now = new Date();
      const dueInvoices = schedules.filter(schedule => 
        schedule.isActive && 
        new Date(schedule.nextScheduled) <= now
      );

      console.log(`📋 Processing ${dueInvoices.length} due recurring invoices...`);

      for (const schedule of dueInvoices) {
        try {
          // Generate invoice data for recurring client
          const invoiceData = {
            id: `RECURRING-${schedule.clientId}-${Date.now()}`,
            clientName: schedule.clientName,
            email: schedule.email,
            service: schedule.serviceType,
            date: new Date().toISOString(),
            hoursWorked: 2, // Default for recurring
            isRecurring: true,
            frequency: schedule.frequency,
            status: 'pending'
          };

          // Create the invoice
          const invoice = await this.createInvoice(invoiceData);
          
          // Send email notification (simulated)
          await this.sendRecurringInvoiceEmail(invoice, schedule);
          
          // Update schedule for next invoice
          schedule.lastSent = now.toISOString();
          schedule.nextScheduled = this.calculateNextInvoiceDate(schedule.frequency);
          
          console.log(`✅ Recurring invoice sent to ${schedule.clientName}`);
        } catch (error) {
          console.error(`❌ Failed to process recurring invoice for ${schedule.clientName}:`, error);
        }
      }

      // Save updated schedules
      await AsyncStorage.setItem('@care_recurring_schedules', JSON.stringify(schedules));
      
      return dueInvoices.length;
    } catch (error) {
      console.error('Error processing due recurring invoices:', error);
      throw error;
    }
  }

  /**
   * Send recurring invoice email (simulated)
   */
  static async sendRecurringInvoiceEmail(invoice, schedule) {
    try {
      // In a real app, this would integrate with an email service like SendGrid, Mailgun, etc.
      const emailData = {
        to: schedule.email,
        subject: `Recurring Invoice - ${invoice.invoiceId}`,
        template: 'recurring_invoice',
        data: {
          clientName: schedule.clientName,
          invoiceId: invoice.invoiceId,
          amount: invoice.total,
          service: schedule.serviceType,
          frequency: schedule.frequency,
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString(),
          pdfAttachment: invoice.pdfUri
        }
      };

      // Simulate email sending
      console.log('📧 Sending recurring invoice email:', emailData);
      
      // In production, you would call your email service here:
      // await EmailService.send(emailData);
      
      return { success: true, emailId: `EMAIL-${Date.now()}` };
    } catch (error) {
      console.error('Error sending recurring invoice email:', error);
      throw error;
    }
  }

  /**
   * Create a sample invoice for testing/preview purposes
   */
  static async createSampleInvoice() {
    try {
      const sampleAppointmentData = {
        id: 'SAMPLE-001',
        patientName: 'John Smith',
        clientName: 'John Smith',
        email: 'john.smith@example.com',
        phone: '+1 (555) 123-4567',
        address: '123 Main Street, Anytown, State 12345',
        nurseName: 'Sarah Johnson, RN',
        service: 'Home Nursing',
        date: new Date().toISOString(),
        hoursWorked: 2.5,
        actualStartTime: new Date(Date.now() - 2.5 * 60 * 60 * 1000).toISOString(),
        actualEndTime: new Date().toISOString(),
        status: 'completed'
      };

      const invoice = await this.createInvoice(sampleAppointmentData);
      console.log('📄 Sample invoice created:', invoice.invoiceId);
      console.log(`💰 Sample invoice amount: J$${invoice.invoice.total.toLocaleString()}`);
      return invoice;
    } catch (error) {
      console.error('Error creating sample invoice:', error);
      throw error;
    }
  }

  /**
   * Create and save invoice from appointment data
   */
  static async createInvoice(appointmentData) {
    try {
      const invoiceId = await this.generateInvoiceId();
      const serviceType = appointmentData.serviceType || appointmentData.serviceName || appointmentData.service;
      
      // Get the actual service price using our lookup method
      const rate = this.getServicePrice(serviceType);
      
      const hours = appointmentData.hoursWorked || 1;
      const total = rate * hours;
      
      console.log(`💰 Creating invoice for ${serviceType}: J$${rate} x ${hours} hours = J$${total}`);
      
      const issueDate = new Date().toLocaleDateString('en-US');
      const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US'); // 30 days from now

      const invoiceData = {
        invoiceId,
        clientName: appointmentData.patientName || appointmentData.clientName || 'Client',
        clientEmail: appointmentData.patientEmail || appointmentData.email || appointmentData.clientEmail || 'client@care.com',
        clientPhone: appointmentData.patientPhone || appointmentData.phone || appointmentData.clientPhone || 'N/A',
        clientAddress: appointmentData.address || appointmentData.clientAddress || 'Address on file',
        nurseName: appointmentData.nurseName || 'Assigned Nurse',
        service: serviceType,
        date: this.formatDateForInvoice(appointmentData.appointmentDate),
        hours,
        rate,
        total,
        issueDate,
        dueDate,
        status: 'Pending',
        createdAt: new Date().toISOString(),
        appointmentId: appointmentData.id,
        // Add items array for compatibility with InvoiceImageGenerator
        items: [{
          description: serviceType,
          detailedDescription: `Professional ${serviceType.toLowerCase()} services provided`,
          quantity: hours,
          price: rate,
          total: total,
          serviceDates: this.formatDateForInvoice(appointmentData.appointmentDate),
          nurseNames: appointmentData.nurseName || 'Care Professional'
        }],
        // Additional fields for invoice display
        serviceDate: this.formatDateForInvoice(appointmentData.appointmentDate),
        subtotal: total,
        tax: 0, // No tax charged
        finalTotal: total
      };

      // Generate PDF using InvoiceImageGenerator
      const html = InvoiceImageGenerator.createInvoiceHTML(invoiceData);
      const { uri } = await Print.printToFileAsync({ 
        html,
        base64: false 
      });

      // Save PDF to local storage
      const fileName = `${invoiceId}.pdf`;
      const fileUri = `${FileSystem.documentDirectory}invoices/${fileName}`;
      
      // Create invoices directory if it doesn't exist
      const dirInfo = await FileSystem.getInfoAsync(`${FileSystem.documentDirectory}invoices/`);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(`${FileSystem.documentDirectory}invoices/`, { intermediates: true });
      }

      // Copy PDF to permanent location
      await FileSystem.copyAsync({
        from: uri,
        to: fileUri
      });

      // Save invoice record
      const invoiceRecord = {
        ...invoiceData,
        pdfUri: fileUri,
        fileName
      };

      await this.saveInvoiceRecord(invoiceRecord);

      return {
        success: true,
        invoice: invoiceRecord
      };
    } catch (error) {
      console.error('Error creating invoice:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Save invoice record to AsyncStorage
   */
  static async saveInvoiceRecord(invoice) {
    try {
      const existingInvoices = await this.getAllInvoices();
      const updatedInvoices = [...existingInvoices, invoice];
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(updatedInvoices));
    } catch (error) {
      console.error('Error saving invoice record:', error);
      throw error;
    }
  }

  /**
   * Get all invoices
   */
  static async getAllInvoices() {
    try {
      const invoicesStr = await AsyncStorage.getItem(this.STORAGE_KEY);
      return invoicesStr ? JSON.parse(invoicesStr) : [];
    } catch (error) {
      console.error('Error getting invoices:', error);
      return [];
    }
  }

  /**
   * Get invoice by ID
   */
  static async getInvoiceById(invoiceId) {
    try {
      const invoices = await this.getAllInvoices();
      return invoices.find(invoice => invoice.invoiceId === invoiceId);
    } catch (error) {
      console.error('Error getting invoice by ID:', error);
      return null;
    }
  }

  /**
   * Update invoice status
   */
  static async updateInvoiceStatus(invoiceId, status, paymentMethod = null) {
    try {
      const invoices = await this.getAllInvoices();
      const updatedInvoices = invoices.map(invoice => {
        if (invoice.invoiceId === invoiceId) {
          const updates = { 
            ...invoice, 
            status, 
            updatedAt: new Date().toISOString() 
          };
          // Add paidDate and paymentMethod when marking as paid
          if (status === 'Paid') {
            updates.paidDate = new Date().toLocaleDateString('en-US', { 
              month: 'short', 
              day: 'numeric', 
              year: 'numeric' 
            });
            if (paymentMethod) {
              updates.paymentMethod = paymentMethod;
            }
          }
          return updates;
        }
        return invoice;
      });
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(updatedInvoices));
      console.log(`📄 Invoice ${invoiceId} status updated to: ${status}${paymentMethod ? ` via ${paymentMethod}` : ''}`);
    } catch (error) {
      console.error('Error updating invoice status:', error);
      throw error;
    }
  }

  /**
   * Share invoice via email/other apps
   */
  static async shareInvoice(invoice) {
    try {
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(invoice.pdfUri, {
          mimeType: 'application/pdf',
          dialogTitle: `Invoice ${invoice.invoiceId}`,
          UTI: 'com.adobe.pdf'
        });
      } else {
        console.log('Sharing is not available on this platform');
      }
    } catch (error) {
      console.error('Error sharing invoice:', error);
      throw error;
    }
  }

  /**
   * Delete invoice
   */
  static async deleteInvoice(invoiceId) {
    try {
      const invoices = await this.getAllInvoices();
      const invoice = invoices.find(inv => inv.invoiceId === invoiceId);
      
      if (invoice) {
        // Delete PDF file
        const fileInfo = await FileSystem.getInfoAsync(invoice.pdfUri);
        if (fileInfo.exists) {
          await FileSystem.deleteAsync(invoice.pdfUri);
        }
        
        // Remove from records
        const updatedInvoices = invoices.filter(inv => inv.invoiceId !== invoiceId);
        await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(updatedInvoices));
        
        console.log(`📄 Invoice ${invoiceId} deleted successfully`);
      }
    } catch (error) {
      console.error('Error deleting invoice:', error);
      throw error;
    }
  }

  /**
   * Remove all sample invoices from storage
   */
  static async removeSampleInvoices() {
    try {
      const invoices = await this.getAllInvoices();
      
      // Track unique appointmentIds to detect duplicates
      const seenAppointmentIds = new Map();
      
      // Filter out sample invoices and duplicates
      const realInvoices = invoices.filter(inv => {
        // Check if it's a sample invoice
        const isSample = 
          inv.appointmentId === 'SAMPLE-001' ||
          inv.appointmentId?.includes('SAMPLE') ||
          inv.invoiceId?.includes('SAMPLE') ||
          inv.clientName === 'John Smith (Sample)' ||
          inv.clientName === 'Sample Client' ||
          (inv.clientName === 'John Smith' && inv.clientEmail === 'john.smith@example.com');
        
        if (isSample) {
          return false;
        }
        
        // Check for duplicate appointmentIds (keep only the first one, which is usually the latest)
        if (seenAppointmentIds.has(inv.appointmentId)) {
          return false;
        }
        
        seenAppointmentIds.set(inv.appointmentId, inv.invoiceId);
        return true;
      });
      
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(realInvoices));
    } catch (error) {
      console.error('Error removing sample invoices:', error);
      throw error;
    }
  }

  /**
   * Get invoice statistics
   */
  static async getInvoiceStats() {
    try {
      const invoices = await this.getAllInvoices();
      const total = invoices.length;
      const pending = invoices.filter(inv => inv.status === 'Pending').length;
      const paid = invoices.filter(inv => inv.status === 'Paid').length;
      const overdue = invoices.filter(inv => inv.status === 'Overdue').length;
      const totalAmount = invoices.reduce((sum, inv) => sum + inv.total, 0);
      const paidAmount = invoices.filter(inv => inv.status === 'Paid').reduce((sum, inv) => sum + inv.total, 0);
      const pendingAmount = invoices.filter(inv => inv.status === 'Pending').reduce((sum, inv) => sum + inv.total, 0);

      return {
        total,
        pending,
        paid,
        overdue,
        totalAmount,
        paidAmount,
        pendingAmount
      };
    } catch (error) {
      console.error('Error getting invoice stats:', error);
      return {
        total: 0,
        pending: 0,
        paid: 0,
        overdue: 0,
        totalAmount: 0,
        paidAmount: 0,
        pendingAmount: 0
      };
    }
  }

  // Legacy methods for backward compatibility
  static generateInvoiceNumber() {
    return this.generateInvoiceId();
  }

  static createInvoiceFromAppointment(appointment, patientInfo = null) {
    return this.createInvoice(appointment);
  }

  static formatPrice(amount) {
    if (!amount && amount !== 0) return 'J$0.00';
    return `J$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  static calculateTotals(items) {
    const subtotal = items.reduce((sum, item) => sum + (item.total || item.price * item.quantity), 0);
    const tax = 0;
    const total = subtotal + tax;
    return { subtotal, tax, total };
  }

  // Check for overdue invoices
  static async getOverdueInvoices() {
    try {
      const allInvoices = await this.getAllInvoices();
      const today = new Date();
      
      const overdueInvoices = allInvoices.filter(invoice => {
        if (invoice.status === 'Paid') return false;
        
        const dueDate = new Date(invoice.dueDate);
        return dueDate < today;
      });

      return overdueInvoices;
    } catch (error) {
      console.error('Error getting overdue invoices:', error);
      return [];
    }
  }

  // Send overdue payment notifications
  static async sendOverdueNotifications() {
    try {
      const overdueInvoices = await this.getOverdueInvoices();
      
      if (overdueInvoices.length === 0) return [];

      const notifications = [];
      
      for (const invoice of overdueInvoices) {
        // Patient notification
        const patientNotification = {
          title: 'Payment Overdue',
          body: `Your payment for invoice ${invoice.invoiceId} is overdue. Please settle your account.`,
          data: {
            type: 'overdue_payment',
            invoiceId: invoice.invoiceId,
            amount: invoice.total
          }
        };

        // Admin notification
        const adminNotification = {
          title: 'Overdue Payment Alert',
          body: `Invoice ${invoice.invoiceId} for ${invoice.clientName} is overdue ($${invoice.total})`,
          data: {
            type: 'overdue_payment_admin',
            invoiceId: invoice.invoiceId,
            clientName: invoice.clientName,
            amount: invoice.total
          }
        };

        notifications.push({ patient: patientNotification, admin: adminNotification, invoice });
      }

      return notifications;
    } catch (error) {
      console.error('Error sending overdue notifications:', error);
      return [];
    }
  }

  // Clear all invoices (for testing/reset purposes)
  static async clearAllInvoices() {
    try {
      await AsyncStorage.removeItem(this.STORAGE_KEY);
      await AsyncStorage.removeItem(this.INVOICE_COUNTER_KEY);
      
      // Also delete all invoice PDF files
      const invoiceDir = `${FileSystem.documentDirectory}invoices/`;
      try {
        const dirInfo = await FileSystem.getInfoAsync(invoiceDir);
        if (dirInfo.exists) {
          await FileSystem.deleteAsync(invoiceDir, { idempotent: true });
        }
      } catch (fileError) {
        console.log('No invoice directory to clear');
      }
      
      console.log('✅ All invoices cleared successfully');
      return { success: true, message: 'All invoices cleared' };
    } catch (error) {
      console.error('Error clearing invoices:', error);
      throw error;
    }
  }

  /**
   * Update existing invoices to use new pricing structure
   * This will recalculate all invoice totals based on the current SERVICE_RATES
   */
  static async updateInvoicePricing() {
    try {
      console.log('🔄 Starting invoice price update...');
      
      const invoices = await this.getAllInvoices();
      
      if (invoices.length === 0) {
        console.log('ℹ️  No invoices found to update');
        return { success: true, updated: 0, total: 0 };
      }
      
      console.log(`📊 Found ${invoices.length} invoices to check`);
      
      let updatedCount = 0;
      
      const updatedInvoices = invoices.map(invoice => {
        const service = invoice.service;
        const hours = invoice.hours || 1;
        const oldRate = invoice.rate;
        const oldTotal = invoice.total;
        
        // Get new rate based on current pricing
        const newRate = this.getServicePrice(service);
        const newTotal = newRate * hours;
        
        // Only update if prices have changed
        if (oldRate !== newRate || oldTotal !== newTotal) {
          console.log(`📝 Updating ${invoice.invoiceId}:`);
          console.log(`   Service: ${service}`);
          console.log(`   Hours: ${hours}`);
          console.log(`   Old: $${oldRate} x ${hours} = $${oldTotal}`);
          console.log(`   New: J$${newRate.toLocaleString()} x ${hours} = J$${newTotal.toLocaleString()}`);
          
          updatedCount++;
          
          return {
            ...invoice,
            rate: newRate,
            total: newTotal,
            subtotal: newTotal,
            finalTotal: newTotal,
            // Update items array if it exists
            items: invoice.items ? invoice.items.map(item => ({
              ...item,
              price: newRate,
              total: newTotal
            })) : [{
              description: service,
              detailedDescription: `Professional ${service.toLowerCase()} services provided`,
              quantity: hours,
              price: newRate,
              total: newTotal,
              serviceDates: invoice.serviceDate || invoice.date,
              nurseNames: invoice.nurseName || 'Care Professional'
            }]
          };
        }
        
        return invoice;
      });
      
      // Save updated invoices
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(updatedInvoices));
      
      console.log(`✅ Invoice pricing update complete!`);
      console.log(`   Total invoices: ${invoices.length}`);
      console.log(`   Updated: ${updatedCount}`);
      console.log(`   Unchanged: ${invoices.length - updatedCount}`);
      
      return { 
        success: true, 
        updated: updatedCount, 
        total: invoices.length,
        message: `Updated ${updatedCount} of ${invoices.length} invoices`
      };
      
    } catch (error) {
      console.error('❌ Error updating invoice pricing:', error);
      return { 
        success: false, 
        error: error.message 
      };
    }
  }
}

export default InvoiceService;