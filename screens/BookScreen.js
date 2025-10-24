import TouchableWeb from "../components/TouchableWeb";
import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  Alert,
  Platform,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, GRADIENTS, SPACING, SERVICES } from '../constants';
import { getAddressSuggestions } from '../utils/addressData';

export default function BookScreen() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    service: '',
    date: '',
    time: '',
    notes: '',
    paymentMethod: '',
    subscriptionPlan: '',
  });
  const [addressSuggestions, setAddressSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showPaymentDropdown, setShowPaymentDropdown] = useState(false);
  const [showSubscriptionDropdown, setShowSubscriptionDropdown] = useState(false);

  const paymentOptions = [
    { id: 'card', icon: 'credit-card', label: 'Credit/Debit Card' },
    { id: 'bank', icon: 'bank', label: 'Bank Transfer' },
    { id: 'insurance', icon: 'shield-account', label: 'Insurance' },
    { id: 'medicare', icon: 'medical-bag', label: 'Medicare' },
    { id: 'private', icon: 'cash', label: 'Private Pay' },
  ];

  const subscriptionPlans = [
    { id: 'none', label: 'One-time Service', price: 'Pay per visit', popular: false },
    { id: 'basic', label: 'Basic Care', price: '$99/month', popular: false },
    { id: 'premium', label: 'Premium Care', price: '$199/month', popular: true },
    { id: 'elite', label: 'Elite Care', price: '$349/month', popular: false },
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

  const handleOutsidePress = () => {
    setShowPaymentDropdown(false);
    setShowSubscriptionDropdown(false);
  };

  const handleSubmit = () => {
    // Validate form
    if (!formData.name || !formData.phone || !formData.address || !formData.service || !formData.paymentMethod) {
      Alert.alert('Required Fields', 'Please fill in all required fields (Name, Phone, Address, Service, Payment Method)');
      return;
    }

    // In a real app, this would send the request to the admin dashboard
    // The request will appear in the admin portal under "Pending Appointments"
    
    // Show success message
    Alert.alert(
      'Request Submitted Successfully!',
      'Your appointment request has been sent to our admin team. You will receive a confirmation call within 2 hours to schedule your appointment.',
      [{ text: 'OK', onPress: () => resetForm() }]
    );
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
      paymentMethod: '',
      subscriptionPlan: '',
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <LinearGradient
        colors={GRADIENTS.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>Book Appointment</Text>
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
            <View style={styles.inputContainer}>
              <MaterialCommunityIcons name="account" size={20} color={COLORS.primary} />
              <TextInput
                style={styles.input}
                placeholder="Enter your full name"
                placeholderTextColor={COLORS.textMuted}
                value={formData.name}
                onChangeText={(text) => setFormData({ ...formData, name: text })}
              />
            </View>
          </View>

          {/* Email Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email Address</Text>
            <View style={styles.inputContainer}>
              <MaterialCommunityIcons name="email" size={20} color={COLORS.primary} />
              <TextInput
                style={styles.input}
                placeholder="your.email@example.com"
                placeholderTextColor={COLORS.textMuted}
                value={formData.email}
                onChangeText={(text) => setFormData({ ...formData, email: text })}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </View>

          {/* Phone Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Phone Number <Text style={styles.required}>*</Text>
            </Text>
            <View style={styles.inputContainer}>
              <MaterialCommunityIcons name="phone" size={20} color={COLORS.primary} />
              <TextInput
                style={styles.input}
                placeholder="876-XXX-XXXX"
                placeholderTextColor={COLORS.textMuted}
                value={formData.phone}
                onChangeText={(text) => setFormData({ ...formData, phone: text })}
                keyboardType="phone-pad"
              />
            </View>
          </View>

          {/* Address Input with Autocomplete */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Service Address <Text style={styles.required}>*</Text>
            </Text>
            <View style={styles.addressWrapper}>
              <View style={styles.inputContainer}>
                <MaterialCommunityIcons name="map-marker" size={20} color={COLORS.primary} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your address or area"
                  placeholderTextColor={COLORS.textMuted}
                  value={formData.address}
                  onChangeText={handleAddressChange}
                  onFocus={() => {
                    if (formData.address.length >= 2) {
                      setShowSuggestions(true);
                    }
                  }}
                />
                {formData.address.length > 0 && (
                  <TouchableWeb
                    onPress={() => {
                      setFormData({ ...formData, address: '' });
                      setShowSuggestions(false);
                    }}
                    style={styles.clearButton}
                  >
                    <MaterialCommunityIcons name="close-circle" size={20} color={COLORS.textMuted} />
                  </TouchableWeb>
                )}
              </View>
              
              {showSuggestions && addressSuggestions.length > 0 && (
                <View style={styles.suggestionsContainer}>
                  <FlatList
                    data={addressSuggestions}
                    keyExtractor={(item, index) => index.toString()}
                    nestedScrollEnabled
                    renderItem={({ item }) => (
                      <TouchableWeb
                        style={styles.suggestionItem}
                        onPress={() => selectAddress(item)}
                      >
                        <MaterialCommunityIcons name="map-marker-outline" size={16} color={COLORS.primary} />
                        <Text style={styles.suggestionText}>{item}</Text>
                      </TouchableWeb>
                    )}
                  />
                </View>
              )}
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
              {SERVICES.map((service) => (
                <TouchableWeb
                  key={service.id}
                  style={[
                    styles.serviceChip,
                    formData.service === service.title && styles.serviceChipSelected,
                  ]}
                  onPress={() => setFormData({ ...formData, service: service.title })}
                  activeOpacity={0.7}
                >
                  <MaterialCommunityIcons
                    name={service.icon}
                    size={16}
                    color={formData.service === service.title ? COLORS.white : COLORS.primary}
                  />
                  <Text
                    style={[
                      styles.serviceChipText,
                      formData.service === service.title && styles.serviceChipTextSelected,
                    ]}
                    numberOfLines={1}
                  >
                    {service.title}
                  </Text>
                </TouchableWeb>
              ))}
            </ScrollView>
          </View>

          {/* Date Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Preferred Date</Text>
            <View style={styles.inputContainer}>
              <MaterialCommunityIcons name="calendar" size={20} color={COLORS.primary} />
              <TextInput
                style={styles.input}
                placeholder="DD/MM/YYYY"
                placeholderTextColor={COLORS.textMuted}
                value={formData.date}
                onChangeText={(text) => setFormData({ ...formData, date: text })}
              />
            </View>
          </View>

          {/* Time Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Preferred Time</Text>
            <View style={styles.inputContainer}>
              <MaterialCommunityIcons name="clock" size={20} color={COLORS.primary} />
              <TextInput
                style={styles.input}
                placeholder="HH:MM AM/PM"
                placeholderTextColor={COLORS.textMuted}
                value={formData.time}
                onChangeText={(text) => setFormData({ ...formData, time: text })}
              />
            </View>
          </View>

          {/* Payment Method Dropdown */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Payment Method <Text style={styles.required}>*</Text>
            </Text>
            <TouchableWeb
              style={styles.dropdownButton}
              onPress={() => setShowPaymentDropdown(!showPaymentDropdown)}
              activeOpacity={0.7}
            >
              <View style={styles.dropdownContent}>
                <MaterialCommunityIcons 
                  name={formData.paymentMethod ? paymentOptions.find(p => p.id === formData.paymentMethod)?.icon : 'credit-card'} 
                  size={20} 
                  color={COLORS.primary} 
                />
                <Text style={[styles.dropdownText, !formData.paymentMethod && styles.placeholderText]}>
                  {formData.paymentMethod 
                    ? paymentOptions.find(p => p.id === formData.paymentMethod)?.label 
                    : 'Select payment method'}
                </Text>
                <MaterialCommunityIcons 
                  name={showPaymentDropdown ? 'chevron-up' : 'chevron-down'} 
                  size={20} 
                  color={COLORS.textLight} 
                />
              </View>
            </TouchableWeb>
            
            {showPaymentDropdown && (
              <View style={styles.dropdownMenu}>
                {paymentOptions.map((option) => (
                  <TouchableWeb
                    key={option.id}
                    style={[
                      styles.dropdownItem,
                      formData.paymentMethod === option.id && styles.dropdownItemSelected
                    ]}
                    onPress={() => {
                      setFormData({ ...formData, paymentMethod: option.id });
                      setShowPaymentDropdown(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <MaterialCommunityIcons name={option.icon} size={20} color={COLORS.primary} />
                    <Text style={styles.dropdownItemText}>{option.label}</Text>
                    {formData.paymentMethod === option.id && (
                      <MaterialCommunityIcons name="check" size={16} color={COLORS.primary} />
                    )}
                  </TouchableWeb>
                ))}
              </View>
            )}
          </View>

          {/* Subscription Plan Dropdown */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Subscription Plan</Text>
            <Text style={styles.subtitle}>Optional - Save with monthly plans</Text>
            <TouchableWeb
              style={styles.dropdownButton}
              onPress={() => setShowSubscriptionDropdown(!showSubscriptionDropdown)}
              activeOpacity={0.7}
            >
              <View style={styles.dropdownContent}>
                <MaterialCommunityIcons name="crown" size={20} color={COLORS.primary} />
                <View style={styles.planInfo}>
                  <Text style={[styles.dropdownText, !formData.subscriptionPlan && styles.placeholderText]}>
                    {formData.subscriptionPlan 
                      ? subscriptionPlans.find(p => p.id === formData.subscriptionPlan)?.label 
                      : 'Select plan (optional)'}
                  </Text>
                  {formData.subscriptionPlan && formData.subscriptionPlan !== 'none' && (
                    <Text style={styles.planPrice}>
                      {subscriptionPlans.find(p => p.id === formData.subscriptionPlan)?.price}
                    </Text>
                  )}
                </View>
                <MaterialCommunityIcons 
                  name={showSubscriptionDropdown ? 'chevron-up' : 'chevron-down'} 
                  size={20} 
                  color={COLORS.textLight} 
                />
              </View>
            </TouchableWeb>
            
            {showSubscriptionDropdown && (
              <View style={styles.dropdownMenu}>
                {subscriptionPlans.map((plan) => (
                  <TouchableWeb
                    key={plan.id}
                    style={[
                      styles.dropdownItem,
                      formData.subscriptionPlan === plan.id && styles.dropdownItemSelected,
                      plan.popular && styles.popularItem
                    ]}
                    onPress={() => {
                      setFormData({ ...formData, subscriptionPlan: plan.id });
                      setShowSubscriptionDropdown(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.planDetails}>
                      <View style={styles.planHeader}>
                        <Text style={styles.planName}>{plan.label}</Text>
                        {plan.popular && (
                          <View style={styles.popularBadge}>
                            <Text style={styles.popularText}>POPULAR</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.planPriceText}>{plan.price}</Text>
                    </View>
                    {formData.subscriptionPlan === plan.id && (
                      <MaterialCommunityIcons name="check" size={16} color={COLORS.primary} />
                    )}
                  </TouchableWeb>
                ))}
              </View>
            )}
          </View>

          {/* Notes Input - Compact */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Additional Notes</Text>
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
          </View>

          {/* Submit Button */}
          <TouchableWeb
            style={styles.submitButton}
            onPress={handleSubmit}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[COLORS.accent, COLORS.accentLight]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
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
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontFamily: 'Poppins_700Bold',
    color: COLORS.white,
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
    backgroundColor: COLORS.card,
    borderRadius: 24,
    padding: SPACING.lg,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
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
    backgroundColor: COLORS.background,
    borderRadius: 12,
    paddingHorizontal: SPACING.md,
    paddingVertical: Platform.OS === 'ios' ? SPACING.md : 0,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: SPACING.sm,
  },
  addressWrapper: {
    position: 'relative',
    zIndex: 1,
  },
  clearButton: {
    padding: 4,
  },
  suggestionsContainer: {
    position: 'absolute',
    top: 52,
    left: 0,
    right: 0,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    maxHeight: 200,
    shadowColor: COLORS.dark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 1000,
    overflow: 'hidden',
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: SPACING.sm,
  },
  suggestionText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.text,
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
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    borderRadius: 999,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    marginRight: SPACING.sm,
    gap: 6,
  },
  serviceChipSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  serviceChipText: {
    fontSize: 12,
    fontFamily: 'Poppins_500Medium',
    color: COLORS.primary,
  },
  serviceChipTextSelected: {
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
  notesInput: {
    minHeight: 60,
    textAlignVertical: 'top',
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
});
