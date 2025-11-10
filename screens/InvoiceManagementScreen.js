import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Modal,
  Alert,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Image,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { TouchableWeb } from '../components/TouchableWeb';
import { COLORS, GRADIENTS, SPACING } from '../constants';
import InvoiceService from '../services/InvoiceService';
import { useAppointments } from '../context/AppointmentContext';

export default function InvoiceManagementScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const appointments = useAppointments();
  const [invoices, setInvoices] = useState([]);
  const [stats, setStats] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [invoiceDetailsVisible, setInvoiceDetailsVisible] = useState(false);
  const [filterStatus, setFilterStatus] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('invoices');
  const [recurringSchedules, setRecurringSchedules] = useState([]);
  const [searchVisible, setSearchVisible] = useState(false);
  const [paymentMethodModalVisible, setPaymentMethodModalVisible] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('');
  const [invoiceToMarkPaid, setInvoiceToMarkPaid] = useState(null);

  // Format date to a cleaner format (e.g., "Nov 4, 2025")
  const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
      // Handle various date formats
      const date = new Date(dateString);
      // Check if date is valid
      if (isNaN(date.getTime())) return dateString;
      const options = { year: 'numeric', month: 'short', day: 'numeric' };
      return date.toLocaleDateString('en-US', options);
    } catch (error) {
      return dateString; // Return original if parsing fails
    }
  };

  const [companyDetails, setCompanyDetails] = useState({
    companyName: 'CARE Nursing Services and More',
    fullName: 'NURSING SERVICES AND MORE',
    address: 'Kingston, Jamaica',
    phone: '876-288-7304',
    email: 'care@nursingcareja.com',
    taxId: '',
    website: ''
  });

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

  // Load invoices when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      loadInvoices();
    }, [])
  );

  const loadInvoices = async () => {
    try {
      // Remove sample invoices from storage first
      await InvoiceService.removeSampleInvoices();
      
      const allInvoices = await InvoiceService.getAllInvoices();
      
      // Get all appointments to check for orphaned invoices
      const { appointments: allAppointments } = appointments;
      const completedAppointmentIds = allAppointments
        ?.filter(apt => apt.status === 'completed')
        .map(apt => apt.id) || [];
      
      // Filter out sample invoices, orphaned invoices (no matching appointment)
      const realInvoices = allInvoices.filter(inv => {
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
        
        // Store invoices have relatedOrderId instead of appointmentId
        if (inv.service === 'Store Purchase' && inv.relatedOrderId) {
          return true; // Keep all store invoices
        }
        
        // Check if invoice has a matching completed appointment
        const hasMatchingAppointment = completedAppointmentIds.includes(inv.appointmentId);
        if (!hasMatchingAppointment && completedAppointmentIds.length > 0) {
          return false;
        }
        
        return true;
      });
      
      const invoiceStats = await InvoiceService.getInvoiceStats();
      const schedules = await InvoiceService.getRecurringSchedules();
      setInvoices(realInvoices.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
      setStats(invoiceStats);
      setRecurringSchedules(schedules);
    } catch (error) {
      console.error('Error loading invoices:', error);
      Alert.alert('Error', 'Failed to load invoices');
    }
  };

  const handleClearAllInvoices = () => {
    Alert.alert(
      'Clear All Invoices',
      'This will delete ALL invoices and reset the counter. This action cannot be undone. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            try {
              await InvoiceService.clearAllInvoices();
              await loadInvoices();
              Alert.alert('Success', 'All invoices have been cleared');
            } catch (error) {
              Alert.alert('Error', 'Failed to clear invoices');
            }
          }
        }
      ]
    );
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadInvoices();
    setRefreshing(false);
  };

  // Filter and search invoices
  const filteredInvoices = useMemo(() => {
    let filtered = invoices;

    // Filter by status
    if (filterStatus !== 'All') {
      filtered = filtered.filter(invoice => invoice.status === filterStatus);
    }

    // Search by client name, patient name, or invoice ID
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(invoice => 
        invoice.clientName?.toLowerCase().includes(query) ||
        invoice.patientName?.toLowerCase().includes(query) ||
        invoice.invoiceId?.toLowerCase().includes(query) ||
        invoice.relatedOrderId?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [invoices, filterStatus, searchQuery]);

  const handleStatusUpdate = async (invoiceId, newStatus, paymentMethod = null) => {
    try {
      await InvoiceService.updateInvoiceStatus(invoiceId, newStatus, paymentMethod);
      
      // If this is a store invoice, sync with order status
      const invoice = invoices.find(inv => inv.invoiceId === invoiceId);
      if (invoice && invoice.service === 'Store Purchase' && invoice.relatedOrderId) {
        const ordersData = await AsyncStorage.getItem('@care_store_orders');
        if (ordersData) {
          const orders = JSON.parse(ordersData);
          const updatedOrders = orders.map(order => {
            if (order.orderNumber === invoice.relatedOrderId) {
              // If invoice is paid, mark order as completed (if it wasn't already)
              if (newStatus === 'Paid' && order.status === 'pending') {
                return {
                  ...order,
                  status: 'completed',
                  completedDate: new Date().toISOString()
                };
              }
            }
            return order;
          });
          await AsyncStorage.setItem('@care_store_orders', JSON.stringify(updatedOrders));
        }
      }
      
      await loadInvoices(); // Reload to reflect changes
      Alert.alert('Success', `Invoice status updated to ${newStatus}`);
    } catch (error) {
      Alert.alert('Error', 'Failed to update invoice status');
    }
  };

  const handleMarkAsPaid = (invoice) => {
    setInvoiceToMarkPaid(invoice);
    setPaymentMethodModalVisible(true);
  };

  const confirmMarkAsPaid = async () => {
    if (!selectedPaymentMethod) {
      Alert.alert('Error', 'Please select a payment method');
      return;
    }
    
    setPaymentMethodModalVisible(false);
    await handleStatusUpdate(invoiceToMarkPaid.invoiceId, 'Paid', selectedPaymentMethod);
    setSelectedPaymentMethod('');
    setInvoiceToMarkPaid(null);
  };

  const handleShareInvoice = async (invoice) => {
    try {
      await InvoiceService.shareInvoice(invoice);
    } catch (error) {
      Alert.alert('Error', 'Could not share invoice: ' + error.message);
    }
  };

  const handleViewInvoice = (invoice) => {
    setSelectedInvoice(invoice);
    // Scroll to the preview section at the top
    // You can add scroll functionality here if needed
  };

  const handleDeleteInvoice = async (invoiceId) => {
    Alert.alert(
      'Delete Invoice',
      'Are you sure you want to delete this invoice? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await InvoiceService.deleteInvoice(invoiceId);
              await loadInvoices();
              setInvoiceDetailsVisible(false);
              Alert.alert('Success', 'Invoice deleted successfully');
            } catch (error) {
              Alert.alert('Error', 'Failed to delete invoice');
            }
          }
        }
      ]
    );
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Paid': return COLORS.success;
      case 'Pending': return COLORS.warning;
      case 'Overdue': return COLORS.error;
      default: return COLORS.textLight;
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Paid': return 'check-circle';
      case 'Pending': return 'clock-outline';
      case 'Overdue': return 'alert-circle';
      default: return 'circle-outline';
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Header */}
      <LinearGradient
        colors={GRADIENTS.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 20, paddingBottom: 20 }]}
      >
        <View style={styles.headerRow}>
          <TouchableWeb onPress={() => navigation.goBack()} style={styles.iconButton}>
            <MaterialCommunityIcons name="arrow-left" size={26} color={COLORS.white} />
          </TouchableWeb>
          <Text style={styles.headerTitle}>Invoice Management</Text>
          <View style={styles.headerActions}>
            <TouchableWeb onPress={handleClearAllInvoices} style={styles.iconButton}>
              <MaterialCommunityIcons name="delete-sweep" size={24} color={COLORS.white} />
            </TouchableWeb>
            <TouchableWeb onPress={() => setSearchVisible(!searchVisible)} style={styles.iconButton}>
              <MaterialCommunityIcons name="magnify" size={24} color={COLORS.white} />
            </TouchableWeb>
          </View>
        </View>
        
        {/* Search Bar in Header */}
        {searchVisible && (
          <View style={styles.headerSearchBar}>
            <MaterialCommunityIcons name="magnify" size={20} color={COLORS.white} />
            <TextInput
              style={styles.headerSearchInput}
              placeholder="Search invoices..."
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
        {/* Invoice Preview Section */}
        <View style={styles.previewSection}>
          <View style={styles.previewHeader}>
            <Text style={styles.previewTitle}>
              {selectedInvoice ? `Invoice Preview - ${selectedInvoice.invoiceId}` : 'Invoice Preview'}
            </Text>
            <TouchableWeb
              onPress={async () => {
                try {
                  if (selectedInvoice) {
                    await InvoiceService.shareInvoice(selectedInvoice);
                  } else {
                    const sampleInvoice = await InvoiceService.createSampleInvoice();
                    await InvoiceService.shareInvoice(sampleInvoice);
                  }
                } catch (error) {
                  console.error('Error sharing invoice:', error);
                }
              }}
              style={styles.previewShareButton}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons name="share-variant" size={16} color={COLORS.primary} />
              <Text style={styles.previewShareText}>Share PDF</Text>
            </TouchableWeb>
          </View>
          
          {selectedInvoice ? (
            <>
              <View style={styles.invoicePreviewCard}>
                {/* PDF Header */}
                <View style={styles.pdfHeader}>
                  <View style={styles.pdfHeaderTop}>
                    <View style={styles.pdfCompanyInfo}>
                      <Image 
                        source={require('../assets/Images/CARElogo.png')} 
                        style={styles.careLogoHeader}
                        resizeMode="cover"
                      />
                    </View>
                    <View style={styles.pdfInvoiceInfo}>
                      <Text style={styles.pdfInvoiceTitle}>INVOICE</Text>
                      <Text style={styles.pdfInvoiceNumber}>{selectedInvoice.invoiceId}</Text>
                      <Text style={styles.pdfInvoiceDate}>Issue Date: {formatDate(selectedInvoice.issueDate)}</Text>
                      <Text style={styles.pdfInvoiceDate}>Due Date: {formatDate(selectedInvoice.dueDate)}</Text>
                    </View>
                  </View>
                  <View style={styles.pdfBlueLine} />
                </View>

                {/* Bill To and Service Provider */}
                <View style={styles.pdfClientSection}>
                  <View style={styles.pdfClientRow}>
                    <View style={styles.pdfBillTo}>
                      <Text style={styles.pdfSectionTitle}>BILL TO:</Text>
                      <Text style={styles.pdfClientName}>
                        {selectedInvoice.service === 'Store Purchase' 
                          ? (selectedInvoice.patientName || selectedInvoice.clientName)
                          : selectedInvoice.clientName
                        }
                      </Text>
                      <Text style={styles.pdfClientInfo}>
                        {selectedInvoice.service === 'Store Purchase'
                          ? (selectedInvoice.patientEmail || selectedInvoice.clientEmail || 'N/A')
                          : selectedInvoice.clientEmail
                        }
                      </Text>
                      <Text style={styles.pdfClientInfo}>
                        {selectedInvoice.service === 'Store Purchase'
                          ? (selectedInvoice.patientPhone || selectedInvoice.clientPhone || 'N/A')
                          : selectedInvoice.clientPhone
                        }
                      </Text>
                      {selectedInvoice.service === 'Store Purchase' ? (
                        <Text style={styles.pdfClientInfo}>Order #{selectedInvoice.relatedOrderId}</Text>
                      ) : (
                        <Text style={styles.pdfClientInfo}>{selectedInvoice.clientAddress || '123 Main Street, Anytown, State 12345'}</Text>
                      )}
                    </View>
                    <View style={styles.pdfServiceProvider}>
                      <Text style={styles.pdfSectionTitle}>SERVICE PROVIDED BY:</Text>
                      <Text style={styles.pdfProviderName}>{companyDetails.companyName}</Text>
                      <Text style={styles.pdfProviderInfo}>{companyDetails.address}</Text>
                      <Text style={styles.pdfProviderInfo}>Phone: {companyDetails.phone}</Text>
                      <Text style={styles.pdfProviderInfo}>Email: {companyDetails.email}</Text>
                      {companyDetails.website && <Text style={styles.pdfProviderInfo}>Web: {companyDetails.website}</Text>}
                    </View>
                  </View>
                </View>

                {/* Service/Order Table */}
                <View style={styles.pdfServiceSection}>
                  <View style={styles.pdfTable}>
                    <View style={styles.pdfTableHeader}>
                      <Text style={[styles.pdfTableHeaderText, { flex: 2 }]}>
                        {selectedInvoice.service === 'Store Purchase' ? 'Item Description' : 'Service Description'}
                      </Text>
                      {selectedInvoice.service === 'Store Purchase' ? (
                        <>
                          <Text style={styles.pdfTableHeaderText}>Qty</Text>
                          <Text style={styles.pdfTableHeaderText}>Unit Price</Text>
                          <Text style={styles.pdfTableHeaderText}>Amount</Text>
                        </>
                      ) : (
                        <>
                          <Text style={styles.pdfTableHeaderText}>Date</Text>
                          <Text style={styles.pdfTableHeaderText}>Hours</Text>
                          <Text style={styles.pdfTableHeaderText}>Rate</Text>
                          <Text style={styles.pdfTableHeaderText}>Amount</Text>
                        </>
                      )}
                    </View>
                    {selectedInvoice.service === 'Store Purchase' ? (
                      // Store Purchase Items
                      selectedInvoice.items && selectedInvoice.items.length > 0 ? (
                        selectedInvoice.items.map((item, index) => (
                          <View key={index} style={styles.pdfTableRow}>
                            <Text style={[styles.pdfTableCell, { flex: 2 }]}>{item.description}</Text>
                            <Text style={styles.pdfTableCell}>{item.quantity}</Text>
                            <Text style={styles.pdfTableCell}>J${item.unitPrice?.toFixed(2) || '0.00'}</Text>
                            <Text style={styles.pdfTableCellAmount}>J${item.total?.toFixed(2) || '0.00'}</Text>
                          </View>
                        ))
                      ) : (
                        <View style={styles.pdfTableRow}>
                          <Text style={[styles.pdfTableCell, { flex: 2 }]}>{selectedInvoice.description || selectedInvoice.service}</Text>
                          <Text style={styles.pdfTableCell}>1</Text>
                          <Text style={styles.pdfTableCell}>J${selectedInvoice.total}</Text>
                          <Text style={styles.pdfTableCellAmount}>J${selectedInvoice.total}</Text>
                        </View>
                      )
                    ) : (
                      // Appointment Service
                      <View style={styles.pdfTableRow}>
                        <Text style={[styles.pdfTableCell, { flex: 2 }]}>{selectedInvoice.service}</Text>
                        <Text style={styles.pdfTableCell}>{formatDate(selectedInvoice.date)}</Text>
                        <Text style={styles.pdfTableCell}>{selectedInvoice.hours}</Text>
                        <Text style={styles.pdfTableCell}>${selectedInvoice.rate}</Text>
                        <Text style={styles.pdfTableCellAmount}>${selectedInvoice.total}</Text>
                      </View>
                    )}
                  </View>

                  {/* Bottom Section: Payment Info and Totals Side by Side */}
                  <View style={styles.pdfBottomSection}>
                    {/* Payment Information */}
                    <View style={styles.pdfPaymentSection}>
                      <Text style={styles.pdfPaymentTitle}>Payment Information</Text>
                      {paymentInfo.bankAccounts.map((account) => (
                        <View key={account.id} style={styles.bankAccountGroup}>
                          <Text style={styles.pdfPaymentInfo}>{account.bankName}</Text>
                          {account.payee && (
                            <Text style={styles.pdfPaymentInfo}>Payee: {account.payee}</Text>
                          )}
                          {account.branch && (
                            <Text style={styles.pdfPaymentInfo}>Branch: {account.branch}</Text>
                          )}
                          {account.accountNumbers.map((accNum) => (
                            <Text key={accNum.id} style={styles.pdfPaymentInfo}>
                              {accNum.currency}: {accNum.number}
                            </Text>
                          ))}
                          {account.swiftCode && (
                            <Text style={styles.pdfPaymentInfo}>Swift: {account.swiftCode}</Text>
                          )}
                        </View>
                      ))}
                      {paymentInfo.cashAccepted && (
                        <Text style={styles.pdfPaymentInfo}>Cash accepted for home visits</Text>
                      )}
                      {paymentInfo.posAvailable && (
                        <Text style={styles.pdfPaymentInfo}>POS Machine Available</Text>
                      )}
                    </View>

                    {/* Invoice Totals */}
                    <View style={styles.pdfTotalsSection}>
                      <View style={styles.pdfTotalRow}>
                        <Text style={styles.pdfTotalLabel}>Subtotal:</Text>
                        <Text style={styles.pdfTotalValue}>
                          {selectedInvoice.service === 'Store Purchase' ? 'J$' : '$'}
                          {(selectedInvoice.subtotal || selectedInvoice.total || selectedInvoice.amount || 0).toFixed(2)}
                        </Text>
                      </View>
                      <View style={styles.pdfBlueLine} />
                      <View style={styles.pdfFinalTotalRow}>
                        <Text style={styles.pdfFinalTotalLabel}>Total Amount:</Text>
                        <Text style={styles.pdfFinalTotalAmount}>
                          {selectedInvoice.service === 'Store Purchase' ? 'J$' : '$'}
                          {(selectedInvoice.finalTotal || selectedInvoice.total || selectedInvoice.amount || 0).toFixed(2)}
                        </Text>
                      </View>
                      
                      {/* Paid Stamp below Total */}
                      {selectedInvoice.status === 'Paid' && (
                        <View style={styles.paidStampContainer}>
                          <View style={styles.paidStamp}>
                            <Text style={styles.paidStampText}>PAID</Text>
                            {selectedInvoice.paymentMethod && (
                              <Text style={styles.paidMethodText}>{selectedInvoice.paymentMethod}</Text>
                            )}
                            {selectedInvoice.paidDate && (
                              <Text style={styles.paidDateText}>{formatDate(selectedInvoice.paidDate)}</Text>
                            )}
                          </View>
                        </View>
                      )}
                    </View>
                  </View>
                </View>
              </View>
              
              {/* Close Button */}
              <TouchableWeb
                style={styles.closePreviewButton}
                onPress={() => setSelectedInvoice(null)}
              >
                <MaterialCommunityIcons name="close" size={18} color={COLORS.white} />
                <Text style={styles.closePreviewText}>Close Preview</Text>
              </TouchableWeb>
            </>
          ) : (
            <View style={styles.noInvoiceSelected}>
              <MaterialCommunityIcons name="file-document-outline" size={60} color={COLORS.border} />
              <Text style={styles.noInvoiceText}>Select an invoice below to preview</Text>
            </View>
          )}
        </View>

        {/* Filter Pills */}
        <View style={styles.filterContainer}>
          {[
            { key: 'All', label: 'All' },
            { key: 'Pending', label: 'Pending' },
            { key: 'Paid', label: 'Paid' },
            { key: 'Overdue', label: 'Overdue' }
          ].map((filter) => (
            <TouchableWeb
              key={filter.key}
              style={styles.filterPill}
              onPress={() => setFilterStatus(filter.key)}
              activeOpacity={0.8}
            >
              {filterStatus === filter.key ? (
                <LinearGradient
                  colors={GRADIENTS.header}
                  style={styles.filterPillGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
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
            </TouchableWeb>
          ))}
        </View>

        {/* Invoice List */}
        {filteredInvoices.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="file-document-outline" size={80} color={COLORS.border} />
            <Text style={styles.emptyTitle}>No invoices found</Text>
            <Text style={styles.emptyText}>
              {searchQuery || filterStatus !== 'All' 
                ? 'Try adjusting your search or filter'
                : 'Invoices will appear here when generated'
              }
            </Text>
          </View>
        ) : (
          <View style={styles.invoicesList}>
            {filteredInvoices.map((invoice) => (
              <View
                key={invoice.invoiceId}
                style={styles.invoiceCard}
              >
                <View style={styles.invoiceHeader}>
                  <View style={styles.invoiceInfo}>
                    {invoice.service === 'Store Purchase' ? (
                      <Text style={styles.invoiceId}>Order #{invoice.relatedOrderId}</Text>
                    ) : (
                      <>
                        <Text style={styles.invoiceId}>{invoice.invoiceId}</Text>
                        <Text style={styles.clientName}>{invoice.clientName}</Text>
                      </>
                    )}
                  </View>
                  <View style={styles.invoiceActions}>
                    <TouchableWeb
                      style={styles.viewButton}
                      onPress={() => handleViewInvoice(invoice)}
                    >
                      <LinearGradient
                        colors={GRADIENTS.header}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.viewButtonGradient}
                      >
                        <Text style={styles.viewButtonText}>View</Text>
                      </LinearGradient>
                    </TouchableWeb>
                    
                    {invoice.status === 'Pending' && (
                      <TouchableWeb
                        style={styles.paidButton}
                        onPress={() => handleMarkAsPaid(invoice)}
                      >
                        <MaterialCommunityIcons name="check" size={16} color={COLORS.white} />
                        <Text style={styles.paidButtonText}>Paid</Text>
                      </TouchableWeb>
                    )}
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Invoice Details Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={invoiceDetailsVisible}
        onRequestClose={() => setInvoiceDetailsVisible(false)}
      >
        <TouchableWeb 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setInvoiceDetailsVisible(false)}
        >
          <TouchableWeb 
            activeOpacity={1} 
            onPress={(e) => e.stopPropagation()}
            style={{ flex: 1, justifyContent: 'flex-end' }}
          >
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Invoice Details</Text>
                <TouchableWeb onPress={() => setInvoiceDetailsVisible(false)}>
                  <MaterialCommunityIcons name="close" size={24} color={COLORS.text} />
                </TouchableWeb>
              </View>

              {selectedInvoice && (
                <ScrollView style={styles.modalBody}>
                  <View style={styles.detailsSection}>
                    <Text style={styles.sectionTitle}>Invoice Information</Text>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Invoice ID:</Text>
                      <Text style={styles.detailValue}>{selectedInvoice.invoiceId}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Issue Date:</Text>
                      <Text style={styles.detailValue}>{selectedInvoice.issueDate}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Due Date:</Text>
                      <Text style={styles.detailValue}>{selectedInvoice.dueDate}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Status:</Text>
                      <View style={[styles.statusBadge, { backgroundColor: getStatusColor(selectedInvoice.status) + '20' }]}>
                        <Text style={[styles.statusText, { color: getStatusColor(selectedInvoice.status) }]}>
                          {selectedInvoice.status}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.detailsSection}>
                    <Text style={styles.sectionTitle}>Client Information</Text>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Name:</Text>
                      <Text style={styles.detailValue}>{selectedInvoice.clientName}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Email:</Text>
                      <Text style={styles.detailValue}>{selectedInvoice.clientEmail}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Phone:</Text>
                      <Text style={styles.detailValue}>{selectedInvoice.clientPhone}</Text>
                    </View>
                  </View>

                  <View style={styles.detailsSection}>
                    <Text style={styles.sectionTitle}>Service Details</Text>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Service:</Text>
                      <Text style={styles.detailValue}>{selectedInvoice.service}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Date:</Text>
                      <Text style={styles.detailValue}>{selectedInvoice.date}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Hours:</Text>
                      <Text style={styles.detailValue}>{selectedInvoice.hours}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Rate:</Text>
                      <Text style={styles.detailValue}>${selectedInvoice.rate}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Total:</Text>
                      <Text style={[styles.detailValue, styles.totalAmount]}>${selectedInvoice.total}</Text>
                    </View>
                  </View>

                  {/* Action Buttons */}
                  <View style={styles.actionButtons}>
                    <TouchableWeb
                      style={styles.actionButton}
                      onPress={() => handleShareInvoice(selectedInvoice)}
                    >
                      <LinearGradient
                        colors={[COLORS.primary, COLORS.accent]}
                        style={styles.actionButtonGradient}
                      >
                        <MaterialCommunityIcons name="share" size={18} color={COLORS.white} />
                        <Text style={styles.actionButtonText}>Share</Text>
                      </LinearGradient>
                    </TouchableWeb>

                    {selectedInvoice.status === 'Pending' && (
                      <TouchableWeb
                        style={styles.actionButton}
                        onPress={() => handleMarkAsPaid(selectedInvoice)}
                      >
                        <LinearGradient
                          colors={[COLORS.success, '#2E7D32']}
                          style={styles.actionButtonGradient}
                        >
                          <MaterialCommunityIcons name="check" size={18} color={COLORS.white} />
                          <Text style={styles.actionButtonText}>Mark Paid</Text>
                        </LinearGradient>
                      </TouchableWeb>
                    )}

                    <TouchableWeb
                      style={styles.deleteButton}
                      onPress={() => handleDeleteInvoice(selectedInvoice.invoiceId)}
                    >
                      <MaterialCommunityIcons name="delete" size={18} color={COLORS.error} />
                      <Text style={styles.deleteButtonText}>Delete</Text>
                    </TouchableWeb>
                  </View>
                </ScrollView>
              )}
            </View>
          </TouchableWeb>
        </TouchableWeb>
      </Modal>

      {/* Payment Method Modal */}
      <Modal
        visible={paymentMethodModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setPaymentMethodModalVisible(false)}
      >
        <View style={styles.paymentMethodOverlay}>
          <TouchableWeb 
            style={styles.paymentMethodBackdrop}
            activeOpacity={1}
            onPress={() => setPaymentMethodModalVisible(false)}
          />
          <TouchableWeb 
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.paymentMethodModal}>
              <Text style={styles.paymentMethodTitle}>Select Payment Method</Text>
              <Text style={styles.paymentMethodSubtitle}>
                How did the client pay for this invoice?
              </Text>

              <View style={styles.paymentMethods}>
                {['Debit/Credit Card', 'Bank Transfer', 'Cash'].map((method) => (
                  <TouchableWeb
                    key={method}
                    style={[
                      styles.paymentMethodOption,
                      selectedPaymentMethod === method && styles.paymentMethodOptionSelected
                    ]}
                    onPress={() => setSelectedPaymentMethod(method)}
                  >
                    <MaterialCommunityIcons 
                      name={
                        method === 'Debit/Credit Card' ? 'credit-card' :
                        method === 'Bank Transfer' ? 'bank-transfer' :
                        'cash'
                      }
                      size={24}
                      color={selectedPaymentMethod === method ? COLORS.white : COLORS.primary}
                    />
                    <Text style={[
                      styles.paymentMethodText,
                      selectedPaymentMethod === method && styles.paymentMethodTextSelected
                    ]}>
                      {method}
                    </Text>
                  </TouchableWeb>
                ))}
              </View>

              <View style={styles.paymentMethodButtons}>
                <TouchableWeb
                  style={styles.paymentMethodCancelButton}
                  onPress={() => {
                    setPaymentMethodModalVisible(false);
                    setSelectedPaymentMethod('');
                  }}
                >
                  <Text style={styles.paymentMethodCancelText}>Cancel</Text>
                </TouchableWeb>
                <TouchableWeb
                  style={styles.paymentMethodConfirmButton}
                  onPress={confirmMarkAsPaid}
                >
                  <LinearGradient
                    colors={[COLORS.success, '#2E7D32']}
                    style={styles.paymentMethodConfirmGradient}
                  >
                    <Text style={styles.paymentMethodConfirmText}>Confirm Payment</Text>
                  </LinearGradient>
                </TouchableWeb>
              </View>
            </View>
          </TouchableWeb>
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
  header: {
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Poppins_700Bold',
    color: COLORS.white,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 12,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerSearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 8,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    marginTop: SPACING.sm,
    gap: SPACING.sm,
  },
  headerSearchInput: {
    flex: 1,
    fontSize: 16,
    color: COLORS.white,
  },
  clearSearchButton: {
    padding: 4,
  },
  previewSection: {
    backgroundColor: COLORS.background,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
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
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: COLORS.primary + '10',
  },
  previewShareText: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '500',
  },
  invoicePreviewCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    marginBottom: SPACING.sm,
  },
  paidStampContainer: {
    marginTop: 12,
    alignItems: 'center',
  },
  paidStamp: {
    borderWidth: 2,
    borderColor: '#4CAF50',
    borderRadius: 6,
    paddingVertical: 4,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    transform: [{ rotate: '-5deg' }],
  },
  paidStampText: {
    fontSize: 18,
    fontFamily: 'Poppins_700Bold',
    color: '#4CAF50',
    textAlign: 'center',
    letterSpacing: 3,
  },
  paidDateText: {
    fontSize: 9,
    fontFamily: 'Poppins_600SemiBold',
    color: '#4CAF50',
    textAlign: 'center',
    marginTop: 1,
  },
  paidMethodText: {
    fontSize: 10,
    fontFamily: 'Poppins_600SemiBold',
    color: '#4CAF50',
    textAlign: 'center',
    marginTop: 2,
  },
  paymentMethodOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  paymentMethodBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  paymentMethodModal: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  paymentMethodTitle: {
    fontSize: 20,
    fontFamily: 'Poppins_700Bold',
    color: COLORS.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  paymentMethodSubtitle: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.textLight,
    marginBottom: 24,
    textAlign: 'center',
  },
  paymentMethods: {
    gap: 12,
    marginBottom: 24,
  },
  paymentMethodOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.border,
    gap: 12,
  },
  paymentMethodOptionSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  paymentMethodText: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.text,
  },
  paymentMethodTextSelected: {
    color: COLORS.white,
  },
  paymentMethodButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  paymentMethodCancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  paymentMethodCancelText: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.text,
  },
  paymentMethodConfirmButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  paymentMethodConfirmGradient: {
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  paymentMethodConfirmText: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.white,
  },
  pdfHeader: {
    backgroundColor: COLORS.white,
    paddingTop: SPACING.md,
  },
  pdfHeaderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  pdfCompanyInfo: {
    flex: 1,
    marginRight: SPACING.sm,
  },
  careLogoHeader: {
    width: 200,
    height: 80,
    marginLeft: -40,
  },
  pdfCompanyName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#00B8D4', // Teal blue from PDF
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
    marginHorizontal: SPACING.md,
    marginVertical: SPACING.xs,
  },
  pdfClientSection: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  pdfClientRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  pdfBillTo: {
    flex: 1,
    marginRight: SPACING.md,
  },
  pdfServiceProvider: {
    flex: 1,
  },
  careLogo: {
    width: 120,
    height: 60,
    marginTop: 5,
  },
  pdfSectionTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.xs,
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
  pdfProviderName: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 2,
  },
  pdfProviderInfo: {
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
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  pdfTable: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 4,
    marginBottom: SPACING.md,
  },
  pdfTableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F5F5F5',
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.xs,
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
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.xs,
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
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.text,
    marginBottom: 8,
  },
  bankAccountGroup: {
    marginBottom: 10,
  },
  pdfPaymentInfo: {
    fontSize: 9,
    fontFamily: 'Poppins_400Regular',
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
  pdfFinalTotalAmount: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  filterContainer: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: SPACING.md,
    marginTop: SPACING.md,
    marginBottom: SPACING.md,
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
  scrollView: {
    flex: 1,
    backgroundColor: COLORS.background,
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
    marginTop: SPACING.md,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textLight,
    textAlign: 'center',
    marginTop: SPACING.xs,
  },
  invoicesList: {
    padding: SPACING.md,
  },
  invoiceCard: {
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
  invoiceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.sm,
  },
  invoiceInfo: {
    flex: 1,
  },
  invoiceId: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  clientName: {
    fontSize: 14,
    color: COLORS.textLight,
    marginTop: 2,
  },
  invoiceService: {
    fontSize: 12,
    color: COLORS.primary,
    marginTop: 2,
    fontFamily: 'Poppins_500Medium',
  },
  invoiceAmount: {
    fontSize: 16,
    fontFamily: 'Poppins_700Bold',
    color: '#10B981',
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    minHeight: '50%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  modalBody: {
    flex: 1,
    padding: SPACING.lg,
  },
  detailsSection: {
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border + '30',
  },
  detailLabel: {
    fontSize: 14,
    color: COLORS.textLight,
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '500',
    flex: 2,
    textAlign: 'right',
  },
  totalAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.lg,
  },
  actionButton: {
    flex: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  actionButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: SPACING.xs,
  },
  actionButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: SPACING.md,
    borderRadius: 8,
    backgroundColor: COLORS.error + '20',
    gap: SPACING.xs,
  },
  deleteButtonText: {
    color: COLORS.error,
    fontSize: 14,
    fontWeight: '600',
  },
  invoiceActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
    alignItems: 'center',
  },
  viewButton: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  viewButtonGradient: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewButtonText: {
    fontSize: 11,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.white,
  },
  paidButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
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
  noInvoiceSelected: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    marginBottom: SPACING.sm,
  },
  noInvoiceText: {
    fontSize: 16,
    color: COLORS.textLight,
    marginTop: SPACING.sm,
    textAlign: 'center',
  },
  closePreviewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.error,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    borderRadius: 8,
    marginTop: SPACING.sm,
    marginHorizontal: SPACING.md,
    gap: SPACING.xs,
  },
  closePreviewText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
  },
});