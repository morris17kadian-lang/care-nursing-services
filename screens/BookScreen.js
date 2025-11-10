import TouchableWeb from "../components/TouchableWeb";
import React, { useState, useContext, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  Alert,
  Platform,
  FlatList,
  Pressable,
  Keyboard,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, GRADIENTS, SPACING } from '../constants';
import { useServices } from '../context/ServicesContext';
import { getAddressSuggestions } from '../utils/addressData';
import { useAppointments } from '../context/AppointmentContext';
import { useAuth } from '../context/AuthContext';
import InvoiceService from '../services/InvoiceService';
import RecurringAppointmentService from '../services/RecurringAppointmentService';

export default function BookScreen() {
  const { services } = useServices();
  const { bookAppointment } = useAppointments();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const addressInputRef = useRef(null);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    service: '',
    date: '',
    time: '',
    notes: '',
    subscriptionPlan: '',
  });
  const [addressSuggestions, setAddressSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showSubscriptionDropdown, setShowSubscriptionDropdown] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState(new Date());
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringFrequency, setRecurringFrequency] = useState('2weeks');
  const [recurringDuration, setRecurringDuration] = useState(1);
  const [invoiceFrequency, setInvoiceFrequency] = useState('monthly');
  const [autoEmailInvoices, setAutoEmailInvoices] = useState(false);

  // Autofill form data from user profile
  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        name: user.name || user.username || '',
        email: user.email || '',
        phone: user.phone || '',
        address: user.address || '',
      }));
    }
  }, [user]);

  const subscriptionPlans = [
    { id: 'none', label: 'One-time Service', price: 'Pay per visit', popular: false },
    { id: 'basic', label: 'Basic Care', price: 'J$15,000/month', popular: false },
    { id: 'premium', label: 'Premium Care', price: 'J$30,000/month', popular: true },
    { id: 'elite', label: 'Elite Care', price: 'J$52,500/month', popular: false },
  ];

  const handleAddressChange = (text) => {
    setFormData({ ...formData, address: text });
    if (text.length >= 2) {
      const suggestions = getAddressSuggestions(text);
      setAddressSuggestions(suggestions);
      setShowSuggestions(suggestions.length > 0);
    } else {
      setShowSuggestions(false);
      setAddressSuggestions([]);
    }
  };

  const selectAddress = (address) => {
    setFormData({ ...formData, address });
    setShowSuggestions(false);
    setAddressSuggestions([]);
  };

  const handleAddressFocus = () => {
    if (formData.address.length >= 2) {
      const suggestions = getAddressSuggestions(formData.address);
      setAddressSuggestions(suggestions);
      setShowSuggestions(suggestions.length > 0);
    }
  };

  const handleAddressBlur = () => {
    // Delay hiding suggestions to allow for selection
    setTimeout(() => {
      setShowSuggestions(false);
    }, 300);
  };

  const handleOutsidePress = () => {
    setShowSubscriptionDropdown(false);
  };

      const handleSubmit = async () => {
    // Validate form - use the values already formatted in formData
    if (!formData.name || !formData.email || !formData.phone || !formData.address || !formData.service || !formData.date || !formData.time) {
      Alert.alert('Error', 'Please fill in all required fields including date and time');
      return;
    }

    try {
      const appointmentData = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
        service: formData.service,
        preferredDate: formData.date,
        preferredTime: formData.time,
        date: formData.date,
        time: formData.time,
        notes: formData.notes,
        subscriptionPlan: formData.subscriptionPlan,
        isRecurring: isRecurring,
        recurringFrequency: isRecurring ? recurringFrequency : null,
        recurringDuration: isRecurring ? recurringDuration : null,
        patientId: user?.id || formData.email,
        patientName: formData.name,
      };

      console.log('Booking appointment with data:', appointmentData);

      // Handle recurring appointments
      if (isRecurring) {
        try {
          const result = await RecurringAppointmentService.createRecurringAppointments(
            appointmentData,
            recurringFrequency,
            recurringDuration
          );
          
          console.log(`✅ Created ${result.totalInstances} recurring appointment instances`);
          console.log(`📅 Series ID: ${result.seriesId}`);
          
          // Set up automatic invoice scheduling for recurring appointments
          if (autoEmailInvoices) {
            try {
              const clientData = {
                id: Date.now(),
                name: formData.name,
                email: formData.email,
                serviceType: formData.service,
                phone: formData.phone,
                address: formData.address
              };
              
              await InvoiceService.setupRecurringInvoiceSchedule(clientData, invoiceFrequency);
              console.log('✅ Automatic invoice scheduling set up for recurring client');
            } catch (error) {
              console.error('Error setting up invoice scheduling:', error);
              // Don't fail the booking if invoice setup fails
            }
          }
          
          Alert.alert(
            'Success',
            `Your recurring appointment has been booked successfully!\n\n` +
            `📅 ${result.totalInstances} appointments scheduled (${recurringFrequency})\n` +
            `🔔 Reminder notifications will be sent 24 hours before each appointment\n\n` +
            (autoEmailInvoices ? `💰 Automatic invoices will be emailed ${invoiceFrequency}\n\n` : '') +
            `You will receive confirmation shortly.`,
            [{ text: 'OK', onPress: () => resetForm() }]
          );
        } catch (error) {
          console.error('Error creating recurring appointments:', error);
          Alert.alert('Error', 'Failed to create recurring appointments. Please try again.');
          return;
        }
      } else {
        // Single appointment booking (existing logic)
        await bookAppointment(appointmentData);
        
        Alert.alert(
          'Success',
          'Your appointment has been booked successfully! You will receive a confirmation shortly.',
          [{ text: 'OK', onPress: () => resetForm() }]
        );
      }
    } catch (error) {
      console.error('Error booking appointment:', error);
      Alert.alert('Error', 'Failed to book appointment. Please try again.');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      address: '',
      service: '',
      date: '',
      time: '',
      notes: '',
      subscriptionPlan: '',
    });
    setSelectedDate(new Date());
    setSelectedTime(new Date());
    setIsRecurring(false);
    setRecurringFrequency('2weeks');
    setRecurringDuration(1);
    setInvoiceFrequency('monthly');
    setAutoEmailInvoices(false);
  };

  const onDateChange = (event, date) => {
    // On Android, the picker is dismissed automatically when user selects or cancels
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
      if (event.type === 'set' && date) {
        // User selected a date
        setSelectedDate(date);
        const formattedDate = date.toLocaleDateString('en-US', {
          month: 'short',
          day: '2-digit',
          year: 'numeric'
        });
        setFormData({ ...formData, date: formattedDate });
      }
      // If event.type === 'dismissed', user cancelled - do nothing
    } else {
      // On iOS, just update the selected date
      if (date) {
        setSelectedDate(date);
      }
    }
  };

  const onTimeChange = (event, time) => {
    // On Android, the picker is dismissed automatically when user selects or cancels
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
      if (event.type === 'set' && time) {
        // User selected a time
        setSelectedTime(time);
        const formattedTime = time.toLocaleTimeString('en-US', { 
          hour: 'numeric', 
          minute: '2-digit',
          hour12: true 
        });
        setFormData({ ...formData, time: formattedTime });
      }
      // If event.type === 'dismissed', user cancelled - do nothing
    } else {
      // On iOS, just update the selected time
      if (time) {
        setSelectedTime(time);
      }
    }
  };

  const confirmDateSelection = () => {
    // Format date as "MMM DD, YYYY" (e.g., "Nov 02, 2025")
    const formattedDate = selectedDate.toLocaleDateString('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric'
    });
    setFormData({ ...formData, date: formattedDate });
    setShowDatePicker(false);
  };

  const confirmTimeSelection = () => {
    const formattedTime = selectedTime.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
    setFormData({ ...formData, time: formattedTime });
    setShowTimePicker(false);
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
          <Text style={styles.welcomeText}>Book Appointment</Text>
        </View>
      </LinearGradient>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        onScrollBeginDrag={handleOutsidePress}
      >
        <View style={styles.formCard}>
          {/* Name Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Full Name <Text style={styles.required}>*</Text>
            </Text>
            <View style={[styles.inputContainer, styles.autofilledInput]}>
              <MaterialCommunityIcons name="account" size={20} color={COLORS.primary} />
              <TextInput
                style={styles.input}
                placeholder="Enter your full name"
                placeholderTextColor={COLORS.textMuted}
                value={formData.name}
                editable={false}
              />
              <MaterialCommunityIcons name="lock" size={16} color={COLORS.textMuted} />
            </View>
          </View>

          {/* Email Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email Address</Text>
            <View style={[styles.inputContainer, styles.autofilledInput]}>
              <MaterialCommunityIcons name="email" size={20} color={COLORS.primary} />
              <TextInput
                style={styles.input}
                placeholder="your.email@example.com"
                placeholderTextColor={COLORS.textMuted}
                value={formData.email}
                editable={false}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <MaterialCommunityIcons name="lock" size={16} color={COLORS.textMuted} />
            </View>
          </View>

          {/* Phone Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Phone Number <Text style={styles.required}>*</Text>
            </Text>
            <View style={[styles.inputContainer, styles.autofilledInput]}>
              <MaterialCommunityIcons name="phone" size={20} color={COLORS.primary} />
              <TextInput
                style={styles.input}
                placeholder="876-XXX-XXXX"
                placeholderTextColor={COLORS.textMuted}
                value={formData.phone}
                editable={false}
                keyboardType="phone-pad"
              />
              <MaterialCommunityIcons name="lock" size={16} color={COLORS.textMuted} />
            </View>
          </View>

          {/* Address Input with Enhanced Autocomplete */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Service Address <Text style={styles.required}>*</Text>
            </Text>
            <Text style={styles.subtitle}>Address from your profile</Text>
            <View style={styles.addressWrapper}>
              <View style={[styles.inputContainer, styles.autofilledInput]}>
                <MaterialCommunityIcons name="map-marker" size={20} color={COLORS.primary} />
                <TextInput
                  ref={addressInputRef}
                  style={styles.input}
                  placeholder="e.g., Half Way Tree, New Kingston, Portmore..."
                  placeholderTextColor={COLORS.textMuted}
                  value={formData.address}
                  editable={false}
                  autoCorrect={false}
                  autoCapitalize="words"
                />
                <MaterialCommunityIcons name="lock" size={16} color={COLORS.textMuted} />
              </View>
            </View>
          </View>

          {/* Service Selection */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Service Required <Text style={styles.required}>*</Text>
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.serviceScroll}
            >
              {services.map((service) => (
                <TouchableWeb
                  key={service.id}
                  style={[
                    styles.serviceChip,
                    formData.service === service.title && { overflow: 'hidden' }
                  ]}
                  onPress={() => setFormData({ ...formData, service: service.title })}
                  activeOpacity={0.7}
                >
                  {formData.service === service.title ? (
                    <LinearGradient
                      colors={GRADIENTS.header}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 0, y: 1 }}
                      style={styles.serviceChipGradient}
                    >
                      <MaterialCommunityIcons
                        name={service.icon}
                        size={16}
                        color={COLORS.white}
                      />
                      <Text
                        style={styles.serviceChipTextSelected}
                        numberOfLines={1}
                      >
                        {service.title}
                      </Text>
                    </LinearGradient>
                  ) : (
                    <View style={styles.inactiveServiceChip}>
                      <MaterialCommunityIcons
                        name={service.icon}
                        size={16}
                        color={COLORS.primary}
                      />
                      <Text
                        style={styles.serviceChipText}
                        numberOfLines={1}
                      >
                        {service.title}
                      </Text>
                    </View>
                  )}
                </TouchableWeb>
              ))}
            </ScrollView>
          </View>

          {/* Date Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Preferred Date</Text>
            <TouchableWeb 
              style={styles.inputContainer}
              onPress={() => setShowDatePicker(true)}
            >
              <MaterialCommunityIcons name="calendar" size={20} color={COLORS.primary} />
              <Text style={[styles.input, { color: formData.date ? COLORS.text : COLORS.textMuted }]}>
                {formData.date || 'Select Date'}
              </Text>
            </TouchableWeb>
          </View>

          {/* Time Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Preferred Time</Text>
            <TouchableWeb 
              style={styles.inputContainer}
              onPress={() => setShowTimePicker(true)}
            >
              <MaterialCommunityIcons name="clock" size={20} color={COLORS.primary} />
              <Text style={[styles.input, { color: formData.time ? COLORS.text : COLORS.textMuted }]}>
                {formData.time || 'Select Time'}
              </Text>
            </TouchableWeb>
          </View>

          {/* Notes Input - Compact */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Additional Notes</Text>
            <View style={styles.notesContainer}>
              <View style={styles.inputContainer}>
                <MaterialCommunityIcons name="text" size={20} color={COLORS.primary} />
                <TextInput
                  style={[styles.input, styles.notesInput]}
                  placeholder="Any special requirements or concerns..."
                  placeholderTextColor={COLORS.textMuted}
                  value={formData.notes}
                  onChangeText={(text) => setFormData({ ...formData, notes: text })}
                  multiline
                  numberOfLines={2}
                />
              </View>
              <View style={styles.notesActions}>
                <TouchableWeb
                  style={styles.notesActionButton}
                  onPress={() => {
                    // Save notes - you can add additional save logic here if needed
                    Alert.alert('Success', 'Notes saved!');
                  }}
                  activeOpacity={0.7}
                >
                  <MaterialCommunityIcons name="check" size={24} color={COLORS.success} />
                </TouchableWeb>
                <TouchableWeb
                  style={styles.notesActionButton}
                  onPress={() => {
                    setFormData({ ...formData, notes: '' });
                  }}
                  activeOpacity={0.7}
                >
                  <MaterialCommunityIcons name="close" size={24} color={COLORS.error} />
                </TouchableWeb>
              </View>
            </View>
          </View>

          {/* Recurring Appointment Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recurring Appointment</Text>
            
            <TouchableWeb
              style={styles.recurringToggle}
              onPress={() => setIsRecurring(!isRecurring)}
              activeOpacity={0.7}
            >
              <View style={styles.recurringToggleContent}>
                <View style={styles.recurringToggleLeft}>
                  <MaterialCommunityIcons 
                    name="calendar-refresh" 
                    size={20} 
                    color={isRecurring ? COLORS.primary : COLORS.textMuted} 
                  />
                  <Text style={[styles.recurringToggleText, { color: isRecurring ? COLORS.primary : COLORS.text }]}>
                    Make this a recurring appointment
                  </Text>
                </View>
                <View style={[styles.toggleSwitch, { backgroundColor: isRecurring ? COLORS.primary : COLORS.border }]}>
                  <View style={[styles.toggleKnob, { marginLeft: isRecurring ? 27 : 3 }]} />
                </View>
              </View>
            </TouchableWeb>

            {isRecurring && (
              <View style={styles.recurringOptions}>
                {/* Frequency Selection */}
                <View style={styles.recurringRow}>
                  <Text style={styles.recurringLabel}>Frequency</Text>
                  <View style={styles.frequencyButtons}>
                    <TouchableWeb
                      style={[
                        styles.frequencyButton,
                        recurringFrequency === '2weeks' && { overflow: 'hidden' }
                      ]}
                      onPress={() => setRecurringFrequency('2weeks')}
                      activeOpacity={0.7}
                    >
                      {recurringFrequency === '2weeks' ? (
                        <LinearGradient
                          colors={GRADIENTS.header}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 0, y: 1 }}
                          style={styles.frequencyButtonGradient}
                        >
                          <Text style={styles.frequencyButtonTextActive}>
                            Every 2 Weeks
                          </Text>
                        </LinearGradient>
                      ) : (
                        <View style={styles.inactiveFrequencyButton}>
                          <Text style={styles.frequencyButtonText}>
                            Every 2 Weeks
                          </Text>
                        </View>
                      )}
                    </TouchableWeb>
                    <TouchableWeb
                      style={[
                        styles.frequencyButton,
                        recurringFrequency === 'monthly' && { overflow: 'hidden' }
                      ]}
                      onPress={() => setRecurringFrequency('monthly')}
                      activeOpacity={0.7}
                    >
                      {recurringFrequency === 'monthly' ? (
                        <LinearGradient
                          colors={GRADIENTS.header}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 0, y: 1 }}
                          style={styles.frequencyButtonGradient}
                        >
                          <Text style={styles.frequencyButtonTextActive}>
                            Monthly
                          </Text>
                        </LinearGradient>
                      ) : (
                        <View style={styles.inactiveFrequencyButton}>
                          <Text style={styles.frequencyButtonText}>
                            Monthly
                          </Text>
                        </View>
                      )}
                    </TouchableWeb>
                  </View>
                </View>

                {/* Duration Selection */}
                <View style={styles.recurringRow}>
                  <Text style={styles.recurringLabel}>Duration</Text>
                  <View style={styles.durationContainer}>
                    <TouchableWeb
                      style={styles.durationButton}
                      onPress={() => setRecurringDuration(Math.max(1, recurringDuration - 1))}
                      activeOpacity={0.7}
                    >
                      <MaterialCommunityIcons name="minus" size={20} color={COLORS.primary} />
                    </TouchableWeb>
                    <View style={styles.durationDisplay}>
                      <Text style={styles.durationText}>{recurringDuration}</Text>
                      <Text style={styles.durationUnit}>
                        {recurringFrequency === '2weeks' ? 'periods' : 'months'}
                      </Text>
                    </View>
                    <TouchableWeb
                      style={styles.durationButton}
                      onPress={() => setRecurringDuration(recurringDuration + 1)}
                      activeOpacity={0.7}
                    >
                      <MaterialCommunityIcons name="plus" size={20} color={COLORS.primary} />
                    </TouchableWeb>
                  </View>
                </View>

                {/* Summary */}
                <View style={styles.recurringSummary}>
                  <MaterialCommunityIcons name="information" size={16} color={COLORS.info} />
                  <Text style={styles.recurringSummaryText}>
                    {recurringFrequency === '2weeks' 
                      ? `Appointment will repeat every 2 weeks for ${recurringDuration} periods (${recurringDuration * 2} weeks total)`
                      : `Appointment will repeat monthly for ${recurringDuration} month${recurringDuration > 1 ? 's' : ''}`
                    }
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* Invoice Settings for Recurring Appointments */}
          {isRecurring && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Invoice Settings</Text>
              
              {/* Auto-Email Invoices Toggle */}
              <TouchableWeb
                style={styles.recurringToggle}
                onPress={() => setAutoEmailInvoices(!autoEmailInvoices)}
                activeOpacity={0.7}
              >
                <View style={styles.recurringToggleContent}>
                  <View style={styles.recurringToggleLeft}>
                    <MaterialCommunityIcons 
                      name="email-fast" 
                      size={20} 
                      color={autoEmailInvoices ? COLORS.primary : COLORS.textMuted} 
                    />
                    <Text style={[styles.recurringToggleText, { color: autoEmailInvoices ? COLORS.primary : COLORS.text }]}>
                      Automatically email invoices
                    </Text>
                  </View>
                  <View style={[styles.toggleSwitch, { backgroundColor: autoEmailInvoices ? COLORS.primary : COLORS.border }]}>
                    <View style={[styles.toggleKnob, { marginLeft: autoEmailInvoices ? 27 : 3 }]} />
                  </View>
                </View>
              </TouchableWeb>

              {/* Invoice Frequency Selection */}
              {autoEmailInvoices && (
                <View style={styles.recurringOptions}>
                  <View style={styles.recurringRow}>
                    <Text style={styles.recurringLabel}>Invoice Frequency</Text>
                    <View style={styles.frequencyButtons}>
                      <TouchableWeb
                        style={[
                          styles.frequencyButton,
                          invoiceFrequency === 'weekly' && { overflow: 'hidden' }
                        ]}
                        onPress={() => setInvoiceFrequency('weekly')}
                        activeOpacity={0.7}
                      >
                        {invoiceFrequency === 'weekly' ? (
                          <LinearGradient
                            colors={GRADIENTS.header}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 0, y: 1 }}
                            style={styles.frequencyButtonGradient}
                          >
                            <Text style={styles.frequencyButtonTextActive}>
                              Weekly
                            </Text>
                          </LinearGradient>
                        ) : (
                          <View style={styles.inactiveFrequencyButton}>
                            <Text style={styles.frequencyButtonText}>
                              Weekly
                            </Text>
                          </View>
                        )}
                      </TouchableWeb>
                      <TouchableWeb
                        style={[
                          styles.frequencyButton,
                          invoiceFrequency === 'monthly' && { overflow: 'hidden' }
                        ]}
                        onPress={() => setInvoiceFrequency('monthly')}
                        activeOpacity={0.7}
                      >
                        {invoiceFrequency === 'monthly' ? (
                          <LinearGradient
                            colors={GRADIENTS.header}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 0, y: 1 }}
                            style={styles.frequencyButtonGradient}
                          >
                            <Text style={styles.frequencyButtonTextActive}>
                              Monthly
                            </Text>
                          </LinearGradient>
                        ) : (
                          <View style={styles.inactiveFrequencyButton}>
                            <Text style={styles.frequencyButtonText}>
                              Monthly
                            </Text>
                          </View>
                        )}
                      </TouchableWeb>
                      <TouchableWeb
                        style={[
                          styles.frequencyButton,
                          invoiceFrequency === 'quarterly' && { overflow: 'hidden' }
                        ]}
                        onPress={() => setInvoiceFrequency('quarterly')}
                        activeOpacity={0.7}
                      >
                        {invoiceFrequency === 'quarterly' ? (
                          <LinearGradient
                            colors={GRADIENTS.header}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 0, y: 1 }}
                            style={styles.frequencyButtonGradient}
                          >
                            <Text style={styles.frequencyButtonTextActive}>
                              Quarterly
                            </Text>
                          </LinearGradient>
                        ) : (
                          <View style={styles.inactiveFrequencyButton}>
                            <Text style={styles.frequencyButtonText}>
                              Quarterly
                            </Text>
                          </View>
                        )}
                      </TouchableWeb>
                    </View>
                  </View>

                  {/* Invoice Summary */}
                  <View style={styles.recurringSummary}>
                    <MaterialCommunityIcons name="information" size={16} color={COLORS.info} />
                    <Text style={styles.recurringSummaryText}>
                      Invoices will be automatically generated and emailed {invoiceFrequency.toLowerCase()} to {formData.email || 'your email address'}
                    </Text>
                  </View>
                </View>
              )}
            </View>
          )}

          {/* Submit Button */}
          <TouchableWeb
            style={styles.submitButton}
            onPress={handleSubmit}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={GRADIENTS.header}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={styles.submitGradient}
            >
              <MaterialCommunityIcons name="check-circle" size={20} color={COLORS.white} />
              <Text style={styles.submitText}>Submit Appointment Request</Text>
            </LinearGradient>
          </TouchableWeb>

          {/* Info Box */}
          <View style={styles.infoBox}>
            <MaterialCommunityIcons name="information" size={20} color={COLORS.info} />
            <Text style={styles.infoText}>
              We'll contact you within 24 hours to confirm your appointment. For urgent needs,
              please call our 24/7 emergency line.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Date Picker */}
      {showDatePicker && Platform.OS === 'ios' && (
        <View style={styles.pickerOverlay}>
          <View style={styles.pickerContainer}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>Select Date</Text>
              <TouchableWeb
                onPress={() => setShowDatePicker(false)}
                style={styles.pickerCloseButton}
              >
                <MaterialCommunityIcons name="close" size={24} color={COLORS.text} />
              </TouchableWeb>
            </View>
            <DateTimePicker
              value={selectedDate}
              mode="date"
              display="spinner"
              onChange={onDateChange}
              minimumDate={new Date()}
              textColor={COLORS.text}
            />
            <TouchableWeb
              style={styles.pickerConfirmButton}
              onPress={confirmDateSelection}
            >
              <LinearGradient
                colors={GRADIENTS.header}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={styles.pickerConfirmGradient}
              >
                <Text style={styles.pickerConfirmText}>Done</Text>
              </LinearGradient>
            </TouchableWeb>
          </View>
        </View>
      )}

      {/* Android Date Picker - shows as native dialog */}
      {showDatePicker && Platform.OS === 'android' && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display="default"
          onChange={onDateChange}
          minimumDate={new Date()}
        />
      )}

      {/* Time Picker */}
      {showTimePicker && Platform.OS === 'ios' && (
        <View style={styles.pickerOverlay}>
          <View style={styles.pickerContainer}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>Select Time</Text>
              <TouchableWeb
                onPress={() => setShowTimePicker(false)}
                style={styles.pickerCloseButton}
              >
                <MaterialCommunityIcons name="close" size={24} color={COLORS.text} />
              </TouchableWeb>
            </View>
            <DateTimePicker
              value={selectedTime}
              mode="time"
              display="spinner"
              onChange={onTimeChange}
              textColor={COLORS.text}
            />
            <TouchableWeb
              style={styles.pickerConfirmButton}
              onPress={confirmTimeSelection}
            >
              <LinearGradient
                colors={GRADIENTS.header}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={styles.pickerConfirmGradient}
              >
                <Text style={styles.pickerConfirmText}>Done</Text>
              </LinearGradient>
            </TouchableWeb>
          </View>
        </View>
      )}

      {/* Android Time Picker - shows as native dialog */}
      {showTimePicker && Platform.OS === 'android' && (
        <DateTimePicker
          value={selectedTime}
          mode="time"
          display="default"
          onChange={onTimeChange}
        />
      )}
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
    justifyContent: 'center',
  },
  welcomeText: {
    fontSize: 18,
    fontFamily: 'Poppins_700Bold',
    color: COLORS.white,
    opacity: 0.98,
    textAlign: 'center',
    alignSelf: 'center',
  },
  headerSubtitle: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.white,
    opacity: 0.9,
    textAlign: 'center',
  },
  scrollContent: {
    padding: SPACING.lg,
  },
  formCard: {
    backgroundColor: 'transparent',
    padding: 0,
  },
  inputGroup: {
    marginBottom: SPACING.lg,
  },
  label: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  required: {
    color: COLORS.error,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: SPACING.md,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 8,
    borderBottomWidth: 0,
  },
  autofilledInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 8,
    borderBottomWidth: 0,
  },
  addressWrapper: {
    position: 'relative',
    zIndex: 10,
  },
  clearButton: {
    padding: 4,
  },
  suggestionsContainer: {
    position: 'absolute',
    top: 52,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    maxHeight: 220,
    shadowColor: COLORS.dark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 10000,
    overflow: 'hidden',
  },
  suggestionsHeader: {
    fontSize: 12,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.primary,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.lightGray,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  suggestionsList: {
    maxHeight: 200,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: SPACING.sm,
    backgroundColor: '#FFFFFF',
  },
  lastSuggestionItem: {
    borderBottomWidth: 0,
  },
  suggestionText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.text,
  },
  noSuggestionsContainer: {
    position: 'absolute',
    top: 52,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    shadowColor: COLORS.dark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    zIndex: 999,
  },
  noSuggestionsText: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
  input: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.text,
    paddingVertical: Platform.OS === 'android' ? SPACING.sm : 0,
  },
  textAreaContainer: {
    alignItems: 'flex-start',
    minHeight: 100,
    paddingTop: SPACING.md,
  },
  textAreaIcon: {
    marginTop: 2,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  serviceScroll: {
    marginTop: SPACING.sm,
  },
  serviceChip: {
    marginRight: SPACING.sm,
  },
  serviceChipGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
    minHeight: 36,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  inactiveServiceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
    minHeight: 36,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  serviceChipText: {
    fontSize: 12,
    fontFamily: 'Poppins_500Medium',
    color: COLORS.primary,
  },
  serviceChipTextSelected: {
    fontSize: 12,
    fontFamily: 'Poppins_500Medium',
    color: COLORS.white,
  },
  submitButton: {
    marginTop: SPACING.md,
    borderRadius: 999,
    overflow: 'hidden',
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  submitGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    gap: SPACING.sm,
  },
  submitText: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.white,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: `${COLORS.info}10`,
    borderRadius: 12,
    padding: SPACING.md,
    marginTop: SPACING.lg,
    gap: SPACING.sm,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.textLight,
    lineHeight: 18,
  },
  subtitle: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.textLight,
    marginBottom: SPACING.sm,
    marginTop: 2,
  },
  notesContainer: {
    gap: SPACING.sm,
  },
  notesInput: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  notesActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: SPACING.sm,
  },
  notesActionButton: {
    padding: SPACING.xs,
    borderRadius: 8,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  // Dropdown Styles
  dropdownButton: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: SPACING.md,
  },
  dropdownContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  dropdownText: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Poppins_500Medium',
    color: COLORS.text,
  },
  placeholderText: {
    color: COLORS.textMuted,
    fontFamily: 'Poppins_400Regular',
  },
  planInfo: {
    flex: 1,
  },
  planPrice: {
    fontSize: 12,
    fontFamily: 'Poppins_500Medium',
    color: COLORS.accent,
    marginTop: 2,
  },
  dropdownMenu: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    marginTop: 8,
    maxHeight: 200,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
    gap: SPACING.sm,
  },
  dropdownItemSelected: {
    backgroundColor: `${COLORS.primary}10`,
  },
  dropdownItemText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
    color: COLORS.text,
  },
  popularItem: {
    backgroundColor: `${COLORS.accent}05`,
  },
  planDetails: {
    flex: 1,
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  planName: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.text,
  },
  planPriceText: {
    fontSize: 12,
    fontFamily: 'Poppins_500Medium',
    color: COLORS.textLight,
    marginTop: 2,
  },
  popularBadge: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  popularText: {
    fontSize: 9,
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
    zIndex: 1000,
  },
  pickerContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: SPACING.lg,
    margin: SPACING.lg,
    shadowColor: COLORS.black,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    maxHeight: '80%',
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  pickerTitle: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.text,
  },
  pickerCloseButton: {
    padding: SPACING.sm,
  },
  pickerConfirmButton: {
    borderRadius: 10,
    marginTop: SPACING.md,
    overflow: 'hidden',
  },
  pickerConfirmGradient: {
    paddingVertical: SPACING.md,
    alignItems: 'center',
  },
  pickerConfirmText: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.white,
  },
  recurringToggle: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
    shadowColor: COLORS.black,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  recurringToggleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 24,
  },
  recurringToggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    flex: 0,
    paddingRight: SPACING.md,
  },
  recurringToggleText: {
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
  },
  toggleSwitch: {
    width: 50,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    position: 'relative',
    flexShrink: 0,
  },
  toggleKnob: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.white,
    shadowColor: COLORS.black,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  recurringOptions: {
    backgroundColor: COLORS.lightGray,
    borderRadius: 12,
    padding: SPACING.md,
    gap: SPACING.md,
  },
  recurringRow: {
    gap: SPACING.sm,
  },
  recurringLabel: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  frequencyButtons: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  frequencyButton: {
    flex: 1,
    marginHorizontal: 1,
  },
  frequencyButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  frequencyButtonText: {
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
    color: COLORS.text,
    textAlign: 'center',
  },
  frequencyButtonTextActive: {
    color: COLORS.white,
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
    textAlign: 'center',
  },
  frequencyButtonGradient: {
    paddingHorizontal: 10,
    paddingVertical: 2,
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
  inactiveFrequencyButton: {
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 36,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  durationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.md,
  },
  durationButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  durationDisplay: {
    alignItems: 'center',
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: 8,
    minWidth: 80,
  },
  durationText: {
    fontSize: 20,
    fontFamily: 'Poppins_700Bold',
    color: COLORS.primary,
  },
  durationUnit: {
    fontSize: 10,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  recurringSummary: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    backgroundColor: COLORS.white,
    padding: SPACING.sm,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.info,
  },
  recurringSummaryText: {
    flex: 1,
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.text,
    lineHeight: 16,
  },
  section: {
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.lg,
  },
});
