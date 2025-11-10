import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  StatusBar,
  Alert,
  ActivityIndicator
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import { COLORS, GRADIENTS, SPACING } from '../constants';
import InvoiceService from '../services/InvoiceService';

const InvoiceDisplayScreen = ({ route, navigation }) => {
  const { invoiceData, clientName } = route.params || {};
  const insets = useSafeAreaInsets();
  const [isSharing, setIsSharing] = useState(false);
  
  console.log('🖥️ INVOICE DISPLAY SCREEN LOADED');
  console.log('🖥️ Invoice data received:', invoiceData ? 'YES' : 'NO');
  console.log('🖥️ Client name:', clientName);

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

  if (!invoiceData) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>No invoice data available</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
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
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
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
                  <Text style={styles.pdfCompanyName}>CARE Medical Services</Text>
                  <Text style={styles.pdfCompanyDetails}>456 Oak Ave, Town, State 67890</Text>
                  <Text style={styles.pdfCompanyDetails}>Phone: +1 (555) 987-6543</Text>
                  <Text style={styles.pdfCompanyDetails}>Email: billing@care.com</Text>
                  <Text style={styles.pdfCompanyDetails}>Web: www.care.com</Text>
                </View>
                <View style={styles.pdfInvoiceInfo}>
                  <Text style={styles.pdfInvoiceTitle}>INVOICE</Text>
                  <Text style={styles.pdfInvoiceNumber}>{invoiceData.invoiceId}</Text>
                  <Text style={styles.pdfInvoiceDate}>Issue Date: {invoiceData.issueDate}</Text>
                  <Text style={styles.pdfInvoiceDate}>Due Date: {invoiceData.dueDate}</Text>
                </View>
              </View>
              <View style={styles.pdfBlueLine} />
            </View>

            {/* Bill To and Service Provider */}
            <View style={styles.pdfClientSection}>
              <View style={styles.pdfClientRow}>
                <View style={styles.pdfBillTo}>
                  <Text style={styles.pdfSectionTitle}>BILL TO:</Text>
                  <Text style={styles.pdfClientName}>{invoiceData.clientName}</Text>
                  <Text style={styles.pdfClientInfo}>{invoiceData.clientEmail}</Text>
                  <Text style={styles.pdfClientInfo}>{invoiceData.clientPhone}</Text>
                  <Text style={styles.pdfClientInfo}>{invoiceData.clientAddress}</Text>
                </View>
                <View style={styles.pdfServiceProvider}>
                  <Text style={styles.pdfSectionTitle}>SERVICE PROVIDED BY:</Text>
                  <Text style={styles.pdfProviderName}>{invoiceData.nurseName}</Text>
                  <Text style={styles.pdfProviderInfo}>Licensed Healthcare Professional</Text>
                  <Text style={styles.pdfProviderInfo}>Date: {invoiceData.date}</Text>
                </View>
              </View>
            </View>

            {/* Service Details Table */}
            <View style={styles.pdfServiceSection}>
              <Text style={styles.pdfTableTitle}>Service Details</Text>
              <View style={styles.pdfTable}>
                <View style={styles.pdfTableHeader}>
                  <Text style={styles.pdfTableHeaderText}>Description</Text>
                  <Text style={styles.pdfTableHeaderText}>Hours</Text>
                  <Text style={styles.pdfTableHeaderText}>Rate</Text>
                  <Text style={styles.pdfTableHeaderText}>Amount</Text>
                </View>
                <View style={styles.pdfTableRow}>
                  <Text style={styles.pdfTableCell}>{invoiceData.service}</Text>
                  <Text style={styles.pdfTableCell}>{invoiceData.hours}</Text>
                  <Text style={styles.pdfTableCell}>${invoiceData.rate}</Text>
                  <Text style={styles.pdfTableCell}>${invoiceData.total}</Text>
                </View>
              </View>

              {/* Totals Section */}
              <View style={styles.pdfTotalsSection}>
                <View style={styles.pdfTotalRow}>
                  <Text style={styles.pdfTotalLabel}>Subtotal:</Text>
                  <Text style={styles.pdfTotalValue}>${invoiceData.subtotal || invoiceData.total}</Text>
                </View>
                <View style={styles.pdfTotalRow}>
                  <Text style={styles.pdfTotalLabel}>Tax (15%):</Text>
                  <Text style={styles.pdfTotalValue}>${invoiceData.tax || '0.00'}</Text>
                </View>
                <View style={styles.pdfBlueLine} />
                <View style={styles.pdfFinalTotalRow}>
                  <Text style={styles.pdfFinalTotalLabel}>Total Amount:</Text>
                  <Text style={styles.pdfFinalTotalAmount}>${invoiceData.finalTotal || invoiceData.total}</Text>
                </View>
              </View>
            </View>

            {/* Payment Information */}
            <View style={styles.pdfPaymentSection}>
              <Text style={styles.pdfPaymentTitle}>Payment Information</Text>
              <Text style={styles.pdfPaymentInfo}>NCB Account #123456789</Text>
              <Text style={styles.pdfPaymentInfo}>E-Transfer: billing@care.com</Text>
              <Text style={styles.pdfPaymentInfo}>Cash accepted for home visits</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};
    } catch (error) {
      console.error('❌ Error generating professional invoice:', error);
      Alert.alert('Error', 'Failed to generate professional invoice');
    } finally {
      setIsGenerating(false);
    }
  };

  // Capture invoice as image
  const captureInvoice = async () => {
    try {
      const uri = await captureRef(viewRef, {
        format: 'png',
        quality: 1.0,
        result: 'tmpfile',
      });
      setCapturedImageUri(uri);
      return uri;
    } catch (error) {
      console.error('Error capturing invoice:', error);
      Alert.alert('Error', 'Failed to capture invoice image');
      return null;
    }
  };

  // Share invoice (prefer generated PDF, fallback to captured image)
  const shareInvoice = async () => {
    const invoiceUri = generatedInvoiceUri || capturedImageUri || await captureInvoice();
    if (invoiceUri) {
      try {
        // Use the generator's share function
        await InvoiceImageGenerator.shareInvoice(invoiceUri, clientName);
      } catch (error) {
        console.error('Error sharing invoice:', error);
        Alert.alert('Error', 'Failed to share invoice');
      }
    }
  };

  // Download invoice
  const downloadInvoice = async () => {
    const invoiceUri = generatedInvoiceUri || capturedImageUri || await captureInvoice();
    if (invoiceUri) {
      try {
        // Determine file extension based on URI
        let extension = 'png';
        if (invoiceUri.includes('.pdf')) {
          extension = 'pdf';
        } else if (invoiceUri.includes('.svg')) {
          extension = 'svg';
        }
        
        const fileName = `CARE_Invoice_${invoiceData.invoiceNumber}_${clientName?.replace(/\s+/g, '_')}.${extension}`;
        const downloadPath = `${FileSystem.documentDirectory}${fileName}`;
        
        await FileSystem.copyAsync({
          from: invoiceUri,
          to: downloadPath,
        });
        
        Alert.alert('Success', `Invoice saved as ${fileName}\n\nFile Type: ${extension.toUpperCase()}`);
      } catch (error) {
        console.error('Error downloading invoice:', error);
        Alert.alert('Error', 'Failed to download invoice');
      }
    }
  };

  // Regenerate invoice
  const regenerateInvoice = async () => {
    setGeneratedInvoiceUri(null);
    await generateProfessionalInvoice();
  };

  if (!invoiceData) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
        <LinearGradient 
          colors={GRADIENTS.header} 
          style={[styles.header, { paddingTop: insets.top + 10 }]}
        >
          <View style={styles.headerContent}>
            <TouchableOpacity 
              style={styles.backButton} 
              onPress={() => navigation.goBack()}
            >
              <MaterialCommunityIcons name="arrow-left" size={24} color="white" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Invoice</Text>
            <View style={styles.placeholder} />
          </View>
        </LinearGradient>
        
        <View style={styles.errorContainer}>
          <MaterialCommunityIcons name="file-document-alert" size={64} color={COLORS.error} />
          <Text style={styles.errorText}>No invoice data available</Text>
          <TouchableOpacity 
            style={styles.backToAdminButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backToAdminText}>Back to Admin</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      {/* Header */}
      <LinearGradient 
        colors={GRADIENTS.header} 
        style={[styles.header, { paddingTop: insets.top + 10 }]}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => navigation.goBack()}
          >
            <MaterialCommunityIcons name="arrow-left" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Invoice</Text>
          <TouchableOpacity style={styles.editButton}>
            <MaterialCommunityIcons name="pencil" size={20} color="white" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Professional Invoice Generation Status */}
        {isGenerating && (
          <View style={styles.generatingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.generatingText}>Generating Professional Invoice...</Text>
          </View>
        )}

        {/* Generated Professional Invoice Display */}
        {generatedInvoiceUri && !isGenerating && (
          <View style={styles.professionalInvoiceContainer}>
            <View style={styles.invoiceStatusHeader}>
              <MaterialCommunityIcons name="check-circle" size={24} color={COLORS.success} />
              <Text style={styles.invoiceStatusText}>Professional Invoice Generated</Text>
              <TouchableOpacity onPress={regenerateInvoice} style={styles.refreshButton}>
                <MaterialCommunityIcons name="refresh" size={20} color={COLORS.primary} />
              </TouchableOpacity>
            </View>
            <Text style={styles.invoicePathText}>Saved to: {generatedInvoiceUri}</Text>
          </View>
        )}

        {/* Template Preview (for reference) */}
        <View style={styles.invoiceContainer}>
          <Text style={styles.previewLabel}>Invoice Preview</Text>
          <View style={styles.invoiceImageContainer} ref={viewRef}>
            <ImageBackground
              source={require('../assets/Images/CAREinvoice.png')}
              style={styles.invoiceBackground}
              resizeMode="contain"
            >
              {/* Data positioned to match template exactly */}
              <View style={styles.dataOverlay}>
                <View style={styles.invoiceNumberOverlay}>
                  <Text style={styles.overlayInvoiceNumber}>#{invoiceData.invoiceNumber}</Text>
                </View>
                <View style={styles.dateOverlay}>
                  <Text style={styles.overlayDate}>{invoiceData.date}</Text>
                </View>
                <View style={styles.clientNameOverlay}>
                  <Text style={styles.overlayClientName}>{invoiceData.billTo?.name}</Text>
                </View>
                <View style={styles.clientAddressOverlay}>
                  <Text style={styles.overlayClientAddress}>{invoiceData.billTo?.address}</Text>
                </View>
                <View style={styles.serviceOverlay}>
                  <Text style={styles.overlayService}>{invoiceData.items?.[0]?.description}</Text>
                </View>
                <View style={styles.amountOverlay}>
                  <Text style={styles.overlayAmount}>J${invoiceData.total?.toLocaleString()}</Text>
                </View>
              </View>
            </ImageBackground>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={[styles.shareButton, isGenerating && styles.disabledButton]} 
            onPress={shareInvoice}
            disabled={isGenerating}
          >
            <MaterialCommunityIcons name="share-variant" size={20} color="white" />
            <Text style={styles.shareButtonText}>Share {generatedInvoiceUri ? 'PDF' : 'Preview'}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.downloadButton, isGenerating && styles.disabledButton]} 
            onPress={downloadInvoice}
            disabled={isGenerating}
          >
            <MaterialCommunityIcons name="download" size={20} color={COLORS.primary} />
            <Text style={styles.downloadButtonText}>Download</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.generateButton, isGenerating && styles.disabledButton]} 
            onPress={generateProfessionalInvoice}
            disabled={isGenerating}
          >
            <MaterialCommunityIcons name="file-document" size={20} color={COLORS.accent} />
            <Text style={styles.generateButtonText}>
              {isGenerating ? 'Generating...' : generatedInvoiceUri ? 'Regenerate' : 'Generate PDF'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.bottomPadding} />
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
    marginBottom: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  pdfHeader: {
    marginBottom: 20,
  },
  pdfHeaderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  pdfCompanyInfo: {
    flex: 1,
  },
  pdfCompanyName: {
    fontSize: 24,
    fontFamily: 'Poppins_700Bold',
    color: COLORS.text,
    marginBottom: 8,
  },
  pdfCompanyDetails: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.textLight,
    lineHeight: 18,
  },
  pdfInvoiceInfo: {
    alignItems: 'flex-end',
  },
  pdfInvoiceTitle: {
    fontSize: 32,
    fontFamily: 'Poppins_700Bold',
    color: COLORS.primary,
    marginBottom: 8,
  },
  pdfInvoiceNumber: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.text,
    marginBottom: 4,
  },
  pdfInvoiceDate: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.textLight,
    lineHeight: 18,
  },
  pdfBlueLine: {
    height: 4,
    backgroundColor: COLORS.primary,
    marginVertical: 15,
  },
  pdfClientSection: {
    marginBottom: 25,
  },
  pdfClientRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  pdfBillTo: {
    flex: 1,
    marginRight: 20,
  },
  pdfServiceProvider: {
    flex: 1,
  },
  pdfSectionTitle: {
    fontSize: 12,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.textLight,
    marginBottom: 8,
  },
  pdfClientName: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.text,
    marginBottom: 4,
  },
  pdfClientInfo: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.textLight,
    lineHeight: 18,
  },
  pdfProviderName: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.text,
    marginBottom: 4,
  },
  pdfProviderInfo: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.textLight,
    lineHeight: 18,
  },
  pdfServiceSection: {
    marginBottom: 25,
  },
  pdfTableTitle: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.text,
    marginBottom: 12,
  },
  pdfTable: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 20,
  },
  pdfTableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f8f9fa',
    paddingVertical: 12,
    paddingHorizontal: 15,
  },
  pdfTableHeaderText: {
    flex: 1,
    fontSize: 12,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.text,
  },
  pdfTableRow: {
    flexDirection: 'row',
    paddingVertical: 15,
    paddingHorizontal: 15,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  pdfTableCell: {
    flex: 1,
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.text,
  },
  pdfTotalsSection: {
    alignItems: 'flex-end',
  },
  pdfTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: 200,
    paddingVertical: 6,
  },
  pdfTotalLabel: {
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
    color: COLORS.text,
  },
  pdfTotalValue: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.text,
  },
  pdfFinalTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: 200,
    paddingVertical: 10,
    marginTop: 10,
  },
  pdfFinalTotalLabel: {
    fontSize: 16,
    fontFamily: 'Poppins_700Bold',
    color: COLORS.text,
  },
  pdfFinalTotalAmount: {
    fontSize: 20,
    fontFamily: 'Poppins_700Bold',
    color: COLORS.primary,
  },
  pdfPaymentSection: {
    marginTop: 25,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  pdfPaymentTitle: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.text,
    marginBottom: 10,
  },
  pdfPaymentInfo: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.textLight,
    lineHeight: 18,
  },
});

