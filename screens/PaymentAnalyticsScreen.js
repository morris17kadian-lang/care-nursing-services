import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  useWindowDimensions,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GRADIENTS } from '../constants';

const COLORS = {
  primary: '#6B46C1',
  secondary: '#EC4899',
  accent: '#10B981',
  background: '#F8FAFC',
  white: '#FFFFFF',
  text: '#1F2937',
  textMuted: '#6B7280',
  textLight: '#9CA3AF',
  border: '#E5E7EB',
  shadow: '#000000',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#3B82F6',
  lightPurple: '#F3F4F6',
  darkPurple: '#4C1D95',
  gradient1: ['#667eea', '#764ba2'],
  gradient2: ['#f093fb', '#f5576c'],
  gradient3: ['#4facfe', '#00f2fe'],
  gradient4: ['#43e97b', '#38f9d7'],
};

const PaymentAnalyticsScreen = ({ navigation }) => {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [selectedPeriod, setSelectedPeriod] = useState('weekly');
  const [animatedValues] = useState(
    Array.from({ length: 7 }, () => new Animated.Value(0))
  );

  useEffect(() => {
    // Reset and animate chart bars when period changes
    animatedValues.forEach(value => value.setValue(0));
    
    const animations = animatedValues.map((value, index) => 
      Animated.timing(value, {
        toValue: 1,
        duration: 1000,
        delay: index * 150,
        useNativeDriver: false,
      })
    );
    
    Animated.stagger(100, animations).start();
  }, [selectedPeriod]);

  // Dynamic data based on selected period
  const getDataForPeriod = (period) => {
    switch (period) {
      case 'daily':
        return {
          chartData: [
            { label: '6AM', amount: 12000, percentage: 40 },
            { label: '9AM', amount: 18000, percentage: 60 },
            { label: '12PM', amount: 25500, percentage: 85 },
            { label: '3PM', amount: 30000, percentage: 100 },
            { label: '6PM', amount: 22500, percentage: 75 },
            { label: '9PM', amount: 15000, percentage: 50 },
            { label: '12AM', amount: 7500, percentage: 25 },
          ],
          totalRevenue: 130500,
          totalTransactions: 42,
          periodLabel: 'Today',
          growthRate: '+8.3%',
        };
      case 'weekly':
        return {
          chartData: [
            { label: 'Mon', amount: 75000, percentage: 75 },
            { label: 'Tue', amount: 45000, percentage: 45 },
            { label: 'Wed', amount: 90000, percentage: 90 },
            { label: 'Thu', amount: 30000, percentage: 30 },
            { label: 'Fri', amount: 105000, percentage: 100 },
            { label: 'Sat', amount: 60000, percentage: 60 },
            { label: 'Sun', amount: 82500, percentage: 80 },
          ],
          totalRevenue: 487500,
          totalTransactions: 145,
          periodLabel: 'This Week',
          growthRate: '+12.5%',
        };
      case 'yearly':
        return {
          chartData: [
            { label: 'Jan', amount: 1500000, percentage: 60 },
            { label: 'Feb', amount: 1800000, percentage: 72 },
            { label: 'Mar', amount: 2100000, percentage: 84 },
            { label: 'Apr', amount: 1950000, percentage: 78 },
            { label: 'May', amount: 2250000, percentage: 90 },
            { label: 'Jun', amount: 2500000, percentage: 100 },
            { label: 'Jul', amount: 2175000, percentage: 87 },
          ],
          totalRevenue: 14275000,
          totalTransactions: 4250,
          periodLabel: 'This Year',
          growthRate: '+18.7%',
        };
      default:
        return getDataForPeriod('weekly');
    }
  };

  const currentData = getDataForPeriod(selectedPeriod);
  const averageTransaction = Math.round(currentData.totalRevenue / currentData.totalTransactions);

  const serviceRevenueData = [
    {
      id: 1,
      name: 'Home Nursing',
      icon: 'medical-bag',
      revenue: Math.round(currentData.totalRevenue * 0.36),
      bookings: 456,
      percentage: 36,
      gradient: COLORS.gradient1,
    },
    {
      id: 2,
      name: 'Physiotherapy',
      icon: 'arm-flex',
      revenue: Math.round(currentData.totalRevenue * 0.31),
      bookings: 352,
      percentage: 31,
      gradient: COLORS.gradient2,
    },
    {
      id: 3,
      name: 'Blood Draws',
      icon: 'water',
      revenue: Math.round(currentData.totalRevenue * 0.18),
      bookings: 298,
      percentage: 18,
      gradient: COLORS.gradient3,
    },
    {
      id: 4,
      name: 'Dressings',
      icon: 'bandage',
      revenue: Math.round(currentData.totalRevenue * 0.10),
      bookings: 245,
      percentage: 10,
      gradient: COLORS.gradient4,
    },
    {
      id: 5,
      name: 'Vital Signs',
      icon: 'heart-pulse',
      revenue: Math.round(currentData.totalRevenue * 0.05),
      bookings: 217,
      percentage: 5,
      gradient: ['#ffecd2', '#fcb69f'],
    },
  ];

  const paymentMethodData = [
    {
      id: 1,
      name: 'Credit/Debit Card',
      icon: 'credit-card',
      amount: Math.round(currentData.totalRevenue * 0.60),
      percentage: 60,
      gradient: COLORS.gradient1,
    },
    {
      id: 2,
      name: 'Digital Wallet',
      icon: 'wallet',
      amount: Math.round(currentData.totalRevenue * 0.30),
      percentage: 30,
      gradient: COLORS.gradient2,
    },
    {
      id: 3,
      name: 'Bank Transfer',
      icon: 'bank-transfer',
      amount: Math.round(currentData.totalRevenue * 0.10),
      percentage: 10,
      gradient: COLORS.gradient3,
    },
  ];

  const formatCurrency = (amount) => {
    return `J$${amount.toLocaleString()}`;
  };

  const FilterTabs = () => (
    <View style={styles.filterContainer}>
      {['daily', 'weekly', 'yearly'].map((period) => (
        <TouchableOpacity
          key={period}
          style={styles.filterPill}
          onPress={() => setSelectedPeriod(period)}
        >
          {selectedPeriod === period ? (
            <LinearGradient
              colors={GRADIENTS.header}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.filterPillGradient}
            >
              <Text style={styles.filterPillText}>
                {period.charAt(0).toUpperCase() + period.slice(1)}
              </Text>
            </LinearGradient>
          ) : (
            <View style={styles.inactiveFilterPill}>
              <Text style={styles.inactiveFilterPillText}>
                {period.charAt(0).toUpperCase() + period.slice(1)}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      ))}
    </View>
  );

  const ModernChart = ({ data }) => (
    <View style={styles.modernChartContainer}>
      <View style={styles.barChartContainer}>
        {data.map((item, index) => {
          const barHeight = (item.percentage / 100) * 140;
          
          return (
            <View key={index} style={styles.barColumn}>
              {/* Value on top */}
              <Text style={styles.barValue}>{formatCurrency(item.amount)}</Text>
              
              {/* Bar */}
              <View style={styles.barWrapper}>
                <LinearGradient
                  colors={['#667eea', '#764ba2']}
                  style={[styles.bar, { height: barHeight }]}
                />
              </View>
              
              {/* Label at bottom */}
              <Text style={styles.barLabel}>{item.label}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );

  const MetricCard = ({ title, value, subtitle, icon, gradient = COLORS.gradient1 }) => (
    <View style={styles.metricCard}>
      <LinearGradient colors={gradient} style={styles.metricGradient}>
        <View style={styles.metricContent}>
          <View style={styles.metricLeft}>
            <Text style={styles.metricTitle}>{title}</Text>
            <Text style={styles.metricValue}>{value}</Text>
            <Text style={styles.metricSubtitle}>{subtitle}</Text>
          </View>
          <View style={styles.metricIconContainer}>
            <MaterialCommunityIcons name={icon} size={28} color={COLORS.white} />
          </View>
        </View>
      </LinearGradient>
    </View>
  );

  const ServiceItem = ({ item }) => (
    <View style={styles.modernServiceItem}>
      <LinearGradient colors={item.gradient} style={styles.serviceIconGradient}>
        <MaterialCommunityIcons name={item.icon} size={20} color={COLORS.white} />
      </LinearGradient>
      <View style={styles.serviceItemContent}>
        <View style={styles.serviceItemLeft}>
          <Text style={styles.serviceName}>{item.name}</Text>
          <Text style={styles.serviceBookings}>{item.bookings} bookings</Text>
        </View>
        <View style={styles.serviceItemRight}>
          <Text style={styles.serviceRevenue}>{formatCurrency(item.revenue)}</Text>
          <View style={styles.modernProgressContainer}>
            <View style={styles.progressBackground} />
            <LinearGradient
              colors={item.gradient}
              style={[styles.progressFill, { width: `${item.percentage}%` }]}
            />
          </View>
        </View>
      </View>
    </View>
  );

  const PaymentMethodItem = ({ item }) => (
    <View style={styles.modernPaymentItem}>
      <LinearGradient colors={item.gradient} style={styles.paymentIconGradient}>
        <MaterialCommunityIcons name={item.icon} size={20} color={COLORS.white} />
      </LinearGradient>
      <View style={styles.paymentItemContent}>
        <View style={styles.paymentItemLeft}>
          <Text style={styles.paymentMethodName}>{item.name}</Text>
          <Text style={styles.paymentMethodAmount}>{formatCurrency(item.amount)}</Text>
        </View>
        <View style={styles.paymentItemRight}>
          <Text style={styles.paymentMethodPercentage}>{item.percentage}%</Text>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={GRADIENTS.header}
        style={[styles.header, { paddingTop: insets.top + 20, paddingBottom: 20 }]}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => navigation.goBack()}
          >
            <MaterialCommunityIcons name="arrow-left" size={26} color={COLORS.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Payment Analytics</Text>
          <TouchableOpacity style={styles.iconButton}>
            <MaterialCommunityIcons name="download" size={24} color={COLORS.white} />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <FilterTabs />

        {/* Revenue Overview */}
        <View style={styles.metricsGrid}>
          <MetricCard
            title="Total Revenue"
            value={formatCurrency(currentData.totalRevenue)}
            subtitle={`${currentData.growthRate} vs last period`}
            icon="currency-usd"
            gradient={COLORS.gradient1}
          />
          <MetricCard
            title="Transactions"
            value={currentData.totalTransactions.toString()}
            subtitle={`Avg: ${formatCurrency(averageTransaction)}`}
            icon="receipt"
            gradient={COLORS.gradient2}
          />
        </View>

        {/* Quick Stats */}
        <View style={styles.quickStatsCard}>
          <View style={styles.quickStatItem}>
            <MaterialCommunityIcons name="account-clock" size={24} color="#FF9800" />
            <Text style={styles.quickStatValue}>245</Text>
            <Text style={styles.quickStatLabel}>Pending</Text>
          </View>
          <View style={styles.quickStatItem}>
            <MaterialCommunityIcons name="check-circle" size={24} color="#4CAF50" />
            <Text style={styles.quickStatValue}>1,523</Text>
            <Text style={styles.quickStatLabel}>Completed</Text>
          </View>
          <View style={styles.quickStatItem}>
            <MaterialCommunityIcons name="calendar-check" size={24} color="#9C27B0" />
            <Text style={styles.quickStatValue}>67</Text>
            <Text style={styles.quickStatLabel}>This Week</Text>
          </View>
        </View>

        {/* Modern Chart */}
        <View style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <Text style={styles.chartTitle}>Revenue Trend - {currentData.periodLabel}</Text>
            <View style={styles.chartLegend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#667eea' }]} />
                <Text style={styles.legendText}>Revenue</Text>
              </View>
            </View>
          </View>
          <ModernChart data={currentData.chartData} />
        </View>

        {/* Service Revenue Breakdown */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Top Services by Revenue</Text>
          {serviceRevenueData.map((item) => (
            <ServiceItem key={item.id} item={item} />
          ))}
        </View>

        {/* Payment Methods */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Payment Methods</Text>
          {paymentMethodData.map((item) => (
            <PaymentMethodItem key={item.id} item={item} />
          ))}
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
    paddingHorizontal: 20,
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
    fontWeight: 'bold',
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  filterContainer: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 20,
    marginTop: -10,
    marginBottom: 20,
  },
  filterPill: {
    flex: 1,
  },
  filterPillGradient: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 36,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  inactiveFilterPill: {
    backgroundColor: COLORS.white,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 36,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  filterPillText: {
    fontSize: 11,
    fontFamily: 'Poppins_700Bold',
    color: COLORS.white,
  },
  inactiveFilterPillText: {
    fontSize: 11,
    fontFamily: 'Poppins_700Bold',
    color: COLORS.textMuted,
  },
  metricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  metricCard: {
    flex: 1,
    marginHorizontal: 5,
    borderRadius: 16,
    overflow: 'hidden',
  },
  metricGradient: {
    padding: 20,
  },
  metricContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metricLeft: {
    flex: 1,
  },
  metricTitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: 4,
  },
  metricSubtitle: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  metricIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chartCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  chartLegend: {
    flexDirection: 'row',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  legendText: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  modernChartContainer: {
    height: 200,
    paddingTop: 10,
  },
  barChartContainer: {
    flexDirection: 'row',
    height: 180,
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    paddingBottom: 25,
  },
  barColumn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 2,
  },
  barValue: {
    fontSize: 9,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 6,
    textAlign: 'center',
  },
  barWrapper: {
    width: '100%',
    maxWidth: 32,
    alignItems: 'center',
  },
  bar: {
    width: '100%',
    borderRadius: 6,
    minHeight: 20,
  },
  barLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textMuted,
    marginTop: 8,
    textAlign: 'center',
  },
  sectionCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 20,
  },
  modernServiceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    padding: 16,
    backgroundColor: COLORS.background,
    borderRadius: 16,
  },
  serviceIconGradient: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  serviceItemContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  serviceItemLeft: {
    flex: 1,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  serviceBookings: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  serviceRevenue: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 6,
  },
  serviceItemRight: {
    alignItems: 'flex-end',
    width: 100,
  },
  servicePercentage: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 6,
  },
  modernProgressContainer: {
    width: 80,
    height: 8,
    position: 'relative',
  },
  progressBackground: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    backgroundColor: COLORS.border,
    borderRadius: 4,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  // Quick Stats Styles
  quickStatsCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    gap: 8,
  },
  quickStatItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  quickStatValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: 6,
  },
  quickStatLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
    marginTop: 2,
    textAlign: 'center',
  },
  // Top Card Styles
  topCard: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  topTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  topContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  topAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topInfo: {
    flex: 1,
  },
  topName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  topSubtext: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  topStats: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 8,
  },
  topStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  topStatText: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.text,
  },
  topProgressBar: {
    height: 8,
    backgroundColor: COLORS.border,
    borderRadius: 4,
    overflow: 'hidden',
    marginTop: 16,
  },
  topProgressFill: {
    height: '100%',
    borderRadius: 4,
  },
  topProgressText: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 6,
    textAlign: 'center',
  },
  modernPaymentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    padding: 16,
    backgroundColor: COLORS.background,
    borderRadius: 16,
  },
  paymentIconGradient: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  paymentItemContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  paymentItemLeft: {
    flex: 1,
  },
  paymentMethodName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  paymentMethodAmount: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
  paymentItemRight: {
    alignItems: 'flex-end',
  },
  paymentMethodPercentage: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  bottomPadding: {
    height: 40,
  },
});

export default PaymentAnalyticsScreen;