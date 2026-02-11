import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import ApiService from './ApiService';
import NCBPaymentService from './NCBPaymentService';

/**
 * AutoPayoutService - Handles automated staff payouts with real NCB payments
 * Integrates with PaymentSettings, Payroll configurations, and generated payslips
 */
class AutoPayoutService {
  static async isAutoPayoutEnabled() {
    try {
      const settings = await AsyncStorage.getItem('paymentSettings');
      if (settings) {
        const parsed = JSON.parse(settings);
        return parsed.autoPayoutEnabled === true;
      }
      return false;
    } catch (error) {
      // Error checking auto payout setting
      return false;
    }
  }

  static async getDefaultPaymentMethod() {
    try {
      // Get payment settings from Firebase
      const paymentSettings = await ApiService.getPaymentSettings();
      if (paymentSettings && paymentSettings.defaultMethod) {
        return paymentSettings.defaultMethod;
      }

      // Fallback to AsyncStorage
      const methods = await AsyncStorage.getItem('paymentMethods');
      if (methods) {
        const paymentMethods = JSON.parse(methods);
        return paymentMethods.find(method => method.default === true || method.isDefault === true);
      }
      return null;
    } catch (error) {
      // Error getting default payment method
      // Fallback to AsyncStorage
      const methods = await AsyncStorage.getItem('paymentMethods');
      if (methods) {
        const paymentMethods = JSON.parse(methods);
        return paymentMethods.find(method => method.default === true || method.isDefault === true);
      }
      return null;
    }
  }

  static async processAutomaticPayout(payslip) {
    try {
      // Check if auto payout is enabled
      const isEnabled = await this.isAutoPayoutEnabled();
      if (!isEnabled) {
        // Auto payout is disabled
        return false;
      }

      // Get default payment method (card)
      const defaultPaymentMethod = await this.getDefaultPaymentMethod();
      if (!defaultPaymentMethod) {
        // No default payment method found for auto payout
        return false;
      }

      // Validate payslip data
      if (!payslip.netPay || parseFloat(payslip.netPay) <= 0) {
        // Invalid payslip amount for auto payout
        return false;
      }

      // Process real payment through NCB
      const paymentResult = await this.processPayment({
        payslip,
        paymentMethod: defaultPaymentMethod,
        amount: parseFloat(payslip.netPay)
      });

      if (paymentResult.success) {
        // Update payslip status
        await this.updatePayslipStatus(payslip.id, 'paid', {
          paymentMethod: defaultPaymentMethod.name || `${defaultPaymentMethod.cardType} Card`,
          payDate: new Date().toISOString().split('T')[0],
          transactionId: paymentResult.transactionId,
          ncbTransactionId: paymentResult.ncbTransactionId
        });

        // Auto payout successful
        return true;
      } else {
        // Auto payout failed
        return false;
      }
    } catch (error) {
      // Error processing automatic payout
      return false;
    }
  }

  static async processPayment({ payslip, paymentMethod, amount }) {
    try {
      // Get staff banking details for the payment
      const staffBankingDetails = await this.getStaffBankingDetails(payslip.staffId);
      
      if (!staffBankingDetails) {
        return {
          success: false,
          error: 'Staff banking details not found - cannot process payout',
          paymentMethod: paymentMethod.name || `${paymentMethod.cardType} Card`,
          attemptedAt: new Date().toISOString()
        };
      }

      // Process real payment through NCB
      const ncbResult = await NCBPaymentService.processPayment({
        amount: amount,
        payslipId: payslip.id,
        paymentMethodId: paymentMethod.id || paymentMethod._id,
        recipientId: payslip.staffId,
        recipientName: staffBankingDetails.accountHolderName,
        recipientEmail: payslip.staffEmail,
        recipientPhone: payslip.staffPhone,
        description: `Payslip Payment for ${payslip.staffName} - Period: ${payslip.period}`
      });

      if (ncbResult.success) {
        return {
          success: true,
          transactionId: ncbResult.transactionId,
          ncbTransactionId: ncbResult.ncbTransactionId,
          amount: amount,
          paymentMethod: paymentMethod.name || `${paymentMethod.cardType} Card`,
          processedAt: new Date().toISOString(),
          recipientBank: staffBankingDetails.bankName,
          recipientAccount: `****${staffBankingDetails.accountNumber.slice(-4)}`,
          recipientName: staffBankingDetails.accountHolderName,
          status: ncbResult.status
        };
      } else {
        return {
          success: false,
          error: ncbResult.error || 'Payment processing failed',
          paymentMethod: paymentMethod.name || `${paymentMethod.cardType} Card`,
          attemptedAt: new Date().toISOString()
        };
      }
    } catch (error) {
      // Error in processPayment
      return {
        success: false,
        error: error.message || 'Payment processing error',
        attemptedAt: new Date().toISOString()
      };
    }
  }

