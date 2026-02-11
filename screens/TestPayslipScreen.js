import React from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import PayslipComponent from '../components/PayslipComponent';
import PayslipGenerator from '../services/PayslipGenerator';

export default function TestPayslipScreen({ navigation }) {
  // Sample payslip data based on your nurse pay structure
  const samplePayslip = {
    id: 'NUR-001-20260113',
    payslipNumber: 'NUR-PAY-0001',
    staffId: 'nurse_001',
    employeeId: '54231846',
    nurseCode: 'NURSE001',
    code: 'NURSE001',
    staffName: 'kadian red',
    email: 'ref@care.com',
    address: 'Grafton road, Jamaica',
    role: 'Registered Nurse',
    staffType: 'nursing',
    payType: 'hourly',
    
    // Pay period
    periodStart: '2026-01-10',
    periodEnd: '2026-01-17',
    generatedDate: '2026-01-10',
    payDate: '2026-01-17',
    
    // Hours worked
    regularHours: 38.4,
    overtimeHours: 0,
    hoursWorked: 38.4,
    appointmentHours: 38.4,
    shiftHours: 0,
    sessionsCompleted: 1,
    shiftsCompleted: 0,
    
    // Pay calculations
    hourlyRate: 2700, // J$2,700 per hour (RN rate - 60% of J$4,500)
    regularPay: '103680.00', // 38.4 hours × J$2,700
    overtimePay: '0.00',
    grossPay: '103680.00',
    deductions: 0,
    netPay: '103680.00',
    
    // Status
    status: 'paid',
    paymentMethod: 'Bank Transfer',
    paidDate: '2026-01-17',
  };

  const handleClose = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  };

  const [isSharing, setIsSharing] = React.useState(false);

  const handleShare = async (payslip = samplePayslip) => {
    if (isSharing) return;
    setIsSharing(true);
    try {
      const pdfUri = await PayslipGenerator.generatePayslipPDF(payslip);
      await PayslipGenerator.sharePayslip(pdfUri, payslip.staffName);
    } catch (error) {
      console.error('Error generating payslip PDF:', error);
      Alert.alert('Error', 'Failed to generate payslip PDF. Please try again.');
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <View style={styles.container}>
      <PayslipComponent 
        payslip={samplePayslip}
        onClose={handleClose}
        onShare={handleShare}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
