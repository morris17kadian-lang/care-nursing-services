import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import InvoiceService from '../services/InvoiceService';
import { COLORS, GRADIENTS } from '../constants';

export default function UpdateInvoicesScreen({ navigation }) {
  const [updating, setUpdating] = useState(false);
  const [result, setResult] = useState(null);

  const handleUpdatePricing = async () => {
    Alert.alert(
      'Update Invoice Pricing',
      'This will recalculate all existing invoices using the current service prices. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Update',
          onPress: async () => {
            setUpdating(true);
            setResult(null);
            
            try {
              const updateResult = await InvoiceService.updateInvoicePricing();
              setResult(updateResult);
              
              if (updateResult.success) {
                Alert.alert(
                  'Success!',
                  updateResult.message,
                  [{ text: 'OK' }]
                );
              } else {
                Alert.alert(
                  'Error',
                  updateResult.error || 'Failed to update invoices',
                  [{ text: 'OK' }]
                );
              }
            } catch (error) {
              Alert.alert('Error', error.message);
            } finally {
              setUpdating(false);
            }
          }
        }
      ]
    );
  };

  const handleViewInvoices = async () => {
    try {
      const invoices = await InvoiceService.getAllInvoices();
      const stats = await InvoiceService.getInvoiceStats();
      
      Alert.alert(
        'Invoice Summary',
        `Total Invoices: ${stats.total}\n` +
        `Pending: ${stats.pending}\n` +
        `Paid: ${stats.paid}\n` +
        `Total Amount: J$${stats.totalAmount.toLocaleString()}\n` +
        `Pending Amount: J$${stats.pendingAmount.toLocaleString()}`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient
        colors={GRADIENTS.header}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <MaterialCommunityIcons name="arrow-left" size={24} color={COLORS.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Update Invoices</Text>
          <View style={styles.backButton} />
        </View>
      </LinearGradient>

      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <MaterialCommunityIcons
            name="information-outline"
            size={48}
            color={COLORS.primary}
            style={styles.icon}
          />
          
          <Text style={styles.title}>Invoice Price Update</Text>
          <Text style={styles.description}>
            This tool will update all existing invoices to use the current service pricing
            from the CARE price list. All amounts will be recalculated in Jamaican dollars.
          </Text>

          {result && (
            <View style={[
              styles.resultBox,
              { backgroundColor: result.success ? COLORS.successLight : COLORS.errorLight }
            ]}>
              <Text style={[
                styles.resultTitle,
                { color: result.success ? COLORS.success : COLORS.error }
              ]}>
                {result.success ? '✅ Update Complete' : '❌ Update Failed'}
              </Text>
              {result.success && (
                <View style={styles.resultStats}>
                  <Text style={styles.resultText}>Total Invoices: {result.total}</Text>
                  <Text style={styles.resultText}>Updated: {result.updated}</Text>
                  <Text style={styles.resultText}>Unchanged: {result.total - result.updated}</Text>
                </View>
              )}
              {result.error && (
                <Text style={styles.errorText}>{result.error}</Text>
              )}
            </View>
          )}

          <TouchableOpacity
            style={[styles.button, updating && styles.buttonDisabled]}
            onPress={handleUpdatePricing}
            disabled={updating}
          >
            {updating ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <>
                <MaterialCommunityIcons name="update" size={24} color={COLORS.white} />
                <Text style={styles.buttonText}>Update Invoice Pricing</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleViewInvoices}
          >
            <MaterialCommunityIcons name="file-document-outline" size={24} color={COLORS.primary} />
            <Text style={styles.secondaryButtonText}>View Invoice Stats</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>What This Does:</Text>
          <View style={styles.infoItem}>
            <MaterialCommunityIcons name="check-circle" size={20} color={COLORS.success} />
            <Text style={styles.infoText}>
              Recalculates all invoice totals using current service prices
            </Text>
          </View>
          <View style={styles.infoItem}>
            <MaterialCommunityIcons name="check-circle" size={20} color={COLORS.success} />
            <Text style={styles.infoText}>
              Updates prices to Jamaican dollars (J$)
            </Text>
          </View>
          <View style={styles.infoItem}>
            <MaterialCommunityIcons name="check-circle" size={20} color={COLORS.success} />
            <Text style={styles.infoText}>
              Preserves all other invoice details and history
            </Text>
          </View>
          <View style={styles.infoItem}>
            <MaterialCommunityIcons name="check-circle" size={20} color={COLORS.success} />
            <Text style={styles.infoText}>
              Syncs with the official CARE service price list
            </Text>
          </View>
        </View>
      </ScrollView>
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
    paddingVertical: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    alignItems: 'center',
  },
  icon: {
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    color: COLORS.textLight,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  resultBox: {
    width: '100%',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  resultStats: {
    gap: 4,
  },
  resultText: {
    fontSize: 14,
    color: COLORS.text,
  },
  errorText: {
    fontSize: 14,
    color: COLORS.error,
  },
  button: {
    width: '100%',
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    marginBottom: 12,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  secondaryButton: {
    width: '100%',
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  infoSection: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 24,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 16,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textLight,
    lineHeight: 20,
  },
});