  static async getStaffBankingDetails(staffId) {
    try {
      // Get staff data from nurses context
      const nursesData = await AsyncStorage.getItem('nurses');
      if (nursesData) {
        const nurses = JSON.parse(nursesData);
        const staff = nurses.find(nurse => nurse.id === staffId);
        if (staff && staff.bankingDetails) {
          return staff.bankingDetails;
        }
      }

      // Also check in users data for admin staff
      const usersData = await AsyncStorage.getItem('users');
      if (usersData) {
        const users = JSON.parse(usersData);
        const staff = users.find(user => user.id === staffId);
        if (staff && staff.bankingDetails) {
          return staff.bankingDetails;
        }
      }

      return null;
    } catch (error) {
      // Error getting staff banking details
      return null;
    }
  }

  static async updatePayslipStatus(payslipId, status, paymentDetails = {}) {
    try {
      // Update locally first
      const stored = await AsyncStorage.getItem('generatedPayslips');
      if (stored) {
        const payslips = JSON.parse(stored);
        const updated = payslips.map(payslip =>
          payslip.id === payslipId
            ? { 
                ...payslip, 
                status, 
                ...paymentDetails,
                lastUpdated: new Date().toISOString()
              }
            : payslip
        );
        await AsyncStorage.setItem('generatedPayslips', JSON.stringify(updated));
      }

      // Also update payslips cache
      const nursePayslipsStored = await AsyncStorage.getItem('nursePayslips');
      if (nursePayslipsStored) {
        const allNursePayslips = JSON.parse(nursePayslipsStored);
        for (const staffId in allNursePayslips) {
          allNursePayslips[staffId] = allNursePayslips[staffId].map(p =>
            p.id === payslipId ? { ...p, status, ...paymentDetails } : p
          );
        }
        await AsyncStorage.setItem('nursePayslips', JSON.stringify(allNursePayslips));
      }

      // Sync to backend - update payslip in Firebase
      try {
        const updateData = {
          status,
          paymentMethod: paymentDetails.paymentMethod,
          transactionId: paymentDetails.transactionId,
          ncbTransactionId: paymentDetails.ncbTransactionId,
          notes: `Payout processed on ${new Date().toLocaleDateString()}`
        };
        
        await ApiService.updatePayslip(payslipId, updateData);
        console.log('Payslip synced to Firebase successfully');
      } catch (backendError) {
        console.warn('Backend sync pending for payslip - will retry later:', backendError);
        // Continue even if backend sync fails - local update is successful
      }

      return true;
    } catch (error) {
      // Error updating payslip status
      return false;
    }
  }

  static async processPendingPayouts() {
    try {
      // Get all pending payslips
      const stored = await AsyncStorage.getItem('generatedPayslips');
      if (!stored) return;

      const payslips = JSON.parse(stored);
      const pendingPayslips = payslips.filter(p => p.status === 'pending');

      // Processing pending auto payouts

      for (const payslip of pendingPayslips) {
        const result = await this.processAutomaticPayout(payslip);
        
        if (result) {
          // Optional: Send notification to staff member
          await this.sendPaymentNotification(payslip);
        }

        // Add delay between payments to avoid overwhelming the payment processor
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Auto payout batch processing completed
    } catch (error) {
      // Error processing pending payouts
    }
  }

  static async sendPaymentNotification(payslip) {
    // In a real app, this would send push notification or email
    // Notification: Payment sent
  }

  // Schedule automatic payouts (to be called on payslip generation)
  static async scheduleAutoPayout(payslips) {
    if (!Array.isArray(payslips)) {
      payslips = [payslips];
    }

    for (const payslip of payslips) {
      // Add a small delay to prevent simultaneous processing
      setTimeout(async () => {
        await this.processAutomaticPayout(payslip);
      }, Math.random() * 5000); // Random delay 0-5 seconds
    }
  }
}

export default AutoPayoutService;