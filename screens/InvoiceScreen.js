import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  StatusBar,
  Alert,
  ActivityIndicator,
  Image
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import { COLORS, GRADIENTS, SPACING } from '../constants';
import InvoiceService from '../services/InvoiceService';

const InvoiceDisplayScreen = ({ route, navigation }) => {
  const insets = useSafeAreaInsets();
  const invoiceViewRef = useRef();
  const { invoiceData, clientName, returnToClientDetails, clientId } = route.params;
  const [isSharing, setIsSharing] = useState(false);
  const [orderDetails, setOrderDetails] = useState(null);
  
  // Determine if this is a store purchase invoice
  const isStoreInvoice = invoiceData?.service === 'Store Purchase';

  // Format date to a cleaner format (e.g., "Nov 4, 2025")
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      // Handle various date formats
      // If it's already in "MMM DD, YYYY" format, return as is
      if (typeof dateString === 'string' && /^[A-Z][a-z]{2}\s\d{1,2},\s\d{4}$/.test(dateString)) {
        return dateString;
      }
      
      const date = new Date(dateString);
      // Check if date is valid
      if (isNaN(date.getTime())) {
        // Try to parse as ISO date
        const isoDate = new Date(dateString.split('T')[0]);
        if (!isNaN(isoDate.getTime())) {
          const options = { year: 'numeric', month: 'short', day: 'numeric' };
          return isoDate.toLocaleDateString('en-US', options);
        }
        return dateString; // Return original if still can't parse
      }
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
    website: '',
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
  
  console.log('🖥️ INVOICE DISPLAY SCREEN LOADED');
  console.log('🖥️ Invoice data received:', invoiceData ? 'YES' : 'NO');
  console.log('🖥️ Client name:', clientName);

  // Load company details and payment info
  useEffect(() => {
    loadCompanyDetails();
    loadPaymentInfo();
    
    // Load order details if this is a store invoice
    if (isStoreInvoice && invoiceData?.relatedOrderId) {
      loadOrderDetails();
    }
  }, []);
  
  const loadOrderDetails = async () => {
    try {
      const ordersData = await AsyncStorage.getItem('@care_store_orders');
      if (ordersData) {
        const orders = JSON.parse(ordersData);
        const order = orders.find(o => o.orderNumber === invoiceData.relatedOrderId);
        if (order) {
          setOrderDetails(order);
        }
      }
    } catch (error) {
      console.error('Error loading order details:', error);
    }
  };

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

  const handleShareInvoice = async () => {
    if (isSharing || !invoiceData) return;
    
    setIsSharing(true);
    try {
      await InvoiceService.shareInvoice(invoiceData);
    } catch (error) {
      console.error('Error sharing invoice:', error);
      Alert.alert('Error', 'Failed to share invoice');
    } finally {
      setIsSharing(false);
    }
  };

  const handleBackPress = () => {
    if (returnToClientDetails) {
      // Return to Clients screen, which will keep the client details modal open
      navigation.navigate('Clients', { 
        openClientDetails: true,
        clientId: clientId 
      });
    } else {
      // Just go back to previous screen (order details)
      navigation.goBack();
    }
  };

  if (!invoiceData) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>No invoice data available</Text>
        <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <LinearGradient
        colors={GRADIENTS.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 20 }]}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
            <MaterialCommunityIcons name="arrow-left" size={24} color={COLORS.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Invoice Preview</Text>
          <TouchableOpacity 
            onPress={handleShareInvoice} 
            style={styles.shareButton}
            disabled={isSharing}
          >
            {isSharing ? (
              <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
              <MaterialCommunityIcons name="share" size={24} color={COLORS.white} />
            )}
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Invoice Preview */}
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.invoiceContainer}>
          
          {/* PDF Invoice Preview */}
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
                  <Text style={styles.pdfInvoiceNumber}>{invoiceData.invoiceId}</Text>
                  <Text style={styles.pdfInvoiceDate}>Issue Date: {formatDate(invoiceData.issueDate)}</Text>
                  <Text style={styles.pdfInvoiceDate}>Due Date: {formatDate(invoiceData.dueDate)}</Text>
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
                    {isStoreInvoice ? invoiceData.patientName : invoiceData.clientName}
                  </Text>
                  <Text style={styles.pdfClientInfo}>
                    {isStoreInvoice ? (invoiceData.patientEmail || 'N/A') : invoiceData.clientEmail}
                  </Text>
                  <Text style={styles.pdfClientInfo}>
                    {isStoreInvoice ? (invoiceData.patientPhone || 'N/A') : invoiceData.clientPhone}
                  </Text>
                  {!isStoreInvoice && <Text style={styles.pdfClientInfo}>{invoiceData.clientAddress}</Text>}
                  {isStoreInvoice && orderDetails && (
                    <Text style={styles.pdfClientInfo}>Order #{orderDetails.orderNumber}</Text>
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

            {/* Service/Order Details Table */}
            <View style={styles.pdfServiceSection}>
              <View style={styles.pdfTable}>
                <View style={styles.pdfTableHeader}>
                  <Text style={[styles.pdfTableHeaderText, { flex: 2 }]}>Description</Text>
                  {isStoreInvoice ? (
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
                {isStoreInvoice ? (
                  // Store Purchase Items
                  invoiceData.items && invoiceData.items.length > 0 ? (
                    invoiceData.items.map((item, index) => (
                      <View key={index} style={styles.pdfTableRow}>
                        <Text style={[styles.pdfTableCell, { flex: 2 }]}>{item.description}</Text>
                        <Text style={styles.pdfTableCell}>{item.quantity}</Text>
                        <Text style={styles.pdfTableCell}>J${item.unitPrice.toFixed(2)}</Text>
                        <Text style={styles.pdfTableCellAmount}>J${item.total.toFixed(2)}</Text>
                      </View>
                    ))
                  ) : (
                    <View style={styles.pdfTableRow}>
                      <Text style={[styles.pdfTableCell, { flex: 2 }]}>{invoiceData.description || invoiceData.service}</Text>
                      <Text style={styles.pdfTableCell}>1</Text>
                      <Text style={styles.pdfTableCell}>J${invoiceData.amount.toFixed(2)}</Text>
                      <Text style={styles.pdfTableCellAmount}>J${invoiceData.amount.toFixed(2)}</Text>
                    </View>
                  )
                ) : (
                  // Appointment Service Items
                  invoiceData.items && invoiceData.items.length > 0 ? (
                    invoiceData.items.map((item, index) => (
                      <View key={index} style={styles.pdfTableRow}>
                        <Text style={[styles.pdfTableCell, { flex: 2 }]}>{item.description}</Text>
                        <Text style={styles.pdfTableCell}>{formatDate(item.serviceDates || item.date || invoiceData.date || invoiceData.appointmentDate || invoiceData.issueDate)}</Text>
                        <Text style={styles.pdfTableCell}>{item.quantity || item.hours || invoiceData.hours}</Text>
                        <Text style={styles.pdfTableCell}>${item.price || item.rate || invoiceData.rate}</Text>
                        <Text style={styles.pdfTableCellAmount}>${item.total || item.amount || invoiceData.total}</Text>
                      </View>
                    ))
                  ) : (
                    <View style={styles.pdfTableRow}>
                      <Text style={[styles.pdfTableCell, { flex: 2 }]}>{invoiceData.service}</Text>
                      <Text style={styles.pdfTableCell}>{formatDate(invoiceData.date || invoiceData.appointmentDate || invoiceData.serviceDate || invoiceData.issueDate)}</Text>
                      <Text style={styles.pdfTableCell}>{invoiceData.hours}</Text>
                      <Text style={styles.pdfTableCell}>${invoiceData.rate}</Text>
                      <Text style={styles.pdfTableCellAmount}>${invoiceData.total}</Text>
                    </View>
                  )
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

                {/* Totals Section */}
                <View style={styles.pdfTotalsSection}>
                  <View style={styles.pdfTotalRow}>
                    <Text style={styles.pdfTotalLabel}>Subtotal:</Text>
                    <Text style={styles.pdfTotalValue}>
                      {isStoreInvoice ? 'J$' : '$'}
                      {(invoiceData.subtotal || invoiceData.amount || invoiceData.total || 0).toFixed(2)}
                    </Text>
                  </View>
                  <View style={styles.pdfBlueLine} />
                  <View style={styles.pdfFinalTotalRow}>
                    <Text style={styles.pdfFinalTotalLabel}>Total Amount:</Text>
                    <Text style={styles.pdfFinalTotalAmount}>
                      {isStoreInvoice ? 'J$' : '$'}
                      {(invoiceData.finalTotal || invoiceData.amount || invoiceData.total || 0).toFixed(2)}
                    </Text>
                  </View>
                  
                  {/* Paid Stamp below Total */}
                  {(invoiceData.status === 'Paid' || invoiceData.status === 'paid') && (
                    <View style={styles.paidStampContainer}>
                      <View style={styles.paidStamp}>
                        <Text style={styles.paidStampText}>PAID</Text>
                        {invoiceData.paymentMethod && (
                          <Text style={styles.paidMethodText}>{invoiceData.paymentMethod}</Text>
                        )}
                        {invoiceData.paidDate && (
                          <Text style={styles.paidDateText}>{formatDate(invoiceData.paidDate)}</Text>
                        )}
                      </View>
                    </View>
                  )}
                  
                  {/* Order Details for Store Invoices */}
                  {isStoreInvoice && orderDetails && (
                    <View style={styles.orderDetailsSection}>
                      <Text style={styles.orderDetailTitle}>Order Status</Text>
                      <View style={[styles.orderStatusBadge, {
                        backgroundColor: orderDetails.status === 'pending' ? '#FFA500' :
                                       orderDetails.status === 'completed' ? '#10B981' : '#EF4444'
                      }]}>
                        <Text style={styles.orderStatusText}>{orderDetails.status.toUpperCase()}</Text>
                      </View>
                      {orderDetails.completedDate && (
                        <Text style={styles.orderDetailText}>
                          Delivered: {formatDate(orderDetails.completedDate)}
                        </Text>
                      )}
                    </View>
                  )}
                </View>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingBottom: SPACING.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
  },
  backButton: {
    padding: SPACING.sm,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.white,
  },
  shareButton: {
    padding: SPACING.sm,
  },
  scrollView: {
    flex: 1,
  },
  invoiceContainer: {
    padding: SPACING.md,
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 20,
  },
  backButtonText: {
    fontSize: 16,
    color: COLORS.primary,
  },
  // PDF Invoice Preview Styles (same as InvoiceManagementScreen)
  invoicePreviewCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: SPACING.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    maxWidth: 600,
    width: '100%',
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
  orderDetailsSection: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    alignItems: 'center',
  },
  orderDetailTitle: {
    fontSize: 11,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.text,
    marginBottom: 6,
  },
  orderStatusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 4,
  },
  orderStatusText: {
    fontSize: 10,
    fontFamily: 'Poppins_700Bold',
    color: COLORS.white,
    letterSpacing: 1,
  },
  orderDetailText: {
    fontSize: 9,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.textLight,
    marginTop: 2,
  },
});

export default InvoiceDisplayScreen;