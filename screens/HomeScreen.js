import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Image,
  useWindowDimensions,
  Linking,
  Modal,
  Animated,
  Platform,
  TextInput,
  Alert,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { InfoCard, SectionHeader } from '../components/Cards';
import { COLORS, GRADIENTS, SPACING, CONTACT_INFO } from '../constants';
import { useServices } from '../context/ServicesContext';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { useAppointments } from '../context/AppointmentContext';
import { useShifts } from '../context/ShiftContext';
import TouchableWeb from '../components/TouchableWeb';
import InvoiceService from '../services/InvoiceService';
import PushNotificationService from '../services/PushNotificationService';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function HomeScreen({ navigation }) {
  const { width } = useWindowDimensions();
  const { user } = useAuth();
  const { services } = useServices();
  const { getUpcomingAppointments } = useAppointments();
  const { shiftRequests } = useShifts(); // Add shift context
  const { unreadCount, clearAllNotifications } = useNotifications();
  const insets = useSafeAreaInsets();
  const [selectedService, setSelectedService] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [reminderModalVisible, setReminderModalVisible] = useState(false);
  const [emergencyModalVisible, setEmergencyModalVisible] = useState(false);
  const [currentFeatureIndex, setCurrentFeatureIndex] = useState(0);
  const [reminderText, setReminderText] = useState('');
  const [reminderDate, setReminderDate] = useState('');
  const [reminderTime, setReminderTime] = useState('');
  const [showReminderDatePicker, setShowReminderDatePicker] = useState(false);
  const [showReminderTimePicker, setShowReminderTimePicker] = useState(false);
  const [selectedReminderDate, setSelectedReminderDate] = useState(new Date());
  const [selectedReminderTime, setSelectedReminderTime] = useState(new Date());
  const [emergencyFirstName, setEmergencyFirstName] = useState('');
  const [emergencyLastName, setEmergencyLastName] = useState('');
  const [emergencyRelationship, setEmergencyRelationship] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [reminders, setReminders] = useState([]);
  const [overdueInvoices, setOverdueInvoices] = useState([]);
  const [pendingOrders, setPendingOrders] = useState([]);
  const [emergencyContact, setEmergencyContact] = useState(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const arrowAnim = useRef(new Animated.Value(0)).current;
  const servicesScrollAnim = useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef(null);

  // Get upcoming appointments for patient (including approved shifts)
  const upcomingAppointments = getUpcomingAppointments();
  
  // Get approved shifts assigned to this patient (same logic as AppointmentsScreen)
  const patientId = user?.id;
  const approvedShifts = shiftRequests.filter(shift => {
    const isApproved = shift.status === 'approved';
    const matchesClient = 
      shift.clientId === patientId ||
      shift.clientId === parseInt(patientId) ||
      String(shift.clientId) === patientId ||
      shift.clientName === user?.name ||
      (shift.clientId === 1 && patientId === 'PATIENT001') || // Fixed logic
      (shift.clientId === '1' && patientId === 'PATIENT001') ||
      (shift.clientId === 1 && user?.username === 'testpatient') ||
      (!shift.clientId && user?.role === 'patient') ||
      (user?.role === 'patient' && shift.clientName && shift.clientName.toLowerCase().includes('test'));
    return isApproved && matchesClient;
  });
  
  // Combine regular appointments with approved shifts
  const allUpcomingAppointments = [...upcomingAppointments, ...approvedShifts];
  const nextAppointment = allUpcomingAppointments[0]; // Get the next upcoming appointment

  const whyChooseFeatures = [
    {
      icon: 'shield-check',
      title: 'Licensed & Certified',
      description: 'All our healthcare professionals are fully licensed and certified',
    },
    {
      icon: 'clock-fast',
      title: '24/7 Availability',
      description: 'Round-the-clock care services whenever you need us',
    },
    {
      icon: 'heart-pulse',
      title: 'Personalized Care',
      description: 'Tailored healthcare solutions designed for your unique needs',
    },
    {
      icon: 'star',
      title: 'Trusted Excellence',
      description: 'Years of experience delivering compassionate, quality care',
    },
  ];

  const handleServicePress = (service) => {
    setSelectedService(service);
    setModalVisible(true);
  };

  const handleBookAppointment = () => {
    setModalVisible(false);
    navigation.navigate('Book');
  };

  const onReminderDateChange = (event, date) => {
    if (date) {
      setSelectedReminderDate(date);
      const formattedDate = date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
      setReminderDate(formattedDate);
    }
  };

  const onReminderTimeChange = (event, time) => {
    if (time) {
      setSelectedReminderTime(time);
      const formattedTime = time.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
      setReminderTime(formattedTime);
    }
  };

  const handleAddReminder = () => {
    if (!reminderText.trim()) {
      Alert.alert('Missing Information', 'Please enter a reminder title');
      return;
    }
    if (!reminderDate.trim()) {
      Alert.alert('Missing Information', 'Please select a date');
      return;
    }
    if (!reminderTime.trim()) {
      Alert.alert('Missing Information', 'Please select a time');
      return;
    }

    const newReminder = {
      id: Date.now(),
      text: reminderText,
      date: reminderDate,
      time: reminderTime,
      completed: false,
    };
    setReminders([...reminders, newReminder]);
    setReminderText('');
    setReminderDate('');
    setReminderTime('');
    setShowReminderDatePicker(false);
    setShowReminderTimePicker(false);
    setReminderModalVisible(false);
  };

  const handleDeleteReminder = (reminderId) => {
    setReminders(reminders.filter(r => r.id !== reminderId));
  };

  const handleToggleReminder = (reminderId) => {
    setReminders(reminders.map(r => 
      r.id === reminderId ? { ...r, completed: !r.completed } : r
    ));
  };

  const handleAddEmergencyContact = () => {
    if (emergencyFirstName.trim() && emergencyLastName.trim() && emergencyPhone.trim() && emergencyRelationship.trim()) {
      setEmergencyContact({
        firstName: emergencyFirstName,
        lastName: emergencyLastName,
        relationship: emergencyRelationship,
        phone: emergencyPhone,
      });
      setEmergencyFirstName('');
      setEmergencyLastName('');
      setEmergencyRelationship('');
      setEmergencyPhone('');
      setEmergencyModalVisible(false);
    }
  };

  const handleCallEmergency = () => {
    if (emergencyContact?.phone) {
      Linking.openURL(`tel:${emergencyContact.phone}`);
    }
  };

  // Temporary function to clear wrong notifications for patient
  const clearWrongNotifications = async () => {
    if (user?.role === 'patient') {
      await clearAllNotifications();
      console.log('Cleared wrong notifications for patient');
    }
  };

  // Load overdue invoices and send notifications
  const loadOverdueInvoices = async () => {
    try {
      const overdueInvoices = await InvoiceService.getOverdueInvoices();
      setOverdueInvoices(overdueInvoices);

      // Send notifications for overdue invoices if any exist
      if (overdueInvoices.length > 0) {
        const notifications = await InvoiceService.sendOverdueNotifications();
        await PushNotificationService.sendBatchOverdueNotifications(notifications);
      }
    } catch (error) {
      console.error('Error loading overdue invoices:', error);
    }
  };

  // Load pending store orders
  const loadPendingOrders = async () => {
    try {
      const ordersJson = await AsyncStorage.getItem('@care_store_orders');
      if (ordersJson) {
        const allOrders = JSON.parse(ordersJson);
        const userPendingOrders = allOrders.filter(
          order => order.patientId === user?.id && order.status === 'pending'
        );
        setPendingOrders(userPendingOrders);
      }
    } catch (error) {
      console.error('Error loading pending orders:', error);
    }
  };

  useEffect(() => {
    // Clear wrong notifications when patient loads the home screen
    clearWrongNotifications();
    
    // Features animation
    const featuresInterval = setInterval(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }).start(() => {
        setCurrentFeatureIndex((prevIndex) => 
          (prevIndex + 1) % whyChooseFeatures.length
        );
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }).start();
      });
    }, 4000);

    return () => {
      clearInterval(featuresInterval);
    };
  }, [fadeAnim]);

  // Animate arrow left to right continuously
  useEffect(() => {
    const animateArrow = () => {
      Animated.sequence([
        Animated.timing(arrowAnim, {
          toValue: 10,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(arrowAnim, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }),
      ]).start(() => animateArrow());
    };
    
    animateArrow();
  }, [arrowAnim]);

  // Auto-scroll services animation with Animated API
  useEffect(() => {
    if (!services || services.length === 0) return;

    const serviceWidth = 100;
    const totalWidth = services.length * serviceWidth;

    const animateScroll = () => {
      servicesScrollAnim.setValue(0);
      Animated.loop(
        Animated.timing(servicesScrollAnim, {
          toValue: -totalWidth,
          duration: services.length * 5000,
          useNativeDriver: true,
          isInteraction: false,
        })
      ).start();
    };

    animateScroll();

    return () => {
      servicesScrollAnim.stopAnimation();
    };
  }, [services, servicesScrollAnim]);

  // Load overdue invoices on mount and set up periodic checking
  useEffect(() => {
    // Load initially
    loadOverdueInvoices();
    loadPendingOrders();
    
    // Check for overdue invoices every 24 hours
    const overdueInterval = setInterval(() => {
      loadOverdueInvoices();
    }, 24 * 60 * 60 * 1000); // 24 hours

    // Check for pending orders every 5 minutes
    const ordersInterval = setInterval(() => {
      loadPendingOrders();
    }, 5 * 60 * 1000); // 5 minutes

    return () => {
      clearInterval(overdueInterval);
      clearInterval(ordersInterval);
    };
  }, [user?.id]); // Re-run if user changes

  // Load emergency contact from user profile
  useEffect(() => {
    if (user?.emergencyContact && user?.emergencyPhone) {
      // Parse the name if it's stored as full name
      const nameParts = user.emergencyContact.split(' ');
      setEmergencyContact({
        firstName: nameParts[0] || '',
        lastName: nameParts.slice(1).join(' ') || '',
        relationship: 'Emergency Contact',
        phone: user.emergencyPhone
      });
    }
  }, [user?.emergencyContact, user?.emergencyPhone]);

  const handleCall = () => {
    Linking.openURL(`tel:${CONTACT_INFO.phone}`);
  };

  const handleEmail = () => {
    Linking.openURL(`mailto:${CONTACT_INFO.email}`);
  };

  const handleInstagram = () => {
    Linking.openURL(`https://instagram.com/${CONTACT_INFO.instagram.replace('@', '')}`);
  };

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
            style={styles.iconButton}
            onPress={() => navigation.navigate('Notifications')}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="bell-outline" size={26} color={COLORS.white} />
            {unreadCount > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Text>
              </View>
            )}
          </TouchableWeb>
          <Text style={styles.welcomeText}>Welcome, {user?.username}!</Text>
          <TouchableWeb 
            style={styles.iconButton}
            onPress={() => navigation.navigate('Profile')}
            activeOpacity={0.7}
          >
            {user?.profilePhoto ? (
              <Image 
                source={{ uri: user.profilePhoto }} 
                style={styles.headerProfileImage}
              />
            ) : (
              <MaterialCommunityIcons name="account-circle-outline" size={26} color={COLORS.white} />
            )}
          </TouchableWeb>
        </View>
      </LinearGradient>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollViewContent}
      >
        {/* Services */}
        <View style={[styles.fullWidthSection, { marginTop: -10 }]}>
          <View style={[styles.whiteContainer, { overflow: 'hidden', paddingTop: 20 }]}>
            <Animated.View style={{ 
              flexDirection: 'row',
              paddingVertical: 15,
              transform: [{ translateX: servicesScrollAnim }] 
            }}>
              {services && [...services, ...services].map((service, index) => (
                <TouchableWeb
                  key={`${service.id}-${index}`}
                  style={styles.serviceCircle}
                  onPress={() => handleServicePress(service)}
                  activeOpacity={0.7}
                >
                  <LinearGradient
                    colors={GRADIENTS.header}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.serviceCircleGradient}
                  >
                    <View style={styles.innerGlow}>
                      <MaterialCommunityIcons name={service.icon} size={32} color={COLORS.white} />
                    </View>
                  </LinearGradient>
                  <Text style={styles.serviceCircleLabel} numberOfLines={2}>
                    {service.title || 'Service'}
                  </Text>
                </TouchableWeb>
              ))}
            </Animated.View>
          </View>
        </View>

        {/* Next Appointment */}
        <View style={styles.fullWidthSection}>
          <View style={styles.sectionContent}>
            <SectionHeader title="Upcoming Appointment" subtitle="Your next scheduled visit" />
            {nextAppointment ? (
              <LinearGradient
                colors={GRADIENTS.accent}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.appointmentCardGradient}
              >
                <View style={styles.appointmentHeader}>
                  <MaterialCommunityIcons name="calendar-check" size={24} color={COLORS.white} />
                  <Text style={[styles.appointmentTitle, { color: COLORS.white }]}>Next Appointment</Text>
                </View>
                <Text style={[styles.appointmentText, { color: COLORS.white }]}>
                  {nextAppointment.date && !isNaN(new Date(nextAppointment.date)) 
                    ? new Date(nextAppointment.date).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric', 
                        year: 'numeric' 
                      })
                    : (nextAppointment.date || nextAppointment.preferredDate || 'Date TBD')
                  } at {
                    nextAppointment.startTime && nextAppointment.endTime 
                      ? `${nextAppointment.startTime} - ${nextAppointment.endTime}`
                      : (nextAppointment.time || nextAppointment.scheduledTime || 'Time TBD')
                  }
                </Text>
                <Text style={[styles.appointmentService, { color: 'rgba(255, 255, 255, 0.9)' }]}>
                  {nextAppointment.service || 'Care Service'}
                  {nextAppointment.nurseName && ` with ${nextAppointment.nurseName}`}
                  {nextAppointment.nurse && ` with ${nextAppointment.nurse}`}
                  {(nextAppointment.nurseId && !nextAppointment.nurseName && !nextAppointment.nurse) && ` with Nurse ID: ${nextAppointment.nurseId}`}
                  {(!nextAppointment.nurseName && !nextAppointment.nurse && !nextAppointment.nurseId) && ' with Assigned Nurse'}
                </Text>
                {nextAppointment.status && (
                  <Text style={[styles.appointmentService, { color: 'rgba(255, 255, 255, 0.8)', fontSize: 14, marginTop: 4 }]}>
                    Status: {nextAppointment.status === 'confirmed' || nextAppointment.status === 'approved' || nextAppointment.status === 'nurse_assigned'
                      ? 'Confirmed' 
                      : nextAppointment.status.charAt(0).toUpperCase() + nextAppointment.status.slice(1)
                    }
                  </Text>
                )}
              </LinearGradient>
            ) : (
              <View style={styles.appointmentCard}>
                <View style={styles.appointmentHeader}>
                  <MaterialCommunityIcons name="calendar-check" size={24} color={COLORS.primary} />
                  <Text style={styles.appointmentTitle}>Next Appointment</Text>
                </View>
                <Text style={styles.appointmentText}>No upcoming appointments</Text>
                <Text style={styles.appointmentService}>Book a service to get started</Text>
              </View>
            )}
          </View>
        </View>

        {/* The CARE Store */}
        <View style={styles.fullWidthSection}>
          <View style={styles.sectionContent}>
            <TouchableWeb
              activeOpacity={0.8}
              onPress={() => navigation.navigate('CareStore')}
            >
              <LinearGradient
                colors={['#fff', '#fff', '#00CED1', '#00BFFF', '#1E90FF', '#4169E1']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.storeCardGradient}
              >
                <Animated.Image
                  source={require('../assets/Images/CARElogo.png')}
                  style={styles.storeLogo}
                  resizeMode="contain"
                />
                <View style={styles.storeCardContent}>
                  <View style={styles.storeCardText}>
                    <Text style={styles.storeCardTitle}>Store</Text>
                  </View>
                  <Animated.View style={{ transform: [{ translateX: arrowAnim }] }}>
                    <MaterialCommunityIcons 
                      name="chevron-right" 
                      size={28} 
                      color={COLORS.white} 
                    />
                  </Animated.View>
                </View>
              </LinearGradient>
            </TouchableWeb>
          </View>
        </View>

        {/* Quick Access - Reminders, Emergency & Orders */}
        <View style={styles.fullWidthSection}>
          <View style={styles.sectionContent}>
            <View style={styles.quickAccessRow}>
              {/* Reminders Tile */}
              <TouchableWeb
                style={styles.quickAccessTile}
                activeOpacity={0.8}
                onPress={() => setReminderModalVisible(true)}
              >
                <LinearGradient
                  colors={GRADIENTS.header}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.quickAccessTileGradient}
                >
                  <MaterialCommunityIcons name="bell-ring" size={36} color={COLORS.white} />
                  <Text style={styles.quickAccessTileTitle}>Reminders</Text>
                  {(reminders.length > 0 || overdueInvoices.length > 0) && (
                    <View style={styles.tileBadge}>
                      <Text style={styles.tileBadgeText}>
                        {reminders.length + overdueInvoices.length}
                      </Text>
                    </View>
                  )}
                </LinearGradient>
              </TouchableWeb>

              {/* Emergency Contact Tile */}
              <TouchableWeb
                style={styles.quickAccessTile}
                activeOpacity={0.8}
                onPress={() => setEmergencyModalVisible(true)}
              >
                <LinearGradient
                  colors={[COLORS.error, '#ff6b6b']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.quickAccessTileGradient}
                >
                  <MaterialCommunityIcons name="phone-alert" size={36} color={COLORS.white} />
                  <Text style={styles.quickAccessTileTitle}>Emergency</Text>
                  {emergencyContact && (
                    <View style={[styles.tileBadge, { backgroundColor: COLORS.success }]}>
                      <MaterialCommunityIcons name="check" size={14} color={COLORS.white} />
                    </View>
                  )}
                </LinearGradient>
              </TouchableWeb>

              {/* My Orders Tile */}
              <TouchableWeb
                style={styles.quickAccessTile}
                activeOpacity={0.8}
                onPress={() => navigation.navigate('PatientStoreOrders')}
              >
                <LinearGradient
                  colors={['#10B981', '#059669']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.quickAccessTileGradient}
                >
                  <MaterialCommunityIcons name="package-variant" size={36} color={COLORS.white} />
                  <Text style={styles.quickAccessTileTitle}>My Orders</Text>
                  {pendingOrders.length > 0 && (
                    <View style={styles.tileBadge}>
                      <Text style={styles.tileBadgeText}>
                        {pendingOrders.length}
                      </Text>
                    </View>
                  )}
                </LinearGradient>
              </TouchableWeb>
            </View>
          </View>
        </View>


      </ScrollView>

      {/* Service Detail Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedService && (
              <>
                <LinearGradient
                  colors={GRADIENTS.header}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                  style={styles.modalHeader}
                >
                  <MaterialCommunityIcons 
                    name={selectedService.icon || 'medical-bag'} 
                    size={36} 
                    color={COLORS.white} 
                  />
                  <Text style={styles.modalTitle}>{selectedService.title || 'Service'}</Text>
                  <Text style={styles.modalCategory}>{selectedService.category || 'Healthcare'}</Text>
                </LinearGradient>

                <View style={styles.modalBody}>
                  <Text style={styles.modalDescription}>{selectedService.description || 'Professional healthcare service'}</Text>

                  {/* Pricing Information */}
                  <View style={styles.pricingContainer}>
                    <View style={styles.pricingItem}>
                      <MaterialCommunityIcons name="currency-usd" size={20} color={COLORS.primary} />
                      <View style={styles.pricingTextContainer}>
                        <Text style={styles.pricingLabel}>Price</Text>
                        <Text style={styles.pricingValue}>{selectedService.price || 'Contact us'}</Text>
                      </View>
                    </View>
                    <View style={styles.pricingDivider} />
                    <View style={styles.pricingItem}>
                      <MaterialCommunityIcons name="clock-outline" size={20} color={COLORS.accent} />
                      <View style={styles.pricingTextContainer}>
                        <Text style={styles.pricingLabel}>Duration</Text>
                        <Text style={styles.pricingValue}>{selectedService.duration || 'Varies'}</Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.modalButtons}>
                    <TouchableWeb
                      style={styles.modalBookButton}
                      onPress={handleBookAppointment}
                      activeOpacity={0.8}
                    >
                      <LinearGradient
                        colors={GRADIENTS.header}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 0, y: 1 }}
                        style={styles.modalBookGradient}
                      >
                        <MaterialCommunityIcons name="plus-circle" size={18} color={COLORS.white} />
                        <Text style={styles.modalBookButtonText}>Book Appointment</Text>
                      </LinearGradient>
                    </TouchableWeb>

                    <TouchableWeb
                      style={styles.modalCloseButton}
                      onPress={() => setModalVisible(false)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.modalCloseButtonText}>Close</Text>
                    </TouchableWeb>
                  </View>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Add Reminder Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={reminderModalVisible}
        onRequestClose={() => setReminderModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.reminderModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalHeaderTitle}>Add Reminder</Text>
              <TouchableWeb
                onPress={() => setReminderModalVisible(false)}
                style={styles.closeIconButton}
              >
                <MaterialCommunityIcons name="close" size={24} color={COLORS.text} />
              </TouchableWeb>
            </View>

            <ScrollView style={styles.reminderModalBody}>
              <Text style={styles.inputLabel}>Reminder Title</Text>
              <View style={styles.textInput}>
                <TextInput
                  placeholder="e.g., Take medication, Call doctor"
                  placeholderTextColor={COLORS.textLight}
                  value={reminderText}
                  onChangeText={setReminderText}
                  style={styles.inputField}
                />
              </View>

              <Text style={styles.inputLabel}>Date</Text>
              <TouchableWeb
                style={styles.dateTimeButton}
                onPress={() => setShowReminderDatePicker(!showReminderDatePicker)}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons name="calendar" size={20} color={COLORS.primary} />
                <Text style={[styles.dateTimeButtonText, !reminderDate && { color: COLORS.textLight }]}>
                  {reminderDate || 'Select Date'}
                </Text>
              </TouchableWeb>

              {showReminderDatePicker && (
                <View style={styles.inlinePickerContainer}>
                  <DateTimePicker
                    value={selectedReminderDate}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={onReminderDateChange}
                    minimumDate={new Date()}
                    textColor={COLORS.text}
                  />
                  <TouchableWeb
                    style={styles.inlinePickerDoneButton}
                    onPress={() => setShowReminderDatePicker(false)}
                  >
                    <Text style={styles.inlinePickerDoneText}>Done</Text>
                  </TouchableWeb>
                </View>
              )}

              <Text style={styles.inputLabel}>Time</Text>
              <TouchableWeb
                style={styles.dateTimeButton}
                onPress={() => setShowReminderTimePicker(!showReminderTimePicker)}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons name="clock-outline" size={20} color={COLORS.primary} />
                <Text style={[styles.dateTimeButtonText, !reminderTime && { color: COLORS.textLight }]}>
                  {reminderTime || 'Select Time'}
                </Text>
              </TouchableWeb>

              {showReminderTimePicker && (
                <View style={styles.inlinePickerContainer}>
                  <DateTimePicker
                    value={selectedReminderTime}
                    mode="time"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={onReminderTimeChange}
                    textColor={COLORS.text}
                  />
                  <TouchableWeb
                    style={styles.inlinePickerDoneButton}
                    onPress={() => setShowReminderTimePicker(false)}
                  >
                    <Text style={styles.inlinePickerDoneText}>Done</Text>
                  </TouchableWeb>
                </View>
              )}

              {/* Display overdue invoices in modal */}
              {overdueInvoices.length > 0 && (
                <>
                  <Text style={[styles.inputLabel, { marginTop: SPACING.lg, color: COLORS.error }]}>Overdue Payments</Text>
                  {overdueInvoices.map(invoice => (
                    <View key={`overdue-modal-${invoice.invoiceId}`} style={[styles.reminderItem, styles.overdueReminderModalItem]}>
                      <MaterialCommunityIcons
                        name="alert-circle"
                        size={24}
                        color={COLORS.error}
                      />
                      <View style={styles.reminderTextContainer}>
                        <Text style={[styles.reminderTitle, { color: COLORS.error }]}>
                          Payment Overdue: {invoice.invoiceId}
                        </Text>
                        <Text style={[styles.reminderDateTime, { color: COLORS.error }]}>
                          Amount: ${invoice.total} | Due: {invoice.dueDate}
                        </Text>
                      </View>
                      <TouchableWeb
                        onPress={() => {
                          setReminderModalVisible(false);
                          // Navigate to invoice or payment screen
                          // navigation.navigate('Invoice', { invoiceId: invoice.invoiceId });
                        }}
                        style={[styles.deleteButton, { backgroundColor: COLORS.error + '20' }]}
                      >
                        <MaterialCommunityIcons name="eye" size={20} color={COLORS.error} />
                      </TouchableWeb>
                    </View>
                  ))}
                </>
              )}

              {reminders.length > 0 && (
                <>
                  <Text style={[styles.inputLabel, { marginTop: SPACING.lg }]}>Your Reminders</Text>
                  {reminders.map(reminder => (
                    <View key={reminder.id} style={styles.reminderItem}>
                      <TouchableWeb
                        onPress={() => handleToggleReminder(reminder.id)}
                        style={styles.reminderCheckbox}
                      >
                        <MaterialCommunityIcons
                          name={reminder.completed ? 'check-circle' : 'circle-outline'}
                          size={24}
                          color={reminder.completed ? COLORS.primary : COLORS.textLight}
                        />
                      </TouchableWeb>
                      <View style={styles.reminderTextContainer}>
                        <Text style={[styles.reminderTitle, reminder.completed && { textDecorationLine: 'line-through', color: COLORS.textLight }]}>
                          {reminder.text}
                        </Text>
                        <Text style={styles.reminderDateTime}>{reminder.date} at {reminder.time}</Text>
                      </View>
                      <TouchableWeb
                        onPress={() => handleDeleteReminder(reminder.id)}
                        style={styles.deleteButton}
                      >
                        <MaterialCommunityIcons name="trash-can-outline" size={20} color={COLORS.error} />
                      </TouchableWeb>
                    </View>
                  ))}
                </>
              )}
            </ScrollView>

            <View style={styles.reminderModalFooter}>
              <TouchableWeb
                style={styles.modalButton}
                onPress={() => setReminderModalVisible(false)}
              >
                <View style={styles.modalButtonBackground}>
                  <Text style={[styles.modalButtonText, { color: COLORS.text }]}>Cancel</Text>
                </View>
              </TouchableWeb>
              <TouchableWeb
                style={styles.modalButton}
                onPress={handleAddReminder}
              >
                <LinearGradient
                  colors={GRADIENTS.header}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                  style={styles.modalButtonGradient}
                >
                  <Text style={[styles.modalButtonText, { color: COLORS.white }]}>Add Reminder</Text>
                </LinearGradient>
              </TouchableWeb>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Emergency Contact Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={emergencyModalVisible}
        onRequestClose={() => setEmergencyModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.reminderModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalHeaderTitle}>Emergency Contact</Text>
              <TouchableWeb
                onPress={() => setEmergencyModalVisible(false)}
                style={styles.closeIconButton}
              >
                <MaterialCommunityIcons name="close" size={24} color={COLORS.text} />
              </TouchableWeb>
            </View>

            <ScrollView 
              style={styles.reminderModalBody}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={styles.inputLabel}>First Name</Text>
              <View style={styles.textInput}>
                <TextInput
                  placeholder="e.g., John"
                  placeholderTextColor={COLORS.textLight}
                  value={emergencyFirstName}
                  onChangeText={setEmergencyFirstName}
                  style={styles.inputField}
                />
              </View>

              <Text style={styles.inputLabel}>Last Name</Text>
              <View style={styles.textInput}>
                <TextInput
                  placeholder="e.g., Doe"
                  placeholderTextColor={COLORS.textLight}
                  value={emergencyLastName}
                  onChangeText={setEmergencyLastName}
                  style={styles.inputField}
                />
              </View>

              <Text style={styles.inputLabel}>Relationship</Text>
              <View style={styles.textInput}>
                <TextInput
                  placeholder="e.g., Mother, Brother, Spouse"
                  placeholderTextColor={COLORS.textLight}
                  value={emergencyRelationship}
                  onChangeText={setEmergencyRelationship}
                  style={styles.inputField}
                />
              </View>

              <Text style={styles.inputLabel}>Phone Number</Text>
              <View style={styles.textInput}>
                <TextInput
                  placeholder="e.g., +1 234 567 8900"
                  placeholderTextColor={COLORS.textLight}
                  value={emergencyPhone}
                  onChangeText={setEmergencyPhone}
                  keyboardType="phone-pad"
                  style={styles.inputField}
                />
              </View>

              {emergencyContact && (
                <View style={styles.emergencyContactCard}>
                  <View style={styles.emergencyContactHeader}>
                    <MaterialCommunityIcons name="phone-alert" size={28} color={COLORS.error} />
                    <View style={styles.emergencyContactInfo}>
                      <Text style={styles.emergencyContactName}>{emergencyContact.firstName} {emergencyContact.lastName}</Text>
                      <Text style={styles.emergencyContactRelationship}>{emergencyContact.relationship}</Text>
                      <Text style={styles.emergencyContactPhone}>{emergencyContact.phone}</Text>
                    </View>
                  </View>
                  <TouchableWeb
                    style={styles.emergencyCallButton}
                    onPress={handleCallEmergency}
                  >
                    <LinearGradient
                      colors={[COLORS.error, '#ff6b6b']}
                      style={styles.emergencyCallGradient}
                    >
                      <MaterialCommunityIcons name="phone" size={20} color={COLORS.white} />
                      <Text style={styles.emergencyCallText}>Call Now</Text>
                    </LinearGradient>
                  </TouchableWeb>
                </View>
              )}
            </ScrollView>

            <View style={styles.reminderModalFooter}>
              <TouchableWeb
                style={[styles.modalButton, { backgroundColor: COLORS.border }]}
                onPress={() => setEmergencyModalVisible(false)}
              >
                <Text style={[styles.modalButtonText, { color: COLORS.text }]}>Cancel</Text>
              </TouchableWeb>
              <TouchableWeb
                style={[styles.modalButton, { backgroundColor: COLORS.error }]}
                onPress={handleAddEmergencyContact}
              >
                <Text style={[styles.modalButtonText, { color: COLORS.white }]}>Save Contact</Text>
              </TouchableWeb>
            </View>
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
  welcomeText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.white,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 16,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerProfileImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  notificationBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: COLORS.error,
    borderRadius: 12,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  notificationBadgeText: {
    fontSize: 10,
    fontFamily: 'Poppins_700Bold',
    color: COLORS.white,
  },
  section: {
    paddingHorizontal: SPACING.lg,
    marginTop: SPACING.xl,
  },
  scrollViewContent: {
    paddingBottom: 100,
  },
  fullWidthSection: {
    marginTop: SPACING.xl,
  },
  whiteContainer: {
    backgroundColor: COLORS.white,
    paddingVertical: SPACING.sm,
    marginTop: SPACING.md,
  },
  sectionContent: {
    paddingHorizontal: SPACING.lg,
  },
  lastSection: {
    marginBottom: SPACING.xxl,
  },
  servicesScroll: {
    paddingHorizontal: SPACING.xs,
    paddingVertical: SPACING.xs,
    gap: -5,
  },
  serviceCircle: {
    alignItems: 'center',
    marginRight: SPACING.lg,
    width: 90,
  },
  serviceCircleGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
    marginBottom: SPACING.sm,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  innerGlow: {
    width: '100%',
    height: '100%',
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
  },
  serviceCircleLabel: {
    fontSize: 11,
    fontFamily: 'Poppins_500Medium',
    color: COLORS.text,
    textAlign: 'center',
    lineHeight: 14,
  },
  quickActions: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  actionCard: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  actionGradient: {
    padding: SPACING.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 100,
  },
  actionText: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.white,
    marginTop: SPACING.sm,
  },
  contactTiles: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  contactTile: {
    flex: 1,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 12,
  },
  contactTileGradient: {
    paddingVertical: SPACING.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    borderRadius: 16,
  },
  contactTileLabel: {
    fontSize: 12,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.white,
  },
  hoursCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: SPACING.md,
    gap: SPACING.md,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 3,
  },
  hourRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  hourLabel: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
    color: COLORS.text,
  },
  hourValue: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.primary,
  },
  emergencyHour: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: 12,
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  emergencyHourText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.white,
  },
  featureList: {
    gap: SPACING.md,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    padding: SPACING.md,
    borderRadius: 12,
    gap: SPACING.md,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  featureText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
    color: COLORS.text,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    width: '90%',
    maxWidth: 500,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 15,
  },
  modalHeader: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 17,
    fontFamily: 'Poppins_700Bold',
    color: COLORS.white,
    marginTop: SPACING.xs,
    textAlign: 'center',
  },
  modalCategory: {
    fontSize: 11,
    fontFamily: 'Poppins_500Medium',
    color: COLORS.white,
    opacity: 0.9,
    marginTop: 2,
  },
  modalBody: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  modalDescription: {
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.text,
    lineHeight: 19,
    marginBottom: SPACING.md,
    textAlign: 'center',
  },
  pricingContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  pricingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    flex: 1,
  },
  pricingTextContainer: {
    flex: 1,
  },
  pricingLabel: {
    fontSize: 10,
    fontFamily: 'Poppins_500Medium',
    color: COLORS.textLight,
    marginBottom: 2,
  },
  pricingValue: {
    fontSize: 14,
    fontFamily: 'Poppins_700Bold',
    color: COLORS.text,
  },
  pricingDivider: {
    width: 1,
    height: 30,
    backgroundColor: COLORS.border,
    marginHorizontal: SPACING.sm,
  },
  modalButtons: {
    flexDirection: 'column',
    gap: SPACING.md,
    marginTop: SPACING.md,
  },
  modalCloseButton: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.text,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
  },
  modalCloseButtonText: {
    fontSize: 14,
    fontFamily: 'Poppins_700Bold',
    color: COLORS.text,
    letterSpacing: 0.2,
  },
  modalBookButton: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  modalBookGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    gap: SPACING.sm,
  },
  modalBookButtonText: {
    fontSize: 14,
    fontFamily: 'Poppins_700Bold',
    color: COLORS.white,
    letterSpacing: 0.3,
  },
  advertisementCard: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  advertisementGradient: {
    padding: SPACING.xl,
    minHeight: 220,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  advertisementBackgroundLogo: {
    position: 'absolute',
    width: '80%',
    height: '80%',
    opacity: 0.08,
    alignSelf: 'center',
  },
  advertisementContent: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    zIndex: 1,
  },
  advertisementTitle: {
    fontSize: 24,
    fontFamily: 'Poppins_700Bold',
    color: COLORS.white,
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  advertisementDescription: {
    fontSize: 15,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.white,
    textAlign: 'center',
    lineHeight: 22,
    opacity: 0.95,
    paddingHorizontal: SPACING.md,
  },
  indicatorContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: SPACING.md,
    gap: SPACING.xs,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  indicatorActive: {
    backgroundColor: COLORS.white,
    width: 24,
  },
  quickAccessContainer: {
    flexDirection: 'column',
    gap: 12,
  },
  quickAccessCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  quickAccessHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  quickAccessTitle: {
    fontSize: 15,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.text,
  },
  quickAccessSubtitle: {
    fontSize: 11,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.textLight,
    marginBottom: 14,
    lineHeight: 16,
  },
  quickAccessButton: {
    borderRadius: 10,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  quickAccessButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 6,
  },
  quickAccessButtonText: {
    fontSize: 12,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.white,
  },
  remindersList: {
    marginBottom: SPACING.md,
  },
  reminderPreviewItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 8,
    backgroundColor: COLORS.background,
    borderRadius: 8,
    marginBottom: 6,
  },
  reminderPreviewText: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.text,
    flex: 1,
  },
  moreRemindersText: {
    fontSize: 11,
    fontFamily: 'Poppins_500Medium',
    color: COLORS.primary,
    textAlign: 'center',
    marginTop: 4,
  },
  overdueReminderItem: {
    backgroundColor: COLORS.error + '10',
    borderLeftWidth: 3,
    borderLeftColor: COLORS.error,
  },
  overdueReminderText: {
    color: COLORS.error,
    fontWeight: '600',
  },
  noRemindersText: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.textLight,
    textAlign: 'center',
    marginVertical: 8,
    fontStyle: 'italic',
  },
  overdueReminderModalItem: {
    backgroundColor: COLORS.error + '10',
    borderLeftWidth: 4,
    borderLeftColor: COLORS.error,
    paddingLeft: SPACING.md,
  },
  emergencyContactPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 71, 87, 0.1)',
    borderRadius: 10,
    padding: 12,
    marginBottom: SPACING.md,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.error,
  },
  emergencyContactInfo: {
    flex: 1,
  },
  emergencyContactName: {
    fontSize: 13,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.text,
    marginBottom: 2,
  },
  emergencyContactRelationship: {
    fontSize: 11,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.textLight,
    fontStyle: 'italic',
    marginBottom: 2,
  },
  emergencyContactPhone: {
    fontSize: 12,
    fontFamily: 'Poppins_500Medium',
    color: COLORS.text,
  },
  callQuickButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.error,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.error,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  reminderModalContent: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    marginHorizontal: 20,
    marginVertical: 100,
    maxWidth: 400,
    maxHeight: '80%',
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
    flex: 1,
    flexDirection: 'column',
  },
  appointmentCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  appointmentCardGradient: {
    borderRadius: 20,
    padding: 20,
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
  appointmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  appointmentTitle: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.text,
  },
  appointmentText: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.text,
  },
  appointmentService: {
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.textLight,
    marginTop: 2,
  },
  reminderModalContent: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    flex: 1,
    flexDirection: 'column',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalHeaderTitle: {
    fontSize: 20,
    fontFamily: 'Poppins_700Bold',
    color: COLORS.text,
  },
  closeIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reminderModalBody: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.text,
    marginBottom: SPACING.sm,
    marginTop: SPACING.md,
  },
  textInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: SPACING.md,
    backgroundColor: COLORS.white,
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    marginBottom: SPACING.md,
  },
  inputField: {
    flex: 1,
    paddingVertical: SPACING.md,
    fontFamily: 'Poppins_400Regular',
    fontSize: 14,
    color: COLORS.text,
  },
  reminderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: SPACING.md,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    marginBottom: SPACING.xs,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  reminderCheckbox: {
    marginRight: SPACING.md,
  },
  reminderTextContainer: {
    flex: 1,
  },
  reminderTitle: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.text,
  },
  reminderTime: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.textLight,
    marginTop: 4,
  },
  reminderDateTime: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.textLight,
    marginTop: 4,
  },
  deleteButton: {
    padding: SPACING.sm,
  },
  reminderModalFooter: {
    flexDirection: 'row',
    gap: SPACING.md,
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonText: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
  },
  modalButtonGradient: {
    width: '100%',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonBackground: {
    width: '100%',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.border,
  },
  emergencyContactCard: {
    backgroundColor: 'rgba(255, 71, 87, 0.1)',
    borderRadius: 12,
    padding: SPACING.lg,
    marginTop: SPACING.lg,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.error,
  },
  emergencyContactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  emergencyContactInfo: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  emergencyContactName: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.text,
  },
  emergencyContactPhone: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.textLight,
    marginTop: 4,
  },
  emergencyContactRelationship: {
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.accent,
    marginTop: 2,
    fontStyle: 'italic',
  },
  emergencyCallButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  emergencyCallGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    gap: SPACING.sm,
  },
  emergencyCallText: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.white,
  },
  dateTimeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  dateTimeButtonText: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.text,
    flex: 1,
  },
  inlinePickerContainer: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    marginBottom: SPACING.md,
    padding: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  inlinePickerDoneButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.sm,
    marginTop: SPACING.sm,
    borderRadius: 8,
    alignItems: 'center',
  },
  inlinePickerDoneText: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.white,
  },
  pickerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    marginHorizontal: 20,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    overflow: 'hidden',
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  pickerTitle: {
    fontSize: 18,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.text,
  },
  pickerCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerConfirmButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    marginHorizontal: SPACING.md,
    marginVertical: SPACING.md,
    borderRadius: 12,
    alignItems: 'center',
  },
  pickerConfirmText: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.white,
  },
  // CARE Store Styles
  storeCardGradient: {
    borderRadius: 20,
    padding: 40,
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
    minHeight: 80,
  },
  storeLogo: {
    position: 'absolute',
    left: -20,
    top: '-60%',
    marginTop: -45,
    width: 250,
    height: 250,
    zIndex: 10,
    shadowColor: '#ffffff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 10,
  },
  storeCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 180,
  },
  storeCardText: {
    flex: 1,
  },
  storeCardTitle: {
    fontSize: 24,
    fontFamily: 'Poppins_700Bold',
    color: COLORS.white,
    letterSpacing: 0.5,
    marginBottom: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  // Quick Access Tiles
  quickAccessRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 16,
  },
  quickAccessTile: {
    flex: 1,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 15,
    elevation: 15,
    transform: [{ translateY: -3 }],
  },
  fullWidthTile: {
    borderRadius: 20,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 15,
    elevation: 15,
    transform: [{ translateY: -3 }],
  },
  quickAccessTileGradient: {
    padding: 20,
    borderRadius: 20,
    minHeight: 130,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    borderTopWidth: 2,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.4)',
    borderLeftColor: 'rgba(255, 255, 255, 0.2)',
    borderRightColor: 'rgba(255, 255, 255, 0.1)',
    borderBottomWidth: 3,
    borderBottomColor: 'rgba(0, 0, 0, 0.2)',
  },
  quickAccessTileTitle: {
    fontSize: 10,
    fontFamily: 'Poppins_700Bold',
    color: COLORS.white,
    textAlign: 'center',
    letterSpacing: 0.8,
    textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  tileBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: COLORS.error,
    borderRadius: 14,
    minWidth: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: COLORS.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 10,
  },
  tileBadgeText: {
    fontSize: 13,
    fontFamily: 'Poppins_700Bold',
    color: COLORS.white,
  },
});
