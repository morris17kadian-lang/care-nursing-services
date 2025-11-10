import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, GRADIENTS } from '../constants';

const PaymentSettingsScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [viewMode, setViewMode] = useState('general'); // 'general', 'payment', 'business', 'company'
  
  // State for settings
  const [autoPayoutEnabled, setAutoPayoutEnabled] = useState(true);
  const [paymentRemindersEnabled, setPaymentRemindersEnabled] = useState(true);
  const [receiptsEnabled, setReceiptsEnabled] = useState(true);
  
  // Picker modal states
  const [currencyModalVisible, setCurrencyModalVisible] = useState(false);
  const [scheduleModalVisible, setScheduleModalVisible] = useState(false);
  
  // Payment method states
  const [paymentMethods, setPaymentMethods] = useState([
    { id: '1', type: 'Credit Card', name: 'Visa ****1234', default: true, icon: 'credit-card' },
    { id: '2', type: 'Bank Account', name: 'Checking ****5678', default: false, icon: 'bank' },
  ]);

  // Business settings
  const [businessSettings, setBusinessSettings] = useState({
    businessName: 'CARE Nursing Services and More',
    taxId: '12-3456789',
    serviceFee: '2.5',
    currency: 'JMD',
    payoutSchedule: 'weekly',
    minimumPayout: '15,000'
  });

  // Company details for invoices
  const [companyDetails, setCompanyDetails] = useState({
    companyName: 'CARE Nursing Services and More',
    fullName: 'NURSING SERVICES AND MORE',
    address: 'Kingston, Jamaica',
    phone: '876-288-7304',
    email: 'care@nursingcareja.com',
    taxId: '',
    website: '',
  });

  // Payment information for invoices
  const [paymentInfo, setPaymentInfo] = useState({
    bankAccounts: [
      { 
        id: '1', 
        bankName: 'NCB', 
        recipientType: 'Individual',
        accountNumbers: [
          { id: '1', number: '123456789', currency: 'JMD' }
        ],
        payee: '',
        branch: '',
        swiftCode: '',
        sortCode: ''
      }
    ],
    cashAccepted: true,
    posAvailable: false
  });

  // Load company details and payment info from AsyncStorage on mount
  useEffect(() => {
    loadCompanyDetails();
    loadPaymentInfo();
  }, []);

  const loadPaymentInfo = async () => {
    try {
      const stored = await AsyncStorage.getItem('paymentInfo');
      if (stored) {
        setPaymentInfo(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading payment info:', error);
    }
  };

  const savePaymentInfo = async () => {
    try {
      await AsyncStorage.setItem('paymentInfo', JSON.stringify(paymentInfo));
      Alert.alert('Success', 'Payment information saved successfully');
    } catch (error) {
      console.error('Error saving payment info:', error);
      Alert.alert('Error', 'Failed to save payment information');
    }
  };

  // Load company details from AsyncStorage on mount

  const loadCompanyDetails = async () => {
    try {
      const stored = await AsyncStorage.getItem('companyDetails');
      if (stored) {
        setCompanyDetails(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading company details:', error);
    }
  };

  const saveCompanyDetails = async () => {
    try {
      await AsyncStorage.setItem('companyDetails', JSON.stringify(companyDetails));
      Alert.alert('Success', 'Company details saved successfully');
    } catch (error) {
      console.error('Error saving company details:', error);
      Alert.alert('Error', 'Failed to save company details');
    }
  };

  const handleAddPaymentMethod = () => {
    Alert.alert(
      'Add Payment Method',
      'Choose payment method type:',
      [
        { text: 'Credit Card', onPress: () => addPaymentMethod('Credit Card') },
        { text: 'Bank Account', onPress: () => addPaymentMethod('Bank Account') },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const addPaymentMethod = (type) => {
    Alert.alert('Add Payment Method', `${type} addition functionality would be implemented here`);
  };

  const setDefaultPaymentMethod = (id) => {
    setPaymentMethods(methods =>
      methods.map(method => ({
        ...method,
        default: method.id === id
      }))
    );
    Alert.alert('Success', 'Default payment method updated');
  };

  const removePaymentMethod = (id) => {
    Alert.alert(
      'Remove Payment Method',
      'Are you sure you want to remove this payment method?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            setPaymentMethods(methods => methods.filter(method => method.id !== id));
            Alert.alert('Success', 'Payment method removed');
          }
        }
      ]
    );
  };

  const saveSettings = () => {
    Alert.alert('Success', 'Payment settings have been saved successfully');
  };

  const renderSettingRow = (title, subtitle, value, onValueChange, type = 'switch') => (
    <View style={styles.settingRow}>
      <View style={styles.settingInfo}>
        <Text style={styles.settingTitle}>{title}</Text>
        {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
      </View>
      {type === 'switch' ? (
        <Switch
          value={value}
          onValueChange={onValueChange}
          trackColor={{ false: COLORS.border, true: COLORS.accent }}
          thumbColor={value ? COLORS.white : COLORS.textMuted}
        />
      ) : (
        <TouchableOpacity onPress={onValueChange}>
          <Text style={styles.settingValue}>{value}</Text>
          <MaterialCommunityIcons name="chevron-right" size={20} color={COLORS.textMuted} />
        </TouchableOpacity>
      )}
    </View>
  );

  const renderPaymentMethod = (method) => (
    <View key={method.id} style={styles.paymentMethodCard}>
      <View style={styles.paymentMethodLeft}>
        <View style={styles.paymentMethodInfo}>
          <Text style={styles.paymentMethodType}>{method.type}</Text>
          <Text style={styles.paymentMethodName}>{method.name}</Text>
          {method.default && <Text style={styles.defaultLabel}>Default</Text>}
        </View>
      </View>
      <View style={styles.paymentMethodActions}>
        {!method.default && (
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => setDefaultPaymentMethod(method.id)}
          >
            <Text style={styles.actionButtonText}>Set Default</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity 
          style={[styles.actionButton, styles.removeButton]}
          onPress={() => removePaymentMethod(method.id)}
        >
          <MaterialCommunityIcons name="delete" size={16} color={COLORS.error} />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderBusinessSetting = (key, label, value, placeholder) => (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        style={styles.textInput}
        value={value}
        onChangeText={(text) => setBusinessSettings(prev => ({ ...prev, [key]: text }))}
        placeholder={placeholder}
        placeholderTextColor={COLORS.textMuted}
      />
    </View>
  );

  const renderCompanyField = (key, label, value, placeholder, keyboardType = 'default') => (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        style={styles.textInput}
        value={value}
        onChangeText={(text) => setCompanyDetails(prev => ({ ...prev, [key]: text }))}
        placeholder={placeholder}
        placeholderTextColor={COLORS.textMuted}
        keyboardType={keyboardType}
      />
    </View>
  );

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      <LinearGradient 
        colors={GRADIENTS.header} 
        style={[styles.header, { paddingTop: insets.top + 20 }]}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <MaterialCommunityIcons name="arrow-left" size={24} color={COLORS.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Payment Settings</Text>
          <TouchableOpacity
            onPress={() => {
              if (viewMode === 'company') {
                saveCompanyDetails();
                savePaymentInfo();
              } else {
                saveSettings();
              }
            }}
            style={styles.saveButton}
          >
            <MaterialCommunityIcons name="check" size={24} color={COLORS.white} />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* View Mode Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={styles.tab}
          onPress={() => setViewMode('general')}
        >
          {viewMode === 'general' ? (
            <LinearGradient
              colors={GRADIENTS.header}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.tabGradient}
            >
              <Text style={styles.tabText}>General</Text>
            </LinearGradient>
          ) : (
            <View style={styles.inactiveTab}>
              <Text style={styles.inactiveTabText}>General</Text>
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.tab}
          onPress={() => setViewMode('payment')}
        >
          {viewMode === 'payment' ? (
            <LinearGradient
              colors={GRADIENTS.header}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.tabGradient}
            >
              <Text style={styles.tabText}>Payment</Text>
            </LinearGradient>
          ) : (
            <View style={styles.inactiveTab}>
              <Text style={styles.inactiveTabText}>Payment</Text>
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.tab}
          onPress={() => setViewMode('business')}
        >
          {viewMode === 'business' ? (
            <LinearGradient
              colors={GRADIENTS.header}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.tabGradient}
            >
              <Text style={styles.tabText}>Business</Text>
            </LinearGradient>
          ) : (
            <View style={styles.inactiveTab}>
              <Text style={styles.inactiveTabText}>Business</Text>
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.tab}
          onPress={() => setViewMode('company')}
        >
          {viewMode === 'company' ? (
            <LinearGradient
              colors={GRADIENTS.header}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.tabGradient}
            >
              <Text style={styles.tabText}>Invoice</Text>
            </LinearGradient>
          ) : (
            <View style={styles.inactiveTab}>
              <Text style={styles.inactiveTabText}>Invoice</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.content} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Conditional Content Based on View Mode */}
        {viewMode === 'general' && (
          <>
            {/* General Settings Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>General Settings</Text>
              {renderSettingRow(
                'Auto Payout',
                'Automatically transfer earnings to your account',
                autoPayoutEnabled,
                setAutoPayoutEnabled
              )}
              {renderSettingRow(
                'Payment Reminders',
                'Send notifications for upcoming payments',
                paymentRemindersEnabled,
                setPaymentRemindersEnabled
              )}
              {renderSettingRow(
                'Email Receipts',
                'Send receipt confirmation emails',
                receiptsEnabled,
                setReceiptsEnabled
              )}
            </View>
          </>
        )}

        {viewMode === 'payment' && (
          <>
            {/* Payment Methods Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Payment Methods</Text>
                <TouchableOpacity 
                  style={styles.addButton}
                  onPress={handleAddPaymentMethod}
                >
                  <MaterialCommunityIcons name="plus" size={20} color={COLORS.primary} />
                  <Text style={styles.addButtonText}>Add</Text>
                </TouchableOpacity>
              </View>
              {paymentMethods.map(renderPaymentMethod)}
            </View>
          </>
        )}

        {viewMode === 'business' && (
          <>
            {/* Business Settings Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Business Information</Text>
              {renderBusinessSetting('businessName', 'Business Name', businessSettings.businessName, 'Enter business name')}
              {renderBusinessSetting('taxId', 'Tax ID', businessSettings.taxId, 'Enter tax ID')}
              {renderBusinessSetting('serviceFee', 'Service Fee (%)', businessSettings.serviceFee, 'Enter service fee percentage')}
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Currency</Text>
                <TouchableOpacity 
                  style={styles.textInput}
                  onPress={() => setCurrencyModalVisible(true)}
                >
                  <Text style={styles.inputText}>{businessSettings.currency}</Text>
                  <MaterialCommunityIcons name="chevron-down" size={20} color={COLORS.textMuted} />
                </TouchableOpacity>
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Payout Schedule</Text>
                <TouchableOpacity 
                  style={styles.textInput}
                  onPress={() => setScheduleModalVisible(true)}
                >
                  <Text style={styles.inputText}>{businessSettings.payoutSchedule}</Text>
                  <MaterialCommunityIcons name="chevron-down" size={20} color={COLORS.textMuted} />
                </TouchableOpacity>
              </View>
              
              {renderBusinessSetting('minimumPayout', 'Minimum Payout ($)', businessSettings.minimumPayout, 'Enter minimum payout amount')}
            </View>
          </>
        )}

        {viewMode === 'company' && (
          <>
            {/* Company Details for Invoices */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Company Information</Text>
              <Text style={styles.sectionSubtitle}>This information will appear on all invoices</Text>
              
              {renderCompanyField('companyName', 'Company Name', companyDetails.companyName, 'Enter company name')}
              {renderCompanyField('fullName', 'Full Business Name', companyDetails.fullName, 'Enter full business name')}
              {renderCompanyField('address', 'Business Address', companyDetails.address, 'Enter business address')}
              {renderCompanyField('phone', 'Phone Number', companyDetails.phone, 'Enter phone number', 'phone-pad')}
              {renderCompanyField('email', 'Email Address', companyDetails.email, 'Enter email address', 'email-address')}
              {renderCompanyField('taxId', 'Tax ID / Registration Number', companyDetails.taxId, 'Enter tax ID or registration number')}
              {renderCompanyField('website', 'Website (Optional)', companyDetails.website, 'Enter website URL')}
            </View>

            {/* Payment Information Section */}
            <View style={styles.section}>
              <View>
                <Text style={styles.sectionTitle}>Bank Account Information</Text>
                <Text style={styles.sectionSubtitle}>Bank accounts will appear on invoices</Text>
              </View>
              
              {paymentInfo.bankAccounts.map((account, index) => (
                <View key={account.id} style={styles.bankAccountCard}>
                  <View style={styles.bankAccountHeader}>
                    <Text style={styles.bankAccountTitle}>Bank Account {index + 1}</Text>
                    {paymentInfo.bankAccounts.length > 1 && (
                      <TouchableOpacity 
                        onPress={() => {
                          setPaymentInfo({
                            ...paymentInfo,
                            bankAccounts: paymentInfo.bankAccounts.filter(a => a.id !== account.id)
                          });
                        }}
                      >
                        <MaterialCommunityIcons name="delete" size={20} color={COLORS.error} />
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Bank Name */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Recipient's Bank</Text>
                    <TextInput
                      style={styles.textInput}
                      value={account.bankName}
                      onChangeText={(text) => {
                        const updated = [...paymentInfo.bankAccounts];
                        updated[index].bankName = text;
                        setPaymentInfo({ ...paymentInfo, bankAccounts: updated });
                      }}
                      placeholder="Enter bank name"
                      placeholderTextColor={COLORS.textMuted}
                    />
                  </View>

                  {/* Recipient Type */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Recipient Type</Text>
                    <TextInput
                      style={styles.textInput}
                      value={account.recipientType}
                      onChangeText={(text) => {
                        const updated = [...paymentInfo.bankAccounts];
                        updated[index].recipientType = text;
                        setPaymentInfo({ ...paymentInfo, bankAccounts: updated });
                      }}
                      placeholder="e.g., Individual, Business"
                      placeholderTextColor={COLORS.textMuted}
                    />
                  </View>

                  {/* Account Numbers with Currency */}
                  <View style={styles.accountNumbersContainer}>
                    {account.accountNumbers.map((accNum, accIndex) => (
                      <View key={accNum.id} style={styles.accountNumberRow}>
                        <View style={[styles.inputGroup, { flex: 2, marginBottom: 0 }]}>
                          <Text style={styles.inputLabel}>Bank Account Number {accIndex + 1}</Text>
                          <TextInput
                            style={styles.textInput}
                            value={accNum.number}
                            onChangeText={(text) => {
                              const updated = [...paymentInfo.bankAccounts];
                              updated[index].accountNumbers[accIndex].number = text;
                              setPaymentInfo({ ...paymentInfo, bankAccounts: updated });
                            }}
                            placeholder="Enter account number"
                            placeholderTextColor={COLORS.textMuted}
                            keyboardType="numeric"
                          />
                        </View>
                        <View style={[styles.inputGroup, { flex: 1, marginBottom: 0 }]}>
                          <Text style={styles.inputLabel}>Currency</Text>
                          <TouchableOpacity 
                            style={styles.textInput}
                            onPress={() => {
                              setPaymentInfo({ 
                                ...paymentInfo, 
                                selectedAccountIndex: index,
                                selectedAccountNumberIndex: accIndex 
                              });
                              setCurrencyModalVisible(true);
                            }}
                          >
                            <Text style={styles.inputText}>{accNum.currency}</Text>
                            <MaterialCommunityIcons name="chevron-down" size={20} color={COLORS.textMuted} />
                          </TouchableOpacity>
                        </View>
                        {account.accountNumbers.length > 1 && (
                          <TouchableOpacity 
                            style={styles.deleteAccountNumberButton}
                            onPress={() => {
                              const updated = [...paymentInfo.bankAccounts];
                              updated[index].accountNumbers = updated[index].accountNumbers.filter(a => a.id !== accNum.id);
                              setPaymentInfo({ ...paymentInfo, bankAccounts: updated });
                            }}
                          >
                            <MaterialCommunityIcons name="close-circle" size={20} color={COLORS.error} />
                          </TouchableOpacity>
                        )}
                      </View>
                    ))}
                    
                    {/* Add Account Number Button */}
                    <TouchableOpacity 
                      style={styles.addAccountButton}
                      onPress={() => {
                        const updated = [...paymentInfo.bankAccounts];
                        const newAccNumId = (updated[index].accountNumbers.length + 1).toString();
                        updated[index].accountNumbers.push({ 
                          id: newAccNumId, 
                          number: '', 
                          currency: 'JMD' 
                        });
                        setPaymentInfo({ ...paymentInfo, bankAccounts: updated });
                      }}
                    >
                      <MaterialCommunityIcons name="plus" size={24} color={COLORS.primary} />
                    </TouchableOpacity>
                  </View>

                  {/* Payee */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Payee</Text>
                    <TextInput
                      style={styles.textInput}
                      value={account.payee}
                      onChangeText={(text) => {
                        const updated = [...paymentInfo.bankAccounts];
                        updated[index].payee = text;
                        setPaymentInfo({ ...paymentInfo, bankAccounts: updated });
                      }}
                      placeholder="Enter payee name"
                      placeholderTextColor={COLORS.textMuted}
                    />
                  </View>

                  {/* Branch */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Branch</Text>
                    <TextInput
                      style={styles.textInput}
                      value={account.branch}
                      onChangeText={(text) => {
                        const updated = [...paymentInfo.bankAccounts];
                        updated[index].branch = text;
                        setPaymentInfo({ ...paymentInfo, bankAccounts: updated });
                      }}
                      placeholder="Enter branch name"
                      placeholderTextColor={COLORS.textMuted}
                    />
                  </View>

                  {/* Swift Code */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Bank Swift Code</Text>
                    <TextInput
                      style={styles.textInput}
                      value={account.swiftCode}
                      onChangeText={(text) => {
                        const updated = [...paymentInfo.bankAccounts];
                        updated[index].swiftCode = text;
                        setPaymentInfo({ ...paymentInfo, bankAccounts: updated });
                      }}
                      placeholder="Enter swift code"
                      placeholderTextColor={COLORS.textMuted}
                    />
                  </View>

                  {/* Sort Code */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Bank Sort Code</Text>
                    <TextInput
                      style={styles.textInput}
                      value={account.sortCode}
                      onChangeText={(text) => {
                        const updated = [...paymentInfo.bankAccounts];
                        updated[index].sortCode = text;
                        setPaymentInfo({ ...paymentInfo, bankAccounts: updated });
                      }}
                      placeholder="Enter sort code"
                      placeholderTextColor={COLORS.textMuted}
                    />
                  </View>
                </View>
              ))}

              {/* Cash and POS Options */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Other Payment Methods</Text>
                {renderSettingRow(
                  'Cash Accepted',
                  'Cash accepted for home visits',
                  paymentInfo.cashAccepted,
                  (value) => setPaymentInfo({ ...paymentInfo, cashAccepted: value })
                )}
                {renderSettingRow(
                  'POS Machine Available',
                  'Accept card payments via POS machine',
                  paymentInfo.posAvailable,
                  (value) => setPaymentInfo({ ...paymentInfo, posAvailable: value })
                )}
              </View>
            </View>
          </>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Currency Picker Modal */}
      <Modal
        visible={currencyModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setCurrencyModalVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setCurrencyModalVisible(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Currency</Text>
            {['JMD', 'USD', 'CAD', 'GBP', 'EUR'].map((currency) => (
              <TouchableOpacity
                key={currency}
                style={styles.modalOption}
                onPress={() => {
                  // Check if we're updating business settings or bank account
                  if (viewMode === 'business') {
                    setBusinessSettings({ ...businessSettings, currency });
                  } else if (viewMode === 'company' && paymentInfo.selectedAccountIndex !== undefined) {
                    const updated = [...paymentInfo.bankAccounts];
                    if (paymentInfo.selectedAccountNumberIndex !== undefined) {
                      // Update specific account number currency
                      updated[paymentInfo.selectedAccountIndex].accountNumbers[paymentInfo.selectedAccountNumberIndex].currency = currency;
                    }
                    setPaymentInfo({ 
                      ...paymentInfo, 
                      bankAccounts: updated, 
                      selectedAccountIndex: undefined,
                      selectedAccountNumberIndex: undefined 
                    });
                  }
                  setCurrencyModalVisible(false);
                }}
              >
                <Text style={[
                  styles.modalOptionText,
                  (viewMode === 'business' && businessSettings.currency === currency) ||
                  (viewMode === 'company' && paymentInfo.selectedAccountIndex !== undefined && 
                   paymentInfo.selectedAccountNumberIndex !== undefined &&
                   paymentInfo.bankAccounts[paymentInfo.selectedAccountIndex]?.accountNumbers[paymentInfo.selectedAccountNumberIndex]?.currency === currency) ? styles.modalOptionTextSelected : null
                ]}>
                  {currency}
                </Text>
                {((viewMode === 'business' && businessSettings.currency === currency) ||
                  (viewMode === 'company' && paymentInfo.selectedAccountIndex !== undefined && 
                   paymentInfo.selectedAccountNumberIndex !== undefined &&
                   paymentInfo.bankAccounts[paymentInfo.selectedAccountIndex]?.accountNumbers[paymentInfo.selectedAccountNumberIndex]?.currency === currency)) && (
                  <MaterialCommunityIcons name="check" size={20} color={COLORS.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Schedule Picker Modal */}
      <Modal
        visible={scheduleModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setScheduleModalVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setScheduleModalVisible(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Payout Schedule</Text>
            {['daily', 'weekly', 'bi-weekly', 'monthly'].map((schedule) => (
              <TouchableOpacity
                key={schedule}
                style={styles.modalOption}
                onPress={() => {
                  setBusinessSettings({ ...businessSettings, payoutSchedule: schedule });
                  setScheduleModalVisible(false);
                }}
              >
                <Text style={[
                  styles.modalOptionText,
                  businessSettings.payoutSchedule === schedule && styles.modalOptionTextSelected
                ]}>
                  {schedule.charAt(0).toUpperCase() + schedule.slice(1)}
                </Text>
                {businessSettings.payoutSchedule === schedule && (
                  <MaterialCommunityIcons name="check" size={20} color={COLORS.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.white,
    flex: 1,
    textAlign: 'center',
  },
  saveButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  section: {
    margin: 20,
    marginBottom: 0,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginBottom: 16,
    lineHeight: 20,
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginTop: 16,
    marginBottom: 8,
    gap: 8,
  },
  tab: {
    flex: 1,
  },
  tabGradient: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 36,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  inactiveTab: {
    backgroundColor: COLORS.white,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 36,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  tabText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.white,
    textAlign: 'center',
  },
  inactiveTabText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: COLORS.background,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  addButtonText: {
    marginLeft: 4,
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 20,
  },
  paymentMethodCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  paymentMethodLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  paymentMethodIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  paymentMethodInfo: {
    flex: 1,
  },
  paymentMethodType: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  paymentMethodName: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginBottom: 2,
  },
  defaultLabel: {
    fontSize: 12,
    color: COLORS.success,
    fontWeight: '600',
  },
  paymentMethodActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: COLORS.background,
    marginLeft: 8,
  },
  removeButton: {
    backgroundColor: COLORS.errorLight,
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  settingInfo: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  settingSubtitle: {
    fontSize: 14,
    color: COLORS.textMuted,
  },
  settingValue: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  inputText: {
    fontSize: 16,
    color: COLORS.text,
    flex: 1,
  },
  textInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: COLORS.text,
    backgroundColor: COLORS.white,
  },
  dropdownButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  dropdownText: {
    fontSize: 16,
    color: COLORS.text,
  },
  dropdownHelper: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  securityButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  securityInfo: {
    flex: 1,
    marginLeft: 12,
  },
  securityTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  securitySubtitle: {
    fontSize: 14,
    color: COLORS.textMuted,
  },
  bottomPadding: {
    height: 20,
  },
  bankAccountCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  bankAccountHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  bankAccountTitle: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.text,
  },
  accountNumberRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-end',
    marginBottom: 12,
  },
  accountNumbersContainer: {
    marginBottom: 16,
  },
  deleteAccountNumberButton: {
    padding: 8,
    marginBottom: 8,
  },
  addAccountButton: {
    alignSelf: 'center',
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.background,
    borderWidth: 2,
    borderColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 12,
  },
  dropdownInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.text,
  },
  paymentInfoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    gap: 12,
  },
  paymentInfoInputs: {
    flex: 1,
    gap: 12,
  },
  deletePaymentButton: {
    padding: 8,
    marginTop: 24,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '50%',
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.text,
    marginBottom: 20,
  },
  modalOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalOptionText: {
    fontSize: 16,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.text,
  },
  modalOptionTextSelected: {
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.primary,
  },
});


export default PaymentSettingsScreen;