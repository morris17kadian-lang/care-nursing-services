import TouchableWeb from "../components/TouchableWeb";
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Modal } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, GRADIENTS, SPACING } from '../constants';

export default function AdminPaymentsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState('overview');
  const [analyticsModalVisible, setAnalyticsModalVisible] = useState(false);
  const [analyticsTab, setAnalyticsTab] = useState('revenue');

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
                  <Text style={styles.statValue}>J$18,876,000</Text>
                  <Text style={styles.statLabel}>Total Revenue</Text>
                </LinearGradient>
              </View>
              
              <View style={styles.statCard}>
                <LinearGradient
                  colors={['#2196F3', '#1565C0']}
                  style={styles.statGradient}
                >
                  <MaterialCommunityIcons name="trending-up" size={32} color="#fff" />
                  <Text style={styles.statValue}>J$2,787,500</Text>
                  <Text style={styles.statLabel}>This Month</Text>
                </LinearGradient>
              </View>
            </View>

            {/* Revenue Chart Placeholder */}
            <View style={styles.chartCard}>
              <View style={styles.chartHeader}>
                <Text style={styles.cardTitle}>Revenue Trend</Text>
                <TouchableWeb
                  style={styles.analyticsButton}
                  onPress={() => setAnalyticsModalVisible(true)}
                >
                  <MaterialCommunityIcons name="chart-box-outline" size={20} color={COLORS.white} />
                  <Text style={styles.analyticsButtonText}>Full Analytics</Text>
                </TouchableWeb>
              </View>
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
                  <Text style={styles.clientName}>John Smith</Text>
                  <Text style={styles.paymentDate}>Home Nursing • Oct 22</Text>
                </View>
                <Text style={styles.paymentAmount}>J$12,050</Text>
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
                  <Text style={[styles.summaryValue, { color: COLORS.success }]}>J$1,529,000</Text>
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
                    <Text style={styles.planPrice}>J$15,000/month</Text>
                  </View>
                  <Text style={styles.subscriberCount}>24 subscribers</Text>
                </View>
              </TouchableWeb>

              <TouchableWeb style={styles.planCard}>
                <View style={styles.planHeader}>
                  <MaterialCommunityIcons name="crown" size={24} color="#FF9800" />
                  <View style={styles.planInfo}>
                    <Text style={styles.planName}>Premium Care</Text>
                    <Text style={styles.planPrice}>J$30,000/month</Text>
                  </View>
                  <Text style={styles.subscriberCount}>18 subscribers</Text>
                </View>
              </TouchableWeb>

              <TouchableWeb style={styles.planCard}>
                <View style={styles.planHeader}>
                  <MaterialCommunityIcons name="diamond-stone" size={24} color="#9C27B0" />
                  <View style={styles.planInfo}>
                    <Text style={styles.planName}>Elite Care</Text>
                    <Text style={styles.planPrice}>J$52,500/month</Text>
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
                <Text style={styles.serviceRevenue}>J$6,810,000</Text>
              </View>
              <View style={styles.serviceItem}>
                <Text style={styles.serviceName}>Physiotherapy</Text>
                <Text style={styles.serviceRevenue}>J$5,863,500</Text>
              </View>
              <View style={styles.serviceItem}>
                <Text style={styles.serviceName}>Blood Draws</Text>
                <Text style={styles.serviceRevenue}>J$3,331,500</Text>
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
        style={[styles.header, { paddingTop: insets.top + 20 }]}
      >
        <View style={styles.headerRow}>
          <Text style={styles.welcomeText}>Payments & Analytics</Text>
        </View>
      </LinearGradient>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableWeb
          style={styles.tab}
          onPress={() => setActiveTab('overview')}
        >
          {activeTab === 'overview' ? (
            <LinearGradient
              colors={GRADIENTS.header}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.activeTabGradient}
            >
              <MaterialCommunityIcons 
                name="view-dashboard" 
                size={20} 
                color={COLORS.white} 
              />
              <Text style={styles.activeTabText}>
                Overview
              </Text>
            </LinearGradient>
          ) : (
            <View style={styles.inactiveTabContent}>
              <MaterialCommunityIcons 
                name="view-dashboard" 
                size={20} 
                color={COLORS.textLight} 
              />
              <Text style={styles.tabText}>
                Overview
              </Text>
            </View>
          )}
        </TouchableWeb>

        <TouchableWeb
          style={styles.tab}
          onPress={() => setActiveTab('subscriptions')}
        >
          {activeTab === 'subscriptions' ? (
            <LinearGradient
              colors={GRADIENTS.header}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.activeTabGradient}
            >
              <MaterialCommunityIcons 
                name="crown" 
                size={20} 
                color={COLORS.white} 
              />
              <Text style={styles.activeTabText}>
                Plans
              </Text>
            </LinearGradient>
          ) : (
            <View style={styles.inactiveTabContent}>
              <MaterialCommunityIcons 
                name="crown" 
                size={20} 
                color={COLORS.textLight} 
              />
              <Text style={styles.tabText}>
                Plans
              </Text>
            </View>
          )}
        </TouchableWeb>

        <TouchableWeb
          style={styles.tab}
          onPress={() => setActiveTab('analytics')}
        >
          {activeTab === 'analytics' ? (
            <LinearGradient
              colors={GRADIENTS.header}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.activeTabGradient}
            >
              <MaterialCommunityIcons 
                name="chart-bar" 
                size={20} 
                color={COLORS.white} 
              />
              <Text style={styles.activeTabText}>
                Analytics
              </Text>
            </LinearGradient>
          ) : (
            <View style={styles.inactiveTabContent}>
              <MaterialCommunityIcons 
                name="chart-bar" 
                size={20} 
                color={COLORS.textLight} 
              />
              <Text style={styles.tabText}>
                Analytics
              </Text>
            </View>
          )}
        </TouchableWeb>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {renderTabContent()}
      </ScrollView>

      {/* Payment Analytics Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={analyticsModalVisible}
        onRequestClose={() => setAnalyticsModalVisible(false)}
      >
        <View style={styles.analyticsModalOverlay}>
          <View style={styles.analyticsModalContent}>
            {/* Modal Header */}
            <View style={styles.analyticsHeader}>
              <Text style={styles.analyticsTitle}>Payment Analytics</Text>
              <TouchableWeb
                onPress={() => setAnalyticsModalVisible(false)}
                style={styles.analyticsCloseButton}
              >
                <MaterialCommunityIcons name="close" size={24} color={COLORS.text} />
              </TouchableWeb>
            </View>

            {/* Analytics Tabs */}
            <View style={styles.analyticsTabContainer}>
              <TouchableWeb
                style={[styles.analyticsTab, analyticsTab === 'revenue' && styles.analyticsActiveTab]}
                onPress={() => setAnalyticsTab('revenue')}
              >
                <MaterialCommunityIcons 
                  name="chart-line" 
                  size={18} 
                  color={analyticsTab === 'revenue' ? COLORS.white : COLORS.textLight}
                />
                <Text style={[styles.analyticsTabText, analyticsTab === 'revenue' && styles.analyticsActiveTabText]}>
                  Revenue
                </Text>
              </TouchableWeb>

              <TouchableWeb
                style={[styles.analyticsTab, analyticsTab === 'subscriptions' && styles.analyticsActiveTab]}
                onPress={() => setAnalyticsTab('subscriptions')}
              >
                <MaterialCommunityIcons 
                  name="crown" 
                  size={18} 
                  color={analyticsTab === 'subscriptions' ? COLORS.white : COLORS.textLight}
                />
                <Text style={[styles.analyticsTabText, analyticsTab === 'subscriptions' && styles.analyticsActiveTabText]}>
                  Subscriptions
                </Text>
              </TouchableWeb>

              <TouchableWeb
                style={[styles.analyticsTab, analyticsTab === 'services' && styles.analyticsActiveTab]}
                onPress={() => setAnalyticsTab('services')}
              >
                <MaterialCommunityIcons 
                  name="medical-bag" 
                  size={18} 
                  color={analyticsTab === 'services' ? COLORS.white : COLORS.textLight}
                />
                <Text style={[styles.analyticsTabText, analyticsTab === 'services' && styles.analyticsActiveTabText]}>
                  Services
                </Text>
              </TouchableWeb>
            </View>

            {/* Analytics Content */}
            <ScrollView style={styles.analyticsContent} showsVerticalScrollIndicator={false}>
              {analyticsTab === 'revenue' && (
                <View>
                  {/* Main Stats */}
                  <View style={styles.analyticsStatsRow}>
                    <View style={styles.analyticsMainStatCard}>
                      <MaterialCommunityIcons name="cash-multiple" size={40} color="#4CAF50" />
                      <Text style={styles.analyticsMainStatValue}>J$18,876,000</Text>
                      <Text style={styles.analyticsMainStatLabel}>Total Revenue</Text>
                      <View style={styles.analyticsTrendBadge}>
                        <MaterialCommunityIcons name="trending-up" size={14} color="#4CAF50" />
                        <Text style={styles.analyticsTrendText}>+12.5%</Text>
                      </View>
                    </View>
                    <View style={styles.analyticsMainStatCard}>
                      <MaterialCommunityIcons name="calendar-month" size={40} color="#2196F3" />
                      <Text style={styles.analyticsMainStatValue}>J$2,787,500</Text>
                      <Text style={styles.analyticsMainStatLabel}>This Month</Text>
                      <View style={styles.analyticsTrendBadge}>
                        <MaterialCommunityIcons name="trending-up" size={14} color="#4CAF50" />
                        <Text style={styles.analyticsTrendText}>+8.3%</Text>
                      </View>
                    </View>
                  </View>

                  {/* Quick Stats Grid */}
                  <View style={styles.analyticsQuickStats}>
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

                  {/* Top Client */}
                  <View style={styles.analyticsTopCard}>
                    <View style={styles.analyticsTopHeader}>
                      <MaterialCommunityIcons name="crown" size={24} color="#FFD700" />
                      <Text style={styles.analyticsTopTitle}>Top Client</Text>
                    </View>
                    <View style={styles.analyticsTopContent}>
                      <View style={styles.analyticsTopAvatar}>
                        <MaterialCommunityIcons name="account" size={32} color={COLORS.white} />
                      </View>
                      <View style={styles.analyticsTopInfo}>
                        <Text style={styles.analyticsTopName}>Sarah Johnson</Text>
                        <Text style={styles.analyticsTopSubtext}>Premium Member</Text>
                        <View style={styles.analyticsTopStats}>
                          <View style={styles.analyticsTopStatItem}>
                            <MaterialCommunityIcons name="calendar-multiple" size={16} color={COLORS.primary} />
                            <Text style={styles.analyticsTopStatText}>42 appointments</Text>
                          </View>
                          <View style={styles.analyticsTopStatItem}>
                            <MaterialCommunityIcons name="cash" size={16} color={COLORS.success} />
                            <Text style={styles.analyticsTopStatText}>J$894,500</Text>
                          </View>
                        </View>
                      </View>
                    </View>
                  </View>

                  {/* Top Service */}
                  <View style={styles.analyticsTopCard}>
                    <View style={styles.analyticsTopHeader}>
                      <MaterialCommunityIcons name="star" size={24} color="#FFD700" />
                      <Text style={styles.analyticsTopTitle}>Top Service</Text>
                    </View>
                    <View style={styles.analyticsTopContent}>
                      <View style={[styles.analyticsTopAvatar, { backgroundColor: COLORS.primary }]}>
                        <MaterialCommunityIcons name="medical-bag" size={32} color={COLORS.white} />
                      </View>
                      <View style={styles.analyticsTopInfo}>
                        <Text style={styles.analyticsTopName}>Home Nursing</Text>
                        <Text style={styles.analyticsTopSubtext}>Most Popular Service</Text>
                        <View style={styles.analyticsTopStats}>
                          <View style={styles.analyticsTopStatItem}>
                            <MaterialCommunityIcons name="account-multiple" size={16} color={COLORS.primary} />
                            <Text style={styles.analyticsTopStatText}>456 bookings</Text>
                          </View>
                          <View style={styles.analyticsTopStatItem}>
                            <MaterialCommunityIcons name="cash" size={16} color={COLORS.success} />
                            <Text style={styles.analyticsTopStatText}>J$6,810,000</Text>
                          </View>
                        </View>
                      </View>
                    </View>
                    <View style={styles.analyticsProgressBar}>
                      <View style={[styles.analyticsProgressFill, { width: '45%' }]} />
                    </View>
                    <Text style={styles.analyticsProgressText}>45% of total revenue</Text>
                  </View>

                  {/* Revenue Chart */}
                  <View style={styles.analyticsChartCard}>
                    <Text style={styles.analyticsChartTitle}>Monthly Revenue Trend</Text>
                    <View style={styles.analyticsChartPlaceholder}>
                      <MaterialCommunityIcons name="chart-line" size={48} color={COLORS.primary} />
                      <Text style={styles.analyticsChartText}>Revenue trend visualization</Text>
                    </View>
                  </View>
                </View>
              )}

              {analyticsTab === 'subscriptions' && (
                <View>
                  {/* Subscription Stats */}
                  <View style={styles.analyticsStatsRow}>
                    <View style={styles.analyticsMainStatCard}>
                      <MaterialCommunityIcons name="account-multiple" size={40} color="#9C27B0" />
                      <Text style={styles.analyticsMainStatValue}>54</Text>
                      <Text style={styles.analyticsMainStatLabel}>Active Subscribers</Text>
                      <View style={styles.analyticsTrendBadge}>
                        <MaterialCommunityIcons name="trending-up" size={14} color="#4CAF50" />
                        <Text style={styles.analyticsTrendText}>+6 new</Text>
                      </View>
                    </View>
                    <View style={styles.analyticsMainStatCard}>
                      <MaterialCommunityIcons name="cash" size={40} color="#FF9800" />
                      <Text style={styles.analyticsMainStatValue}>J$1,529,000</Text>
                      <Text style={styles.analyticsMainStatLabel}>Monthly Revenue</Text>
                      <View style={styles.analyticsTrendBadge}>
                        <MaterialCommunityIcons name="trending-up" size={14} color="#4CAF50" />
                        <Text style={styles.analyticsTrendText}>+15%</Text>
                      </View>
                    </View>
                  </View>

                  {/* Quick Stats */}
                  <View style={styles.analyticsQuickStats}>
                    <View style={styles.quickStatItem}>
                      <MaterialCommunityIcons name="account-plus" size={24} color="#4CAF50" />
                      <Text style={styles.quickStatValue}>12</Text>
                      <Text style={styles.quickStatLabel}>New This Month</Text>
                    </View>
                    <View style={styles.quickStatItem}>
                      <MaterialCommunityIcons name="sync" size={24} color="#2196F3" />
                      <Text style={styles.quickStatValue}>6</Text>
                      <Text style={styles.quickStatLabel}>Renewals</Text>
                    </View>
                    <View style={styles.quickStatItem}>
                      <MaterialCommunityIcons name="account-cancel" size={24} color="#F44336" />
                      <Text style={styles.quickStatValue}>2</Text>
                      <Text style={styles.quickStatLabel}>Cancelled</Text>
                    </View>
                  </View>

                  {/* Plans Performance */}
                  <View style={styles.analyticsPlansContainer}>
                    <Text style={styles.analyticsSectionTitle}>Plan Performance</Text>
                    
                    <View style={styles.analyticsPlanCard}>
                      <View style={styles.analyticsPlanHeader}>
                        <View style={[styles.analyticsPlanIcon, { backgroundColor: '#E3F2FD' }]}>
                          <MaterialCommunityIcons name="medical-bag" size={24} color="#2196F3" />
                        </View>
                        <View style={styles.analyticsPlanInfo}>
                          <Text style={styles.analyticsPlanName}>Basic Care</Text>
                          <Text style={styles.analyticsPlanPrice}>J$15,000/month</Text>
                        </View>
                      </View>
                      <View style={styles.analyticsPlanStats}>
                        <View style={styles.analyticsPlanStatItem}>
                          <Text style={styles.analyticsPlanStatValue}>24</Text>
                          <Text style={styles.analyticsPlanStatLabel}>subscribers</Text>
                        </View>
                        <View style={styles.analyticsPlanStatItem}>
                          <Text style={[styles.analyticsPlanStatValue, { color: COLORS.success }]}>J$360,000</Text>
                          <Text style={styles.analyticsPlanStatLabel}>monthly revenue</Text>
                        </View>
                      </View>
                      <View style={styles.analyticsProgressBar}>
                        <View style={[styles.analyticsProgressFill, { width: '44%', backgroundColor: '#2196F3' }]} />
                      </View>
                      <Text style={styles.analyticsProgressText}>44% of subscribers</Text>
                    </View>

                    <View style={styles.analyticsPlanCard}>
                      <View style={styles.analyticsPlanHeader}>
                        <View style={[styles.analyticsPlanIcon, { backgroundColor: '#FFF3E0' }]}>
                          <MaterialCommunityIcons name="crown" size={24} color="#FF9800" />
                        </View>
                        <View style={styles.analyticsPlanInfo}>
                          <Text style={styles.analyticsPlanName}>Premium Care</Text>
                          <Text style={styles.analyticsPlanPrice}>J$30,000/month</Text>
                        </View>
                      </View>
                      <View style={styles.analyticsPlanStats}>
                        <View style={styles.analyticsPlanStatItem}>
                          <Text style={styles.analyticsPlanStatValue}>18</Text>
                          <Text style={styles.analyticsPlanStatLabel}>subscribers</Text>
                        </View>
                        <View style={styles.analyticsPlanStatItem}>
                          <Text style={[styles.analyticsPlanStatValue, { color: COLORS.success }]}>J$540,000</Text>
                          <Text style={styles.analyticsPlanStatLabel}>monthly revenue</Text>
                        </View>
                      </View>
                      <View style={styles.analyticsProgressBar}>
                        <View style={[styles.analyticsProgressFill, { width: '33%', backgroundColor: '#FF9800' }]} />
                      </View>
                      <Text style={styles.analyticsProgressText}>33% of subscribers</Text>
                    </View>

                    <View style={styles.analyticsPlanCard}>
                      <View style={styles.analyticsPlanHeader}>
                        <View style={[styles.analyticsPlanIcon, { backgroundColor: '#F3E5F5' }]}>
                          <MaterialCommunityIcons name="diamond-stone" size={24} color="#9C27B0" />
                        </View>
                        <View style={styles.analyticsPlanInfo}>
                          <Text style={styles.analyticsPlanName}>Elite Care</Text>
                          <Text style={styles.analyticsPlanPrice}>J$52,500/month</Text>
                        </View>
                      </View>
                      <View style={styles.analyticsPlanStats}>
                        <View style={styles.analyticsPlanStatItem}>
                          <Text style={styles.analyticsPlanStatValue}>12</Text>
                          <Text style={styles.analyticsPlanStatLabel}>subscribers</Text>
                        </View>
                        <View style={styles.analyticsPlanStatItem}>
                          <Text style={[styles.analyticsPlanStatValue, { color: COLORS.success }]}>J$630,000</Text>
                          <Text style={styles.analyticsPlanStatLabel}>monthly revenue</Text>
                        </View>
                      </View>
                      <View style={styles.analyticsProgressBar}>
                        <View style={[styles.analyticsProgressFill, { width: '22%', backgroundColor: '#9C27B0' }]} />
                      </View>
                      <Text style={styles.analyticsProgressText}>22% of subscribers</Text>
                    </View>
                  </View>
                </View>
              )}

              {analyticsTab === 'services' && (
                <View>
                  {/* Service Stats */}
                  <View style={styles.analyticsStatsRow}>
                    <View style={styles.analyticsMainStatCard}>
                      <MaterialCommunityIcons name="medical-bag" size={40} color="#4CAF50" />
                      <Text style={styles.analyticsMainStatValue}>8</Text>
                      <Text style={styles.analyticsMainStatLabel}>Total Services</Text>
                    </View>
                    <View style={styles.analyticsMainStatCard}>
                      <MaterialCommunityIcons name="chart-bar" size={40} color="#2196F3" />
                      <Text style={styles.analyticsMainStatValue}>1,768</Text>
                      <Text style={styles.analyticsMainStatLabel}>Total Bookings</Text>
                    </View>
                  </View>

                  {/* Top Service (Featured) */}
                  <View style={styles.analyticsTopCard}>
                    <View style={styles.analyticsTopHeader}>
                      <MaterialCommunityIcons name="trophy" size={24} color="#FFD700" />
                      <Text style={styles.analyticsTopTitle}>Best Performing Service</Text>
                    </View>
                    <View style={styles.analyticsTopContent}>
                      <View style={[styles.analyticsTopAvatar, { backgroundColor: COLORS.primary }]}>
                        <MaterialCommunityIcons name="medical-bag" size={32} color={COLORS.white} />
                      </View>
                      <View style={styles.analyticsTopInfo}>
                        <Text style={styles.analyticsTopName}>Home Nursing</Text>
                        <Text style={styles.analyticsTopSubtext}>$65/hour</Text>
                        <View style={styles.analyticsTopStats}>
                          <View style={styles.analyticsTopStatItem}>
                            <MaterialCommunityIcons name="calendar-check" size={16} color={COLORS.primary} />
                            <Text style={styles.analyticsTopStatText}>456 bookings</Text>
                          </View>
                          <View style={styles.analyticsTopStatItem}>
                            <MaterialCommunityIcons name="star" size={16} color="#FFD700" />
                            <Text style={styles.analyticsTopStatText}>4.9 rating</Text>
                          </View>
                        </View>
                      </View>
                    </View>
                    <View style={styles.analyticsRevenueSection}>
                      <Text style={styles.analyticsRevenueLabel}>Total Revenue</Text>
                      <Text style={styles.analyticsRevenueValue}>J$6,810,000</Text>
                    </View>
                    <View style={styles.analyticsProgressBar}>
                      <View style={[styles.analyticsProgressFill, { width: '45%' }]} />
                    </View>
                    <Text style={styles.analyticsProgressText}>45% of total service revenue</Text>
                  </View>

                  {/* All Services */}
                  <Text style={styles.analyticsSectionTitle}>All Services Performance</Text>
                  <View style={styles.analyticsServicesContainer}>
                    <View style={styles.analyticsServiceItem}>
                      <View style={styles.analyticsServiceHeader}>
                        <View style={styles.analyticsServiceIcon}>
                          <MaterialCommunityIcons name="medical-bag" size={20} color={COLORS.primary} />
                        </View>
                        <View style={styles.analyticsServiceInfo}>
                          <Text style={styles.analyticsServiceName}>Home Nursing</Text>
                          <Text style={styles.analyticsServiceBookings}>456 bookings</Text>
                        </View>
                        <Text style={styles.analyticsServiceRevenue}>J$6,810,000</Text>
                      </View>
                      <View style={styles.analyticsServiceBar}>
                        <View style={[styles.analyticsServiceBarFill, { width: '45%', backgroundColor: COLORS.primary }]} />
                      </View>
                    </View>

                    <View style={styles.analyticsServiceItem}>
                      <View style={styles.analyticsServiceHeader}>
                        <View style={[styles.analyticsServiceIcon, { backgroundColor: '#FFF3E0' }]}>
                          <MaterialCommunityIcons name="arm-flex" size={20} color="#FF9800" />
                        </View>
                        <View style={styles.analyticsServiceInfo}>
                          <Text style={styles.analyticsServiceName}>Physiotherapy</Text>
                          <Text style={styles.analyticsServiceBookings}>352 bookings</Text>
                        </View>
                        <Text style={styles.analyticsServiceRevenue}>J$5,863,500</Text>
                      </View>
                      <View style={styles.analyticsServiceBar}>
                        <View style={[styles.analyticsServiceBarFill, { width: '39%', backgroundColor: '#FF9800' }]} />
                      </View>
                    </View>

                    <View style={styles.analyticsServiceItem}>
                      <View style={styles.analyticsServiceHeader}>
                        <View style={[styles.analyticsServiceIcon, { backgroundColor: '#E8F5E9' }]}>
                          <MaterialCommunityIcons name="water" size={20} color="#4CAF50" />
                        </View>
                        <View style={styles.analyticsServiceInfo}>
                          <Text style={styles.analyticsServiceName}>Blood Draws</Text>
                          <Text style={styles.analyticsServiceBookings}>298 bookings</Text>
                        </View>
                        <Text style={styles.analyticsServiceRevenue}>J$3,331,500</Text>
                      </View>
                      <View style={styles.analyticsServiceBar}>
                        <View style={[styles.analyticsServiceBarFill, { width: '22%', backgroundColor: '#4CAF50' }]} />
                      </View>
                    </View>

                    <View style={styles.analyticsServiceItem}>
                      <View style={styles.analyticsServiceHeader}>
                        <View style={[styles.analyticsServiceIcon, { backgroundColor: '#F3E5F5' }]}>
                          <MaterialCommunityIcons name="bandage" size={20} color="#9C27B0" />
                        </View>
                        <View style={styles.analyticsServiceInfo}>
                          <Text style={styles.analyticsServiceName}>Dressings</Text>
                          <Text style={styles.analyticsServiceBookings}>245 bookings</Text>
                        </View>
                        <Text style={styles.analyticsServiceRevenue}>J$2,450,000</Text>
                      </View>
                      <View style={styles.analyticsServiceBar}>
                        <View style={[styles.analyticsServiceBarFill, { width: '16%', backgroundColor: '#9C27B0' }]} />
                      </View>
                    </View>

                    <View style={styles.analyticsServiceItem}>
                      <View style={styles.analyticsServiceHeader}>
                        <View style={[styles.analyticsServiceIcon, { backgroundColor: '#E1F5FE' }]}>
                          <MaterialCommunityIcons name="heart-pulse" size={20} color="#00BCD4" />
                        </View>
                        <View style={styles.analyticsServiceInfo}>
                          <Text style={styles.analyticsServiceName}>Vital Signs</Text>
                          <Text style={styles.analyticsServiceBookings}>217 bookings</Text>
                        </View>
                        <Text style={styles.analyticsServiceRevenue}>J$759,500</Text>
                      </View>
                      <View style={styles.analyticsServiceBar}>
                        <View style={[styles.analyticsServiceBarFill, { width: '5%', backgroundColor: '#00BCD4' }]} />
                      </View>
                    </View>
                  </View>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
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
    gap: 8,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  tab: {
    flex: 1,
  },
  activeTabGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 20,
    minHeight: 36,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  inactiveTabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 20,
    minHeight: 36,
    gap: 6,
    backgroundColor: COLORS.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  tabText: {
    fontSize: 11,
    fontFamily: 'Poppins_700Bold',
    color: COLORS.textMuted,
  },
  activeTabText: {
    fontSize: 11,
    fontFamily: 'Poppins_700Bold',
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
  // Analytics Button
  analyticsButton: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 6,
  },
  analyticsButtonText: {
    fontSize: 13,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.white,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  // Analytics Modal Styles
  analyticsModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  analyticsModalContent: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    width: '100%',
    maxWidth: 500,
    maxHeight: '90%',
    flex: 1,
    flexDirection: 'column',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  analyticsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  analyticsTitle: {
    fontSize: 20,
    fontFamily: 'Poppins_700Bold',
    color: COLORS.text,
  },
  analyticsCloseButton: {
    padding: SPACING.sm,
  },
  analyticsTabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingHorizontal: 20,
  },
  analyticsTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    gap: 6,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  analyticsActiveTab: {
    borderBottomColor: COLORS.primary,
  },
  analyticsTabText: {
    fontSize: 13,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.textLight,
  },
  analyticsActiveTabText: {
    color: COLORS.primary,
  },
  analyticsContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  // New Analytics Styles
  analyticsStatsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  analyticsMainStatCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  analyticsMainStatValue: {
    fontSize: 24,
    fontFamily: 'Poppins_700Bold',
    color: COLORS.text,
    marginTop: 8,
  },
  analyticsMainStatLabel: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.textLight,
    marginTop: 4,
    textAlign: 'center',
  },
  analyticsTrendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
    gap: 4,
  },
  analyticsTrendText: {
    fontSize: 11,
    fontFamily: 'Poppins_600SemiBold',
    color: '#4CAF50',
  },
  analyticsQuickStats: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 12,
    marginBottom: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  quickStatItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  quickStatValue: {
    fontSize: 18,
    fontFamily: 'Poppins_700Bold',
    color: COLORS.text,
    marginTop: 6,
  },
  quickStatLabel: {
    fontSize: 10,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.textLight,
    marginTop: 2,
    textAlign: 'center',
  },
  analyticsTopCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  analyticsTopHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  analyticsTopTitle: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.text,
  },
  analyticsTopContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  analyticsTopAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  analyticsTopInfo: {
    flex: 1,
  },
  analyticsTopName: {
    fontSize: 18,
    fontFamily: 'Poppins_700Bold',
    color: COLORS.text,
  },
  analyticsTopSubtext: {
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.textLight,
    marginTop: 2,
  },
  analyticsTopStats: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 8,
  },
  analyticsTopStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  analyticsTopStatText: {
    fontSize: 12,
    fontFamily: 'Poppins_500Medium',
    color: COLORS.text,
  },
  analyticsRevenueSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  analyticsRevenueLabel: {
    fontSize: 13,
    fontFamily: 'Poppins_500Medium',
    color: COLORS.textLight,
  },
  analyticsRevenueValue: {
    fontSize: 20,
    fontFamily: 'Poppins_700Bold',
    color: COLORS.success,
  },
  analyticsProgressBar: {
    height: 8,
    backgroundColor: COLORS.lightGray,
    borderRadius: 4,
    overflow: 'hidden',
    marginTop: 12,
  },
  analyticsProgressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 4,
  },
  analyticsProgressText: {
    fontSize: 11,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.textLight,
    marginTop: 6,
    textAlign: 'center',
  },
  analyticsSectionTitle: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.text,
    marginBottom: 12,
    marginTop: 4,
  },
  analyticsStatsGrid: {
    flexDirection: 'row',
    gap: 15,
    marginBottom: 20,
  },
  analyticsStatCard: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  analyticsStatValue: {
    fontSize: 18,
    fontFamily: 'Poppins_700Bold',
    color: COLORS.text,
    marginTop: 8,
  },
  analyticsStatLabel: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.textLight,
    marginTop: 4,
    textAlign: 'center',
  },
  analyticsChartCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  analyticsChartTitle: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.text,
    marginBottom: 12,
  },
  analyticsChartPlaceholder: {
    height: 150,
    backgroundColor: COLORS.background,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  analyticsChartText: {
    marginTop: 10,
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.textLight,
  },
  analyticsPlansContainer: {
    gap: 12,
  },
  analyticsPlanCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  analyticsPlanHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  analyticsPlanIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  analyticsPlanInfo: {
    flex: 1,
  },
  analyticsPlanName: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.text,
  },
  analyticsPlanPrice: {
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.textLight,
    marginTop: 2,
  },
  analyticsPlanStats: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 12,
  },
  analyticsPlanStatItem: {
    flex: 1,
  },
  analyticsPlanStatValue: {
    fontSize: 18,
    fontFamily: 'Poppins_700Bold',
    color: COLORS.text,
  },
  analyticsPlanStatLabel: {
    fontSize: 11,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.textLight,
    marginTop: 2,
  },
  analyticsSubscriberCount: {
    fontSize: 13,
    fontFamily: 'Poppins_500Medium',
    color: COLORS.primary,
  },
  analyticsServiceTitle: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.text,
    marginBottom: 15,
  },
  analyticsServicesContainer: {
    gap: 12,
  },
  analyticsServiceItem: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  analyticsServiceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  analyticsServiceIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  analyticsServiceInfo: {
    flex: 1,
  },
  analyticsServiceName: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.text,
  },
  analyticsServiceBookings: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.textLight,
    marginTop: 2,
  },
  analyticsServiceRevenue: {
    fontSize: 15,
    fontFamily: 'Poppins_700Bold',
    color: COLORS.success,
  },
  analyticsServiceBar: {
    height: 8,
    backgroundColor: COLORS.lightGray,
    borderRadius: 4,
    overflow: 'hidden',
  },
  analyticsServiceBarFill: {
    height: '100%',
    borderRadius: 4,
  },
});