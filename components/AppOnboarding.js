import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Dimensions,
  Alert,
  Image,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS, GRADIENTS, SPACING } from '../constants';

const { width, height } = Dimensions.get('window');
const ONBOARDING_KEY = '@app_onboarding_complete';

const PATIENT_STEPS = [
  {
    id: 1,
    title: 'Welcome to 876Nurses! 👋',
    description: 'Your trusted partner for quality home healthcare services in Jamaica.',
    icon: 'medical-bag',
  },
  {
    id: 2,
    title: 'Book Appointments 📅',
    description: 'Easily schedule nursing services at your convenience. Choose from a wide range of care options.',
    icon: 'calendar-check',
  },
  {
    id: 3,
    title: 'Track Your Care 📋',
    description: 'Monitor your appointments, view care history, and manage your health records all in one place.',
    icon: 'clipboard-list',
  },
  {
    id: 4,
    title: 'Secure Payments 💳',
    description: 'Multiple payment options with secure transactions. View invoices and payment history easily.',
    icon: 'credit-card',
  },
  {
    id: 5,
    title: 'Stay Notified 🔔',
    description: 'Receive real-time updates about appointments, messages, and important care reminders.',
    icon: 'bell-ring',
  },
  {
    id: 6,
    title: "You're All Set! 🎉",
    description: "Ready to start your healthcare journey? Explore the app and discover all our features.",
    icon: 'check-decagram',
  },
];

const NURSE_STEPS = [
  {
    id: 1,
    title: 'Welcome, Nurse! 👩‍⚕️',
    description: 'Manage your shifts, appointments, and patient care efficiently with 876Nurses.',
    icon: 'stethoscope',
  },
  {
    id: 2,
    title: 'View Appointments 📅',
    description: 'Access your scheduled appointments and patient details. Stay organized with your daily schedule.',
    icon: 'calendar-clock',
  },
  {
    id: 3,
    title: 'Request Shifts 🕐',
    description: 'Browse available shifts and submit requests. Manage your work schedule with flexibility.',
    icon: 'clock-check',
  },
  {
    id: 4,
    title: 'Patient Records 📋',
    description: 'Access patient information and care history to provide the best service possible.',
    icon: 'clipboard-text',
  },
  {
    id: 5,
    title: 'Track Your Earnings 💰',
    description: 'View your payment history, payslips, and earnings in one place.',
    icon: 'cash-multiple',
  },
  {
    id: 6,
    title: "You're Ready! 🎉",
    description: "Start providing excellent care to our patients. All your tools are at your fingertips.",
    icon: 'check-decagram',
  },
];

const ADMIN_STEPS = [
  {
    id: 1,
    title: 'Welcome, Admin! 👨‍💼',
    description: 'Manage operations, staff, and analytics for 876Nurses healthcare services.',
    icon: 'shield-account',
  },
  {
    id: 2,
    title: 'Dashboard Overview 📊',
    description: 'Monitor key metrics, appointments, and operations at a glance from your central dashboard.',
    icon: 'view-dashboard',
  },
  {
    id: 3,
    title: 'Manage Users 👥',
    description: 'Oversee nurses, patients, and staff. Handle registrations, profiles, and permissions.',
    icon: 'account-group',
  },
  {
    id: 4,
    title: 'Operations & Scheduling 📅',
    description: 'Assign appointments, manage shifts, and coordinate care delivery across the organization.',
    icon: 'calendar-multiple',
  },
  {
    id: 5,
    title: 'Payments & Analytics 💳',
    description: 'Process payments, generate payslips, view financial reports and business analytics.',
    icon: 'chart-line',
  },
  {
    id: 6,
    title: "You're All Set! 🎉",
    description: "Ready to manage 876Nurses operations. Explore all administrative features.",
    icon: 'check-decagram',
  },
];

