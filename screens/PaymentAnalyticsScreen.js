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
  RefreshControl,
  ActivityIndicator,
  InteractionManager,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
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
  greenDaily: ['#10B981', '#059669'], // Softer green (Paid-style) for daily
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
  const [loadingClientData, setLoadingClientData] = useState(false);
  const [invoicesCache, setInvoicesCache] = useState(null);
  const [targetsModalVisible, setTargetsModalVisible] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState('JMD');
  const [currencyDropdownVisible, setCurrencyDropdownVisible] = useState(false);
  const [animatedValues] = useState(
    Array.from({ length: 7 }, () => new Animated.Value(0))
  );
  const [backendAnalytics, setBackendAnalytics] = useState(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Helper: wait until current interactions/animations finish to avoid UI jank
  const waitForInteractions = () => new Promise(resolve => {
    InteractionManager.runAfterInteractions(() => resolve());
  });

  const closeDetailsModal = () => {
    setModalVisible(false);
    setSelectedCardData(null);
  };

  const closeTargetsModal = () => {
    setTargetsModalVisible(false);
  };

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
    // Prevent concurrent fetches
    if (loadingAnalytics) {
      console.log('[Analytics] Already loading, skipping fetch');
      return;
    }
    
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

        // Check if backend has meaningful data (not just empty array/object)
        const hasValidBackendData = response && response.success && response.data && 
          (typeof response.data === 'object') &&
          (Array.isArray(response.data) ? response.data.length > 0 : 
           (response.data.totalRevenue !== undefined || response.data.chartData));

        if (hasValidBackendData) {
          setBackendAnalytics(response.data);
          // Cache to local storage
          await AsyncStorage.setItem(`analytics_${selectedPeriod}`, JSON.stringify(response.data));
          setLoadingAnalytics(false);
          return;
        }
      } catch (backendError) {
        // Backend failed, will fall through to local calculation
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
      console.error('[Analytics] Error:', error.message);
      // Try cached data as last resort
      try {
        const cached = await AsyncStorage.getItem(`analytics_${selectedPeriod}`);
        if (cached) {
          setBackendAnalytics(JSON.parse(cached));
        }
      } catch (e) {
        // Silent fail on cache read
      }
    } finally {
      setLoadingAnalytics(false);
    }
  };

  // Calculate analytics from real app data
  const calculateAnalyticsFromAppData = async (period) => {
    try {
      // Schedule heavy fetch after interactions to avoid jank
      await waitForInteractions();
      // Get real data from app
      const allInvoices = await InvoiceService.getAllInvoices();
      const invoices = allInvoices?.filter(inv => !inv.invoiceId?.includes('SAMPLE')) || [];
      
      if (invoices.length === 0) {
        return null;
      }

      // Cache invoices for reuse elsewhere (e.g., client performance)
      setInvoicesCache(invoices);

      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      // Parse date strings in format "Feb 15, 2026" or ISO format
      const parseInvoiceDate = (dateStr) => {
        if (!dateStr) return null;
        
        // Try ISO format first (createdAt timestamps)
        if (dateStr.includes('T') || dateStr.includes('Z')) {
          return new Date(dateStr);
        }
        
        // Parse "Feb 15, 2026" format
        // Replace comma and parse
        const cleanDate = dateStr.replace(',', '');
        const parsed = new Date(cleanDate);
        
        // If still invalid, try manual parsing
        if (isNaN(parsed.getTime())) {
          const parts = dateStr.match(/(\w+)\s+(\d+),?\s+(\d{4})/);
          if (parts) {
            const [, month, day, year] = parts;
            const monthMap = {
              'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
              'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
            };
            return new Date(parseInt(year), monthMap[month], parseInt(day));
          }
          return null;
        }
        
        return parsed;
      };
      
      // Helper to determine if invoice falls in current period
      const isInCurrentPeriod = (invoiceDate) => {
        const invDate = parseInvoiceDate(invoiceDate);
        if (!invDate || isNaN(invDate.getTime())) return false;
        
        switch (period) {
          case 'daily':
            return invDate >= startOfToday;
          case 'weekly':
            const startOfWeek = new Date(startOfToday);
            startOfWeek.setDate(startOfToday.getDate() - startOfToday.getDay());
            return invDate >= startOfWeek;
          case 'monthly':
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            return invDate >= startOfMonth;
          case 'yearly':
            const startOfYear = new Date(now.getFullYear(), 0, 1);
            return invDate >= startOfYear;
          default:
            return true;
        }
      };

      const isInPreviousPeriod = (invoiceDate) => {
        const invDate = parseInvoiceDate(invoiceDate);
        if (!invDate || isNaN(invDate.getTime())) return false;
        
        switch (period) {
          case 'daily':
            const yesterday = new Date(startOfToday);
            yesterday.setDate(yesterday.getDate() - 1);
            const dayBeforeYesterday = new Date(yesterday);
            dayBeforeYesterday.setDate(dayBeforeYesterday.getDate() - 1);
            return invDate >= dayBeforeYesterday && invDate < yesterday;
          case 'weekly':
            const startOfLastWeek = new Date(startOfToday);
            startOfLastWeek.setDate(startOfToday.getDate() - startOfToday.getDay() - 7);
            const endOfLastWeek = new Date(startOfLastWeek);
            endOfLastWeek.setDate(startOfLastWeek.getDate() + 7);
            return invDate >= startOfLastWeek && invDate < endOfLastWeek;
          case 'monthly':
            const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
            return invDate >= startOfLastMonth && invDate <= endOfLastMonth;
          case 'yearly':
            const startOfLastYear = new Date(now.getFullYear() - 1, 0, 1);
            const endOfLastYear = new Date(now.getFullYear() - 1, 11, 31);
            return invDate >= startOfLastYear && invDate <= endOfLastYear;
          default:
            return false;
        }
      };

      // Filter invoices for current and previous periods
      // Use service date (when service was performed) or creation date as fallback
      const getInvoiceDate = (inv) => {
        // Priority: serviceDate, date, createdAt
        return inv.serviceDate || inv.date || inv.createdAt;
      };

      const currentPeriodInvoices = invoices.filter(inv => {
        const dateStr = getInvoiceDate(inv);
        return dateStr && isInCurrentPeriod(dateStr);
      });
      
      const previousPeriodInvoices = invoices.filter(inv => {
        const dateStr = getInvoiceDate(inv);
        return dateStr && isInPreviousPeriod(dateStr);
      });

      // Calculate totals
      const totalRevenue = currentPeriodInvoices.reduce((sum, inv) => 
        sum + (inv.total || inv.finalTotal || inv.amount || 0), 0
      );
      const totalTransactions = currentPeriodInvoices.length;
      const previousRevenue = previousPeriodInvoices.reduce((sum, inv) => 
        sum + (inv.total || inv.finalTotal || inv.amount || 0), 0
      );

      // Calculate growth rate
      let growthRate = '0%';
      if (previousRevenue > 0) {
        const growth = ((totalRevenue - previousRevenue) / previousRevenue * 100).toFixed(1);
        growthRate = growth > 0 ? `+${growth}%` : `${growth}%`;
      } else if (totalRevenue > 0) {
        growthRate = '+100%';
      }

      // Group invoices by time segments for chart data
      const chartData = (() => {
        const segments = Array(7).fill(0).map(() => ({ amount: 0, count: 0 }));
        
        currentPeriodInvoices.forEach(inv => {
          const dateStr = getInvoiceDate(inv);
          if (!dateStr) return;
          
          const invDate = parseInvoiceDate(dateStr);
          if (!invDate || isNaN(invDate.getTime())) return;
          
          const amount = inv.total || inv.finalTotal || inv.amount || 0;
          let segmentIndex = 0;

          switch (period) {
            case 'daily':
              // Group by 3-hour blocks: 6AM, 9AM, 12PM, 3PM, 6PM, 9PM, 12AM
              const hour = invDate.getHours();
              segmentIndex = Math.min(Math.floor(hour / 3), 6);
              break;
            case 'weekly':
              // Sunday = 0, Monday = 1, etc.
              segmentIndex = invDate.getDay();
              break;
            case 'monthly':
              // Group by weeks (7 segments for ~4 weeks)
              const dayOfMonth = invDate.getDate();
              segmentIndex = Math.min(Math.floor((dayOfMonth - 1) / 4.3), 6);
              break;
            case 'yearly':
              // Group by months (showing first 7 months)
              segmentIndex = Math.min(invDate.getMonth(), 6);
              break;
          }

          segments[segmentIndex].amount += amount;
          segments[segmentIndex].count += 1;
        });

        const maxAmount = Math.max(...segments.map(s => s.amount), 1);
        const labels = {
          daily: ['6AM', '9AM', '12PM', '3PM', '6PM', '9PM', '12AM'],
          weekly: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
          monthly: ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5', 'Week 6', 'Week 7'],
          yearly: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul']
        };

        return segments.map((seg, i) => ({
          label: labels[period][i],
          amount: Math.round(seg.amount),
          percentage: Math.round((seg.amount / maxAmount) * 100)
        }));
      })();

      // Service breakdown from invoice items
      const serviceBreakdown = {};
      currentPeriodInvoices.forEach(inv => {
        const serviceName = inv.service || (inv.items?.[0]?.description) || 'General Service';
        const amount = inv.total || inv.finalTotal || inv.amount || 0;
        
        if (!serviceBreakdown[serviceName]) {
          serviceBreakdown[serviceName] = { revenue: 0, count: 0 };
        }
        serviceBreakdown[serviceName].revenue += amount;
        serviceBreakdown[serviceName].count += 1;
      });

      // Payment method breakdown
      const paymentMethods = {};
      currentPeriodInvoices.forEach(inv => {
        if (inv.paymentMethod) {
          const method = inv.paymentMethod;
          if (!paymentMethods[method]) {
            paymentMethods[method] = 0;
          }
          paymentMethods[method] += inv.total || inv.finalTotal || inv.amount || 0;
        }
      });
      
      return {
        totalRevenue,
        totalTransactions,
        chartData,
        growthRate,
        serviceBreakdown,
        paymentMethods,
        dataSource: 'app'
      };
      
      return result;
    } catch (error) {
      console.error('[Analytics] Calculation error:', error.message);
      console.error('[Analytics] Error stack:', error.stack);
      return null;
    }
  };

  // Refresh analytics when screen comes into focus or period changes
  useFocusEffect(
    React.useCallback(() => {
      fetchAnalytics();
    }, [selectedPeriod, dataCleared])
  );

  // Manual refresh handler
  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await fetchAnalytics();
    await fetchClientPerformanceData();
    setRefreshing(false);
  }, [selectedPeriod, dataCleared]);

  // Dynamic data based on selected period
  const getDataForPeriod = (period) => {
    // If backend data exists, use it
    if (backendAnalytics) {
      const total = backendAnalytics.totalRevenue || 0;
      const transactions = backendAnalytics.totalTransactions || 0;
      
      // Use real chart data if available
      const chartData = backendAnalytics.chartData || [
        { label: period === 'daily' ? '6AM' : period === 'weekly' ? 'Mon' : period === 'yearly' ? 'Jan' : 'Week 1', amount: Math.round(total / 7), percentage: 14 },
        { label: period === 'daily' ? '9AM' : period === 'weekly' ? 'Tue' : period === 'yearly' ? 'Feb' : 'Week 2', amount: Math.round(total / 7), percentage: 14 },
        { label: period === 'daily' ? '12PM' : period === 'weekly' ? 'Wed' : period === 'yearly' ? 'Mar' : 'Week 3', amount: Math.round(total / 7), percentage: 14 },
        { label: period === 'daily' ? '3PM' : period === 'weekly' ? 'Thu' : period === 'yearly' ? 'Apr' : 'Week 4', amount: Math.round(total / 7), percentage: 14 },
        { label: period === 'daily' ? '6PM' : period === 'weekly' ? 'Fri' : period === 'yearly' ? 'May' : 'Week 5', amount: Math.round(total / 7), percentage: 14 },
        { label: period === 'daily' ? '9PM' : period === 'weekly' ? 'Sat' : period === 'yearly' ? 'Jun' : '', amount: Math.round(total / 7), percentage: 14 },
        { label: period === 'daily' ? '12AM' : period === 'weekly' ? 'Sun' : period === 'yearly' ? 'Jul' : '', amount: Math.round(total / 7), percentage: 14 },
      ];
      
      return {
        chartData,
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

  const currentData = React.useMemo(
    () => getDataForPeriod(selectedPeriod),
    [selectedPeriod, backendAnalytics, dataCleared]
  );

  const averageTransaction = React.useMemo(() => {
    const totalRevenue = Number(currentData?.totalRevenue ?? 0);
    const totalTransactions = Number(currentData?.totalTransactions ?? 0);
    if (!Number.isFinite(totalRevenue) || !Number.isFinite(totalTransactions) || totalTransactions <= 0) return 0;
    return Math.round(totalRevenue / totalTransactions);
  }, [currentData?.totalRevenue, currentData?.totalTransactions]);

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
    const totalRevenue = Number(data?.totalRevenue ?? 0);
    const totalTransactions = Number(data?.totalTransactions ?? 0);
    const safeTotalRevenue = Number.isFinite(totalRevenue) ? totalRevenue : 0;
    const safeTotalTransactions = Number.isFinite(totalTransactions) ? totalTransactions : 0;
    const completionRate = Math.min(95 + Math.random() * 5, 100); // 95-100%
    const servicePerformance = Math.min(90 + Math.random() * 8, 98); // 90-98%
    const clientPerformance = Math.min(85 + Math.random() * 10, 95); // 85-95%
    
    return {
      avgTransaction: safeTotalTransactions > 0 ? Math.round(safeTotalRevenue / safeTotalTransactions) : 0,
      completed: Math.round(safeTotalTransactions * (completionRate / 100)),
      servicePerformance: servicePerformance.toFixed(1),
      clientPerformance: clientPerformance.toFixed(1),
      orderPerformance: safeTotalTransactions,
      completionRate: completionRate.toFixed(1)
    };
  };

  const analyticsData = React.useMemo(
    () => getAnalyticsForPeriod(selectedPeriod),
    [
      selectedPeriod,
      dataCleared,
      currentData?.totalRevenue,
      currentData?.totalTransactions,
    ]
  );

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
    const numeric = Number(priceInJMD);
    const safe = Number.isFinite(numeric) ? numeric : 0;

    if (selectedCurrency === 'JMD') {
      return safe.toFixed(2);
    }

    const rate = exchangeRates[selectedCurrency] || 1;
    const safeRate = Number.isFinite(rate) && rate !== 0 ? rate : 1;
    return (safe / safeRate).toFixed(2);
  };

  const getCurrencySymbol = () => {
    return currencySymbols[selectedCurrency] || 'J$';
  };

  // Updated formatCurrency function to use selected currency
  const formatCurrencyWithConverter = (amount) => {
    const convertedAmount = convertPrice(amount);
    const numeric = Number(convertedAmount);
    const safe = Number.isFinite(numeric) ? numeric : 0;
    return `${getCurrencySymbol()}${safe.toLocaleString()}`;
  };

  // Fetch frequent non-recurring clients data from backend
  const fetchClientPerformanceData = async () => {
    // Prevent concurrent calls
    if (loadingClientData) {
      return;
    }
    
    try {
      setLoadingClientData(true);
      
      if (dataCleared) {
        setClientPerformanceData(null);
        setLoadingClientData(false);
        return;
      }
      
      try {
        const response = await ApiService.makeRequest(`/analytics/clients/frequent?period=${selectedPeriod}`, {
          method: 'GET'
        });
        
        if (response && response.success && response.data && response.data.frequentClients?.length > 0) {
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
          return;
        }
      } catch (backendError) {
        // Backend failed, will fall through to local calculation
      }
      
      // Fallback: Calculate from local invoices
      // Prefer cached invoices to avoid repeated heavy fetches
      let invoices = invoicesCache;
      if (!invoices || invoices.length === 0) {
        // Schedule after interactions to avoid jank
        await waitForInteractions();
        const allInvoices = await InvoiceService.getAllInvoices();
        invoices = allInvoices?.filter(inv => !inv.invoiceId?.includes('SAMPLE')) || [];
      }
      
      if (invoices.length > 0) {
        // Group invoices by client
        const clientMap = {};
        
        invoices.forEach(inv => {
          const clientName = inv.clientName || inv.patientName || 'Unknown Client';
          const clientId = inv.clientId || inv.patientId || clientName;
          
          if (!clientMap[clientId]) {
            clientMap[clientId] = {
              clientName: clientName,
              appointmentCount: 0,
              totalSpent: 0
            };
          }
          
          clientMap[clientId].appointmentCount += 1;
          clientMap[clientId].totalSpent += (inv.total || inv.finalTotal || 0);
        });
        
        // Convert to array and sort by appointment count
        const frequentClients = Object.values(clientMap)
          .sort((a, b) => b.appointmentCount - a.appointmentCount)
          .slice(0, 5)
          .map(client => ({
            ...client,
            avgRating: 4.5 + Math.random() * 0.5
          }));
        
        setClientPerformanceData({
          frequentClients: frequentClients,
          retentionRate: 75,
          satisfactionRate: 90
        });
        
        // Cache locally
        await AsyncStorage.setItem(`clientAnalytics_${selectedPeriod}`, JSON.stringify({
          frequentClients,
          retentionRate: 75,
          satisfactionRate: 90
        }));
      }
    } catch (error) {
      console.error('[Analytics] Client performance error:', error.message);
    } finally {
      setLoadingClientData(false);
    }
  };

  useEffect(() => {
    fetchClientPerformanceData();
  }, [selectedPeriod, dataCleared]);

  const serviceRevenueData = dataCleared ? [] : (() => {
    // Use real service breakdown if available from analytics
    if (backendAnalytics?.serviceBreakdown) {
      const services = Object.entries(backendAnalytics.serviceBreakdown)
        .map(([name, data]) => ({
          name,
          revenue: data.revenue,
          bookings: data.count,
          percentage: Math.round((data.revenue / currentData.totalRevenue) * 100)
        }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

      // Add gradients
      const gradients = [
        COLORS.gradient1,
        COLORS.gradient2,
        COLORS.gradient3,
        COLORS.gradient4,
        ['#ffecd2', '#fcb69f']
      ];

      return services.map((service, idx) => ({
        id: idx + 1,
        ...service,
        gradient: gradients[idx] || COLORS.gradient1,
        icon: 'medical-bag'
      }));
    }

    // Fallback to mock data
    return [
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
  })();

  const paymentMethodData = dataCleared ? [] : (() => {
    // Use real payment method breakdown if available
    if (backendAnalytics?.paymentMethods) {
      const methods = Object.entries(backendAnalytics.paymentMethods)
        .map(([name, amount]) => ({
          name: name.replace(/([A-Z])/g, ' $1').trim(),
          amount: Math.round(amount),
          percentage: Math.round((amount / currentData.totalRevenue) * 100)
        }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 3);

      const gradients = [COLORS.gradient1, COLORS.gradient2, COLORS.gradient3];
      const icons = {
        'Credit Card': 'credit-card',
        'Debit Card': 'credit-card',
        'Card': 'credit-card',
        'Cash': 'cash',
        'Bank Transfer': 'bank-transfer',
        'Digital Wallet': 'wallet',
        'Mobile Money': 'cellphone',
        'Check': 'checkbook'
      };

      return methods.map((method, idx) => ({
        id: idx + 1,
        ...method,
        gradient: gradients[idx] || COLORS.gradient1,
        icon: icons[method.name] || 'cash'
      }));
    }

    // Fallback to mock data
    return [
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
  })();

  const formatCurrency = (amount) => {
    const numeric = Number(amount);
    const safe = Number.isFinite(numeric) ? numeric : 0;
    return `J$${safe.toLocaleString()}`;
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
      presentationStyle="overFullScreen"
      hardwareAccelerated={true}
      visible={targetsModalVisible}
      onRequestClose={closeTargetsModal}
      onDismiss={closeTargetsModal}
    >
      <TouchableWithoutFeedback onPress={closeTargetsModal}>
        <View style={styles.modalOverlay}>
          <View pointerEvents="box-none">
        <View style={[styles.modalContent, { height: '80%' }]}>
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderText}>
              <Text style={styles.modalTitle}>Manage Performance Targets</Text>
              <Text style={styles.modalSubtitle}>Set and adjust your business goals</Text>
            </View>
            <TouchableOpacity 
              style={styles.modalCloseButton}
              onPress={closeTargetsModal}
            >
              <MaterialCommunityIcons name="close" size={18} color="#666" />
            </TouchableOpacity>
          </View>
          
          <ScrollView
            style={styles.modalBody}
            keyboardShouldPersistTaps="handled"
            scrollEventThrottle={16}
            nestedScrollEnabled={true}
            contentContainerStyle={{ paddingBottom: 24 }}
          >
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
                    <Text
                      style={
                        typeof target.current === 'string' && target.current.includes('%')
                          ? [styles.targetManageNumber, styles.modalPercentText]
                          : [styles.targetManageNumber, { color: target.color }]
                      }
                    >
                      {target.current}
                    </Text>
                  </View>
                  
                  <View style={styles.targetManageValue}>
                    <Text style={styles.targetManageLabel}>Target</Text>
                    <TouchableOpacity style={styles.targetEditButton}>
                      <Text
                        style={
                          typeof target.target === 'string' && target.target.includes('%')
                            ? [styles.targetManageNumber, styles.modalPercentText]
                            : styles.targetManageNumber
                        }
                      >
                        {target.target}
                      </Text>
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
                  <Text style={[styles.targetProgressText, styles.modalPercentText]}>75% to goal</Text>
                </View>
              </View>
            ))}
          </ScrollView>
          
          <View style={styles.modalActions}>
            <TouchableOpacity 
              style={styles.modalSecondaryButton}
              onPress={closeTargetsModal}
              activeOpacity={0.7}
            >
              <Text style={styles.modalSecondaryButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.modalPrimaryButtonContainer}
              onPress={() => {
                // Save targets logic here
                closeTargetsModal();
              }}
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={GRADIENTS.header}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={styles.modalPrimaryButtonGradient}
              >
                <Text style={styles.modalButtonText}>Save Changes</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
        </View>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );

  // Modal component for detailed analytics
  const DetailsModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      presentationStyle="overFullScreen"
      hardwareAccelerated={true}
      visible={modalVisible}
      onRequestClose={closeDetailsModal}
      onDismiss={closeDetailsModal}
    >
      <TouchableWithoutFeedback onPress={closeDetailsModal}>
        <View style={styles.modalOverlay}>
          <View pointerEvents="box-none">
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <View style={styles.modalIconContainer}>
              <View style={styles.modalHeaderText}>
                <Text style={styles.modalTitle}>{selectedCardData?.title}</Text>
                <Text
                  style={[
                    styles.modalMainValue,
                    typeof selectedCardData?.mainValue === 'string' && selectedCardData.mainValue.includes('%')
                      ? styles.modalPercentText
                      : { color: selectedCardData?.color },
                  ]}
                >
                  {selectedCardData?.mainValue}
                </Text>
              </View>
            </View>
            <TouchableOpacity 
              style={styles.modalCloseButton}
              onPress={closeDetailsModal}
            >
              <MaterialCommunityIcons name="close" size={18} color="#666" />
            </TouchableOpacity>
          </View>
          
          <ScrollView
            style={styles.modalBody}
            keyboardShouldPersistTaps="handled"
            scrollEventThrottle={16}
            nestedScrollEnabled={true}
            contentContainerStyle={{ paddingBottom: 24 }}
          >
            {selectedCardData?.details?.map((detail, index) => (
              <View key={index} style={styles.modalDetailItem}>
                <Text style={styles.modalDetailLabel}>{detail.label}</Text>
                <Text
                  style={
                    typeof detail.value === 'string' && detail.value.includes('%')
                      ? [styles.modalDetailValue, styles.modalPercentText]
                      : styles.modalDetailValue
                  }
                >
                  {detail.value}
                </Text>
              </View>
            ))}
          </ScrollView>
          
        </View>
        </View>
        </View>
      </TouchableWithoutFeedback>
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
            {loadingAnalytics && (
              <Text style={[styles.walletLabel, { fontSize: 10, marginTop: 4 }]}>Loading...</Text>
            )}
            {backendAnalytics && backendAnalytics.dataSource === 'app' && (
              <Text style={[styles.walletLabel, { fontSize: 9, marginTop: 2 }]}>
                From {currentData.totalTransactions} invoice{currentData.totalTransactions !== 1 ? 's' : ''}
              </Text>
            )}
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
    // Don't open modal if client data is still loading
    if (cardType === 'clientPerformance' && loadingClientData) {
      return;
    }
    
    const ACCENT_BLUE = '#2196F3';
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
        color: ACCENT_BLUE
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
        color: ACCENT_BLUE
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
        color: ACCENT_BLUE
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
        color: ACCENT_BLUE
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
        color: ACCENT_BLUE
      }
    };

    // Ensure no overlapping overlays are left open
    setCurrencyDropdownVisible(false);
    setTargetsModalVisible(false);

    setSelectedCardData(cardDetails[cardType] || null);
    setModalVisible(true);
  };

  const AnalyticsCards = () => (
    <View style={styles.analyticsPillsContainer}>
      <TouchableOpacity 
        style={styles.analyticsPill}
        onPress={() => handleCardPress('completed')}
        activeOpacity={0.8}
      >
        <View style={styles.analyticsPillContent}>
          <View style={styles.analyticsPillLeft}>
            <Text style={styles.analyticsPillLabel}>Completed</Text>
            <View style={styles.analyticsProgress}>
              <View style={[styles.progressBar, { width: `${analyticsData.completionRate}%` }]} />
            </View>
          </View>
          <View style={styles.analyticsPillRight}>
            <MaterialCommunityIcons name="chevron-right" size={20} color="#2196F3" />
          </View>
        </View>
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.analyticsPill}
        onPress={() => handleCardPress('servicePerformance')}
        activeOpacity={0.8}
      >
        <View style={styles.analyticsPillContent}>
          <View style={styles.analyticsPillLeft}>
            <Text style={styles.analyticsPillLabel}>Service Performance</Text>
            <View style={styles.analyticsProgress}>
              <View style={[styles.progressBar, { width: `${analyticsData.servicePerformance}%` }]} />
            </View>
          </View>
          <View style={styles.analyticsPillRight}>
            <MaterialCommunityIcons name="chevron-right" size={20} color="#2196F3" />
          </View>
        </View>
      </TouchableOpacity>

      <TouchableOpacity 
        style={[styles.analyticsPill, loadingClientData && { opacity: 0.6 }]}
        onPress={() => handleCardPress('clientPerformance')}
        activeOpacity={0.8}
        disabled={loadingClientData}
      >
        <View style={styles.analyticsPillContent}>
          <View style={styles.analyticsPillLeft}>
            <Text style={styles.analyticsPillLabel}>
              Client Performance {loadingClientData && '...'}
            </Text>
            <View style={styles.analyticsProgress}>
              <View style={[styles.progressBar, { width: `${analyticsData.clientPerformance}%` }]} />
            </View>
          </View>
          <View style={styles.analyticsPillRight}>
            {loadingClientData ? (
              <ActivityIndicator size="small" color="#2196F3" />
            ) : (
              <MaterialCommunityIcons name="chevron-right" size={20} color="#2196F3" />
            )}
          </View>
        </View>
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.analyticsPill}
        onPress={() => handleCardPress('orderPerformance')}
        activeOpacity={0.8}
      >
        <View style={styles.analyticsPillContent}>
          <View style={styles.analyticsPillLeft}>
            <Text style={styles.analyticsPillLabel}>Order Performance</Text>
            <View style={styles.analyticsProgress}>
              <View style={[styles.progressBar, { width: dataCleared ? '0%' : '78%' }]} />
            </View>
          </View>
          <View style={styles.analyticsPillRight}>
            <MaterialCommunityIcons name="chevron-right" size={20} color="#2196F3" />
          </View>
        </View>
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

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
          />
        }
      >
        <FilterTabs />
        <WalletHeader />
        
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Analytics Overview</Text>
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
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={GRADIENTS.header}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={styles.manageButtonGradient}
              >
                <MaterialCommunityIcons name="cog" size={16} color={COLORS.white} />
                <Text style={styles.manageButtonText}>Manage</Text>
              </LinearGradient>
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
                  icon: 'currency-usd'
                },
                { 
                  id: 2, 
                  title: 'Completion Rate', 
                  current: targets.completion.current, 
                  target: targets.completion.target, 
                  icon: 'check-circle',
                  isPercentage: true
                },
                { 
                  id: 3, 
                  title: 'Client Satisfaction', 
                  current: targets.satisfaction.current, 
                  target: targets.satisfaction.target, 
                  icon: 'star',
                  maxValue: 5
                },
                { 
                  id: 4, 
                  title: 'New Acquisitions', 
                  current: targets.acquisitions.current, 
                  target: targets.acquisitions.target, 
                  icon: 'account-plus',
                }
              ];
            })().map((target) => {
              const progress = target.maxValue 
                ? (target.current / target.maxValue) * 100
                : (target.current / target.target) * 100;
              
              return (
                <View key={target.id} style={styles.targetPillContainer}>
                  <View style={styles.targetPill}>
                    <View style={styles.targetPillContent}>
                      <View style={styles.targetPillHeader}>
                        <Text style={styles.targetPillTitle}>
                          {target.title}
                        </Text>
                      </View>
                      
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
                              backgroundColor: '#2196F3' 
                            }
                          ]} 
                        />
                      </View>
                    </View>
                  </View>
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
    borderRadius: 16,
    overflow: 'hidden',
  },
  viewAllButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  viewAllText: {
    fontSize: 14,
    color: COLORS.white,
    marginRight: 4,
    fontWeight: '600',
  },
  // Analytics Grid
  analyticsPillsContainer: {
    gap: 12,
    marginBottom: 24,
  },
  analyticsPill: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  analyticsPillContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  analyticsPillLeft: {
    flex: 1,
    marginRight: 16,
  },
  analyticsPillRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  analyticsPillLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 8,
  },
  analyticsPillValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  analyticsCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  analyticsProgress: {
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
    backgroundColor: '#2196F3',
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
  modalSubtitle: {
    fontSize: 14,
    color: '#2c3e50',
  },
  modalMainValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  modalPercentText: {
    color: COLORS.primary,
    fontWeight: '800',
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
    color: '#2c3e50',
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
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  manageButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
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
    backgroundColor: COLORS.white,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
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
    marginLeft: 0,
    color: '#111827',
  },
  targetPillValue: {
    fontSize: 16,
    fontWeight: '700',
    marginRight: 12,
    color: '#111827',
  },
  targetPillGoal: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginRight: 12,
  },
  targetPillProgressContainer: {
    width: 60,
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    overflow: 'hidden',
  },
  targetPillProgressBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#E5E7EB',
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
    color: '#111827',
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
    color: '#2c3e50',
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
    color: '#2c3e50',
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
    borderColor: '#E5E7EB',
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalPrimaryButtonContainer: {
    width: '48%',
    borderRadius: 12,
    overflow: 'hidden',
  },
  modalPrimaryButtonGradient: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSecondaryButtonText: {
    color: '#2c3e50',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default PaymentAnalyticsScreen;