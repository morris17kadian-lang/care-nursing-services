import TouchableWeb from "../components/TouchableWeb";
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, GRADIENTS, SPACING } from '../constants';
import { useAuth } from '../context/AuthContext';

// Import the existing screens as components  
import AdminManagementHubScreen from './AdminManagementHubScreen';

export default function AdminOperationsScreen({ navigation, route }) {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [activeFilter, setActiveFilter] = useState('admin');

  const StaffOperations = () => (
    <ScrollView
      style={styles.staffContent}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.staffScrollContent}
    >
      <View style={styles.managementGrid}>
        <View style={styles.managementRow}>
          <TouchableWeb
            style={styles.managementCard}
            onPress={() => navigation.navigate('PriceList')}
            activeOpacity={0.7}
          >
            <LinearGradient
              colors={GRADIENTS.header}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={styles.managementCardGradient}
            >
              <MaterialCommunityIcons name="format-list-bulleted" size={32} color={COLORS.white} />
              <Text style={styles.managementCardTitle}>Price List</Text>
              <Text style={styles.managementCardSubtitle}>Service rates</Text>
            </LinearGradient>
          </TouchableWeb>

          <TouchableWeb
            style={styles.managementCard}
            onPress={() => navigation.navigate('RecentTransactions')}
            activeOpacity={0.7}
          >
            <LinearGradient
              colors={GRADIENTS.header}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={styles.managementCardGradient}
            >
              <MaterialCommunityIcons name="account-group" size={32} color={COLORS.white} />
              <Text style={styles.managementCardTitle}>Staff Hub</Text>
              <Text style={styles.managementCardSubtitle}>Payslips & staff</Text>
            </LinearGradient>
          </TouchableWeb>
        </View>

        <View style={styles.managementRow}>
          <TouchableWeb
            style={styles.managementCard}
            onPress={() => navigation.navigate('InventoryManagement')}
            activeOpacity={0.7}
          >
            <LinearGradient
              colors={GRADIENTS.header}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={styles.managementCardGradient}
            >
              <MaterialCommunityIcons name="package-variant-closed" size={32} color={COLORS.white} />
              <Text style={styles.managementCardTitle}>Inventory</Text>
              <Text style={styles.managementCardSubtitle}>Stock management</Text>
            </LinearGradient>
          </TouchableWeb>

          <TouchableWeb
            style={styles.managementCard}
            onPress={() => navigation.navigate('InvoiceManagement')}
            activeOpacity={0.7}
          >
            <LinearGradient
              colors={GRADIENTS.header}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={styles.managementCardGradient}
            >
              <MaterialCommunityIcons name="file-document-multiple" size={32} color={COLORS.white} />
              <Text style={styles.managementCardTitle}>Invoices</Text>
              <Text style={styles.managementCardSubtitle}>Billing & invoices</Text>
            </LinearGradient>
          </TouchableWeb>
        </View>

        <View style={styles.managementRow}>
          <TouchableWeb
            style={styles.managementCard}
            onPress={() => navigation.navigate('AdminStoreOrders')}
            activeOpacity={0.7}
          >
            <LinearGradient
              colors={GRADIENTS.header}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={styles.managementCardGradient}
            >
              <MaterialCommunityIcons name="shopping" size={32} color={COLORS.white} />
              <Text style={styles.managementCardTitle}>Orders</Text>
              <Text style={styles.managementCardSubtitle}>Store orders</Text>
            </LinearGradient>
          </TouchableWeb>

          <View style={styles.managementCardSpacer} />
        </View>
      </View>
    </ScrollView>
  );

  // Filter Pills Component
  const FilterPills = () => (
    <View style={styles.filterContainer}>
      <TouchableWeb 
        style={[styles.filterPill, activeFilter === 'admin' && styles.activeFilter]}
        onPress={() => setActiveFilter('admin')}
        activeOpacity={0.7}
      >
        <MaterialCommunityIcons 
          name="account-cog" 
          size={16} 
          color={activeFilter === 'admin' ? COLORS.primary : COLORS.white} 
        />
        <Text style={[
          styles.filterText, 
          activeFilter === 'admin' && styles.activeFilterText
        ]}>
          Admin
        </Text>
      </TouchableWeb>
      
      <TouchableWeb 
        style={[styles.filterPill, activeFilter === 'staff' && styles.activeFilter]}
        onPress={() => setActiveFilter('staff')}
        activeOpacity={0.7}
      >
        <MaterialCommunityIcons 
          name="account-group" 
          size={16} 
          color={activeFilter === 'staff' ? COLORS.primary : COLORS.white} 
        />
        <Text style={[
          styles.filterText, 
          activeFilter === 'staff' && styles.activeFilterText
        ]}>
          Staff
        </Text>
      </TouchableWeb>
    </View>
  );

  const renderContent = () => {
    switch (activeFilter) {
      case 'admin':
        // Check for admin access - allow superAdmin role, admin role, or users with ADMIN codes
        const hasAdminAccess = user?.role === 'superAdmin' || 
                              user?.role === 'admin' ||
                              user?.isSuperAdmin ||
                              (user?.code && user.code.startsWith('ADMIN')) ||
                              (user?.adminCode && user.adminCode.startsWith('ADMIN')) ||
                              (user?.nurseCode && user.nurseCode.startsWith('ADMIN')) ||
                              (user?.username && user.username === 'ADMIN001') ||
                              (user?.email && user.email === 'ADMIN001');
        
                              
        if (hasAdminAccess) {
          return <AdminManagementHubScreen navigation={navigation} route={route} isEmbedded={true} />;
        } else {
          return (
            <View style={styles.accessDeniedContainer}>
              <MaterialCommunityIcons name="shield-lock" size={64} color={COLORS.lightGray} />
              <Text style={styles.accessDeniedTitle}>Access Restricted</Text>
              <Text style={styles.accessDeniedSubtitle}>
                Only ADMIN (Nurse Bernard) can access this management hub{'\n\n'}
                Current user: {user?.code || user?.adminCode || user?.nurseCode || user?.email}{'\n'}
                Role: {user?.role}{'\n'}
                IsSuperAdmin: {user?.isSuperAdmin ? 'Yes' : 'No'}
              </Text>
            </View>
          );
        }
      case 'staff':
        return <StaffOperations />;
      default:
        return <AdminManagementHubScreen navigation={navigation} route={route} isEmbedded={true} />;
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      {/* Header */}
      <LinearGradient
        colors={GRADIENTS.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 20 }]}
      >
        <View style={styles.headerRow}>
          <View style={{ width: 44 }} />
          <Text style={styles.welcomeText}>Operations</Text>
          <View style={{ width: 44 }} />
        </View>
        
        {/* Filter Pills */}
        <FilterPills />
      </LinearGradient>

      {/* Content */}
      <View style={styles.contentContainer}>
        {renderContent()}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingBottom: SPACING.lg,
    paddingHorizontal: SPACING.lg,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  welcomeText: {
    fontSize: 20,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.white,
    textAlign: 'center',
  },
  filterContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 25,
    padding: 4,
    marginHorizontal: SPACING.md,
  },
  filterPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: SPACING.xs,
    borderRadius: 20,
    gap: 4,
  },
  activeFilter: {
    backgroundColor: COLORS.white,
  },
  filterText: {
    fontSize: 12,
    fontFamily: 'Poppins_500Medium',
    color: COLORS.white,
  },
  activeFilterText: {
    color: COLORS.primary,
  },
  contentContainer: {
    flex: 1,
  },

  // Staff tiles - match Super Admin hub tiles
  staffContent: {
    flex: 1,
  },
  staffScrollContent: {
    paddingTop: SPACING.md,
    paddingBottom: SPACING.lg,
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
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: COLORS.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
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
  managementCardSpacer: {
    flex: 1,
  },
  accessDeniedContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
    backgroundColor: COLORS.background,
  },
  accessDeniedTitle: {
    fontSize: 24,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.text,
    textAlign: 'center',
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
  },
  accessDeniedSubtitle: {
    fontSize: 16,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.lightGray,
    textAlign: 'center',
    lineHeight: 24,
  },
});