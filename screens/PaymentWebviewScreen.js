import React, { useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../constants';
import FygaroPaymentService from '../services/FygaroPaymentService';

/**
 * PaymentWebviewScreen
 * Displays Fygaro payment page in a WebView for mobile
 */
export default function PaymentWebviewScreen({ navigation, route }) {
  const {
    paymentUrl,
    sessionId,
    transactionId,
    appointmentId,
    invoiceId,
    invoiceFirestoreId,
    onSuccess,
    onPaymentSuccess,
    onCancel,
  } = route.params || {};

  const webViewRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);

  const handleNavigationStateChange = async (navState) => {
    const { url } = navState;

    // Check if payment was successful (redirect to success URL)
    if (url.includes('payment-success') || url.includes('success')) {
      setVerifying(true);
      
      try {
        // Verify payment with Fygaro
        const verificationResult = await FygaroPaymentService.verifyPayment(transactionId);

        if (verificationResult.success) {
          // Stamp invoice paid server-side (no client Firestore write)
          await FygaroPaymentService.syncCompletedPayment({
            transactionId: verificationResult.transactionId || transactionId,
            invoiceId,
            invoiceFirestoreId,
            appointmentId,
          });

          // Payment successful
          const callback = onPaymentSuccess || onSuccess;
          if (callback) callback(verificationResult);
          
          navigation.goBack();
          
          setTimeout(() => {
            Alert.alert(
              'Payment Successful',
              'Your payment has been processed successfully!',
              [{ text: 'OK' }]
            );
          }, 300);
        } else {
          throw new Error(verificationResult.error || 'Payment verification failed');
        }
      } catch (error) {
        console.error('Payment verification error:', error);
        Alert.alert(
          'Verification Error',
          'Failed to verify payment. Please contact support.',
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack()
            }
          ]
        );
      } finally {
        setVerifying(false);
      }
    }

    // Check if payment was cancelled
    if (url.includes('payment-cancel') || url.includes('cancel')) {
      if (onCancel) {
        onCancel();
      }
      
      navigation.goBack();
      
      setTimeout(() => {
        Alert.alert(
          'Payment Cancelled',
          'Your payment has been cancelled.',
          [{ text: 'OK' }]
        );
      }, 300);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      )}
      
      {verifying && (
        <View style={styles.verifyingOverlay}>
          <ActivityIndicator size="large" color={COLORS.white} />
        </View>
      )}

      <WebView
        ref={webViewRef}
        source={{ uri: paymentUrl }}
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => setLoading(false)}
        onNavigationStateChange={handleNavigationStateChange}
        style={styles.webview}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        scalesPageToFit={true}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  webview: {
    flex: 1,
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    zIndex: 1,
  },
  verifyingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    zIndex: 2,
  },
});
