import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Alert,
  Share,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, SPACING, INVOICE_CONFIG } from '../constants';
import InvoiceService from '../services/InvoiceService';

const InvoiceComponent = ({ invoice, onClose, onPrint, onShare }) => {
  const [isGenerating, setIsGenerating] = useState(false);

  if (!invoice) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={onClose}>
            <MaterialCommunityIcons name="chevron-left" size={24} color={COLORS.primary} />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.invoiceTitle}>No Invoice Data</Text>
        </View>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text>No invoice data available</Text>
        </View>
      </View>
    );
  }
  
  try {
    const templateData = InvoiceService.getInvoiceTemplate(invoice);
  } catch (error) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={onClose}>
            <MaterialCommunityIcons name="chevron-left" size={24} color={COLORS.primary} />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.invoiceTitle}>Error</Text>
        </View>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text>Error loading invoice: {error.message}</Text>
        </View>
      </View>
    );
  }

  const handleShare = async () => {
    try {
      const shareContent = `
CARE NURSING SERVICES - INVOICE

Invoice #: ${invoice.invoiceNumber}
Date: ${invoice.date}
Due Date: ${invoice.dueDate}

Bill To:
${invoice.billTo.name}
${invoice.billTo.address}
${invoice.billTo.phone}

Services:
${invoice.items.map(item => 
  `${item.description} - Qty: ${item.quantity} - ${InvoiceService.formatPrice(item.total)}`
).join('\n')}

Total: ${InvoiceService.formatPrice(invoice.total)}

${INVOICE_CONFIG.template.terms.paymentText}

Contact: ${INVOICE_CONFIG.companyInfo.phone}
      `;

      await Share.share({
        message: shareContent,
        title: `Invoice ${invoice.invoiceNumber}`,
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to share invoice');
    }
  };

  // TEMPORARY: Simple test render with bright background
  return (
    <View style={[styles.container, { backgroundColor: 'red' }]}>
      
      <View style={{ 
        flex: 1, 
        backgroundColor: 'blue', 
        justifyContent: 'center', 
        alignItems: 'center',
        padding: 20
      }}>
        <Text style={{ 
          color: 'white', 
          fontSize: 24, 
          fontWeight: 'bold',
          marginBottom: 20
        }}>
          INVOICE TEST
        </Text>
        <Text style={{ 
          color: 'white', 
          fontSize: 18,
          marginBottom: 10
        }}>
          Invoice: {invoice.invoiceNumber}
        </Text>
        <Text style={{ 
          color: 'white', 
          fontSize: 16,
          marginBottom: 20
        }}>
          Client: {invoice.billTo.name}
        </Text>
        <TouchableOpacity 
          style={{ 
            backgroundColor: 'yellow',
            padding: 15,
            borderRadius: 8
          }}
          onPress={onClose}
        >
          <Text style={{ color: 'black', fontSize: 16, fontWeight: 'bold' }}>
            CLOSE TEST
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    zIndex: 9999,
    elevation: 9999,
    position: 'relative',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingBottom: 15,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backText: {
    fontSize: 16,
    color: COLORS.primary,
    marginLeft: 5,
  },
  headerTitle: {
    alignItems: 'center',
    flex: 1,
  },
  invoiceTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  clientName: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  editButton: {
    paddingHorizontal: 10,
  },
  editText: {
    fontSize: 16,
    color: COLORS.success,
    fontWeight: '500',
  },
  scrollContent: {
    flex: 1,
  },
  invoiceCard: {
    backgroundColor: COLORS.white,
    margin: 20,
    borderRadius: 12,
    padding: 20,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  companyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  companyName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginLeft: 8,
  },
  invoiceNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  companyDetails: {
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  companyFullName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 5,
  },
  companyAddress: {
    fontSize: 14,
    color: COLORS.textLight,
    marginBottom: 2,
  },
  companyContact: {
    fontSize: 14,
    color: COLORS.textLight,
    marginBottom: 2,
  },
  companyEmail: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  billToSection: {
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  billToLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textMuted,
    marginBottom: 8,
  },
  clientNameLarge: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  clientAddress: {
    fontSize: 14,
    color: COLORS.textLight,
    marginBottom: 2,
  },
  clientContact: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  invoiceDetails: {
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '500',
  },
  servicesSection: {
    marginBottom: 10,
  },
  servicesSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 15,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 6,
    marginBottom: 10,
  },
  tableHeaderText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  tableCell: {
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  serviceDescription: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
    marginBottom: 2,
  },
  serviceDuration: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  tableCellText: {
    fontSize: 14,
    color: COLORS.text,
    textAlign: 'center',
    fontWeight: '500',
  },
  totalSection: {
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  totalLabel: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  totalValue: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '500',
  },
  finalTotalRow: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    marginTop: 8,
  },
  finalTotalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  finalTotalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  amountSummary: {
    backgroundColor: COLORS.white,
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  totalAmountLabel: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginBottom: 5,
  },
  totalAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 15,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  statusBadge: {
    backgroundColor: '#ffeaa7',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#e17055',
  },
  dueDateText: {
    fontSize: 14,
    color: COLORS.textMuted,
  },
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 30 : 20,
    gap: 15,
  },
  sendButton: {
    flex: 1,
    backgroundColor: COLORS.success,
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  sendButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
  },
  paymentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 8,
  },
  paymentButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.success,
  },
});

export default InvoiceComponent;