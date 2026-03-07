import React, { useRef, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
  TouchableOpacity,
  Text,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../constants';
import FygaroPaymentService from '../services/FygaroPaymentService';

/**
 * PaymentWebviewScreen
 * Displays Fygaro payment page in a WebView for mobile.
 *
 * Intercepts:
 *  - https://876nurses.app/payment-success (our configured return URL)
 *  - nurses876://payment-success (custom scheme fallback)
 *  - Fygaro's own payment-success page patterns
 *
 * Fallback: "I've Paid" button appears after the WebView has navigated away
 * from the initial Fygaro checkout URL, letting the user manually confirm payment.
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
  const handledRedirectRef = useRef(false);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [currentUrl, setCurrentUrl] = useState(paymentUrl || '');
  // Show "I've Paid" button once user has navigated away from the initial checkout page
  const [showConfirmButton, setShowConfirmButton] = useState(false);

  const fireSuccessCallback = useCallback(async (urlForParams) => {
    if (handledRedirectRef.current) return;
    handledRedirectRef.current = true;
    setVerifying(true);

    try {
      let fygaroReference = null;
      let fygaroCustomRef = null;
      try {
        const queryStart = (urlForParams || '').indexOf('?');
        if (queryStart !== -1) {
          const params = new URLSearchParams(urlForParams.substring(queryStart + 1));
          fygaroReference = params.get('reference') || null;
          fygaroCustomRef = params.get('customReference') || params.get('custom_reference') || null;
        }
      } catch (_) {}

      const resolvedTransactionId = fygaroReference || transactionId;
      const resolvedCustomRef = fygaroCustomRef || transactionId;

      const verificationResult = {
        success: true,
        transactionId: resolvedTransactionId,
        customReference: resolvedCustomRef,
        status: 'completed',
      };

      // Fire caller's callback first so medical report request (etc.) is created
      const callback = onPaymentSuccess || onSuccess;
      if (typeof callback === 'function') {
        try {
          await Promise.resolve(callback(verificationResult));
        } catch (callbackError) {
          console.warn('Payment callback error:', callbackError?.message || callbackError);
        }
      }

      // Best-effort server-side invoice stamp
      FygaroPaymentService.syncCompletedPayment({
        transactionId: resolvedTransactionId,
        customReference: resolvedCustomRef,
        invoiceId,
        invoiceFirestoreId,
        appointmentId,
      }).catch((err) => console.warn('Sync failed (non-fatal):', err?.message));

      navigation.goBack();
      setTimeout(() => {
        Alert.alert('Payment Successful', 'Your payment has been processed successfully!', [{ text: 'OK' }]);
      }, 300);
    } catch (error) {
      console.error('Payment handling error:', error);
      Alert.alert(
        'Payment Error',
        'Payment was received but we could not update your records. Please contact support.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } finally {
      setVerifying(false);
    }
  }, [transactionId, invoiceId, invoiceFirestoreId, appointmentId, onSuccess, onPaymentSuccess, navigation]);

  const handleUrlChange = useCallback((url) => {
    if (!url || handledRedirectRef.current) return;
    setCurrentUrl(url);

    // Detect our return URL
    if (url.includes('payment-success') || url.includes('876nurses.app')) {
      void fireSuccessCallback(url);
      return;
    }

    // Detect Fygaro's own success/confirmation page
    if (
      url.includes('fygaro.com') &&
      (url.includes('/success') || url.includes('/confirmed') || url.includes('/thank') || url.includes('/complete'))
    ) {
      void fireSuccessCallback(url);
      return;
    }

    // Detect cancel
    if (url.includes('payment-cancel')) {
      handledRedirectRef.current = true;
      if (onCancel) onCancel();
      navigation.goBack();
      setTimeout(() => Alert.alert('Payment Cancelled', 'Your payment has been cancelled.', [{ text: 'OK' }]), 300);
      return;
    }

    // If the user has navigated at least once away from the initial pay page,
    // show the "I've Paid" button as a fallback.
    if (paymentUrl && url !== paymentUrl) {
      setShowConfirmButton(true);
    }
  }, [fireSuccessCallback, onCancel, navigation, paymentUrl]);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={() => {
          if (handledRedirectRef.current) return;
          Alert.alert('Cancel Payment', 'Are you sure you want to cancel this payment?', [
            { text: 'Stay', style: 'cancel' },
            {
              text: 'Cancel Payment',
              style: 'destructive',
              onPress: () => {
                handledRedirectRef.current = true;
                if (onCancel) onCancel();
                navigation.goBack();
              },
            },
          ]);
        }}>
          <Text style={styles.headerButtonTextCancel}>Cancel</Text>
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Secure Payment</Text>

        {/* "I've Paid" fallback button — appears after navigation begins */}
        {showConfirmButton && !verifying ? (
          <TouchableOpacity style={styles.headerButton} onPress={() => {
            Alert.alert(
              'Confirm Payment',
              'Did you complete your payment on the Fygaro page?',
              [
                { text: 'Not Yet', style: 'cancel' },
                { text: "Yes, I've Paid", onPress: () => void fireSuccessCallback(currentUrl) },
              ]
            );
          }}>
            <Text style={styles.headerButtonTextDone}>Done</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.headerButton} />
        )}
      </View>

      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      )}

      {verifying && (
        <View style={styles.verifyingOverlay}>
          <ActivityIndicator size="large" color={COLORS.white} />
          <Text style={styles.verifyingText}>Processing payment...</Text>
        </View>
      )}

      <WebView
        ref={webViewRef}
        source={{ uri: paymentUrl }}
        onLoadStart={() => setLoading(true)}
        onLoadEnd={(e) => {
          setLoading(false);
          const url = e?.nativeEvent?.url;
          if (url) handleUrlChange(url);
        }}
        onShouldStartLoadWithRequest={(request) => {
          const url = request?.url;
          if (!url) return true;
          // Intercept our return URL and custom schemes
          if (url.includes('payment-') || url.includes('876nurses.app')) {
            void handleUrlChange(url);
            return false;
          }
          return true;
        }}
        onNavigationStateChange={(navState) => {
          if (navState?.url) handleUrlChange(navState.url);
        }}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 48,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: COLORS.white,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text || '#1f2a44',
  },
  headerButton: {
    minWidth: 60,
    alignItems: 'center',
    padding: 6,
  },
  headerButtonTextCancel: {
    fontSize: 15,
    color: '#6b7280',
  },
  headerButtonTextDone: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.primary || '#2f62d7',
  },
  webview: {
    flex: 1,
  },
  loadingContainer: {
    position: 'absolute',
    top: 48,
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
    gap: 12,
  },
  verifyingText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '500',
  },
});