export default function AppOnboarding({ visible, onComplete, userRole = 'patient' }) {
  const [currentStep, setCurrentStep] = useState(0);

  // Select steps based on user role
  const getSteps = () => {
    if (userRole === 'nurse' || userRole === 'nurses') return NURSE_STEPS;
    if (userRole === 'admin' || userRole === 'admins' || userRole === 'superAdmin') return ADMIN_STEPS;
    return PATIENT_STEPS;
  };

  const ONBOARDING_STEPS = getSteps();

  const handleNext = () => {
    if (currentStep < ONBOARDING_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    Alert.alert(
      'Skip Tutorial?',
      'You can always access the User Manual from Settings > Help & FAQ.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Skip', style: 'destructive', onPress: handleComplete },
      ]
    );
  };

  const handleComplete = async () => {
    try {
      await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
      setCurrentStep(0);
      if (onComplete) onComplete();
    } catch (error) {
      console.error('Error saving onboarding status:', error);
    }
  };

  const step = ONBOARDING_STEPS[currentStep];
  const isLastStep = currentStep === ONBOARDING_STEPS.length - 1;
  const isFirstStep = currentStep === 0;

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={handleSkip}
    >
      <View style={styles.overlay}>
        <View style={styles.cardWrapper}>
          {/* Nurse Character Image */}
          <View style={styles.iconContainer}>
            <Image 
              source={require('../assets/Images/nurse-character.png')}
              style={styles.nurseImage}
              resizeMode="contain"
            />
          </View>

          <LinearGradient
            colors={GRADIENTS.header}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.container}
          >
          {/* Skip button */}
          {!isLastStep && (
            <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
              <Text style={styles.skipText}>Skip</Text>
            </TouchableOpacity>
          )}

          {/* Content */}
          <View style={styles.content}>
            {/* Title and Description */}
            <Text style={styles.title}>{step.title}</Text>
            <Text style={styles.description}>{step.description}</Text>

            {/* Progress Indicators */}
            <View style={styles.progressContainer}>
              {ONBOARDING_STEPS.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.progressDot,
                    index === currentStep && styles.progressDotActive,
                  ]}
                />
              ))}
            </View>
          </View>

          {/* Navigation Buttons */}
          <View style={styles.navigationContainer}>
            {!isFirstStep && (
              <TouchableOpacity style={styles.secondaryButton} onPress={handlePrevious}>
                <MaterialCommunityIcons name="arrow-left" size={20} color={COLORS.white} />
                <Text style={styles.secondaryButtonText}>Back</Text>
              </TouchableOpacity>
            )}

            <View style={{ flex: 1 }} />

            <TouchableOpacity style={styles.primaryButton} onPress={handleNext}>
              <View style={styles.primaryButtonContent}>
                <Text style={styles.primaryButtonText}>
                  {isLastStep ? "Get Started" : "Next"}
                </Text>
                <MaterialCommunityIcons 
                  name={isLastStep ? "check" : "arrow-right"} 
                  size={20}
                  color={COLORS.primary}
                />
              </View>
            </TouchableOpacity>
          </View>
          </LinearGradient>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardWrapper: {
    width: width * 0.9,
    maxWidth: 500,
    borderRadius: 32,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.45,
    shadowRadius: 30,
    elevation: 20,
  },
  container: {
    borderRadius: 36,
    paddingVertical: SPACING.xl,
    paddingHorizontal: SPACING.xl,
    borderTopWidth: 2,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 3,
    borderTopColor: 'rgba(255, 255, 255, 0.4)',
    borderLeftColor: 'rgba(255, 255, 255, 0.2)',
    borderRightColor: 'rgba(255, 255, 255, 0.15)',
    borderBottomColor: 'rgba(0, 0, 0, 0.25)',
  },
  skipButton: {
    alignSelf: 'flex-end',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 999,
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  skipText: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.white,
    opacity: 0.9,
  },
  content: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
    gap: SPACING.md,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: -30,
    zIndex: 10,
  },
  nurseImage: {
    width: 170,
    height: 170,
  },
  title: {
    fontSize: 22,
    fontFamily: 'Poppins_700Bold',
    color: COLORS.white,
    textAlign: 'center',
    marginBottom: SPACING.sm,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    textShadowColor: 'rgba(0, 0, 0, 0.35)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  description: {
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.white,
    opacity: 0.85,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: SPACING.lg,
  },
  progressContainer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: SPACING.lg,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  progressDotActive: {
    backgroundColor: COLORS.white,
    width: 24,
  },
  navigationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginTop: SPACING.lg,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.white,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  secondaryButtonText: {
    fontSize: 15,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.white,
  },
  primaryButton: {
    borderRadius: 999,
    backgroundColor: COLORS.white,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
  },
  primaryButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
  },
  primaryButtonText: {
    fontSize: 15,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.primary,
  },
});

// Export helper to check onboarding status
export const checkOnboardingStatus = async () => {
  try {
    const completed = await AsyncStorage.getItem(ONBOARDING_KEY);
    return completed === 'true';
  } catch (error) {
    console.error('Error checking onboarding status:', error);
    return false;
  }
};

// Export helper to reset onboarding
export const resetOnboarding = async () => {
  try {
    await AsyncStorage.removeItem(ONBOARDING_KEY);
  } catch (error) {
    console.error('Error resetting onboarding:', error);
  }
};
