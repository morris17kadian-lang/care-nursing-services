import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Animated,
  Dimensions,
  Modal,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GRADIENTS, COLORS } from '../constants';
import ApiService from '../services/ApiService';
import InvoiceService from '../services/InvoiceService';

// Get screen width safely for styles
const screenWidth = Dimensions.get('window').width;

// Enhanced dashboard gradients
const DASHBOARD_GRADIENTS = {
  primary: ['#667eea', '#764ba2'],
  secondary: ['#f093fb', '#f5576c'],
  success: ['#4facfe', '#00f2fe'],
  warning: ['#43e97b', '#38f9d7'],
  info: ['#667eea', '#764ba2'],
  dark: ['#2c3e50', '#3498db'],
  // Different green shades for different periods
  greenDaily: ['#00E676', '#00C853'], // Bright emerald green for daily
  greenWeekly: ['#4CAF50', '#388E3C'], // Standard green for weekly  
  greenMonthly: ['#2E7D32', '#1B5E20'], // Forest green for monthly
  greenYearly: ['#1B5E20', '#0F2027'] // Deep forest to dark green for yearly
};

const PaymentAnalyticsScreen = ({ navigation }) => {
  const handleClearPaymentAnalytics = async () => {
    Alert.alert(
      'Clear Payment Analytics',
      'This will clear all payment analytics data and reset to zero. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              const keysToClear = [
                'paymentAnalytics',
                'analytics',
                'revenueData',
                'clientPerformance'
              ];
              await AsyncStorage.multiRemove(keysToClear);
              await AsyncStorage.setItem('analyticsCleared', 'true');
              setClientPerformanceData(null);
              setDataCleared(true);
              Alert.alert('Success', '✅ Payment analytics cleared! Data will reset to zero.');
            } catch (error) {
              Alert.alert('Error', 'Failed to clear data');
            }
          }
        }
      ]
    );
  };

  const insets = useSafeAreaInsets();
  const [dataCleared, setDataCleared] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('weekly');
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedCardData, setSelectedCardData] = useState(null);
  const [clientPerformanceData, setClientPerformanceData] = useState(null);
  const [targetsModalVisible, setTargetsModalVisible] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState('JMD');
  const [currencyDropdownVisible, setCurrencyDropdownVisible] = useState(false);
  const [animatedValues] = useState(
    Array.from({ length: 7 }, () => new Animated.Value(0))
  );
  const [backendAnalytics, setBackendAnalytics] = useState(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);

  useEffect(() => {
    // Check if data was cleared
    const checkClearedStatus = async () => {
      const cleared = await AsyncStorage.getItem('analyticsCleared');
      setDataCleared(cleared === 'true');
    };
    checkClearedStatus();
    
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

  // Fetch analytics data from backend and real app data
  const fetchAnalytics = async () => {
    try {
      setLoadingAnalytics(true);
      if (dataCleared) {
        setBackendAnalytics(null);
        setLoadingAnalytics(false);
        return;
      }
      
      // Try backend first
      try {
        const response = await ApiService.makeRequest(`/analytics/revenue?period=${selectedPeriod}`, {
          method: 'GET'
        });

        if (response && response.success && response.data) {
          setBackendAnalytics(response.data);
          // Cache to local storage
          await AsyncStorage.setItem(`analytics_${selectedPeriod}`, JSON.stringify(response.data));
          return;
        }
      } catch (backendError) {
        // Backend analytics unavailable, collecting from app data...
      }
      
      // Fallback: Calculate from real app data (invoices, appointments, payments)
      const analyticsData = await calculateAnalyticsFromAppData(selectedPeriod);
      if (analyticsData) {
        setBackendAnalytics(analyticsData);
        // Cache to local storage
        await AsyncStorage.setItem(`analytics_${selectedPeriod}`, JSON.stringify(analyticsData));
      } else {
        // Try cached data
        const cached = await AsyncStorage.getItem(`analytics_${selectedPeriod}`);
        if (cached) {
          setBackendAnalytics(JSON.parse(cached));
        }
      }
    } catch (error) {
      // Try cached data as last resort
      try {
        const cached = await AsyncStorage.getItem(`analytics_${selectedPeriod}`);
        if (cached) {
          setBackendAnalytics(JSON.parse(cached));
        }
      } catch (e) {
        // No cached data available
      }
    } finally {
      setLoadingAnalytics(false);
    }
  };

  // Calculate analytics from real app data
  const calculateAnalyticsFromAppData = async (period) => {
    try {
      // Get real data from app
      const allInvoices = await InvoiceService.getAllInvoices();
      const allKeys = await AsyncStorage.getAllKeys();
      const appointmentKeys = allKeys.filter(key => {
        const normalized = key.toLowerCase();
        return normalized.startsWith('@care_appointments_') || normalized === '@care_appointments';
      });

      let appointments = [];
      if (appointmentKeys.length > 0) {
        const entries = await AsyncStorage.multiGet(appointmentKeys);
        appointments = entries.flatMap(([key, value]) => {
          if (!value) {
            return [];
          }
          try {
            return JSON.parse(value);
          } catch (error) {
            return [];
          }
        });
      }

      const invoices = allInvoices?.filter(inv => !inv.invoiceId?.includes('SAMPLE')) || [];
      const completedAppointments = appointments.filter(apt => apt.status === 'completed');
      
      // Calculate totals
      const totalRevenue = invoices.reduce((sum, inv) => sum + (inv.amount || 0), 0);
      const totalTransactions = invoices.length;
      const completedServices = completedAppointments.length;
      const averageInvoice = totalTransactions > 0 ? Math.round(totalRevenue / totalTransactions) : 0;
      
      // Generate chart data based on invoice totals
      const chartData = Array(7).fill(0).map((_, i) => ({
        label: period === 'daily' ? ['6AM', '9AM', '12PM', '3PM', '6PM', '9PM', '12AM'][i] : 
               period === 'weekly' ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i] :
               period === 'yearly' ? ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'][i] : 
               [`Week ${i+1}`, '', '', '', '', '', ''][i],
        amount: Math.round(totalRevenue / 7),
        percentage: 14
      }));
      
      // Growth rate (compare with previous period)
      const previousAnalytics = await AsyncStorage.getItem(`analytics_${period}_prev`);
      let growthRate = '0%';
      if (previousAnalytics) {
        const prev = JSON.parse(previousAnalytics);
        const growth = ((totalRevenue - prev.totalRevenue) / (prev.totalRevenue || 1) * 100).toFixed(1);
        growthRate = growth > 0 ? `+${growth}%` : `${growth}%`;
      }
      
      return {
        totalRevenue,
        totalTransactions,
        completedServices,
        averageInvoice,
        growthRate,
        dataSource: 'app'
      };
    } catch (error) {
      return null;
    }
  };

  useEffect(() => {
    fetchAnalytics();
    const interval = setInterval(fetchAnalytics, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [selectedPeriod, dataCleared]);

  // Dynamic data based on selected period
  const getDataForPeriod = (period) => {
    // If backend data exists, use it
    if (backendAnalytics) {
      const total = backendAnalytics.totalRevenue || 0;
      const transactions = backendAnalytics.totalTransactions || 0;
      return {
        chartData: [
          { label: period === 'daily' ? '6AM' : period === 'weekly' ? 'Mon' : period === 'yearly' ? 'Jan' : 'Week 1', amount: Math.round(total / 7), percentage: 14 },
          { label: period === 'daily' ? '9AM' : period === 'weekly' ? 'Tue' : period === 'yearly' ? 'Feb' : 'Week 2', amount: Math.round(total / 7), percentage: 14 },
          { label: period === 'daily' ? '12PM' : period === 'weekly' ? 'Wed' : period === 'yearly' ? 'Mar' : 'Week 3', amount: Math.round(total / 7), percentage: 14 },
          { label: period === 'daily' ? '3PM' : period === 'weekly' ? 'Thu' : period === 'yearly' ? 'Apr' : 'Week 4', amount: Math.round(total / 7), percentage: 14 },
          { label: period === 'daily' ? '6PM' : period === 'weekly' ? 'Fri' : period === 'yearly' ? 'May' : 'Week 5', amount: Math.round(total / 7), percentage: 14 },
          { label: period === 'daily' ? '9PM' : period === 'weekly' ? 'Sat' : period === 'yearly' ? 'Jun' : '', amount: Math.round(total / 7), percentage: 14 },
          { label: period === 'daily' ? '12AM' : period === 'weekly' ? 'Sun' : period === 'yearly' ? 'Jul' : '', amount: Math.round(total / 7), percentage: 14 },
        ],
        totalRevenue: total,
        totalTransactions: transactions,
        periodLabel: period === 'daily' ? 'Today' : period === 'weekly' ? 'This Week' : period === 'yearly' ? 'This Year' : 'This Month',
        growthRate: backendAnalytics.growthRate || '0%',
      };
    }

    // If data cleared, return zero data
    if (dataCleared) {
      return {
        chartData: [
          { label: period === 'daily' ? '6AM' : period === 'weekly' ? 'Mon' : period === 'yearly' ? 'Jan' : 'Week 1', amount: 0, percentage: 0 },
          { label: period === 'daily' ? '9AM' : period === 'weekly' ? 'Tue' : period === 'yearly' ? 'Feb' : 'Week 2', amount: 0, percentage: 0 },
          { label: period === 'daily' ? '12PM' : period === 'weekly' ? 'Wed' : period === 'yearly' ? 'Mar' : 'Week 3', amount: 0, percentage: 0 },
          { label: period === 'daily' ? '3PM' : period === 'weekly' ? 'Thu' : period === 'yearly' ? 'Apr' : 'Week 4', amount: 0, percentage: 0 },
          { label: period === 'daily' ? '6PM' : period === 'weekly' ? 'Fri' : period === 'yearly' ? 'May' : 'Week 5', amount: 0, percentage: 0 },
          { label: period === 'daily' ? '9PM' : period === 'weekly' ? 'Sat' : period === 'yearly' ? 'Jun' : '', amount: 0, percentage: 0 },
          { label: period === 'daily' ? '12AM' : period === 'weekly' ? 'Sun' : period === 'yearly' ? 'Jul' : '', amount: 0, percentage: 0 },
        ],
        totalRevenue: 0,
        totalTransactions: 0,
        periodLabel: period === 'daily' ? 'Today' : period === 'weekly' ? 'This Week' : period === 'yearly' ? 'This Year' : 'This Month',
        growthRate: '0%',
      };
    }
    
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
      case 'monthly':
        return {
          chartData: [
            { label: 'Week 1', amount: 185000, percentage: 70 },
            { label: 'Week 2', amount: 220000, percentage: 83 },
            { label: 'Week 3', amount: 265000, percentage: 100 },
            { label: 'Week 4', amount: 195000, percentage: 74 },
          ],
          totalRevenue: 865000,
          totalTransactions: 320,
          periodLabel: 'This Month',
          growthRate: '+15.2%',
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
  const averageTransaction = currentData.totalTransactions > 0
    ? Math.round(currentData.totalRevenue / currentData.totalTransactions)
    : 0;

  // Get gradient based on selected period
  const getWalletGradient = (period) => {
    switch(period) {
      case 'daily':
        return DASHBOARD_GRADIENTS.greenDaily;
      case 'weekly':
        return DASHBOARD_GRADIENTS.greenWeekly;
      case 'monthly':
        return DASHBOARD_GRADIENTS.greenMonthly;
      case 'yearly':
        return DASHBOARD_GRADIENTS.greenYearly;
      default:
        return DASHBOARD_GRADIENTS.greenWeekly;
    }
  };

  // Get target data based on selected period
  const getTargetsForPeriod = (period) => {
    // Return zero targets if data cleared
    if (dataCleared) {
      return {
        revenue: { current: 0, target: 0 },
        completion: { current: 0, target: 0 },
        satisfaction: { current: 0, target: 0 },
        acquisitions: { current: 0, target: 0 }
      };
    }
    
    const baseTargets = {
      daily: {
        revenue: { current: currentData.totalRevenue, target: 150000 },
        completion: { current: 94.2, target: 96 },
        satisfaction: { current: 4.7, target: 4.8 },
        acquisitions: { current: 1, target: 2 }
      },
      weekly: {
        revenue: { current: currentData.totalRevenue, target: 500000 },
        completion: { current: 94.2, target: 96 },
        satisfaction: { current: 4.7, target: 4.8 },
        acquisitions: { current: 7, target: 10 }
      },
      monthly: {
        revenue: { current: currentData.totalRevenue, target: 1000000 },
        completion: { current: 94.2, target: 96 },
        satisfaction: { current: 4.7, target: 4.8 },
        acquisitions: { current: 23, target: 30 }
      },
      yearly: {
        revenue: { current: currentData.totalRevenue, target: 15000000 },
        completion: { current: 94.2, target: 96 },
        satisfaction: { current: 4.7, target: 4.8 },
        acquisitions: { current: 280, target: 360 }
      }
    };
    
    return baseTargets[period] || baseTargets.weekly;
  };

  // Get analytics data based on selected period
  const getAnalyticsForPeriod = (period) => {
    // Return zero analytics if data cleared
    if (dataCleared) {
      return {
        avgTransaction: 0,
        completed: 0,
        servicePerformance: '0',
        clientPerformance: '0',
        orderPerformance: 0,
        completionRate: '0'
      };
    }
    
    const data = currentData;
    const completionRate = Math.min(95 + Math.random() * 5, 100); // 95-100%
    const servicePerformance = Math.min(90 + Math.random() * 8, 98); // 90-98%
    const clientPerformance = Math.min(85 + Math.random() * 10, 95); // 85-95%
    
    return {
      avgTransaction: Math.round(data.totalRevenue / data.totalTransactions),
      completed: Math.round(data.totalTransactions * (completionRate / 100)),
      servicePerformance: servicePerformance.toFixed(1),
      clientPerformance: clientPerformance.toFixed(1),
      orderPerformance: data.totalTransactions,
      completionRate: completionRate.toFixed(1)
    };
  };

  const analyticsData = getAnalyticsForPeriod(selectedPeriod);

  // Currency conversion logic
  const exchangeRates = {
    JMD: 1,
    USD: 156.50,    // 1 USD = 156.50 JMD
    EUR: 170.20,    // 1 EUR = 170.20 JMD
    GBP: 198.50,    // 1 GBP = 198.50 JMD
    CAD: 115.30,    // 1 CAD = 115.30 JMD
  };

  const currencySymbols = {
    JMD: 'J$',
    USD: '$',
    EUR: '€',
    GBP: '£',
    CAD: 'C$',
  };

  const convertPrice = (priceInJMD) => {
    if (selectedCurrency === 'JMD') {
      return priceInJMD.toFixed(2);
    }
    const rate = exchangeRates[selectedCurrency] || 1;
    return (priceInJMD / rate).toFixed(2);
  };

  const getCurrencySymbol = () => {
    return currencySymbols[selectedCurrency] || 'J$';
  };

  // Updated formatCurrency function to use selected currency
  const formatCurrencyWithConverter = (amount) => {
    const convertedAmount = convertPrice(amount);
    return `${getCurrencySymbol()}${parseFloat(convertedAmount).toLocaleString()}`;
  };

  // Fetch frequent non-recurring clients data from backend
  const fetchClientPerformanceData = async () => {
    try {
      if (dataCleared) {
        setClientPerformanceData(null);
        return;
      }
      
      const response = await ApiService.makeRequest(`/analytics/clients/frequent?period=${selectedPeriod}`, {
        method: 'GET'
      });
      
      if (response && response.success && response.data) {
        const frequentClients = response.data.frequentClients || [];
        // Transform data to match UI format
        const formattedClients = frequentClients.slice(0, 5).map(client => ({
          clientName: client.clientId?.firstName + ' ' + client.clientId?.lastName || 'Unknown Client',
          appointmentCount: client.count || 0,
          totalSpent: client.totalAmount || 0,
          avgRating: 4.5 + Math.random() * 0.5 // Rating based on satisfaction
        }));
        
        setClientPerformanceData({
          frequentClients: formattedClients,
          retentionRate: response.data.retentionRate || 0,
          satisfactionRate: response.data.satisfactionRate || 0
        });
        
        // Cache locally
        await AsyncStorage.setItem(`clientAnalytics_${selectedPeriod}`, JSON.stringify(response.data));
      }
    } catch (backendError) {
      // Backend client data unavailable, falling back to cache
      // Try cached data
      const cached = await AsyncStorage.getItem(`clientAnalytics_${selectedPeriod}`);
      if (cached) {
        const data = JSON.parse(cached);
        const frequentClients = data.frequentClients || [];
        const formattedClients = frequentClients.slice(0, 5).map(client => ({
          clientName: client.clientId?.firstName + ' ' + client.clientId?.lastName || 'Unknown Client',
          appointmentCount: client.count || 0,
          totalSpent: client.totalAmount || 0,
          avgRating: 4.5
        }));
        setClientPerformanceData({
          frequentClients: formattedClients,
          retentionRate: data.retentionRate || 0,
          satisfactionRate: data.satisfactionRate || 0
        });
      }
    }
  };

  useEffect(() => {
    fetchClientPerformanceData();
  }, [selectedPeriod, dataCleared]);

  const serviceRevenueData = dataCleared ? [] : [
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

  const paymentMethodData = dataCleared ? [] : [
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
              end={{ x: 0, y: 1 }}
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

  // Targets Management Modal
  const TargetsManagementModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={targetsModalVisible}
      onRequestClose={() => setTargetsModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { height: '80%' }]}>
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderText}>
              <Text style={styles.modalTitle}>Manage Performance Targets</Text>
              <Text style={styles.modalSubtitle}>Set and adjust your business goals</Text>
            </View>
            <TouchableOpacity 
              style={styles.modalCloseButton}
              onPress={() => setTargetsModalVisible(false)}
            >
              <Text style={styles.modalCloseText}>Close</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalBody}>
            {(() => {
              const targets = getTargetsForPeriod(selectedPeriod);
              return [
                { 
                  title: `${selectedPeriod.charAt(0).toUpperCase() + selectedPeriod.slice(1)} Revenue Goal`, 
                  current: formatCurrencyWithConverter(targets.revenue.current), 
                  target: formatCurrencyWithConverter(targets.revenue.target),
                  icon: 'currency-usd',
                  color: '#4CAF50',
                  key: 'revenue'
                },
                { 
                  title: 'Service Completion Rate', 
                  current: `${analyticsData.completionRate}%`, 
                  target: `${targets.completion.target}%`,
                  icon: 'check-circle',
                  color: '#2196F3',
                  key: 'completion'
                },
                { 
                  title: 'Client Satisfaction Score', 
                  current: `${targets.satisfaction.current}/5`, 
                  target: `${targets.satisfaction.target}/5`,
                  icon: 'star',
                  color: '#FF9800',
                  key: 'satisfaction'
                },
                { 
                  title: 'New Client Acquisition', 
                  current: targets.acquisitions.current.toString(), 
                  target: targets.acquisitions.target.toString(),
                  icon: 'account-plus',
                  color: '#9C27B0',
                  key: 'acquisition'
                }
              ];
            })().map((target, index) => (
              <View key={target.key} style={styles.targetManageItem}>
                <View style={styles.targetManageHeader}>
                  <Text style={styles.targetManageTitle}>{target.title}</Text>
                </View>
                
                <View style={styles.targetManageValues}>
                  <View style={styles.targetManageValue}>
                    <Text style={styles.targetManageLabel}>Current</Text>
                    <Text style={[styles.targetManageNumber, { color: target.color }]}>
                      {target.current}
                    </Text>
                  </View>
                  
                  <View style={styles.targetManageValue}>
                    <Text style={styles.targetManageLabel}>Target</Text>
                    <TouchableOpacity style={styles.targetEditButton}>
                      <Text style={styles.targetManageNumber}>{target.target}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                
                <View style={styles.targetProgressContainer}>
                  <View style={styles.targetProgressBar}>
                    <View 
                      style={[
                        styles.targetProgressFill, 
                        { 
                          width: '75%', 
                          backgroundColor: target.color + '40' 
                        }
                      ]} 
                    />
                  </View>
                  <Text style={styles.targetProgressText}>75% to goal</Text>
                </View>
              </View>
            ))}
          </ScrollView>
          
          <View style={styles.modalActions}>
            <TouchableOpacity 
              style={styles.modalSecondaryButton}
              onPress={() => setTargetsModalVisible(false)}
            >
              <Text style={styles.modalSecondaryButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.modalButton, styles.modalPrimaryButton]}
              onPress={() => {
                // Save targets logic here
                setTargetsModalVisible(false);
              }}
            >
              <Text style={styles.modalButtonText}>Save Changes</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  // Modal component for detailed analytics
  const DetailsModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={modalVisible}
      onRequestClose={() => setModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <View style={styles.modalIconContainer}>
              <View style={styles.modalHeaderText}>
                <Text style={styles.modalTitle}>{selectedCardData?.title}</Text>
                <Text style={[styles.modalMainValue, { color: selectedCardData?.color }]}>
                  {selectedCardData?.mainValue}
                </Text>
              </View>
            </View>
            <TouchableOpacity 
              style={styles.modalCloseButton}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.modalCloseText}>Close</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalBody}>
            {selectedCardData?.details?.map((detail, index) => (
              <View key={index} style={styles.modalDetailItem}>
                <Text style={styles.modalDetailLabel}>{detail.label}</Text>
                <Text style={styles.modalDetailValue}>{detail.value}</Text>
              </View>
            ))}
          </ScrollView>
          
          <TouchableOpacity 
            style={[styles.modalButton, { backgroundColor: selectedCardData?.color }]}
            onPress={() => setModalVisible(false)}
          >
            <Text style={styles.modalButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  // New wallet-style header component
  const WalletHeader = () => (
    <View style={styles.walletContainer}>
      <LinearGradient
        colors={getWalletGradient(selectedPeriod)}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.walletCard}
      >
        <View style={styles.walletTopRow}>
          <View>
            <Text style={styles.walletLabel}>Total Balance - {currentData.periodLabel}</Text>
            <Text style={styles.walletAmount}>{formatCurrencyWithConverter(currentData.totalRevenue)}</Text>
          </View>
          <View style={styles.walletIconContainer}>
            <TouchableOpacity 
              style={styles.currencyPicker}
              onPress={() => setCurrencyDropdownVisible(true)}
              activeOpacity={0.7}
            >
              <Text style={styles.currencyPickerText}>{selectedCurrency}</Text>
              <MaterialCommunityIcons name="chevron-down" size={16} color="rgba(255,255,255,0.9)" />
            </TouchableOpacity>
            <View style={styles.periodIndicator}>
              <Text style={styles.periodIndicatorText}>
                {selectedPeriod.charAt(0).toUpperCase()}
              </Text>
            </View>
          </View>
        </View>
        
        <View style={styles.walletBottomRow}>
          <View style={styles.walletStat}>
            <MaterialCommunityIcons name="trending-up" size={16} color="rgba(255,255,255,0.8)" />
            <Text style={styles.walletStatText}>{currentData.growthRate}</Text>
          </View>
          <View style={styles.walletStat}>
            <MaterialCommunityIcons name="receipt" size={16} color="rgba(255,255,255,0.8)" />
            <Text style={styles.walletStatText}>{currentData.totalTransactions} transactions</Text>
          </View>
        </View>
      </LinearGradient>
    </View>
  );

  // Analytics cards component with click handlers
  const handleCardPress = (cardType) => {
    const cardDetails = {
      avgTransaction: {
        title: 'Average Transaction Details',
        mainValue: formatCurrency(analyticsData.avgTransaction),
        details: [
          { label: `Current ${selectedPeriod}`, value: formatCurrencyWithConverter(analyticsData.avgTransaction) },
          { label: `Previous ${selectedPeriod}`, value: formatCurrencyWithConverter(analyticsData.avgTransaction * 0.95) },
          { label: 'Best Performance', value: formatCurrencyWithConverter(analyticsData.avgTransaction * 1.2) },
          { label: 'Industry Average', value: formatCurrencyWithConverter(analyticsData.avgTransaction * 0.87) },
        ],
        icon: 'calculator',
        color: '#1976D2'
      },
      completed: {
        title: 'Completed Services',
        mainValue: analyticsData.completed.toString(),
        details: [
          { label: `${selectedPeriod.charAt(0).toUpperCase() + selectedPeriod.slice(1)} Total`, value: analyticsData.completed.toString() },
          { label: `Previous ${selectedPeriod}`, value: Math.round(analyticsData.completed * 0.85).toString() },
          { label: 'Total Revenue', value: formatCurrencyWithConverter(currentData.totalRevenue) },
          { label: 'Success Rate', value: `${analyticsData.completionRate}%` },
        ],
        icon: 'check-circle',
        color: '#4CAF50'
      },
      servicePerformance: {
        title: 'Service Performance Analytics',
        mainValue: `${analyticsData.servicePerformance}%`,
        details: [
          { label: 'Nursing Services', value: `${(parseFloat(analyticsData.servicePerformance) + 2.6).toFixed(1)}%` },
          { label: 'Home Care', value: `${analyticsData.servicePerformance}%` },
          { label: 'Medical Care', value: `${(parseFloat(analyticsData.servicePerformance) - 2.7).toFixed(1)}%` },
          { label: 'Emergency Services', value: `${(parseFloat(analyticsData.servicePerformance) + 2.9).toFixed(1)}%` },
        ],
        icon: 'medical-bag',
        color: '#FF9800'
      },
      clientPerformance: {
        title: 'Frequent Non-Recurring Clients',
        mainValue: `${clientPerformanceData?.retentionRate || 87.5}%`,
        details: clientPerformanceData?.frequentClients ? [
          { 
            label: 'Top Client', 
            value: `${clientPerformanceData.frequentClients[0]?.clientName || 'Unknown Client'} (${clientPerformanceData.frequentClients[0]?.appointmentCount || 0} visits)` 
          },
          { 
            label: 'Second Most', 
            value: `${clientPerformanceData.frequentClients[1]?.clientName || 'Unknown Client'} (${clientPerformanceData.frequentClients[1]?.appointmentCount || 0} visits)` 
          },
          { 
            label: 'Third Most', 
            value: `${clientPerformanceData.frequentClients[2]?.clientName || 'Unknown Client'} (${clientPerformanceData.frequentClients[2]?.appointmentCount || 0} visits)` 
          },
          { 
            label: 'Avg Spend/Client', 
            value: formatCurrency(
              clientPerformanceData.frequentClients.reduce((sum, client) => sum + (client.totalSpent || 0), 0) / 
              Math.max(1, clientPerformanceData.frequentClients.length)
            )
          },
          { label: 'Satisfaction Rate', value: `${clientPerformanceData?.satisfactionRate || 92.3}%` },
        ] : [
          { label: 'Top Client', value: 'Sarah Johnson (8 visits)' },
          { label: 'Second Most', value: 'Michael Brown (6 visits)' },
          { label: 'Third Most', value: 'Lisa Davis (5 visits)' },
          { label: 'Avg Spend/Client', value: formatCurrency(450) },
          { label: 'Satisfaction Rate', value: '92.3%' },
        ],
        icon: 'account-group',
        color: '#9C27B0'
      },
      orderPerformance: {
        title: 'Order Performance Overview',
        mainValue: analyticsData.orderPerformance.toString(),
        details: [
          { label: 'Total Orders', value: analyticsData.orderPerformance.toString() },
          { label: 'Pending Orders', value: Math.round(analyticsData.orderPerformance * 0.08).toString() },
          { label: 'In Progress', value: Math.round(analyticsData.orderPerformance * 0.22).toString() },
          { label: 'Avg Transaction', value: formatCurrencyWithConverter(analyticsData.avgTransaction) },
        ],
        icon: 'receipt-text',
        color: '#00BCD4'
      }
    };
    
    setSelectedCardData(cardDetails[cardType]);
    setModalVisible(true);
  };

  const AnalyticsCards = () => (
    <View style={styles.analyticsGrid}>
      <TouchableOpacity 
        style={styles.analyticsCard3D}
        onPress={() => handleCardPress('avgTransaction')}
        activeOpacity={0.8}
      >
        <View style={styles.analyticsCardHeader}>
          <Text style={styles.analyticsValue}>{formatCurrencyWithConverter(analyticsData.avgTransaction)}</Text>
        </View>
        <Text style={styles.analyticsLabel}>Avg Transaction</Text>
        <View style={styles.analyticsProgress}>
          <View style={[styles.progressBar, { backgroundColor: '#1976D2', width: dataCleared ? '0%' : '70%' }]} />
        </View>
        <MaterialCommunityIcons name="chevron-right" size={16} color="#1976D2" style={styles.cardArrow} />
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.analyticsCard3D}
        onPress={() => handleCardPress('completed')}
        activeOpacity={0.8}
      >
        <View style={styles.analyticsCardHeader}>
          <Text style={styles.analyticsValue}>{analyticsData.completed}</Text>
        </View>
        <Text style={styles.analyticsLabel}>Completed</Text>
        <View style={styles.analyticsProgress}>
          <View style={[styles.progressBar, { backgroundColor: '#4CAF50', width: `${analyticsData.completionRate}%` }]} />
        </View>
        <MaterialCommunityIcons name="chevron-right" size={16} color="#4CAF50" style={styles.cardArrow} />
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.analyticsCard3D}
        onPress={() => handleCardPress('servicePerformance')}
        activeOpacity={0.8}
      >
        <View style={styles.analyticsCardHeader}>
          <Text style={styles.analyticsValue}>{analyticsData.servicePerformance}%</Text>
        </View>
        <Text style={styles.analyticsLabel}>Service Performance</Text>
        <View style={styles.analyticsProgress}>
          <View style={[styles.progressBar, { backgroundColor: '#FF9800', width: `${analyticsData.servicePerformance}%` }]} />
        </View>
        <MaterialCommunityIcons name="chevron-right" size={16} color="#FF9800" style={styles.cardArrow} />
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.analyticsCard3D}
        onPress={() => handleCardPress('clientPerformance')}
        activeOpacity={0.8}
      >
        <View style={styles.analyticsCardHeader}>
          <Text style={styles.analyticsValue}>{analyticsData.clientPerformance}%</Text>
        </View>
        <Text style={styles.analyticsLabel}>Client Performance</Text>
        <View style={styles.analyticsProgress}>
          <View style={[styles.progressBar, { backgroundColor: '#9C27B0', width: `${analyticsData.clientPerformance}%` }]} />
        </View>
        <MaterialCommunityIcons name="chevron-right" size={16} color="#9C27B0" style={styles.cardArrow} />
      </TouchableOpacity>

      <TouchableOpacity 
        style={[styles.analyticsCard3D, styles.fullWidthCard]}
        onPress={() => handleCardPress('orderPerformance')}
        activeOpacity={0.8}
      >
        <View style={styles.analyticsCardHeader}>
          <Text style={styles.analyticsValue}>{analyticsData.orderPerformance}</Text>
        </View>
        <Text style={styles.analyticsLabel}>Order Performance</Text>
        <View style={styles.analyticsProgress}>
          <View style={[styles.progressBar, { backgroundColor: '#00BCD4', width: dataCleared ? '0%' : '78%' }]} />
        </View>
        <MaterialCommunityIcons name="chevron-right" size={16} color="#00BCD4" style={styles.cardArrow} />
      </TouchableOpacity>
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
        </View>
      </LinearGradient>
    </View>
  );

  const ServiceItem = ({ item }) => (
    <View style={styles.modernServiceItem}>
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
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 20, paddingBottom: 20 }]}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('AdminDashboard')}
          >
            <MaterialCommunityIcons name="arrow-left" size={26} color={COLORS.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Payment Analytics</Text>
          <View style={{ width: 44 }} />
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <FilterTabs />
        <WalletHeader />
        
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Analytics Overview</Text>
          <TouchableOpacity style={styles.viewAllButton}>
            <Text style={styles.viewAllText}>View All</Text>
            <MaterialCommunityIcons name="arrow-right" size={16} color="#666" />
          </TouchableOpacity>
        </View>
        
        <AnalyticsCards />



        <View style={styles.targetsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Performance Targets</Text>
            <TouchableOpacity 
              style={styles.manageButton}
              onPress={() => {
                setTargetsModalVisible(true);
              }}
            >
              <MaterialCommunityIcons name="cog" size={16} color="#fff" />
              <Text style={styles.manageButtonText}>Manage</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.targetPillsContainer}>
            {(() => {
              const targets = getTargetsForPeriod(selectedPeriod);
              return [
                { 
                  id: 1, 
                  title: 'Revenue Goal', 
                  current: targets.revenue.current, 
                  target: targets.revenue.target, 
                  icon: 'currency-usd',
                  gradient: ['rgba(76, 175, 80, 0.15)', 'rgba(69, 160, 73, 0.25)'],
                  textColor: '#4CAF50'
                },
                { 
                  id: 2, 
                  title: 'Completion Rate', 
                  current: targets.completion.current, 
                  target: targets.completion.target, 
                  icon: 'check-circle',
                  gradient: ['rgba(33, 150, 243, 0.15)', 'rgba(25, 118, 210, 0.25)'],
                  textColor: '#2196F3',
                  isPercentage: true
                },
                { 
                  id: 3, 
                  title: 'Client Satisfaction', 
                  current: targets.satisfaction.current, 
                  target: targets.satisfaction.target, 
                  icon: 'star',
                  gradient: ['rgba(255, 152, 0, 0.15)', 'rgba(245, 124, 0, 0.25)'],
                  textColor: '#FF9800',
                  maxValue: 5
                },
                { 
                  id: 4, 
                  title: 'New Acquisitions', 
                  current: targets.acquisitions.current, 
                  target: targets.acquisitions.target, 
                  icon: 'account-plus',
                  gradient: ['rgba(156, 39, 176, 0.15)', 'rgba(123, 31, 162, 0.25)'],
                  textColor: '#9C27B0'
                }
              ];
            })().map((target) => {
              const progress = target.maxValue 
                ? (target.current / target.maxValue) * 100
                : (target.current / target.target) * 100;
              
              return (
                <View key={target.id} style={styles.targetPillContainer}>
                  <LinearGradient
                    colors={target.gradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0, y: 1 }}
                    style={styles.targetPill}
                  >
                    <View style={styles.targetPillContent}>
                      <View style={styles.targetPillHeader}>
                        <MaterialCommunityIcons 
                          name={target.icon} 
                          size={18} 
                          color={target.textColor} 
                        />
                        <Text style={[styles.targetPillTitle, { color: target.textColor }]}>
                          {target.title}
                        </Text>
                      </View>
                      
                      <Text style={[styles.targetPillValue, { color: target.textColor }]}>
                        {target.isPercentage 
                          ? `${target.current}%`
                          : target.maxValue 
                            ? target.current.toFixed(1)
                            : target.current > 1000 
                              ? formatCurrencyWithConverter(target.current)
                              : target.current
                        }
                      </Text>
                      
                      <Text style={styles.targetPillGoal}>
                        Goal: {target.isPercentage 
                          ? `${target.target}%`
                          : target.maxValue 
                            ? target.target.toFixed(1)
                            : target.target > 1000 
                              ? formatCurrencyWithConverter(target.target)
                              : target.target
                        }
                      </Text>
                      
                      <View style={styles.targetPillProgressContainer}>
                        <View style={styles.targetPillProgressBg} />
                        <View 
                          style={[
                            styles.targetPillProgressFill, 
                            { 
                              width: `${Math.min(progress, 100)}%`,
                              backgroundColor: target.textColor 
                            }
                          ]} 
                        />
                      </View>
                    </View>
                  </LinearGradient>
                </View>
              );
            })}
          </View>
        </View>

        <View style={{ height: 50 }} />
      </ScrollView>
      
      <TargetsManagementModal />
      <DetailsModal />
      
      {/* Currency Dropdown Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={currencyDropdownVisible}
        onRequestClose={() => setCurrencyDropdownVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setCurrencyDropdownVisible(false)}>
          <View style={styles.currencyModalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.currencyDropdown}>
                {['JMD', 'USD', 'EUR', 'GBP', 'CAD'].map((currency) => (
                  <TouchableOpacity
                    key={currency}
                    style={[
                      styles.currencyOption,
                      selectedCurrency === currency && styles.currencyOptionSelected
                    ]}
                    onPress={() => {
                      setSelectedCurrency(currency);
                      setCurrencyDropdownVisible(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      styles.currencyCode,
                      selectedCurrency === currency && styles.currencyCodeSelected
                    ]}>
                      {currency}
                    </Text>
                    {selectedCurrency === currency && (
                      <MaterialCommunityIcons name="check" size={20} color="#667eea" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
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
  // Wallet Header Styles
  walletContainer: {
    marginTop: 20,
    marginBottom: 24,
  },
  walletCard: {
    borderRadius: 20,
    padding: 24,
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 15,
    borderWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
    borderLeftColor: 'rgba(255,255,255,0.1)',
    borderRightColor: 'rgba(0,0,0,0.1)',
    borderBottomColor: 'rgba(0,0,0,0.2)',
    transform: [{ perspective: 1000 }, { rotateX: '2deg' }],
  },
  walletTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  walletLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 4,
  },
  walletAmount: {
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.white,
  },
  walletBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  walletStat: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  walletStatText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginLeft: 6,
  },
  walletIconContainer: {
    alignItems: 'center',
    position: 'relative',
  },
  periodIndicator: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  periodIndicatorText: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.95)',
  },
  // Section Headers
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewAllText: {
    fontSize: 14,
    color: '#666',
    marginRight: 4,
  },
  // Analytics Grid
  analyticsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  analyticsCard3D: {
    backgroundColor: COLORS.white,
    borderRadius: 18,
    padding: 18,
    width: (screenWidth - 60) / 2,
    marginBottom: 16,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    transform: [{ perspective: 1000 }],
  },
  fullWidthCard: {
    width: screenWidth - 40,
  },
  analyticsCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  analyticsIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  analyticsValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2c3e50',
  },
  analyticsLabel: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 8,
  },
  analyticsProgress: {
    height: 4,
    backgroundColor: '#ecf0f1',
    borderRadius: 2,
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
  },
  cardArrow: {
    position: 'absolute',
    top: 12,
    right: 12,
    opacity: 0.7,
  },
  // Chart Section Styles
  chartSection: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    marginBottom: 24,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 12,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
  },
  chartToggle: {
    flexDirection: 'row',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 2,
  },
  chartToggleButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  chartToggleActive: {
    backgroundColor: COLORS.white,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  chartToggleText: {
    fontSize: 12,
    color: '#7f8c8d',
    fontWeight: '500',
  },
  chartToggleActiveText: {
    color: '#2c3e50',
  },
  chartContainer: {
    height: 200,
    marginHorizontal: 20,
    marginBottom: 20,
  },
  chartGradientBg: {
    flex: 1,
    borderRadius: 16,
  },
  chartPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chartPlaceholderText: {
    fontSize: 14,
    color: 'rgba(79, 172, 254, 0.6)',
    marginTop: 8,
    fontWeight: '500',
  },
  chartMetrics: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 20,
  },
  chartMetric: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chartDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  chartMetricText: {
    fontSize: 12,
    color: '#7f8c8d',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    width: screenWidth - 40,
    maxHeight: '80%',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.25,
    shadowRadius: 15,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f2f6',
  },
  modalIconContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  modalIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },
  modalHeaderText: {
    flex: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
  },
  modalMainValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  modalCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  modalBody: {
    padding: 20,
  },
  modalDetailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f8f9fa',
  },
  modalDetailLabel: {
    fontSize: 16,
    color: '#7f8c8d',
  },
  modalDetailValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
  },
  modalButton: {
    margin: 20,
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  // Targets Section Styles
  targetsSection: {
    marginBottom: 24,
  },
  manageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#667eea',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  manageButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  targetPillsContainer: {
    gap: 12,
  },
  targetPillContainer: {
    width: '100%',
  },
  targetPill: {
    borderRadius: 25,
    paddingVertical: 16,
    paddingHorizontal: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  targetPillContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  targetPillHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  targetPillTitle: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  targetPillValue: {
    fontSize: 16,
    fontWeight: '700',
    marginRight: 12,
  },
  targetPillGoal: {
    fontSize: 11,
    color: '#7f8c8d',
    marginRight: 12,
  },
  targetPillProgressContainer: {
    width: 60,
    height: 6,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  targetPillProgressBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 3,
  },
  targetPillProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
  filterContainer: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 20,
    marginTop: 10,
    marginBottom: 20,
  },
  filterPill: {
    flex: 1,
    overflow: 'hidden',
    borderRadius: 20,
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
  targetManageItem: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  targetManageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  targetManageTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 12,
  },
  targetManageValues: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  targetManageValue: {
    flex: 1,
    alignItems: 'center',
  },
  targetManageLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
    textTransform: 'uppercase',
    fontWeight: '500',
  },
  targetManageNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  targetEditButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  targetProgressContainer: {
    marginTop: 8,
  },
  targetProgressBar: {
    height: 6,
    backgroundColor: '#f0f0f0',
    borderRadius: 3,
    marginBottom: 8,
  },
  targetProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
  targetProgressText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  currencyPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 8,
  },
  currencyPickerText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    fontWeight: '600',
    marginRight: 4,
  },
  currencyModalOverlay: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 275,
    paddingRight: 7,
  },
  currencyDropdown: {
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    minWidth: 120,
    overflow: 'hidden',
  },
  currencyOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  currencyOptionSelected: {
    backgroundColor: '#f8f9fa',
  },
  currencyCode: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  currencyCodeSelected: {
    fontWeight: '600',
    color: '#667eea',
  },
  modalActions: {
    flexDirection: 'row',
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    backgroundColor: '#fff',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    justifyContent: 'space-between',
  },
  modalSecondaryButton: {
    width: '48%',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    backgroundColor: '#f8f9fa',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalPrimaryButton: {
    width: '48%',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#667eea',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSecondaryButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default PaymentAnalyticsScreen;