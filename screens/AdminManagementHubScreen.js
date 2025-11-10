import TouchableWeb from "../components/TouchableWeb";
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING, GRADIENTS } from '../constants';
import { useAuth } from '../context/AuthContext';

export default function AdminManagementHubScreen({ navigation }) {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  // Redirect if not super admin
  React.useEffect(() => {
    if (!user?.isSuperAdmin) {
      navigation.goBack();
    }
  }, [user, navigation]);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Header */}
      <LinearGradient
        colors={GRADIENTS.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 20 }]}
      >
        <View style={styles.headerRow}>
          <TouchableWeb
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <MaterialCommunityIcons name="arrow-left" size={24} color={COLORS.white} />
          </TouchableWeb>
          <Text style={styles.welcomeText}>Admin Management Hub</Text>
        </View>
      </LinearGradient>

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 20 }]}
      >
        {/* Management Grid */}
        <View style={styles.managementGrid}>
          {/* Row 1 */}
          <View style={styles.managementRow}>
            <TouchableWeb
              style={styles.managementCard}
              onPress={() => navigation.navigate('PriceList')}
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={['#667eea', '#764ba2']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.managementCardGradient}
              >
                <MaterialCommunityIcons name="format-list-bulleted" size={32} color={COLORS.white} />
                <Text style={styles.managementCardTitle}>Price List</Text>
                <Text style={styles.managementCardSubtitle}>Service rates</Text>
              </LinearGradient>
            </TouchableWeb>

            <TouchableWeb 
              style={styles.managementCard} 
              activeOpacity={0.7}
              onPress={() => navigation.navigate('RecentTransactions')}
            >
              <LinearGradient
                colors={['#f093fb', '#f5576c']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.managementCardGradient}
              >
                <MaterialCommunityIcons name="account-group" size={32} color={COLORS.white} />
                <Text style={styles.managementCardTitle}>Staff Hub</Text>
                <Text style={styles.managementCardSubtitle}>Payslips & staff</Text>
              </LinearGradient>
            </TouchableWeb>
          </View>

          {/* Row 2 */}
          <View style={styles.managementRow}>
            <TouchableWeb 
              style={styles.managementCard} 
              activeOpacity={0.7}
              onPress={() => navigation.navigate('PaymentAnalytics')}
            >
              <LinearGradient
                colors={['#4facfe', '#00f2fe']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.managementCardGradient}
              >
                <MaterialCommunityIcons name="chart-box" size={32} color={COLORS.white} />
                <Text style={styles.managementCardTitle}>Analytics</Text>
                <Text style={styles.managementCardSubtitle}>Reports & insights</Text>
              </LinearGradient>
            </TouchableWeb>

            <TouchableWeb 
              style={styles.managementCard} 
              activeOpacity={0.7}
              onPress={() => navigation.navigate('InvoiceManagement')}
            >
              <LinearGradient
                colors={['#43e97b', '#38f9d7']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.managementCardGradient}
              >
                <MaterialCommunityIcons name="file-document-multiple" size={32} color={COLORS.white} />
                <Text style={styles.managementCardTitle}>Invoices</Text>
                <Text style={styles.managementCardSubtitle}>Generate & manage</Text>
              </LinearGradient>
            </TouchableWeb>
          </View>

          {/* Row 3 */}
          <View style={styles.managementRow}>
            <TouchableWeb 
              style={styles.managementCard} 
              activeOpacity={0.7}
              onPress={() => navigation.navigate('AdminStoreOrders')}
            >
              <LinearGradient
                colors={['#10B981', '#059669']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.managementCardGradient}
              >
                <MaterialCommunityIcons name="package-variant" size={32} color={COLORS.white} />
                <Text style={styles.managementCardTitle}>Store Orders</Text>
                <Text style={styles.managementCardSubtitle}>Manage orders</Text>
              </LinearGradient>
            </TouchableWeb>

            <TouchableWeb 
              style={styles.managementCard} 
              activeOpacity={0.7}
              onPress={() => navigation.navigate('InventoryManagement')}
            >
              <LinearGradient
                colors={['#667eea', '#764ba2']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.managementCardGradient}
              >
                <MaterialCommunityIcons name="package-variant-closed" size={32} color={COLORS.white} />
                <Text style={styles.managementCardTitle}>Inventory</Text>
                <Text style={styles.managementCardSubtitle}>Stock management</Text>
              </LinearGradient>
            </TouchableWeb>
          </View>

          {/* Row 4 - Full width */}
          <TouchableWeb 
            style={styles.managementCardFull} 
            activeOpacity={0.7}
            onPress={() => navigation.navigate('PaymentSettings')}
          >
            <LinearGradient
              colors={['#fa709a', '#fee140']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.managementCardFullGradient}
            >
              <MaterialCommunityIcons name="cog" size={28} color={COLORS.white} />
              <View style={styles.managementCardFullContent}>
                <Text style={styles.managementCardTitle}>Payment Settings</Text>
                <Text style={styles.managementCardSubtitle}>Configure payment methods & preferences</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={24} color={COLORS.white} />
            </LinearGradient>
          </TouchableWeb>
        </View>

        {/* Info Section */}
        <View style={styles.infoSection}>
          <MaterialCommunityIcons name="information" size={20} color={COLORS.accent} />
          <Text style={styles.infoText}>
            Only ADMIN001 can access this management hub
          </Text>
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
    paddingBottom: 20,
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
  welcomeText: {
    fontSize: 18,
    fontFamily: 'Poppins_700Bold',
    color: COLORS.white,
    opacity: 0.98,
    flex: 1,
    textAlign: 'center',
    marginRight: 40,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: SPACING.md,
  },
  managementGrid: {
    padding: SPACING.md,
    gap: SPACING.md,
  },
  managementRow: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  managementCard: {
    flex: 1,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 15,
    elevation: 15,
    transform: [{ translateY: -3 }],
    borderTopWidth: 2,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.4)',
    borderLeftColor: 'rgba(255, 255, 255, 0.2)',
    borderRightColor: 'rgba(255, 255, 255, 0.1)',
    borderBottomWidth: 3,
    borderBottomColor: 'rgba(0, 0, 0, 0.2)',
  },
  managementCardGradient: {
    padding: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
    gap: SPACING.xs,
  },
  managementCardTitle: {
    fontSize: 14,
    fontFamily: 'Poppins_700Bold',
    color: COLORS.white,
    textAlign: 'center',
  },
  managementCardSubtitle: {
    fontSize: 11,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.white,
    opacity: 0.9,
    textAlign: 'center',
  },
  managementCardFull: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 15,
    elevation: 15,
    transform: [{ translateY: -3 }],
    borderTopWidth: 2,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.4)',
    borderLeftColor: 'rgba(255, 255, 255, 0.2)',
    borderRightColor: 'rgba(255, 255, 255, 0.1)',
    borderBottomWidth: 3,
    borderBottomColor: 'rgba(0, 0, 0, 0.2)',
  },
  managementCardFullGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    gap: SPACING.md,
  },
  managementCardFullContent: {
    flex: 1,
  },
  infoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    marginHorizontal: SPACING.md,
    marginTop: SPACING.lg,
    padding: SPACING.md,
    borderRadius: 12,
    gap: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.accent + '20',
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.textLight,
  },
});
