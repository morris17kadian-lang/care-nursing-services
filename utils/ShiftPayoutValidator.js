/**
 * Shift Payout Validator
 * Ensures accurate calculations for staff payments and client billing
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import InvoiceService from '../services/InvoiceService';

class ShiftPayoutValidator {
  static VALIDATION_LOG_KEY = '@care_shift_validation_log';
  
  /**
   * Validate shift calculations for accuracy
   */
  static async validateShiftPayout(shift) {
    try {
      const validation = {
        shiftId: shift.id,
        nurseName: shift.nurseName,
        clientName: shift.clientName,
        service: shift.service,
        date: shift.date,
        timestamp: new Date().toISOString(),
        calculations: {}
      };

      // 1. Validate Clock Times
      if (shift.actualStartTime && shift.actualEndTime) {
        const startTime = new Date(shift.actualStartTime);
        const endTime = new Date(shift.actualEndTime);
        const diffMs = endTime - startTime;
        const calculatedHours = (diffMs / (1000 * 60 * 60)).toFixed(2);
        const reportedHours = shift.hoursWorked;

        validation.calculations.clockTimes = {
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          calculatedHours: parseFloat(calculatedHours),
          reportedHours: parseFloat(reportedHours),
          discrepancy: Math.abs(parseFloat(calculatedHours) - parseFloat(reportedHours)),
          isAccurate: Math.abs(parseFloat(calculatedHours) - parseFloat(reportedHours)) < 0.1 // 6-minute tolerance
        };
      }

      // 2. Validate Service Rate
      const serviceRate = this.getShiftSpecificRate(shift);
      validation.calculations.serviceRate = {
        service: shift.service,
        nurseType: shift.nurseType || this.detectNurseType(shift.service),
        shiftType: shift.shiftType || this.detectShiftType(shift),
        rate: serviceRate,
        currency: 'JMD',
        source: 'SHIFT_RATES or InvoiceService.SERVICE_RATES'
      };

      // 3. Calculate Client Billing
      const clientHours = shift.hoursWorked || 1;
      const clientTotal = serviceRate * clientHours;
      validation.calculations.clientBilling = {
        hours: clientHours,
        rate: serviceRate,
        total: clientTotal,
        formatted: InvoiceService.formatCurrency(clientTotal)
      };

      // 4. Calculate Nurse Payout (assuming 60% of service rate)
      const nursePayoutRate = serviceRate * 0.6; // 60% to nurse, 40% to business
      const nurseTotal = nursePayoutRate * clientHours;
      validation.calculations.nursePayout = {
        hours: clientHours,
        payoutRate: nursePayoutRate,
        total: nurseTotal,
        formatted: InvoiceService.formatCurrency(nurseTotal),
        percentage: '60%'
      };

      // 5. Calculate Business Margin
      const businessMargin = clientTotal - nurseTotal;
      validation.calculations.businessMargin = {
        amount: businessMargin,
        formatted: InvoiceService.formatCurrency(businessMargin),
        percentage: '40%'
      };

      // 6. Overall Validation Status
      validation.status = {
        isValid: true,
        warnings: [],
        errors: []
      };

      // Check for potential issues
      if (validation.calculations.clockTimes && !validation.calculations.clockTimes.isAccurate) {
        validation.status.warnings.push(`Clock time discrepancy: ${validation.calculations.clockTimes.discrepancy.toFixed(2)} hours`);
      }

      if (clientHours > 24) {
        validation.status.errors.push(`Unrealistic hours worked: ${clientHours} hours`);
        validation.status.isValid = false;
      }

      if (clientHours < 0.25) {
        validation.status.warnings.push(`Very short shift: ${clientHours} hours`);
      }

      // Log validation
      await this.logValidation(validation);

      return validation;
    } catch (error) {
      console.error('Error validating shift payout:', error);
      return {
        shiftId: shift.id,
        status: { isValid: false, errors: ['Validation failed: ' + error.message] },
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Validate fortnightly billing calculations
   */
  static async validateFortnightlyBilling(shifts, period) {
    try {
      const validation = {
        period,
        shiftCount: shifts.length,
        timestamp: new Date().toISOString(),
        calculations: {},
        shifts: []
      };

      let totalClientBilling = 0;
      let totalNursePayout = 0;
      let totalHours = 0;

      // Validate each shift in the fortnightly period
      for (const shift of shifts) {
        const shiftValidation = await this.validateShiftPayout(shift);
        validation.shifts.push({
          shiftId: shift.id,
          nurseName: shift.nurseName,
          hours: shift.hoursWorked || 0,
          clientBilling: shiftValidation.calculations.clientBilling?.total || 0,
          nursePayout: shiftValidation.calculations.nursePayout?.total || 0,
          isValid: shiftValidation.status.isValid
        });

        totalClientBilling += shiftValidation.calculations.clientBilling?.total || 0;
        totalNursePayout += shiftValidation.calculations.nursePayout?.total || 0;
        totalHours += shift.hoursWorked || 0;
      }

      validation.calculations.totals = {
        totalHours,
        totalClientBilling,
        totalNursePayout,
        businessMargin: totalClientBilling - totalNursePayout,
        averageHourlyRate: totalHours > 0 ? (totalClientBilling / totalHours).toFixed(2) : 0
      };

      validation.calculations.formatted = {
        totalClientBilling: InvoiceService.formatCurrency(totalClientBilling),
        totalNursePayout: InvoiceService.formatCurrency(totalNursePayout),
        businessMargin: InvoiceService.formatCurrency(totalClientBilling - totalNursePayout),
        averageHourlyRate: InvoiceService.formatCurrency(validation.calculations.totals.averageHourlyRate)
      };

      return validation;
    } catch (error) {
      console.error('Error validating fortnightly billing:', error);
      return {
        period,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Log validation results for audit trail
   */
  static async logValidation(validation) {
    try {
      const existingLogs = await AsyncStorage.getItem(this.VALIDATION_LOG_KEY);
      const logs = existingLogs ? JSON.parse(existingLogs) : [];
      
      logs.push(validation);
      
      // Keep only last 100 validations to prevent storage bloat
      if (logs.length > 100) {
        logs.splice(0, logs.length - 100);
      }
      
      await AsyncStorage.setItem(this.VALIDATION_LOG_KEY, JSON.stringify(logs));
    } catch (error) {
      console.error('Error logging validation:', error);
    }
  }

  /**
   * Get validation history
   */
  static async getValidationLogs(limit = 20) {
    try {
      const logs = await AsyncStorage.getItem(this.VALIDATION_LOG_KEY);
      const parsedLogs = logs ? JSON.parse(logs) : [];
      return parsedLogs.slice(-limit).reverse(); // Return most recent first
    } catch (error) {
      console.error('Error getting validation logs:', error);
      return [];
    }
  }

  /**
   * Generate payout report for nurses
   */
  static async generatePayoutReport(startDate, endDate, nurseId = null) {
    try {
      const logs = await this.getValidationLogs(1000); // Get more logs for reporting
      const start = new Date(startDate);
      const end = new Date(endDate);

      const relevantLogs = logs.filter(log => {
        const logDate = new Date(log.timestamp);
        const matchesDate = logDate >= start && logDate <= end;
        const matchesNurse = !nurseId || log.nurseName?.toLowerCase().includes(nurseId.toLowerCase());
        return matchesDate && matchesNurse && log.calculations?.nursePayout;
      });

      const report = {
        period: {
          start: startDate,
          end: endDate,
          nurseFilter: nurseId
        },
        summary: {
          totalShifts: relevantLogs.length,
          totalHours: relevantLogs.reduce((sum, log) => sum + (log.calculations.clientBilling?.hours || 0), 0),
          totalPayout: relevantLogs.reduce((sum, log) => sum + (log.calculations.nursePayout?.total || 0), 0),
          averageHourlyRate: 0
        },
        shifts: relevantLogs.map(log => ({
          shiftId: log.shiftId,
          nurseName: log.nurseName,
          clientName: log.clientName,
          service: log.service,
          date: log.date,
          hours: log.calculations.clientBilling?.hours || 0,
          payout: log.calculations.nursePayout?.total || 0,
          formatted: log.calculations.nursePayout?.formatted || 'J$0.00'
        }))
      };

      if (report.summary.totalHours > 0) {
        report.summary.averageHourlyRate = (report.summary.totalPayout / report.summary.totalHours).toFixed(2);
      }

      report.summary.formattedTotalPayout = InvoiceService.formatCurrency(report.summary.totalPayout);
      report.summary.formattedAverageRate = InvoiceService.formatCurrency(report.summary.averageHourlyRate);

      return report;
    } catch (error) {
      console.error('Error generating payout report:', error);
      return null;
    }
  }

  /**
   * Get shift-specific rate based on nurse type and shift duration
   */
  static getShiftSpecificRate(shift) {
    const nurseType = shift.nurseType || this.detectNurseType(shift.service);
    const hours = shift.hoursWorked || shift.duration || 1;
    
    // For RN (Registered Nurse) shifts
    if (nurseType === 'RN' || nurseType === 'Registered Nurse') {
      return InvoiceService.calculateRNRate(hours) / hours; // Get hourly rate
    }
    
    // For PN (Practical Nurse) shifts
    if (nurseType === 'PN' || nurseType === 'Practical Nurse') {
      const shiftType = this.detectShiftType(shift);
      return InvoiceService.getPNShiftRate(shiftType) / hours; // Get hourly equivalent
    }
    
    // Fallback to standard service rate
    return InvoiceService.getServicePrice(shift.service);
  }
  
  /**
   * Detect nurse type from service name or shift data
   */
  static detectNurseType(service) {
    if (!service) return 'General';
    
    const serviceLower = service.toLowerCase();
    
    if (serviceLower.includes('rn') || serviceLower.includes('registered')) {
      return 'RN';
    }
    
    if (serviceLower.includes('pn') || serviceLower.includes('practical')) {
      return 'PN';
    }
    
    return 'General';
  }
  
  /**
   * Detect shift type from duration and other indicators
   */
  static detectShiftType(shift) {
    const hours = shift.hoursWorked || shift.duration || 8;
    
    // Live-in shifts
    if (shift.isLiveIn || shift.service?.toLowerCase().includes('live')) {
      if (hours >= 24 * 7) return 'weekly_live_in'; // 7+ days
      if (hours >= 20) return '24hr_live_in'; // 20+ hours considered daily live-in
    }
    
    // Standard shifts based on duration
    if (hours >= 11) return '12hr';
    if (hours >= 6) return '8hr';
    
    return '8hr'; // Default
  }
}

export default ShiftPayoutValidator;