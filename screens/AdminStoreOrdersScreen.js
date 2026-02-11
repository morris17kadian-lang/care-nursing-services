import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Modal,
  Alert,
  Image,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import TouchableWeb from '../components/TouchableWeb';
import { COLORS, GRADIENTS, SPACING } from '../constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNotifications } from '../context/NotificationContext';
import InvoiceService from '../services/InvoiceService';

const ORDERS_STORAGE_KEY = '@care_store_orders';
const INVOICES_STORAGE_KEY = '@care_invoices';

export default function AdminStoreOrdersScreen({ navigation, route, isEmbedded = false }) {
  const insets = useSafeAreaInsets();
  const { sendNotificationToUser } = useNotifications();
  const highlightOrderId = route?.params?.highlightOrder;
  const [activeTab, setActiveTab] = useState('pending');
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [invoiceNumber, setInvoiceNumber] = useState(null);

  useEffect(() => {
    loadOrders();
  }, []);

  // Auto-open order details if highlightOrderId is provided
  useEffect(() => {
    if (highlightOrderId && orders.length > 0) {
      const orderToHighlight = orders.find(order => order.orderNumber === highlightOrderId);
      if (orderToHighlight) {
        // Switch to the appropriate tab based on order status
        if (orderToHighlight.status === 'completed') {
          setActiveTab('completed');
        } else if (orderToHighlight.status === 'cancelled') {
          setActiveTab('cancelled');
        } else {
          setActiveTab('pending');
        }
        
        // Open the order details
        setTimeout(async () => {
          setSelectedOrder(orderToHighlight);
          await loadInvoiceForOrder(orderToHighlight.orderNumber);
          setDetailsModalVisible(true);
        }, 300);
      }
    }
  }, [highlightOrderId, orders]);

  const loadOrders = async () => {
    try {
      const stored = await AsyncStorage.getItem(ORDERS_STORAGE_KEY);
      if (stored) {
        setOrders(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading orders:', error);
    }
  };

  const loadInvoiceForOrder = async (orderId) => {
    try {
      const invoicesJson = await AsyncStorage.getItem(INVOICES_STORAGE_KEY);
      if (invoicesJson) {
        const invoices = JSON.parse(invoicesJson);
        const orderInvoice = invoices.find(inv => inv.relatedOrderId === orderId);
        if (orderInvoice) {
          setInvoiceNumber(orderInvoice.invoiceNumber);
          return orderInvoice;
        }
      }
    } catch (error) {
      console.error('Error loading invoice:', error);
    }
    return null;
  };

  const handleViewInvoice = async () => {
    if (selectedOrder) {
      const invoice = await loadInvoiceForOrder(selectedOrder.orderNumber);
      if (invoice) {
        setDetailsModalVisible(false);
        navigation.navigate('InvoiceDisplay', { 
          invoiceData: invoice,
          clientName: invoice.patientName || invoice.clientName
        });
      } else {
        Alert.alert('Not Found', 'Invoice not found for this order');
      }
    }
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      const updatedOrders = orders.map(order =>
        order.id === orderId ? { ...order, status: newStatus, completedDate: newStatus === 'completed' ? new Date().toISOString() : order.completedDate } : order
      );
      await AsyncStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(updatedOrders));
      setOrders(updatedOrders);

      // Get the order to find its orderNumber
      const order = orders.find(o => o.id === orderId);
      if (!order) return;

      // Update related invoice status using orderNumber
      if (newStatus === 'completed') {
        const invoicesStored = await AsyncStorage.getItem(INVOICES_STORAGE_KEY);
        if (invoicesStored) {
          const invoices = JSON.parse(invoicesStored);
          const updatedInvoices = invoices.map(inv =>
            inv.relatedOrderId === order.orderNumber ? { ...inv, status: 'Pending' } : inv
          );
          await AsyncStorage.setItem(INVOICES_STORAGE_KEY, JSON.stringify(updatedInvoices));
        }

        // Send notification to patient about delivery
        try {
          await sendNotificationToUser(
            order.patientId,
            'patient',
            'Order Delivered',
            `Your order #${order.orderNumber} has been delivered successfully!`,
            {
              type: 'order_delivered',
              orderId: order.orderNumber,
              orderTotal: order.total,
              itemCount: order.items?.length || 0
            }
          );
          // Order delivered notification sent to patient
        } catch (notifError) {
          console.error('Failed to send delivery notification:', notifError);
        }
      } else if (newStatus === 'cancelled') {
        const invoicesStored = await AsyncStorage.getItem(INVOICES_STORAGE_KEY);
        if (invoicesStored) {
          const invoices = JSON.parse(invoicesStored);
          const updatedInvoices = invoices.map(inv =>
            inv.relatedOrderId === order.orderNumber ? { ...inv, status: 'cancelled' } : inv
          );
          await AsyncStorage.setItem(INVOICES_STORAGE_KEY, JSON.stringify(updatedInvoices));
        }

        // Send notification to patient about cancellation
        try {
          await sendNotificationToUser(
            order.patientId,
            'patient',
            'Order Cancelled',
            `Your order #${order.orderNumber} has been cancelled.`,
            {
              type: 'order_cancelled',
              orderId: order.orderNumber,
              orderTotal: order.total,
              itemCount: order.items?.length || 0
            }
          );
          // Order cancellation notification sent to patient
        } catch (notifError) {
          console.error('Failed to send cancellation notification:', notifError);
        }
      }

      setDetailsModalVisible(false);
      Alert.alert('Success', `Order ${newStatus === 'completed' ? 'marked as delivered' : 'cancelled'} successfully`);
    } catch (error) {
      console.error('Error updating order:', error);
      Alert.alert('Error', 'Failed to update order status');
    }
  };

  const handleDelivered = () => {
    Alert.alert(
      'Mark as Delivered',
      'Confirm that this order has been delivered?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: () => updateOrderStatus(selectedOrder.id, 'completed')
        }
      ]
    );
  };

  const handleCancel = () => {
    Alert.alert(
      'Cancel Order',
      'Are you sure you want to cancel this order?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: () => updateOrderStatus(selectedOrder.id, 'cancelled')
        }
      ]
    );
  };

  const filteredOrders = orders.filter(order => {
    if (activeTab === 'pending') return order.status === 'pending';
    if (activeTab === 'completed') return order.status === 'completed';
    if (activeTab === 'cancelled') return order.status === 'cancelled';
    return true;
  });

  const renderOrderCard = (order) => {
    const isHighlighted = highlightOrderId && order.orderNumber === highlightOrderId;
    
    return (
      <TouchableWeb
        key={order.id}
        style={[
          styles.orderCard,
          isHighlighted && styles.highlightedOrderCard
        ]}
        onPress={async () => {
          setSelectedOrder(order);
          await loadInvoiceForOrder(order.orderNumber);
          setDetailsModalVisible(true);
        }}
        activeOpacity={0.7}
      >
        <View style={styles.orderHeader}>
        <View style={styles.orderIconContainer}>
          <MaterialCommunityIcons name="package-variant" size={32} color={COLORS.primary} />
        </View>
        <View style={styles.orderInfo}>
          <Text style={styles.orderNumber}>#{order.orderNumber}</Text>
          <Text style={styles.patientName}>{order.patientName}</Text>
          <Text style={styles.orderDate}>{new Date(order.date).toLocaleDateString()}</Text>
        </View>
        <View style={styles.orderRight}>
          <Text style={styles.orderTotal}>J${order.total.toFixed(2)}</Text>
          <View style={[styles.statusBadge, { backgroundColor: order.status === 'pending' ? '#FFA500' : order.status === 'completed' ? '#10B981' : '#EF4444' }]}>
            <Text style={styles.statusText}>{order.status}</Text>
          </View>
        </View>
      </View>
      <View style={styles.orderFooter}>
        <Text style={styles.itemCount}>{order.items.length} item(s)</Text>
        <MaterialCommunityIcons name="chevron-right" size={20} color={COLORS.textLight} />
      </View>
    </TouchableWeb>
    );
  };

  return (
    <View style={styles.container}>
      {/* Watermark Logo */}
      <Image
        source={require('../assets/Images/Nurses-logo.png')}
        style={styles.watermarkLogo}
        resizeMode="contain"
      />
      
      {!isEmbedded && (
        <LinearGradient 
          colors={GRADIENTS.header} 
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={[styles.header, { paddingTop: insets.top + 20 }]}
        >
          <View style={styles.headerContent}>
            <TouchableWeb onPress={() => navigation.goBack()} style={styles.backButton}>
              <MaterialCommunityIcons name="arrow-left" size={24} color={COLORS.white} />
            </TouchableWeb>
            <Text style={styles.headerTitle}>Store Orders</Text>
            <View style={styles.headerRight} />
          </View>
        </LinearGradient>
      )}

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableWeb
          style={styles.tab}
          onPress={() => setActiveTab('pending')}
          activeOpacity={0.7}
        >
          {activeTab === 'pending' ? (
            <LinearGradient
              colors={GRADIENTS.header}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={styles.activeTabGradient}
            >
              <Text style={styles.activeTabText}>Pending</Text>
            </LinearGradient>
          ) : (
            <View style={styles.inactiveTabContent}>
              <Text style={styles.tabText}>Pending</Text>
            </View>
          )}
        </TouchableWeb>
        <TouchableWeb
          style={styles.tab}
          onPress={() => setActiveTab('completed')}
          activeOpacity={0.7}
        >
          {activeTab === 'completed' ? (
            <LinearGradient
              colors={GRADIENTS.header}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={styles.activeTabGradient}
            >
              <Text style={styles.activeTabText}>Completed</Text>
            </LinearGradient>
          ) : (
            <View style={styles.inactiveTabContent}>
              <Text style={styles.tabText}>Completed</Text>
            </View>
          )}
        </TouchableWeb>
        <TouchableWeb
          style={styles.tab}
          onPress={() => setActiveTab('cancelled')}
          activeOpacity={0.7}
        >
          {activeTab === 'cancelled' ? (
            <LinearGradient
              colors={GRADIENTS.header}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={styles.activeTabGradient}
            >
              <Text style={styles.activeTabText}>Cancelled</Text>
            </LinearGradient>
          ) : (
            <View style={styles.inactiveTabContent}>
              <Text style={styles.tabText}>Cancelled</Text>
            </View>
          )}
        </TouchableWeb>
      </View>

      {/* Orders List */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {filteredOrders.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="package-variant-closed" size={64} color={COLORS.border} />
            <Text style={styles.emptyTitle}>No {activeTab} orders</Text>
            <Text style={styles.emptyText}>Orders will appear here when customers place them</Text>
          </View>
        ) : (
          filteredOrders.map(renderOrderCard)
        )}
      </ScrollView>

      {/* Order Details Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={detailsModalVisible}
        onRequestClose={() => setDetailsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Order Details</Text>
              <TouchableWeb onPress={() => setDetailsModalVisible(false)}>
                <MaterialCommunityIcons name="close" size={24} color={COLORS.text} />
              </TouchableWeb>
            </View>

            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              {selectedOrder && (
                <>
                  {/* Order Information */}
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Order Information</Text>
                    <View style={styles.detailRow}>
                      <MaterialCommunityIcons name="pound" size={20} color={COLORS.primary} />
                      <View style={styles.detailContent}>
                        <Text style={styles.detailLabel}>Order Number</Text>
                        <Text style={styles.detailValue}>{selectedOrder.orderNumber}</Text>
                      </View>
                    </View>
                    <View style={styles.detailRow}>
                      <MaterialCommunityIcons name="calendar" size={20} color={COLORS.primary} />
                      <View style={styles.detailContent}>
                        <Text style={styles.detailLabel}>Order Date</Text>
                        <Text style={styles.detailValue}>
                          {new Date(selectedOrder.date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.detailRow}>
                      <MaterialCommunityIcons name="account" size={20} color={COLORS.primary} />
                      <View style={styles.detailContent}>
                        <Text style={styles.detailLabel}>Customer</Text>
                        <Text style={styles.detailValue}>{selectedOrder.patientName}</Text>
                      </View>
                    </View>
                    <View style={styles.detailRow}>
                      <MaterialCommunityIcons name="tag" size={20} color={COLORS.primary} />
                      <View style={styles.detailContent}>
                        <Text style={styles.detailLabel}>Status</Text>
                        <View style={[styles.statusBadgeInline, { 
                          backgroundColor: selectedOrder.status === 'pending' ? '#FFA500' : 
                                         selectedOrder.status === 'completed' ? '#10B981' : '#EF4444' 
                        }]}>
                          <Text style={styles.statusTextInline}>{selectedOrder.status}</Text>
                        </View>
                      </View>
                    </View>
                  </View>

                  {/* Invoice Section - Only show for completed orders */}
                  {selectedOrder.status === 'completed' && (
                    <View style={styles.section}>
                      <Text style={styles.sectionTitle}>Invoice</Text>
                      {invoiceNumber ? (
                        <TouchableWeb
                          style={styles.invoiceItem}
                          onPress={handleViewInvoice}
                          activeOpacity={0.7}
                        >
                          <View style={styles.invoiceInfo}>
                            <View style={styles.invoiceDetails}>
                              <Text style={styles.invoiceNumber}>#{invoiceNumber}</Text>
                              <Text style={styles.invoiceAmount}>{InvoiceService.formatCurrency(selectedOrder.total)}</Text>
                            </View>
                          </View>
                          <MaterialCommunityIcons name="chevron-right" size={24} color={COLORS.textLight} />
                        </TouchableWeb>
                      ) : (
                        <View style={styles.noInvoice}>
                          <Text style={styles.noInvoiceText}>No invoice available</Text>
                        </View>
                      )}
                    </View>
                  )}

                  {/* Items Section - Only show for pending orders */}
                  {selectedOrder.status === 'pending' && (
                    <View style={styles.section}>
                      <Text style={styles.sectionTitle}>Order Items</Text>
                      {selectedOrder.items && selectedOrder.items.map((item, index) => (
                        <View key={index} style={styles.itemRow}>
                          <View style={styles.itemInfo}>
                            <Text style={styles.itemName}>{item.name}</Text>
                            <Text style={styles.itemDetails}>
                              Quantity: {item.quantity} × J${item.price.toFixed(2)}
                            </Text>
                          </View>
                          <Text style={styles.itemTotal}>J${(item.quantity * item.price).toFixed(2)}</Text>
                        </View>
                      ))}
                      <View style={styles.totalSection}>
                        <Text style={styles.totalLabel}>Total Amount</Text>
                        <Text style={styles.totalAmount}>J${selectedOrder.total.toFixed(2)}</Text>
                      </View>
                    </View>
                  )}

                  {/* Action Buttons - Only for pending orders */}
                  {selectedOrder.status === 'pending' && (
                    <View style={styles.actionButtons}>
                      <TouchableWeb
                        style={styles.cancelButton}
                        onPress={handleCancel}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.cancelButtonText}>Cancel Order</Text>
                      </TouchableWeb>
                      <TouchableWeb
                        style={styles.deliveredButton}
                        onPress={handleDelivered}
                        activeOpacity={0.7}
                      >
                        <View style={styles.deliveredGradient}>
                          <Text style={styles.deliveredButtonText}>Mark as Delivered</Text>
                        </View>
                      </TouchableWeb>
                    </View>
                  )}
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
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
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Poppins_700Bold',
    color: COLORS.white,
    flex: 1,
    textAlign: 'center',
  },
  headerRight: {
    width: 40,
  },
  tabContainer: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 20,
    marginTop: 16,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
  },
  activeTabGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 20,
    minHeight: 36,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  inactiveTabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 20,
    minHeight: 36,
    backgroundColor: COLORS.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  tabText: {
    fontSize: 11,
    fontFamily: 'Poppins_700Bold',
    color: COLORS.textMuted,
  },
  activeTabText: {
    fontSize: 11,
    fontFamily: 'Poppins_700Bold',
    color: COLORS.white,
  },
  content: {
    flex: 1,
    padding: SPACING.md,
  },
  orderCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  highlightedOrderCard: {
    borderWidth: 2,
    borderColor: COLORS.primary,
    backgroundColor: '#F0F9FF',
  },
  orderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  orderIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  orderInfo: {
    flex: 1,
  },
  orderNumber: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.text,
  },
  patientName: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.textLight,
    marginTop: 2,
  },
  orderDate: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.textLight,
    marginTop: 2,
  },
  orderRight: {
    alignItems: 'flex-end',
  },
  orderTotal: {
    fontSize: 18,
    fontFamily: 'Poppins_700Bold',
    color: '#10B981',
    marginBottom: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 10,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.white,
    textTransform: 'capitalize',
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  itemCount: {
    fontSize: 12,
    fontFamily: 'Poppins_500Medium',
    color: COLORS.textLight,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.text,
    marginTop: SPACING.md,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.textLight,
    marginTop: SPACING.xs,
    textAlign: 'center',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    width: '100%',
    maxWidth: 380,
    maxHeight: Platform.OS === 'android' ? '93%' : '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
    overflow: 'hidden',
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
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.text,
  },
  modalContent: {
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Poppins_700Bold',
    color: COLORS.text,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  detailContent: {
    marginLeft: 12,
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    fontFamily: 'Poppins_500Medium',
    color: COLORS.textLight,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
    color: COLORS.text,
  },
  statusBadgeInline: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  statusTextInline: {
    fontSize: 10,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.white,
    textTransform: 'capitalize',
  },
  invoiceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: COLORS.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  invoiceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  invoiceDetails: {
    marginLeft: 12,
    flex: 1,
  },
  invoiceNumber: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.text,
  },
  invoiceAmount: {
    fontSize: 12,
    fontFamily: 'Poppins_500Medium',
    color: '#10B981',
    marginTop: 2,
  },
  noInvoice: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: COLORS.background,
    borderRadius: 8,
  },
  noInvoiceText: {
    fontSize: 12,
    fontFamily: 'Poppins_500Medium',
    color: COLORS.textLight,
    marginTop: 8,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: COLORS.background,
    borderRadius: 8,
    marginBottom: 8,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.text,
    marginBottom: 4,
  },
  itemDetails: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.textLight,
  },
  itemTotal: {
    fontSize: 14,
    fontFamily: 'Poppins_700Bold',
    color: '#10B981',
  },
  totalSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: COLORS.background,
    borderRadius: 8,
    marginTop: 8,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  totalLabel: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.text,
  },
  totalAmount: {
    fontSize: 20,
    fontFamily: 'Poppins_700Bold',
    color: '#10B981',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 10,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 13,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.error,
  },
  deliveredButton: {
    flex: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  deliveredGradient: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deliveredButtonText: {
    fontSize: 13,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.white,
  },
});
