import TouchableWeb from "../components/TouchableWeb";
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, GRADIENTS, SPACING } from '../constants';

export default function AdminPaymentsScreen({ navigation }) {
  const [activeTab, setActiveTab] = useState('overview');

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <View style={styles.tabContent}>
            {/* Quick Stats Cards */}
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <LinearGradient
                  colors={['#4CAF50', '#2E7D32']}
                  style={styles.statGradient}
                >
                  <MaterialCommunityIcons name="cash-multiple" size={32} color="#fff" />
                  <Text style={styles.statValue}>$125,340</Text>
                  <Text style={styles.statLabel}>Total Revenue</Text>
                </LinearGradient>
              </View>
              
              <View style={styles.statCard}>
                <LinearGradient
                  colors={['#2196F3', '#1565C0']}
                  style={styles.statGradient}
                >
                  <MaterialCommunityIcons name="trending-up" size={32} color="#fff" />
                  <Text style={styles.statValue}>$18,500</Text>
                  <Text style={styles.statLabel}>This Month</Text>
                </LinearGradient>
              </View>
            </View>

            {/* Revenue Chart Placeholder */}
            <View style={styles.chartCard}>
              <Text style={styles.cardTitle}>Revenue Trend</Text>
              <View style={styles.chartPlaceholder}>
                <MaterialCommunityIcons name="chart-line" size={48} color={COLORS.primary} />
                <Text style={styles.chartText}>Revenue analytics chart</Text>
              </View>
            </View>

            {/* Recent Activity */}
            <View style={styles.activityCard}>
              <Text style={styles.cardTitle}>Recent Payments</Text>
              <View style={styles.paymentItem}>
                <View style={styles.paymentInfo}>
                  <Text style={styles.clientName}>Mary Johnson</Text>
                  <Text style={styles.paymentDate}>Premium Plan • Oct 23</Text>
                </View>
                <Text style={styles.paymentAmount}>$199</Text>
              </View>
              <View style={styles.paymentItem}>
                <View style={styles.paymentInfo}>
                  <Text style={styles.clientName}>John Smith</Text>
                  <Text style={styles.paymentDate}>Home Nursing • Oct 22</Text>
                </View>
                <Text style={styles.paymentAmount}>$80</Text>
              </View>
            </View>
          </View>
        );

      case 'subscriptions':
        return (
          <View style={styles.tabContent}>
            {/* Subscription Summary */}
            <View style={styles.summaryCard}>
              <Text style={styles.cardTitle}>Subscription Overview</Text>
              <View style={styles.summaryGrid}>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryValue}>54</Text>
                  <Text style={styles.summaryLabel}>Active Subscribers</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryValue, { color: COLORS.success }]}>$10,146</Text>
                  <Text style={styles.summaryLabel}>Monthly Revenue</Text>
                </View>
              </View>
            </View>

            {/* Subscription Plans */}
            <View style={styles.plansContainer}>
              <TouchableWeb style={styles.planCard}>
                <View style={styles.planHeader}>
                  <MaterialCommunityIcons name="medical-bag" size={24} color={COLORS.primary} />
                  <View style={styles.planInfo}>
                    <Text style={styles.planName}>Basic Care</Text>
                    <Text style={styles.planPrice}>$99/month</Text>
                  </View>
                  <Text style={styles.subscriberCount}>24 subscribers</Text>
                </View>
              </TouchableWeb>

              <TouchableWeb style={styles.planCard}>
                <View style={styles.planHeader}>
                  <MaterialCommunityIcons name="crown" size={24} color="#FF9800" />
                  <View style={styles.planInfo}>
                    <Text style={styles.planName}>Premium Care</Text>
                    <Text style={styles.planPrice}>$199/month</Text>
                  </View>
                  <Text style={styles.subscriberCount}>18 subscribers</Text>
                </View>
              </TouchableWeb>

              <TouchableWeb style={styles.planCard}>
                <View style={styles.planHeader}>
                  <MaterialCommunityIcons name="diamond-stone" size={24} color="#9C27B0" />
                  <View style={styles.planInfo}>
                    <Text style={styles.planName}>Elite Care</Text>
                    <Text style={styles.planPrice}>$349/month</Text>
                  </View>
                  <Text style={styles.subscriberCount}>12 subscribers</Text>
                </View>
              </TouchableWeb>
            </View>
          </View>
        );

      case 'analytics':
        return (
          <View style={styles.tabContent}>
            {/* Payment Methods */}
            <View style={styles.analyticsCard}>
              <Text style={styles.cardTitle}>Payment Methods</Text>
              <View style={styles.methodItem}>
                <MaterialCommunityIcons name="credit-card" size={20} color={COLORS.primary} />
                <Text style={styles.methodLabel}>Credit Card</Text>
                <Text style={styles.methodValue}>68%</Text>
              </View>
              <View style={styles.methodItem}>
                <MaterialCommunityIcons name="bank" size={20} color={COLORS.primary} />
                <Text style={styles.methodLabel}>Bank Transfer</Text>
                <Text style={styles.methodValue}>22%</Text>
              </View>
              <View style={styles.methodItem}>
                <MaterialCommunityIcons name="wallet" size={20} color={COLORS.primary} />
                <Text style={styles.methodLabel}>Insurance</Text>
                <Text style={styles.methodValue}>10%</Text>
              </View>
            </View>

            {/* Service Performance */}
            <View style={styles.analyticsCard}>
              <Text style={styles.cardTitle}>Top Services</Text>
              <View style={styles.serviceItem}>
                <Text style={styles.serviceName}>Home Nursing</Text>
                <Text style={styles.serviceRevenue}>$45,200</Text>
              </View>
              <View style={styles.serviceItem}>
                <Text style={styles.serviceName}>Physiotherapy</Text>
                <Text style={styles.serviceRevenue}>$38,900</Text>
              </View>
              <View style={styles.serviceItem}>
                <Text style={styles.serviceName}>Blood Draws</Text>
                <Text style={styles.serviceRevenue}>$22,100</Text>
              </View>
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <LinearGradient
        colors={GRADIENTS.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerRow}>
          <Text style={styles.welcomeText}>Payments & Analytics</Text>
        </View>
      </LinearGradient>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableWeb
          style={[styles.tab, activeTab === 'overview' && styles.activeTab]}
          onPress={() => setActiveTab('overview')}
        >
          <MaterialCommunityIcons 
            name="view-dashboard" 
            size={20} 
            color={activeTab === 'overview' ? COLORS.white : COLORS.textLight} 
          />
          <Text style={[styles.tabText, activeTab === 'overview' && styles.activeTabText]}>
            Overview
          </Text>
        </TouchableWeb>

        <TouchableWeb
          style={[styles.tab, activeTab === 'subscriptions' && styles.activeTab]}
          onPress={() => setActiveTab('subscriptions')}
        >
          <MaterialCommunityIcons 
            name="crown" 
            size={20} 
            color={activeTab === 'subscriptions' ? COLORS.white : COLORS.textLight} 
          />
          <Text style={[styles.tabText, activeTab === 'subscriptions' && styles.activeTabText]}>
            Plans
          </Text>
        </TouchableWeb>

        <TouchableWeb
          style={[styles.tab, activeTab === 'analytics' && styles.activeTab]}
          onPress={() => setActiveTab('analytics')}
        >
          <MaterialCommunityIcons 
            name="chart-bar" 
            size={20} 
            color={activeTab === 'analytics' ? COLORS.white : COLORS.textLight} 
          />
          <Text style={[styles.tabText, activeTab === 'analytics' && styles.activeTabText]}>
            Analytics
          </Text>
        </TouchableWeb>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {renderTabContent()}
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
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  welcomeText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
    paddingHorizontal: 20,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: COLORS.primary,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    marginHorizontal: 4,
    marginBottom: 2,
  },
  tabText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textLight,
  },
  activeTabText: {
    color: COLORS.white,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  tabContent: {
    paddingVertical: 20,
  },
  
  // Overview Tab Styles
  statsGrid: {
    flexDirection: 'row',
    gap: 15,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    borderRadius: 15,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statGradient: {
    padding: 20,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.white,
    marginTop: 8,
  },
  statLabel: {
    fontSize: 14,
    color: COLORS.white,
    opacity: 0.9,
    marginTop: 4,
  },
  chartCard: {
    backgroundColor: COLORS.white,
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 15,
  },
  chartPlaceholder: {
    height: 150,
    backgroundColor: COLORS.lightGray,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chartText: {
    marginTop: 10,
    color: COLORS.textLight,
    fontSize: 14,
  },
  activityCard: {
    backgroundColor: COLORS.white,
    borderRadius: 15,
    padding: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  paymentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  paymentInfo: {
    flex: 1,
  },
  clientName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  paymentDate: {
    fontSize: 14,
    color: COLORS.textLight,
    marginTop: 2,
  },
  paymentAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.success,
  },

  // Subscriptions Tab Styles
  summaryCard: {
    backgroundColor: COLORS.white,
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: 20,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
    padding: 15,
    backgroundColor: COLORS.lightGray,
    borderRadius: 10,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  summaryLabel: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 4,
    textAlign: 'center',
  },
  plansContainer: {
    gap: 15,
  },
  planCard: {
    backgroundColor: COLORS.white,
    borderRadius: 15,
    padding: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  planInfo: {
    flex: 1,
  },
  planName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  planPrice: {
    fontSize: 16,
    color: COLORS.primary,
    fontWeight: '600',
    marginTop: 2,
  },
  subscriberCount: {
    fontSize: 14,
    color: COLORS.textLight,
    backgroundColor: COLORS.lightGray,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },

  // Analytics Tab Styles
  analyticsCard: {
    backgroundColor: COLORS.white,
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  methodItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  methodLabel: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: COLORS.text,
  },
  methodValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  serviceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  serviceName: {
    fontSize: 16,
    color: COLORS.text,
  },
  serviceRevenue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.success,
  },
});