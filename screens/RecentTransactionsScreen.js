import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  RefreshControl,
  Image,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, GRADIENTS } from '../constants';
import { useAppointments } from '../context/AppointmentContext';
import { useShifts } from '../context/ShiftContext';
import { useNurses } from '../context/NurseContext';
import TouchableWeb from '../components/TouchableWeb';

const RecentTransactionsScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { nurses } = useNurses();
  const [sortBy, setSortBy] = useState('date'); // 'date', 'amount', 'status'
  const [selectedFilter, setSelectedFilter] = useState('all'); // 'all', 'completed', 'pending', 'failed'
  const [newPaymentModalVisible, setNewPaymentModalVisible] = useState(false);
  const [selectedPayslip, setSelectedPayslip] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchVisible, setSearchVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [pastPayslipsModalVisible, setPastPayslipsModalVisible] = useState(false);
  const [selectedStaffForHistory, setSelectedStaffForHistory] = useState(null);
  const [staffPayslipHistory, setStaffPayslipHistory] = useState([]);
  const { appointments } = useAppointments();
  const { shifts } = useShifts();
  const [paymentForm, setPaymentForm] = useState({
    staffName: '',
    amount: '',
    description: '',
    paymentMethod: 'Bank Transfer',
    category: 'Salary'
  });

  // Get staff members from nurses context
  const staffMembers = useMemo(() => {
    if (!nurses || nurses.length === 0) {
      // Fallback to mock data if nurses context is empty
      return [
        { id: 'nurse-001', name: 'Sarah Johnson, RN', role: 'Registered Nurse', hourlyRate: 28.50, employeeId: 'NURSE001', code: 'NURSE001' },
        { id: 'nurse-002', name: 'Michael Chen, RN', role: 'Registered Nurse', hourlyRate: 32.00, employeeId: 'NURSE002', code: 'NURSE002' },
        { id: 'nurse-003', name: 'Emily Rodriguez, LPN', role: 'Licensed Practical Nurse', hourlyRate: 30.50, employeeId: 'NURSE003', code: 'NURSE003' },
      ];
    }
    
    // Map nurses to staff member format
    return nurses.map(nurse => ({
      id: nurse.id,
      name: nurse.name,
      role: nurse.specialization || nurse.title || 'Nurse',
      hourlyRate: nurse.hourlyRate || 25.00,
      employeeId: nurse.code || nurse.id,
      code: nurse.code
    }));
  }, [nurses]);

  // Calculate actual hours from approved appointments and shifts
  const calculateStaffHours = (staffId, periodStart, periodEnd) => {
    const start = new Date(periodStart);
    const end = new Date(periodEnd);
    
    // Get approved appointments for this staff member in the pay period
    const staffAppointments = appointments?.filter(appointment => 
      (appointment.nurseId === staffId || appointment.assignedNurse === staffId) &&
      appointment.status === 'completed' &&
      new Date(appointment.date) >= start &&
      new Date(appointment.date) <= end
    ) || [];

    // Get shifts for this staff member in the pay period (if shifts context exists)
    const staffShifts = shifts?.filter(shift => 
      shift.staffId === staffId &&
      shift.status === 'completed' &&
      new Date(shift.date) >= start &&
      new Date(shift.date) <= end
    ) || [];

    // Calculate hours from appointments
    const appointmentHours = staffAppointments.reduce((total, appointment) => {
      // Extract duration from appointment (could be in minutes, convert to hours)
      const duration = appointment.duration || appointment.estimatedDuration || 60; // default 1 hour
      const hours = typeof duration === 'string' && duration.includes('min') 
        ? parseInt(duration) / 60 
        : typeof duration === 'number' 
        ? duration / 60 
        : 1; // fallback to 1 hour
      return total + hours;
    }, 0);

    // Calculate hours from shifts
    const shiftHours = staffShifts.reduce((total, shift) => {
      if (shift.startTime && shift.endTime) {
        const startTime = new Date(`${shift.date} ${shift.startTime}`);
        const endTime = new Date(`${shift.date} ${shift.endTime}`);
        const hours = (endTime - startTime) / (1000 * 60 * 60); // Convert milliseconds to hours
        return total + Math.max(0, hours); // Ensure positive hours
      }
      return total + (shift.duration || 8); // fallback to 8 hour shift
    }, 0);

    const totalHours = appointmentHours + shiftHours;
    
    // If no real data, use realistic mock data based on staff role
    const mockHoursRange = {
      'Senior Nurse': [75, 82],
      'Physical Therapist': [70, 78],
      'Wound Care Specialist': [68, 76],
      'Home Care Nurse': [72, 80],
      'Health Monitor': [65, 75],
      'Medication Specialist': [70, 78]
    };
    
    const staff = staffMembers.find(s => s.id === staffId);
    const range = mockHoursRange[staff?.role] || [70, 80];
    const fallbackHours = totalHours > 0 ? totalHours : range[0] + Math.random() * (range[1] - range[0]);
    
    const finalTotalHours = totalHours > 0 ? totalHours : fallbackHours;
    const regularHours = Math.min(finalTotalHours, 70); // Standard 70 hours per fortnight
    const overtimeHours = Math.max(0, finalTotalHours - 70);

    return {
      totalHours: parseFloat(finalTotalHours.toFixed(1)),
      regularHours: parseFloat(regularHours.toFixed(1)),
      overtimeHours: parseFloat(overtimeHours.toFixed(1)),
      appointmentHours: parseFloat(appointmentHours.toFixed(1)),
      shiftHours: parseFloat(shiftHours.toFixed(1)),
      sessionsCompleted: staffAppointments.length,
      shiftsCompleted: staffShifts.length,
    };
  };

  const paymentCategories = ['Salary', 'Overtime', 'Bonus', 'Commission', 'Allowance', 'Reimbursement'];
  const paymentMethods = ['Bank Transfer', 'Mobile Money', 'Cash', 'Check'];

  const handleNewPayment = () => {
    setNewPaymentModalVisible(true);
  };

  const handleSubmitPayment = () => {
    if (!paymentForm.staffName || !paymentForm.amount || !paymentForm.description) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    const newTransaction = {
      id: Date.now().toString(),
      patient: paymentForm.staffName,
      service: `${paymentForm.category} - ${paymentForm.description}`,
      amount: `J$${parseFloat(paymentForm.amount).toLocaleString()}`,
      date: new Date().toISOString().split('T')[0],
      status: 'pending',
      paymentMethod: paymentForm.paymentMethod,
      icon: 'account-cash',
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      type: 'staff_payment'
    };

    // In a real app, you would add this to your transactions list/database
    Alert.alert(
      'Payment Initiated',
      `Payment of J$${parseFloat(paymentForm.amount).toLocaleString()} for ${paymentForm.staffName} has been submitted for processing.`,
      [{ text: 'OK', onPress: () => {
        setNewPaymentModalVisible(false);
        setPaymentForm({
          staffName: '',
          amount: '',
          description: '',
          paymentMethod: 'Bank Transfer',
          category: 'Salary'
        });
      }}]
    );
  };

  // Mock payslip data - Generated fortnightly for staff using actual appointment/shift hours
  const generateFortnightlyPayslips = () => {
    const currentDate = new Date();
    const payslips = [];
    
    // Generate payslips for last 3 fortnights
    for (let i = 0; i < 3; i++) {
      const periodEnd = new Date(currentDate);
      periodEnd.setDate(periodEnd.getDate() - (i * 14));
      
      const periodStart = new Date(periodEnd);
      periodStart.setDate(periodStart.getDate() - 13);
      
      staffMembers.forEach((staff, index) => {
        // Calculate actual hours from appointments and shifts
        const hoursData = calculateStaffHours(
          staff.id, 
          periodStart.toISOString().split('T')[0], 
          periodEnd.toISOString().split('T')[0]
        );
        
        const regularPay = hoursData.regularHours * staff.hourlyRate;
        const overtimePay = hoursData.overtimeHours * staff.hourlyRate * 1.5;
        const grossPay = regularPay + overtimePay;
        
        // No deductions - gross pay equals net pay
        const netPay = grossPay;
        
        payslips.push({
          id: `${staff.id}-${i}`,
          staffId: staff.id,
          employeeId: staff.employeeId,
          staffName: staff.name,
          role: staff.role,
          periodStart: periodStart.toISOString().split('T')[0],
          periodEnd: periodEnd.toISOString().split('T')[0],
          hourlyRate: staff.hourlyRate,
          hoursWorked: hoursData.totalHours,
          regularHours: hoursData.regularHours,
          overtimeHours: hoursData.overtimeHours,
          appointmentHours: hoursData.appointmentHours,
          shiftHours: hoursData.shiftHours,
          sessionsCompleted: hoursData.sessionsCompleted,
          shiftsCompleted: hoursData.shiftsCompleted,
          regularPay: regularPay.toFixed(2),
          overtimePay: overtimePay.toFixed(2),
          grossPay: grossPay.toFixed(2),
          netPay: netPay.toFixed(2),
          status: i === 0 ? 'pending' : 'paid',
          paymentMethod: 'Bank Transfer',
          generatedDate: periodEnd.toISOString().split('T')[0],
          payDate: i === 0 ? null : new Date(periodEnd.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        });
      });
    }
    
    return payslips.sort((a, b) => new Date(b.periodEnd) - new Date(a.periodEnd));
  };

  const payslips = generateFortnightlyPayslips();

  // Refresh functionality
  const onRefresh = async () => {
    setRefreshing(true);
    // Simulate data refresh - in real app, this would fetch new data
    await new Promise(resolve => setTimeout(resolve, 1000));
    setRefreshing(false);
    Alert.alert('Success', 'Payslips refreshed successfully');
  };

  // Filter and search payslips with useMemo for performance
  const filteredAndSearchedPayslips = useMemo(() => {
    let filtered = [...payslips];
    
    // Apply status filter
    if (selectedFilter !== 'all') {
      if (selectedFilter === 'completed') {
        filtered = filtered.filter(p => p.status === 'paid');
      } else {
        filtered = filtered.filter(p => p.status === selectedFilter);
      }
    }

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(payslip => 
        payslip.staffName.toLowerCase().includes(query) ||
        payslip.role.toLowerCase().includes(query) ||
        payslip.employeeId.toLowerCase().includes(query) ||
        payslip.id.toLowerCase().includes(query)
      );
    }

    // Apply sorting
    switch (sortBy) {
      case 'amount':
        return filtered.sort((a, b) => parseFloat(b.netPay) - parseFloat(a.netPay));
      case 'status':
        return filtered.sort((a, b) => {
          const statusOrder = { 'paid': 0, 'pending': 1, 'failed': 2 };
          return statusOrder[a.status] - statusOrder[b.status];
        });
      case 'date':
      default:
        return filtered.sort((a, b) => new Date(b.periodEnd) - new Date(a.periodEnd));
    }
  }, [payslips, selectedFilter, searchQuery, sortBy]);

  // Filtering and sorting logic for payslips - DEPRECATED (replaced by useMemo above)
  const getFilteredPayslips = () => {
    let filtered = [...payslips];
    
    // Apply status filter
    if (selectedFilter !== 'all') {
      if (selectedFilter === 'completed') {
        filtered = filtered.filter(p => p.status === 'paid');
      } else {
        filtered = filtered.filter(p => p.status === selectedFilter);
      }
    }
    
    return filtered;
  };

  const getSortedPayslips = () => {
    const filtered = getFilteredPayslips();
    switch (sortBy) {
      case 'amount':
        return filtered.sort((a, b) => parseFloat(b.netPay) - parseFloat(a.netPay));
      case 'status':
        return filtered.sort((a, b) => {
          const statusOrder = { 'paid': 0, 'pending': 1, 'failed': 2 };
          return statusOrder[a.status] - statusOrder[b.status];
        });
      case 'date':
      default:
        return filtered.sort((a, b) => new Date(b.periodEnd) - new Date(a.periodEnd));
    }
  };

  const sortedPayslips = filteredAndSearchedPayslips; // Use the new filtered results

  const getStatusColor = (status) => {
    switch (status) {
      case 'paid': return COLORS.success;
      case 'pending': return COLORS.warning;
      case 'failed': return COLORS.error;
      default: return COLORS.textMuted;
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'paid': return 'check-circle';
      case 'pending': return 'clock';
      case 'failed': return 'alert-circle';
      default: return 'help-circle';
    }
  };

  const handlePayslipPress = (payslip) => {
    setSelectedPayslip(payslip);
  };

  const handleGeneratePayslip = (payslip) => {
    Alert.alert(
      'Generate Payslip PDF',
      `Generate payslip for ${payslip.staffName} for period ${payslip.periodStart} to ${payslip.periodEnd}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Generate',
          onPress: () => {
            // Here you would integrate with a payslip generation service
            Alert.alert('Success', 'Payslip PDF generated and saved');
          }
        }
      ]
    );
  };

  // Save payslip to nurse profile when marked as paid
  const savePayslipToNurseProfile = async (payslip) => {
    try {
      // Get existing nurse payslips
      const existingPayslipsJson = await AsyncStorage.getItem('nursePayslips');
      const existingPayslips = existingPayslipsJson ? JSON.parse(existingPayslipsJson) : {};
      
      // Find the nurse ID from staffMembers
      const nurse = staffMembers.find(s => s.employeeId === payslip.employeeId || s.name === payslip.staffName);
      if (!nurse) return;
      
      // Initialize array for this nurse if doesn't exist
      if (!existingPayslips[nurse.id]) {
        existingPayslips[nurse.id] = [];
      }
      
      // Add payslip to nurse's array
      const payslipRecord = {
        ...payslip,
        status: 'paid',
        paidDate: new Date().toISOString(),
      };
      
      existingPayslips[nurse.id].push(payslipRecord);
      
      // Save back to AsyncStorage
      await AsyncStorage.setItem('nursePayslips', JSON.stringify(existingPayslips));
      
      return true;
    } catch (error) {
      console.error('Error saving payslip to nurse profile:', error);
      return false;
    }
  };

  const handleMarkAsPaid = async (payslip) => {
    const success = await savePayslipToNurseProfile(payslip);
    if (success) {
      Alert.alert('Payment Processed', `Payslip for ${payslip.staffName} marked as paid and sent to their profile`);
    } else {
      Alert.alert('Error', 'Failed to save payslip to nurse profile');
    }
  };

  const handleViewStaffHistory = async (staffId, staffName) => {
    try {
      // In a real app, you'd fetch this from a persistent source.
      // For now, we'll filter the generated payslips.
      const allPayslips = generateFortnightlyPayslips();
      const history = allPayslips.filter(p => (p.staffId === staffId || p.employeeId === staffId) && p.status === 'paid');
      
      // Sort by most recent first
      history.sort((a, b) => new Date(b.payDate) - new Date(a.payDate));

      setStaffPayslipHistory(history);
      setSelectedStaffForHistory(staffName);
      setPastPayslipsModalVisible(true);
    } catch (error) {
      console.error('Error loading staff payslip history:', error);
      Alert.alert('Error', 'Failed to load payslip history.');
    }
  };

  const getTotalPayroll = () => {
    return sortedPayslips
      .filter(p => p.status === 'paid')
      .reduce((sum, p) => sum + parseFloat(p.netPay), 0)
      .toFixed(2);
  };

  const FilterPills = () => (
    <View style={styles.filterPillContainer}>
      {[
        { key: 'all', label: 'All' },
        { key: 'completed', label: 'Paid' },
        { key: 'pending', label: 'Pending' },
        { key: 'failed', label: 'Failed' }
      ].map((filter) => (
        <TouchableOpacity
          key={filter.key}
          style={styles.filterPill}
          onPress={() => setSelectedFilter(filter.key)}
        >
          {selectedFilter === filter.key ? (
            <LinearGradient
              colors={GRADIENTS.header}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.filterPillGradient}
            >
              <Text style={styles.filterPillText}>
                {filter.label}
              </Text>
            </LinearGradient>
          ) : (
            <View style={styles.inactiveFilterPill}>
              <Text style={styles.inactiveFilterPillText}>
                {filter.label}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Header */}
      <LinearGradient 
        colors={GRADIENTS.header} 
        style={[styles.header, { paddingTop: insets.top + 20, paddingBottom: 20 }]}
      >
        <View style={styles.headerContent}>
          <TouchableWeb
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <MaterialCommunityIcons name="arrow-left" size={24} color={COLORS.white} />
          </TouchableWeb>
          <Text style={styles.headerTitle}>Staff Transactions</Text>
          <TouchableWeb
            onPress={() => setSearchVisible(!searchVisible)}
            style={styles.searchToggle}
          >
            <MaterialCommunityIcons name="magnify" size={24} color={COLORS.white} />
          </TouchableWeb>
        </View>
        
        {/* Search Bar in Header */}
        {searchVisible && (
          <View style={styles.headerSearchBar}>
            <MaterialCommunityIcons name="magnify" size={20} color={COLORS.white} />
            <TextInput
              style={styles.headerSearchInput}
              placeholder="Search staff, role, or employee ID..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor={COLORS.white + '80'}
            />
            <TouchableWeb onPress={() => setSearchQuery('')} style={styles.clearSearchButton}>
              <MaterialCommunityIcons name="close" size={20} color={COLORS.white} />
            </TouchableWeb>
          </View>
        )}
      </LinearGradient>

      {/* Main Scrollable Content */}
      <ScrollView 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Payslip Preview Section */}
        <View style={styles.previewSection}>
        <View style={styles.previewHeader}>
          <Text style={styles.previewTitle}>
            {selectedPayslip ? `Payslip Preview - ${selectedPayslip.staffName}` : 'Payslip Preview'}
          </Text>
          <TouchableOpacity
            onPress={() => {
              if (selectedPayslip) {
                handleGeneratePayslip(selectedPayslip);
              } else {
                Alert.alert('Info', 'Select a payslip below to preview and generate PDF');
              }
            }}
            style={styles.previewShareButton}
          >
            <MaterialCommunityIcons name="file-pdf-box" size={16} color={COLORS.primary} />
            <Text style={styles.previewShareText}>Generate PDF</Text>
          </TouchableOpacity>
        </View>
        
        {selectedPayslip ? (
          <>
            <ScrollView 
              style={styles.payslipScrollView}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.payslipPreviewCard}>
                {/* Employee Information Table */}
                <View style={styles.employeeInfoSection}>
                  <LinearGradient
                    colors={GRADIENTS.header}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.sectionHeader}
                  >
                    <Text style={[styles.sectionHeaderText, { flex: 1 }]}>Employee Information</Text>
                  </LinearGradient>
                  <View style={styles.tableRow}>
                    <Text style={[styles.tableCell, { flex: 1, fontWeight: '600' }]}>Name:</Text>
                    <Text style={[styles.tableCell, { flex: 2 }]}>{selectedPayslip.staffName}</Text>
                    <Text style={[styles.tableCell, { flex: 1, fontWeight: '600' }]}>Pay Period:</Text>
                    <Text style={[styles.tableCell, { flex: 2 }]}>{selectedPayslip.periodStart} to {selectedPayslip.periodEnd}</Text>
                  </View>
                  <View style={styles.tableRow}>
                    <Text style={[styles.tableCell, { flex: 1, fontWeight: '600' }]}>Employee ID:</Text>
                    <Text style={[styles.tableCell, { flex: 2 }]}>{selectedPayslip.employeeId || selectedPayslip.staffId}</Text>
                    <Text style={[styles.tableCell, { flex: 1, fontWeight: '600' }]}>Pay Date:</Text>
                    <Text style={[styles.tableCell, { flex: 2 }]}>{selectedPayslip.payDate || selectedPayslip.generatedDate}</Text>
                  </View>
                  <View style={styles.tableRow}>
                    <Text style={[styles.tableCell, { flex: 1, fontWeight: '600' }]}>Position:</Text>
                    <Text style={[styles.tableCell, { flex: 2 }]}>{selectedPayslip.role}</Text>
                    <Text style={[styles.tableCell, { flex: 1, fontWeight: '600' }]}>Pay Cycle:</Text>
                    <Text style={[styles.tableCell, { flex: 2 }]}>Fortnightly</Text>
                  </View>
                  <View style={styles.tableRow}>
                    <Text style={[styles.tableCell, { flex: 1, fontWeight: '600' }]}>Hourly Rate:</Text>
                    <Text style={[styles.tableCell, { flex: 2 }]}>J${selectedPayslip.hourlyRate}/hour</Text>
                  </View>
                </View>

                {/* Earnings Table */}
                <View style={styles.earningsSection}>
                  <LinearGradient
                    colors={GRADIENTS.header}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.sectionHeader}
                  >
                    <Text style={styles.sectionHeaderText}>Earnings</Text>
                    <Text style={styles.sectionHeaderText}>Hours</Text>
                    <Text style={styles.sectionHeaderText}>Rate</Text>
                    <Text style={styles.sectionHeaderText}>Current</Text>
                  </LinearGradient>
                  <View style={styles.tableRow}>
                    <Text style={styles.tableCell}>Standard Pay</Text>
                    <Text style={styles.tableCell}>{selectedPayslip.regularHours}</Text>
                    <Text style={styles.tableCell}>J${selectedPayslip.hourlyRate}</Text>
                    <Text style={styles.tableCell}>J${parseFloat(selectedPayslip.regularPay).toLocaleString()}</Text>
                  </View>
                  {parseFloat(selectedPayslip.overtimeHours) > 0 && (
                    <View style={styles.tableRow}>
                      <Text style={styles.tableCell}>Overtime Pay</Text>
                      <Text style={styles.tableCell}>{selectedPayslip.overtimeHours}</Text>
                      <Text style={styles.tableCell}>J${(selectedPayslip.hourlyRate * 1.5).toFixed(0)}</Text>
                      <Text style={styles.tableCell}>J${parseFloat(selectedPayslip.overtimePay).toLocaleString()}</Text>
                    </View>
                  )}
                  {parseFloat(selectedPayslip.shiftHours || 0) > 0 && (
                    <View style={styles.tableRow}>
                      <Text style={styles.tableCell}>Shift Hours</Text>
                      <Text style={styles.tableCell}>{selectedPayslip.shiftHours}</Text>
                      <Text style={styles.tableCell}>J${selectedPayslip.hourlyRate}</Text>
                      <Text style={styles.tableCell}>J${(parseFloat(selectedPayslip.shiftHours) * parseFloat(selectedPayslip.hourlyRate)).toLocaleString()}</Text>
                    </View>
                  )}
                  <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>Gross Pay</Text>
                    <Text style={styles.totalValue}>J${parseFloat(selectedPayslip.grossPay).toLocaleString()}</Text>
                  </View>
                </View>

                {/* Net Pay */}
                <LinearGradient
                  colors={GRADIENTS.header}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.netPaySection}
                >
                  <Text style={styles.netPayLabel}>Net Pay</Text>
                  <Text style={styles.netPayAmount}>J${parseFloat(selectedPayslip.netPay).toLocaleString()}</Text>
                </LinearGradient>
              </View>
            </ScrollView>
            
            {/* Close Button */}
            <TouchableOpacity
              style={styles.closePreviewButton}
              onPress={() => setSelectedPayslip(null)}
            >
              <MaterialCommunityIcons name="close" size={18} color={COLORS.white} />
              <Text style={styles.closePreviewText}>Close Preview</Text>
            </TouchableOpacity>
          </>
        ) : (
          <View style={styles.noPayslipSelected}>
            <MaterialCommunityIcons name="receipt" size={60} color={COLORS.border} />
            <Text style={styles.noPayslipText}>Select a payslip below to preview</Text>
          </View>
        )}
      </View>

      {/* Filter Pills */}
      <View style={styles.filterSection}>
        <FilterPills />
      </View>

      {/* Payslips List */}
      <View style={styles.payslipsContainer}>
        {sortedPayslips.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="receipt" size={80} color={COLORS.border} />
            <Text style={styles.emptyTitle}>
              {searchQuery ? 'No matching payslips' : 'No payslips found'}
            </Text>
            <Text style={styles.emptyText}>
              {searchQuery 
                ? `No payslips match "${searchQuery}". Try a different search term.`
                : selectedFilter !== 'all' 
                ? 'Try adjusting your filter'
                : 'Payslips will appear here when generated'
              }
            </Text>
            {searchQuery && (
              <TouchableWeb
                style={styles.clearSearchInline}
                onPress={() => setSearchQuery('')}
              >
                <Text style={styles.clearSearchText}>Clear Search</Text>
              </TouchableWeb>
            )}
          </View>
        ) : (
          <>
            {/* Search Results Count */}
            {(searchQuery || selectedFilter !== 'all') && (
              <View style={styles.searchResultsHeader}>
                <Text style={styles.searchResultsText}>
                  {sortedPayslips.length} payslip{sortedPayslips.length !== 1 ? 's' : ''} found
                  {searchQuery && ` for "${searchQuery}"`}
                  {selectedFilter !== 'all' && ` (${selectedFilter})`}
                </Text>
                {searchQuery && (
                  <TouchableWeb onPress={() => setSearchQuery('')} style={styles.clearSearchSmall}>
                    <MaterialCommunityIcons name="close" size={16} color={COLORS.textLight} />
                  </TouchableWeb>
                )}
              </View>
            )}
            
            <View style={styles.payslipsList}>
            {sortedPayslips.map((payslip) => (
              <TouchableOpacity
                key={payslip.id}
                style={styles.payslipCard}
                onPress={() => {
                  const staff = staffMembers.find(s => 
                    s.employeeId === payslip.employeeId || s.name === payslip.staffName
                  );
                  if (staff) {
                    handleViewStaffHistory(staff.id, payslip.staffName);
                  }
                }}
                activeOpacity={0.7}
              >
                <View style={styles.payslipHeader}>
                  <View style={styles.payslipInfo}>
                    <Text style={styles.staffName}>{payslip.staffName}</Text>
                  </View>
                  <View style={styles.payslipActions}>
                    <TouchableOpacity
                      style={styles.viewButton}
                      onPress={(e) => {
                        e.stopPropagation();
                        handlePayslipPress(payslip);
                      }}
                    >
                      <MaterialCommunityIcons name="eye" size={16} color={COLORS.primary} />
                      <Text style={styles.viewButtonText}>View</Text>
                    </TouchableOpacity>
                    
                    {payslip.status === 'pending' && (
                      <TouchableOpacity
                        style={styles.paidButton}
                        onPress={(e) => {
                          e.stopPropagation();
                          handleMarkAsPaid(payslip);
                        }}
                      >
                        <MaterialCommunityIcons name="check" size={16} color={COLORS.white} />
                        <Text style={styles.paidButtonText}>Mark Paid</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            ))}
            </View>
          </>
        )}
        
        {/* Generate New Payslips Button */}
        <TouchableOpacity style={styles.newTransactionButton} onPress={() => {
          Alert.alert(
            'Generate Payslips',
            'Generate payslips for the current fortnight for all active staff?',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Generate', onPress: () => Alert.alert('Success', 'New payslips generated for all staff') }
            ]
          );
        }}>
          <LinearGradient
            colors={['#6B46C1', '#9333EA']}
            style={styles.newTransactionGradient}
          >
            <MaterialCommunityIcons name="plus" size={20} color={COLORS.white} />
            <Text style={styles.newTransactionText}>Generate New Payslips</Text>
          </LinearGradient>
        </TouchableOpacity>
        
        <View style={styles.bottomPadding} />
      </View>
      </ScrollView>

      {/* New Payment Modal */}
      <Modal
        visible={newPaymentModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setNewPaymentModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.paymentModalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Staff Payment</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setNewPaymentModalVisible(false)}
              >
                <MaterialCommunityIcons name="close" size={24} color={COLORS.textLight} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              {/* Staff Selection */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Staff Member *</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.staffSelector}>
                  {staffMembers.map((staff) => (
                    <TouchableOpacity
                      key={staff.id}
                      style={[
                        styles.staffCard,
                        paymentForm.staffName === staff.name && styles.selectedStaffCard
                      ]}
                      onPress={() => setPaymentForm({...paymentForm, staffName: staff.name})}
                    >
                      <Text style={[
                        styles.staffName,
                        paymentForm.staffName === staff.name && styles.selectedStaffName
                      ]}>
                        {staff.name}
                      </Text>
                      <Text style={styles.staffRole}>{staff.role}</Text>
                      <Text style={styles.staffRate}>J${staff.hourlyRate}/hr</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Payment Category */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Payment Category *</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categorySelector}>
                  {paymentCategories.map((category) => (
                    <TouchableOpacity
                      key={category}
                      style={[
                        styles.categoryChip,
                        paymentForm.category === category && styles.selectedCategoryChip
                      ]}
                      onPress={() => setPaymentForm({...paymentForm, category})}
                    >
                      <Text style={[
                        styles.categoryText,
                        paymentForm.category === category && styles.selectedCategoryText
                      ]}>
                        {category}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Amount */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Amount (J$) *</Text>
                <TextInput
                  style={styles.textInput}
                  value={paymentForm.amount}
                  onChangeText={(text) => setPaymentForm({...paymentForm, amount: text})}
                  placeholder="Enter amount"
                  keyboardType="numeric"
                />
              </View>

              {/* Description */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Description *</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  value={paymentForm.description}
                  onChangeText={(text) => setPaymentForm({...paymentForm, description: text})}
                  placeholder="Payment description"
                  multiline
                  numberOfLines={3}
                />
              </View>

              {/* Payment Method */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Payment Method</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.methodSelector}>
                  {paymentMethods.map((method) => (
                    <TouchableOpacity
                      key={method}
                      style={[
                        styles.methodChip,
                        paymentForm.paymentMethod === method && styles.selectedMethodChip
                      ]}
                      onPress={() => setPaymentForm({...paymentForm, paymentMethod: method})}
                    >
                      <Text style={[
                        styles.methodText,
                        paymentForm.paymentMethod === method && styles.selectedMethodText
                      ]}>
                        {method}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Submit Button */}
              <TouchableOpacity style={styles.submitButton} onPress={handleSubmitPayment}>
                <LinearGradient
                  colors={['#2196F3', '#1976D2']}
                  style={styles.submitGradient}
                >
                  <MaterialCommunityIcons name="cash" size={20} color={COLORS.white} />
                  <Text style={styles.submitButtonText}>Submit Payment</Text>
                </LinearGradient>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Past Payslips Modal */}
      <Modal
        visible={pastPayslipsModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setPastPayslipsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.paymentModalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {selectedStaffForHistory ? `${selectedStaffForHistory} - Payslip History` : 'Payslip History'}
              </Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setPastPayslipsModalVisible(false)}
              >
                <MaterialCommunityIcons name="close" size={24} color={COLORS.textLight} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              {staffPayslipHistory.length === 0 ? (
                <View style={styles.emptyHistoryState}>
                  <MaterialCommunityIcons name="receipt" size={80} color={COLORS.border} />
                  <Text style={styles.emptyTitle}>No Payslip History</Text>
                  <Text style={styles.emptyText}>
                    No past payslips found for this staff member
                  </Text>
                </View>
              ) : (
                <View style={styles.historyList}>
                  {staffPayslipHistory.map((payslip) => (
                    <TouchableOpacity
                      key={payslip.id}
                      style={styles.historyCard}
                      onPress={() => {
                        setSelectedPayslip(payslip);
                        setPastPayslipsModalVisible(false);
                      }}
                      activeOpacity={0.7}
                    >
                      <View style={styles.historyCardHeader}>
                        <View style={styles.historyMainInfo}>
                          <MaterialCommunityIcons name="receipt" size={16} color={COLORS.primary} />
                          <Text style={styles.historyPeriod}>
                            {payslip.periodStart} - {payslip.periodEnd}
                          </Text>
                        </View>
                        <Text style={styles.historyAmount}>
                          J${parseFloat(payslip.netPay).toLocaleString()}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
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
  exportButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchToggle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerSearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 25,
    marginHorizontal: 20,
    marginTop: 15,
    marginBottom: 10,
    paddingHorizontal: 15,
    paddingVertical: 12,
  },
  headerSearchInput: {
    flex: 1,
    color: COLORS.white,
    fontSize: 16,
    marginLeft: 10,
    marginRight: 10,
  },
  clearSearchButton: {
    padding: 4,
  },
  filterSection: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: COLORS.background,
  },
  filterPillContainer: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 20,
    marginTop: 16,
    marginBottom: 20,
  },
  filterPill: {
    flex: 1,
  },
  filterPillGradient: {
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
  inactiveFilterPill: {
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
  filterPillText: {
    fontSize: 11,
    fontFamily: 'Poppins_700Bold',
    color: COLORS.white,
    textAlign: 'center',
  },
  inactiveFilterPillText: {
    fontSize: 11,
    fontFamily: 'Poppins_700Bold',
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  filterContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  filterContent: {
    paddingRight: 20,
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: COLORS.white,
    borderRadius: 20,
    minHeight: 36,
    marginRight: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  filterTabActive: {
    backgroundColor: 'transparent',
  },
  filterTabText: {
    fontSize: 11,
    fontFamily: 'Poppins_700Bold',
    color: COLORS.textMuted,
  },
  filterTabTextActive: {
    fontSize: 11,
    fontFamily: 'Poppins_700Bold',
    color: COLORS.white,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  transactionCard: {
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
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  transactionLeft: {
    flex: 1,
  },
  transactionInfo: {
    flex: 1,
  },
  patientName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  serviceName: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginBottom: 2,
  },
  transactionDate: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  transactionRight: {
    alignItems: 'flex-end',
  },
  amount: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  status: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
    textTransform: 'capitalize',
  },
  paymentMethod: {
    fontSize: 11,
    color: COLORS.textLight,
  },
  newTransactionButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginHorizontal: 20,
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  newTransactionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 8,
  },
  newTransactionText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  bottomPadding: {
    height: 40,
  },
  // Payment Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  paymentModalContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    margin: 20,
    maxHeight: '80%',
    width: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    flex: 1,
    marginRight: -30,
  },
  modalCloseButton: {
    padding: 4,
  },
  modalContent: {
    padding: 20,
  },
  formGroup: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  staffSelector: {
    flexDirection: 'row',
  },
  staffCard: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 12,
    marginRight: 12,
    minWidth: 120,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedStaffCard: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '10',
  },
  staffName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  selectedStaffName: {
    color: COLORS.primary,
  },
  staffRole: {
    fontSize: 12,
    color: COLORS.textLight,
    marginBottom: 2,
  },
  staffRate: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.success,
  },
  categorySelector: {
    flexDirection: 'row',
  },
  categoryChip: {
    backgroundColor: COLORS.background,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  selectedCategoryChip: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  categoryText: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '500',
  },
  selectedCategoryText: {
    color: COLORS.white,
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
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  methodSelector: {
    flexDirection: 'row',
  },
  methodChip: {
    backgroundColor: COLORS.background,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  selectedMethodChip: {
    backgroundColor: COLORS.success,
    borderColor: COLORS.success,
  },
  methodText: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '500',
  },
  selectedMethodText: {
    color: COLORS.white,
  },
  submitButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 20,
  },
  submitGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  
  // Payslip Preview Styles (similar to invoice management)
  previewSection: {
    backgroundColor: COLORS.background,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  previewShareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: COLORS.primary + '10',
  },
  previewShareText: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '500',
  },
  payslipScrollView: {
    maxHeight: 450,
  },
  payslipPreviewCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    marginBottom: 12,
  },
  employeeInfoSection: {
    marginBottom: 0,
  },
  earningsSection: {
    marginBottom: 0,
  },
  sectionHeader: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 8,
    justifyContent: 'space-between',
  },
  sectionHeaderText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.white,
    flex: 1,
    textAlign: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  tableCell: {
    fontSize: 10,
    color: COLORS.text,
    flex: 1,
    textAlign: 'center',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  totalLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.text,
    marginRight: 40,
  },
  totalValue: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.text,
    minWidth: 80,
    textAlign: 'center',
  },
  deductionsSection: {
    marginBottom: 0,
  },
  netPaySection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  netPayLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  netPayAmount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  pdfHeader: {
    backgroundColor: COLORS.white,
    paddingTop: 16,
  },
  pdfHeaderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  pdfCompanyInfo: {
    flex: 1,
  },
  pdfCompanyName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#00B8D4',
    marginBottom: 6,
  },
  pdfCompanyDetails: {
    fontSize: 10,
    color: COLORS.text,
    marginBottom: 2,
  },
  pdfInvoiceInfo: {
    alignItems: 'flex-end',
  },
  pdfInvoiceTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  pdfInvoiceNumber: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },
  pdfInvoiceDate: {
    fontSize: 10,
    color: COLORS.textLight,
    marginBottom: 1,
  },
  pdfBlueLine: {
    height: 2,
    backgroundColor: '#00B8D4',
    marginHorizontal: 16,
    marginVertical: 8,
  },
  pdfClientSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  pdfClientRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  pdfBillTo: {
    flex: 1,
    marginRight: 16,
  },
  pdfServiceProvider: {
    flex: 1,
  },
  pdfSectionTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  pdfClientName: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 2,
  },
  pdfClientInfo: {
    fontSize: 10,
    color: COLORS.textLight,
    marginBottom: 2,
  },
  pdfNurseName: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 2,
  },
  pdfNurseTitle: {
    fontSize: 10,
    color: COLORS.textLight,
    marginBottom: 2,
  },
  pdfNurseCompany: {
    fontSize: 10,
    color: COLORS.textLight,
  },
  pdfServiceSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  pdfTable: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 4,
    marginBottom: 16,
  },
  pdfTableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F5F5F5',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  pdfTableHeaderText: {
    flex: 1,
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
  },
  pdfTableRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  pdfTableCell: {
    flex: 1,
    fontSize: 10,
    color: COLORS.text,
    textAlign: 'center',
  },
  pdfTableCellAmount: {
    flex: 1,
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
  },
  pdfBottomSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: 20,
    gap: 20,
  },
  pdfPaymentSection: {
    flex: 1,
    paddingRight: 10,
  },
  pdfPaymentTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  pdfPaymentInfo: {
    fontSize: 9,
    color: COLORS.textLight,
    lineHeight: 14,
  },
  pdfTotalsSection: {
    alignItems: 'flex-end',
    minWidth: 160,
  },
  pdfTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: 160,
    paddingVertical: 2,
  },
  pdfTotalLabel: {
    fontSize: 11,
    color: COLORS.text,
  },
  pdfTotalValue: {
    fontSize: 11,
    fontWeight: '500',
    color: COLORS.text,
  },
  pdfFinalTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: 160,
    paddingVertical: 4,
    marginTop: 4,
  },
  pdfFinalTotalLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  closePreviewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.error,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 12,
    marginHorizontal: 16,
    gap: 8,
  },
  closePreviewText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
  },
  noPayslipSelected: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    marginBottom: 12,
  },
  noPayslipText: {
    fontSize: 16,
    color: COLORS.textLight,
    marginTop: 12,
    textAlign: 'center',
  },
  
  // Payslip Card Styles
  payslipsList: {
    padding: 16,
  },
  payslipCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  payslipHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  payslipInfo: {
    flex: 1,
  },
  roleName: {
    fontSize: 14,
    color: COLORS.textLight,
    marginTop: 2,
  },
  periodDate: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 4,
  },
  sessionInfo: {
    fontSize: 11,
    color: COLORS.primary,
    marginTop: 2,
    fontWeight: '500',
  },
  payslipActions: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: COLORS.primary + '10',
    gap: 4,
  },
  viewButtonText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '500',
  },
  paidButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: COLORS.success,
    gap: 4,
  },
  paidButtonText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '500',
  },
  payslipDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  payslipAmount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  amountLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.textLight,
  },
  amountValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.success,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textLight,
    textAlign: 'center',
    marginTop: 8,
  },
  // Work Activity Breakdown Styles
  pdfWorkActivitySection: {
    backgroundColor: COLORS.background,
    padding: 16,
    marginVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  pdfWorkActivityList: {
    marginTop: 12,
  },
  pdfWorkActivityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 8,
  },
  pdfWorkActivityText: {
    fontSize: 13,
    color: COLORS.text,
    flex: 1,
    marginLeft: 8,
  },
  pdfWorkActivityTextBold: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: 'bold',
    flex: 1,
    marginLeft: 8,
  },
  pdfWorkActivityValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    minWidth: 30,
    textAlign: 'right',
  },
  pdfWorkActivityValueBold: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.primary,
    minWidth: 50,
    textAlign: 'right',
  },
  pdfWorkActivityHours: {
    fontSize: 12,
    color: COLORS.textLight,
    fontWeight: '500',
    minWidth: 45,
  },
  pdfWorkActivityDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 8,
  },
  // Search Results Styles
  searchResultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  searchResultsText: {
    fontSize: 14,
    color: COLORS.textLight,
    fontWeight: '500',
  },
  clearSearchSmall: {
    padding: 4,
    borderRadius: 12,
    backgroundColor: COLORS.border,
  },
  clearSearchInline: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
  },
  clearSearchText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  // History Modal Styles
  historyList: {
    padding: 16,
  },
  historyCard: {
    backgroundColor: COLORS.white,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  historyCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: COLORS.lightGray,
  },
  historyMainInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  historyPeriod: {
    fontSize: 12,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.primary,
  },
  historyAmount: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.text,
  },
  emptyHistoryState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
});

export default RecentTransactionsScreen;