import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
  TouchableOpacity,
  Modal,
  Image
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, GRADIENTS } from '../constants';
import InvoiceService from '../services/InvoiceService';
import ShiftPayoutValidator from '../utils/ShiftPayoutValidator';
import { TouchableWeb } from '../components/TouchableWeb';

export default function BusinessSettingsScreen({ navigation }) {
  const [invoiceCounterStatus, setInvoiceCounterStatus] = useState(null);
  const [newInvoiceCounter, setNewInvoiceCounter] = useState('');
  const [payoutReportVisible, setPayoutReportVisible] = useState(false);
  const [payoutReport, setPayoutReport] = useState(null);
  const [reportDateRange, setReportDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days ago
    end: new Date().toISOString().split('T')[0] // Today
  });
  const [validationLogs, setValidationLogs] = useState([]);

  useEffect(() => {
    loadInvoiceCounterStatus();
    loadValidationLogs();
  }, []);

  const loadInvoiceCounterStatus = async () => {
    try {
      const status = await InvoiceService.getInvoiceCounterStatus();
      setInvoiceCounterStatus(status);
    } catch (error) {
      console.error('Error loading invoice counter status:', error);
    }
  };

  const loadValidationLogs = async () => {
    try {
      const logs = await ShiftPayoutValidator.getValidationLogs(10);
      setValidationLogs(logs);
    } catch (error) {
      console.error('Error loading validation logs:', error);
    }
  };

  const handleInitializeInvoiceCounter = async () => {
    if (!newInvoiceCounter.trim()) {
      Alert.alert('Error', 'Please enter the last invoice number from your existing system');
      return;
    }

    Alert.alert(
      'Initialize Invoice Counter',
      `This will set the invoice counter to continue from ${newInvoiceCounter}. The next invoice will be generated after this number. Are you sure?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Initialize',
          onPress: async () => {
            try {
              const result = await InvoiceService.initializeInvoiceCounter(newInvoiceCounter);
              
              if (result.success) {
                Alert.alert('Success', result.message);
                setNewInvoiceCounter('');
                await loadInvoiceCounterStatus();
              } else {
                Alert.alert('Error', result.error);
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to initialize invoice counter: ' + error.message);
            }
          }
        }
      ]
    );
  };

  const generatePayoutReport = async () => {
    try {
      const report = await ShiftPayoutValidator.generatePayoutReport(
        reportDateRange.start,
        reportDateRange.end
      );
      
      if (report) {
        setPayoutReport(report);
        setPayoutReportVisible(true);
      } else {
        Alert.alert('Error', 'Failed to generate payout report');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to generate report: ' + error.message);
    }
  };

  const formatCurrency = (amount) => {
    return `J$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Watermark Logo */}
      <Image
        source={require('../assets/Images/Nurses-logo.png')}
        style={styles.watermarkLogo}
        resizeMode="contain"
      />
      
      {/* Header */}
      <LinearGradient
        colors={GRADIENTS.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerRow}>
          <TouchableWeb
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="arrow-left" size={24} color={COLORS.white} />
          </TouchableWeb>
          <Text style={styles.headerTitle}>Business Settings</Text>
          <View style={styles.placeholder} />
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Invoice Counter Management */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Invoice Numbering System</Text>
          
          {invoiceCounterStatus && (
            <View style={styles.statusCard}>
              <View style={styles.statusRow}>
                <MaterialCommunityIcons name="counter" size={24} color={COLORS.primary} />
                <View style={styles.statusInfo}>
                  <Text style={styles.statusLabel}>Current Counter</Text>
                  <Text style={styles.statusValue}>{invoiceCounterStatus.currentCounter}</Text>
                </View>
              </View>
              <View style={styles.statusRow}>
                <MaterialCommunityIcons name="file-document" size={24} color={COLORS.success} />
                <View style={styles.statusInfo}>
                  <Text style={styles.statusLabel}>Next Invoice ID</Text>
                  <Text style={styles.statusValue}>{invoiceCounterStatus.nextInvoiceId}</Text>
                </View>
              </View>
            </View>
          )}

          <Text style={styles.inputLabel}>Initialize from Existing System</Text>
          <Text style={styles.inputDescription}>
            Enter your last invoice number to continue your existing numbering sequence
          </Text>
          
          <View style={styles.inputContainer}>
            <MaterialCommunityIcons name="format-list-numbered" size={20} color={COLORS.textLight} />
            <TextInput
              style={styles.textInput}
              placeholder="e.g., NUR-INV-0150 or 150"
              placeholderTextColor={COLORS.textLight}
              value={newInvoiceCounter}
              onChangeText={setNewInvoiceCounter}
            />
            <TouchableWeb
              style={styles.initializeButton}
              onPress={handleInitializeInvoiceCounter}
              activeOpacity={0.7}
            >
              <Text style={styles.initializeButtonText}>Set</Text>
            </TouchableWeb>
          </View>
        </View>

        {/* Payout Validation */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payout Accuracy Tracking</Text>
          
          <TouchableWeb
            style={styles.actionCard}
            onPress={generatePayoutReport}
            activeOpacity={0.7}
          >
            <LinearGradient
              colors={['#10B981', '#059669']}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={styles.actionGradient}
            >
              <MaterialCommunityIcons name="chart-line" size={32} color={COLORS.white} />
              <Text style={styles.actionTitle}>Generate Payout Report</Text>
              <Text style={styles.actionSubtitle}>View nurse payouts and billing accuracy</Text>
            </LinearGradient>
          </TouchableWeb>

          {/* Recent Validations */}
          <Text style={styles.subsectionTitle}>Recent Shift Validations</Text>
          {validationLogs.map((log, index) => (
            <View key={index} style={styles.validationCard}>
              <View style={styles.validationHeader}>
                <MaterialCommunityIcons 
                  name={log.status?.isValid ? "check-circle" : "alert-circle"} 
                  size={20} 
                  color={log.status?.isValid ? COLORS.success : COLORS.warning} 
                />
                <View style={styles.validationInfo}>
                  <Text style={styles.validationTitle}>{log.clientName || 'Shift Validation'}</Text>
                  <Text style={styles.validationSubtitle}>
                    {log.nurseName} • {log.service} • {new Date(log.timestamp).toLocaleDateString()}
                  </Text>
                </View>
                {log.calculations?.nursePayout?.formatted && (
                  <Text style={styles.validationAmount}>{log.calculations.nursePayout.formatted}</Text>
                )}
              </View>
              
              {log.status?.warnings?.length > 0 && (
                <View style={styles.warningsContainer}>
                  {log.status.warnings.map((warning, idx) => (
                    <Text key={idx} style={styles.warningText}>⚠️ {warning}</Text>
                  ))}
                </View>
              )}
            </View>
          ))}
        </View>

        {/* Service Rates Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Current Service Rates</Text>
          <Text style={styles.ratesNote}>
            These rates are used for all billing and payout calculations. Nurse payouts are calculated at 60% of the service rate.
          </Text>
          
          <View style={styles.ratesGrid}>
            {Object.entries(InvoiceService.SERVICE_RATES).slice(0, 8).map(([service, rate]) => (
              <View key={service} style={styles.rateCard}>
                <Text style={styles.serviceName}>{service}</Text>
                <Text style={styles.serviceRate}>{formatCurrency(rate)}</Text>
                <Text style={styles.nurseRate}>Nurse: {formatCurrency(rate * 0.6)}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Payout Report Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={payoutReportVisible}
        onRequestClose={() => setPayoutReportVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Payout Report</Text>
              <TouchableWeb onPress={() => setPayoutReportVisible(false)}>
                <MaterialCommunityIcons name="close" size={24} color={COLORS.text} />
              </TouchableWeb>
            </View>
            
            {payoutReport && (
              <ScrollView style={styles.reportContent} showsVerticalScrollIndicator={false}>
                <View style={styles.reportSummary}>
                  <Text style={styles.reportPeriod}>
                    {new Date(payoutReport.period.start).toLocaleDateString()} - {new Date(payoutReport.period.end).toLocaleDateString()}
                  </Text>
                  
                  <View style={styles.summaryGrid}>
                    <View style={styles.summaryCard}>
                      <Text style={styles.summaryNumber}>{payoutReport.summary.totalShifts}</Text>
                      <Text style={styles.summaryLabel}>Total Shifts</Text>
                    </View>
                    <View style={styles.summaryCard}>
                      <Text style={styles.summaryNumber}>{payoutReport.summary.totalHours}</Text>
                      <Text style={styles.summaryLabel}>Total Hours</Text>
                    </View>
                    <View style={styles.summaryCard}>
                      <Text style={styles.summaryNumber}>{payoutReport.summary.formattedTotalPayout}</Text>
                      <Text style={styles.summaryLabel}>Total Payout</Text>
                    </View>
                  </View>
                </View>

                <Text style={styles.shiftListTitle}>Shift Details</Text>
                {payoutReport.shifts.map((shift, index) => (
                  <View key={index} style={styles.shiftReportCard}>
                    <View style={styles.shiftReportHeader}>
                      <Text style={styles.shiftReportNurse}>{shift.nurseName}</Text>
                      <Text style={styles.shiftReportPayout}>{shift.formatted}</Text>
                    </View>
                    <Text style={styles.shiftReportDetails}>
                      {shift.clientName} • {shift.service} • {shift.hours}hrs • {shift.date}
                    </Text>
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  watermarkLogo: {
    position: 'absolute',
    width: 250,
    height: 250,
    alignSelf: 'center',
    top: '40%',
    opacity: 0.05,
    zIndex: 0,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.white,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 15,
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 10,
    marginTop: 20,
  },
  statusCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  statusInfo: {
    marginLeft: 12,
    flex: 1,
  },
  statusLabel: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  statusValue: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 2,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 5,
  },
  inputDescription: {
    fontSize: 14,
    color: COLORS.textLight,
    marginBottom: 15,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  textInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    color: COLORS.text,
  },
  initializeButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
  },
  initializeButtonText: {
    color: COLORS.white,
    fontWeight: '600',
  },
  actionCard: {
    marginBottom: 20,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  actionGradient: {
    padding: 20,
    alignItems: 'center',
    gap: 8,
  },
  actionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.white,
    textAlign: 'center',
  },
  actionSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
  },
  validationCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  validationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  validationInfo: {
    flex: 1,
    marginLeft: 12,
  },
  validationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  validationSubtitle: {
    fontSize: 14,
    color: COLORS.textLight,
    marginTop: 2,
  },
  validationAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.success,
  },
  warningsContainer: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  warningText: {
    fontSize: 12,
    color: COLORS.warning,
    marginBottom: 4,
  },
  ratesNote: {
    fontSize: 14,
    color: COLORS.textLight,
    marginBottom: 20,
    fontStyle: 'italic',
  },
  ratesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  rateCard: {
    backgroundColor: COLORS.white,
    borderRadius: 8,
    padding: 12,
    width: '48%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  serviceName: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  serviceRate: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 2,
  },
  nurseRate: {
    fontSize: 11,
    color: COLORS.success,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 0,
    width: '90%',
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  reportContent: {
    padding: 20,
  },
  reportSummary: {
    marginBottom: 20,
  },
  reportPeriod: {
    fontSize: 14,
    color: COLORS.textLight,
    textAlign: 'center',
    marginBottom: 15,
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  summaryNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  summaryLabel: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 4,
  },
  shiftListTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 10,
  },
  shiftReportCard: {
    backgroundColor: COLORS.background,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  shiftReportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  shiftReportNurse: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  shiftReportPayout: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.success,
  },
  shiftReportDetails: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 4,
  },
});