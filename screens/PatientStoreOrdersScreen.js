import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Modal,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import TouchableWeb from '../components/TouchableWeb';
import { COLORS, GRADIENTS, SPACING } from '../constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';

const ORDERS_STORAGE_KEY = '@care_store_orders';

export default function PatientStoreOrdersScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const highlightOrderId = route?.params?.highlightOrder;
  const [activeTab, setActiveTab] = useState('pending');
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [invoiceNumber, setInvoiceNumber] = useState(null);

  useEffect(() => {
    loadOrders();
  }, []);

  useEffect(() => {
    // Reload orders when tab changes or modal closes
    const unsubscribe = navigation.addListener('focus', () => {
      loadOrders();
    });
    return unsubscribe;
  }, [navigation]);

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
        const allOrders = JSON.parse(stored);
        // Filter orders for current patient
        const patientOrders = allOrders.filter(order => order.patientId === (user?.id || 'PATIENT001'));
        setOrders(patientOrders);
      }
    } catch (error) {
      console.error('Error loading orders:', error);
    }
  };

  const loadInvoiceForOrder = async (orderId) => {
    try {
      const invoicesJson = await AsyncStorage.getItem('@care_invoices');
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
          <Text style={styles.orderDate}>{new Date(order.date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
          })}</Text>
        </View>
        <View style={styles.orderRight}>
          <Text style={styles.orderTotal}>J${order.total.toFixed(2)}</Text>
          <View style={[styles.statusBadge, { 
            backgroundColor: order.status === 'pending' ? '#FFA500' : 
                           order.status === 'completed' ? '#10B981' : '#EF4444' 
          }]}>
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
      {/* Header */}
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
          <Text style={styles.headerTitle}>My Orders</Text>
          <View style={styles.headerRight} />
        </View>
      </LinearGradient>

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
              end={{ x: 1, y: 1 }}
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
              end={{ x: 1, y: 1 }}
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
              end={{ x: 1, y: 1 }}
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
            <Text style={styles.emptyText}>
              {activeTab === 'pending' ? 'Your pending orders will appear here' : 
               activeTab === 'completed' ? 'Your completed orders will appear here' :
               'Cancelled orders will appear here'}
            </Text>
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
                    {selectedOrder.completedDate && (
                      <View style={styles.detailRow}>
                        <MaterialCommunityIcons name="check-circle" size={20} color={COLORS.success} />
                        <View style={styles.detailContent}>
                          <Text style={styles.detailLabel}>Delivered On</Text>
                          <Text style={styles.detailValue}>
                            {new Date(selectedOrder.completedDate).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </Text>
                        </View>
                      </View>
                    )}
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
                            <MaterialCommunityIcons name="file-document" size={24} color={COLORS.primary} />
                            <View style={styles.invoiceDetails}>
                              <Text style={styles.invoiceNumber}>#{invoiceNumber}</Text>
                              <Text style={styles.invoiceAmount}>J${selectedOrder.total.toFixed(2)}</Text>
                            </View>
                          </View>
                          <MaterialCommunityIcons name="chevron-right" size={24} color={COLORS.textLight} />
                        </TouchableWeb>
                      ) : (
                        <View style={styles.noInvoice}>
                          <MaterialCommunityIcons name="file-document-outline" size={32} color={COLORS.border} />
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
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
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
    paddingHorizontal: 40,
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
    maxHeight: '85%',
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
    fontFamily: 'Poppins_600SemiBold',
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
});