export default InvoiceDisplayScreen;
    backgroundColor: COLORS.success + '20',
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.success,
  },
  invoiceStatusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  invoiceStatusText: {
    ...TYPOGRAPHY.body,
    fontWeight: '600',
    color: COLORS.success,
    marginLeft: SPACING.xs,
    flex: 1,
  },
  refreshButton: {
    padding: SPACING.xs,
  },
  invoicePathText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textLight,
    fontFamily: 'monospace',
  },
  previewLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textLight,
    marginBottom: SPACING.xs,
    textAlign: 'center',
  },
  disabledButton: {
    opacity: 0.5,
  },
  // New template-based styles
  invoiceContainer: {
    width: '100%',
    aspectRatio: 0.77, // Standard invoice aspect ratio
    marginBottom: SPACING.lg,
  },
  invoiceImageContainer: {
    width: '100%',
    height: '100%',
    backgroundColor: COLORS.white,
  },
  invoiceBackground: {
    width: '100%',
    height: '100%',
    justifyContent: 'flex-start',
  },
  dataOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    padding: 20,
  },
  // Position overlays to match template
  invoiceNumberOverlay: {
    position: 'absolute',
    top: '15%',
    right: '8%',
  },
  overlayInvoiceNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  dateOverlay: {
    position: 'absolute',
    top: '20%',
    right: '8%',
  },
  overlayDate: {
    fontSize: 14,
    color: COLORS.text,
  },
  clientNameOverlay: {
    position: 'absolute',
    top: '35%',
    left: '8%',
  },
  overlayClientName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  clientAddressOverlay: {
    position: 'absolute',
    top: '40%',
    left: '8%',
  },
  overlayClientAddress: {
    fontSize: 14,
    color: COLORS.text,
  },
  serviceOverlay: {
    position: 'absolute',
    top: '60%',
    left: '8%',
    right: '40%',
  },
  overlayService: {
    fontSize: 14,
    color: COLORS.text,
  },
  amountOverlay: {
    position: 'absolute',
    top: '60%',
    right: '8%',
  },
  overlayAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  companyHeader: {
    alignItems: 'center',
    paddingVertical: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    marginBottom: SPACING.lg,
  },
  companyName: {
    ...TYPOGRAPHY.h1,
    color: COLORS.primary,
    fontWeight: 'bold',
    marginBottom: SPACING.xs,
  },
  companySubtitle: {
    ...TYPOGRAPHY.body,
    color: COLORS.textLight,
    marginBottom: SPACING.sm,
  },
  companyDetails: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    marginBottom: 2,
  },
  invoiceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.lg,
    backgroundColor: COLORS.card,
    padding: SPACING.md,
    borderRadius: 12,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  invoiceInfo: {
    flex: 1,
  },
  invoiceNumber: {
    ...TYPOGRAPHY.h2,
    color: COLORS.primary,
    fontWeight: 'bold',
    marginBottom: SPACING.xs,
  },
  invoiceDate: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textLight,
    marginBottom: 2,
  },
  dueDate: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textLight,
  },
  statusContainer: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: 16,
  },
  statusText: {
    ...TYPOGRAPHY.small,
    color: 'white',
    fontWeight: 'bold',
  },
  billToSection: {
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  billToCard: {
    backgroundColor: COLORS.card,
    padding: SPACING.md,
    borderRadius: 12,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  clientName: {
    ...TYPOGRAPHY.body,
    color: COLORS.text,
    fontWeight: 'bold',
    marginBottom: SPACING.xs,
  },
  clientDetails: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textLight,
    marginBottom: 2,
  },
  servicesSection: {
    marginBottom: SPACING.lg,
  },
  serviceItem: {
    backgroundColor: COLORS.card,
    padding: SPACING.md,
    borderRadius: 12,
    marginBottom: SPACING.sm,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  serviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  serviceName: {
    ...TYPOGRAPHY.body,
    color: COLORS.text,
    fontWeight: '600',
    flex: 1,
  },
  servicePrice: {
    ...TYPOGRAPHY.body,
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  serviceDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  serviceQuantity: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textLight,
  },
  serviceTotal: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textLight,
    fontWeight: '600',
  },
  totalsSection: {
    backgroundColor: COLORS.card,
    padding: SPACING.md,
    borderRadius: 12,
    marginBottom: SPACING.lg,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  totalLabel: {
    ...TYPOGRAPHY.body,
    color: COLORS.textLight,
  },
  totalValue: {
    ...TYPOGRAPHY.body,
    color: COLORS.text,
    fontWeight: '600',
  },
  grandTotalRow: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: SPACING.xs,
    marginTop: SPACING.xs,
    marginBottom: 0,
  },
  grandTotalLabel: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text,
    fontWeight: 'bold',
  },
  grandTotalValue: {
    ...TYPOGRAPHY.h3,
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  termsSection: {
    backgroundColor: COLORS.infoLight,
    padding: SPACING.md,
    borderRadius: 12,
    marginBottom: SPACING.lg,
  },
  termsText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textLight,
    lineHeight: 18,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  shareButton: {
    flex: 1,
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    borderRadius: 12,
    gap: SPACING.xs,
  },
  shareButtonText: {
    ...TYPOGRAPHY.body,
    color: 'white',
    fontWeight: '600',
  },
  downloadButton: {
    flex: 1,
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    borderRadius: 12,
    gap: SPACING.xs,
  },
  downloadButtonText: {
    ...TYPOGRAPHY.body,
    color: COLORS.primary,
    fontWeight: '600',
  },
  captureButton: {
    flex: 1,
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: COLORS.accent,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    borderRadius: 12,
    gap: SPACING.xs,
  },
  captureButtonText: {
    ...TYPOGRAPHY.body,
    color: COLORS.accent,
    fontWeight: '600',
  },
  generateButton: {
    flex: 1,
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: COLORS.accent,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    borderRadius: 12,
    gap: SPACING.xs,
  },
  generateButtonText: {
    ...TYPOGRAPHY.body,
    color: COLORS.accent,
    fontWeight: '600',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  errorText: {
    ...TYPOGRAPHY.body,
    color: COLORS.textLight,
    textAlign: 'center',
    marginTop: SPACING.md,
    marginBottom: SPACING.lg,
  },
  backToAdminButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: 12,
  },
  backToAdminText: {
    ...TYPOGRAPHY.body,
    color: 'white',
    fontWeight: '600',
  },
  bottomPadding: {
    height: SPACING.xxl,
  },
});

export default InvoiceDisplayScreen;