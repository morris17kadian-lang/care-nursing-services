import TouchableWeb from "../components/TouchableWeb";
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  StatusBar,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, GRADIENTS, SPACING } from '../constants';

export default function TransactionDetailsScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { 
    clientName, 
    amount, 
    date, 
    transactionId, 
    service, 
    paymentMethod, 
    status 
  } = route.params || {};

  const handleDownloadReceipt = () => {
    Alert.alert(
      'Receipt Downloaded',
      'Receipt has been saved to your Downloads folder!',
      [{ text: 'OK' }]
    );
  };

  const handleRefundTransaction = () => {
    Alert.alert(
      'Refund Transaction',
      `Are you sure you want to refund ${amount} to ${clientName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Refund', 
          style: 'destructive',
          onPress: () => Alert.alert('Success', 'Refund processed successfully!')
        }
      ]
    );
  };

  const DetailRow = ({ icon, label, value, valueColor = COLORS.text }) => (
    <View style={styles.detailRow}>
      <View style={styles.detailLeft}>
        <MaterialCommunityIcons name={icon} size={20} color={COLORS.primary} />
        <Text style={styles.detailLabel}>{label}</Text>
      </View>
      <Text style={[styles.detailValue, { color: valueColor }]}>{value}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      {/* Header */}
      <LinearGradient
        colors={GRADIENTS.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 20 }]}
      >
        <View style={styles.headerRow}>
          <TouchableWeb 
            style={styles.iconButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="arrow-left" size={26} color={COLORS.white} />
          </TouchableWeb>
          <Text style={styles.headerTitle}>Transaction Details</Text>
          <View style={styles.iconButton} />
        </View>
      </LinearGradient>

      <ScrollView 
        style={styles.content} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Transaction Summary */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <MaterialCommunityIcons name="receipt" size={32} color={COLORS.primary} />
            <View style={styles.summaryInfo}>
              <Text style={styles.summaryAmount}>{amount}</Text>
              <Text style={styles.summaryStatus}>
                <MaterialCommunityIcons name="check-circle" size={16} color={COLORS.success} />
                {' '}{status}
              </Text>
            </View>
          </View>
          <Text style={styles.transactionId}>Transaction ID: {transactionId}</Text>
        </View>

        {/* Client Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Client Information</Text>
          <View style={styles.card}>
            <DetailRow 
              icon="account" 
              label="Client Name" 
              value={clientName}
            />
            <DetailRow 
              icon="medical-bag" 
              label="Service" 
              value={service}
            />
            <DetailRow 
              icon="calendar" 
              label="Date" 
              value={date}
            />
          </View>
        </View>

        {/* Payment Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Information</Text>
          <View style={styles.card}>
            <DetailRow 
              icon="credit-card" 
              label="Payment Method" 
              value={paymentMethod}
            />
            <DetailRow 
              icon="cash" 
              label="Amount" 
              value={amount}
              valueColor={COLORS.success}
            />
            <DetailRow 
              icon="check-circle" 
              label="Status" 
              value={status}
              valueColor={COLORS.success}
            />
            <DetailRow 
              icon="clock" 
              label="Processed" 
              value="2:34 PM"
            />
          </View>
        </View>

        {/* Additional Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Additional Details</Text>
          <View style={styles.card}>
            <DetailRow 
              icon="map-marker" 
              label="Service Location" 
              value="Client's Home"
            />
            <DetailRow 
              icon="account-heart" 
              label="Nurse" 
              value="Sarah Johnson, RN"
            />
            <DetailRow 
              icon="timer" 
              label="Duration" 
              value="2 hours"
            />
            <DetailRow 
              icon="star" 
              label="Rating" 
              value="5.0 ⭐"
            />
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionSection}>
          <TouchableWeb
            style={styles.actionButton}
            onPress={handleDownloadReceipt}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={GRADIENTS.primary}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={styles.actionButtonGradient}
            >
              <MaterialCommunityIcons name="download" size={20} color={COLORS.white} />
              <Text style={styles.actionButtonText}>Download Receipt</Text>
            </LinearGradient>
          </TouchableWeb>

          <TouchableWeb
            style={styles.actionButton}
            onPress={handleRefundTransaction}
            activeOpacity={0.8}
          >
            <View style={styles.outlineButton}>
              <MaterialCommunityIcons name="undo" size={20} color={COLORS.error} />
              <Text style={styles.outlineButtonText}>Process Refund</Text>
            </View>
          </TouchableWeb>
        </View>

        <View style={styles.bottomPadding} />
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
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Poppins_700Bold',
    color: COLORS.white,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 12,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: SPACING.xl,
  },
  summaryCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 24,
    margin: 20,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryInfo: {
    marginLeft: 16,
    flex: 1,
  },
  summaryAmount: {
    fontSize: 28,
    fontFamily: 'Poppins_700Bold',
    color: COLORS.success,
    marginBottom: 4,
  },
  summaryStatus: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.success,
    flexDirection: 'row',
    alignItems: 'center',
  },
  transactionId: {
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
    color: COLORS.textLight,
    textAlign: 'center',
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.text,
    marginBottom: 12,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  detailLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  detailLabel: {
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
    color: COLORS.textLight,
    marginLeft: 12,
  },
  detailValue: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.text,
    textAlign: 'right',
  },
  actionSection: {
    paddingHorizontal: 20,
    gap: 12,
  },
  actionButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  actionButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  actionButtonText: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.white,
  },
  outlineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderWidth: 2,
    borderColor: COLORS.error,
    borderRadius: 12,
    gap: 8,
  },
  outlineButtonText: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.error,
  },
  bottomPadding: {
    height: 40,
  },
});