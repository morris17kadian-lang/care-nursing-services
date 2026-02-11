import TouchableWeb from "../components/TouchableWeb";
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, GRADIENTS, SPACING } from '../constants';

export default function UserManualScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [expandedSection, setExpandedSection] = useState(null);

  const manualSections = [
    {
      id: 1,
      icon: 'account-circle',
      title: 'Getting Started',
      subtitle: 'Account setup and first steps',
      content: [
        {
          step: 'Creating an Account',
          details: 'Tap "Sign Up" on the login screen, fill in your personal information including name, email, phone number, and create a secure password. Accept the terms and conditions to complete registration.',
        },
        {
          step: 'Logging In',
          details: 'Enter your registered email/username and password on the login screen. Use the "Remember Me" option for quick access on future visits.',
        },
      ],
    },
    {
      id: 2,
      icon: 'calendar-check',
      title: 'Booking Appointments',
      subtitle: 'How to schedule nursing services',
      content: [
        {
          step: 'Choose Service',
          details: 'Navigate to the "Book" tab and select from our range of services: Home Care, Elder Care, Post-Surgery Care, Wound Care, IV Therapy, and more.',
        },
        {
          step: 'Select Date & Time',
          details: 'Pick your preferred date and time slot. We offer 24/7 services including emergency response.',
        },
        {
          step: 'Provide Details',
          details: 'Enter the patient\'s information, service location address, and any special requirements or medical conditions.',
        },
        {
          step: 'Confirm Booking',
          details: 'Review your booking details and submit. You\'ll receive a confirmation notification within 24 hours.',
        },
      ],
    },
    {
      id: 3,
      icon: 'file-document-edit',
      title: 'Managing Appointments',
      subtitle: 'View, reschedule, or cancel',
      content: [
        {
          step: 'View Appointments',
          details: 'Access the "Appointments" tab to see all your upcoming, completed, and cancelled appointments.',
        },
        {
          step: 'Reschedule',
          details: 'Tap on any appointment and select "Reschedule" to change the date or time. Please provide 24 hours notice when possible.',
        },
        {
          step: 'Cancel Appointment',
          details: 'Select the appointment and tap "Cancel". Provide a reason if required. Cancellation policies may apply.',
        },
        {
          step: 'Track Status',
          details: 'Monitor appointment status: Pending (awaiting confirmation), Confirmed, In Progress, or Completed.',
        },
      ],
    },
    {
      id: 4,
      icon: 'bell',
      title: 'Notifications',
      subtitle: 'Stay updated with alerts',
      content: [
        {
          step: 'Notifications',
          details: 'Receive real-time notifications for appointment updates, messages, and important alerts.',
        },
        {
          step: 'Emergency Contact',
          details: 'For urgent medical needs, use the emergency hotline button available in Help & FAQ section.',
        },
      ],
    },
    {
      id: 5,
      icon: 'credit-card',
      title: 'Payments & Billing',
      subtitle: 'Payment methods and invoices',
      content: [
        {
          step: 'Payment Methods',
          details: 'We accept Cash, Debit/Credit Cards, Bank Transfers, and mobile payment apps. Add your preferred method in Profile > Payment Settings.',
        },
        {
          step: 'View Invoices',
          details: 'Access all invoices in the Appointments section. Tap on any completed appointment to view or download the invoice.',
        },
        {
          step: 'Payment Confirmation',
          details: 'After payment, you\'ll receive a confirmation notification and email receipt.',
        },
      ],
    },
    {
      id: 6,
      icon: 'account-cog',
      title: 'Account Settings',
      subtitle: 'Manage your profile and preferences',
      content: [
        {
          step: 'Edit Profile',
          details: 'Go to Settings > Profile to update your personal information, profile picture, and emergency contacts.',
        },
        {
          step: 'Change Password',
          details: 'Navigate to Settings > Change Password. Enter your current password and new password to update.',
        },
        {
          step: 'Privacy & Security',
          details: 'Manage app permissions, data sharing preferences, and security settings in Privacy & Security section.',
        },
        {
          step: 'Notification Settings',
          details: 'Customize which notifications you receive: appointment reminders, messages, promotional updates, etc.',
        },
      ],
    },
    // 'For Nurses' and 'For Admins' sections removed from patient-facing manual per request
  ];

  const ManualSection = ({ section }) => {
    const isExpanded = expandedSection === section.id;

    return (
      <View style={styles.sectionCard}>
        <TouchableWeb
          style={styles.sectionHeader}
          onPress={() => setExpandedSection(isExpanded ? null : section.id)}
          activeOpacity={0.7}
        >
          <View style={[styles.sectionIcon, isExpanded && styles.sectionIconActive]}>
            <MaterialCommunityIcons 
              name={section.icon} 
              size={24} 
              color={isExpanded ? COLORS.white : COLORS.primary} 
            />
          </View>
          <View style={styles.sectionHeaderContent}>
            <Text style={[styles.sectionTitle, isExpanded && styles.sectionTitleActive]}>
              {section.title}
            </Text>
            <Text style={styles.sectionSubtitle}>{section.subtitle}</Text>
          </View>
          <MaterialCommunityIcons
            name={isExpanded ? 'chevron-up' : 'chevron-down'}
            size={24}
            color={COLORS.textLight}
          />
        </TouchableWeb>

        {isExpanded && (
          <View style={styles.sectionContent}>
            {section.content.map((item, index) => (
              <View key={index} style={styles.stepItem}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>{index + 1}</Text>
                </View>
                <View style={styles.stepContent}>
                  <Text style={styles.stepTitle}>{item.step}</Text>
                  <Text style={styles.stepDetails}>{item.details}</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <LinearGradient
        colors={GRADIENTS.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 20 }]}
      >
        <View style={styles.headerRow}>
          <TouchableWeb onPress={() => navigation.goBack()} style={styles.backButton}>
            <MaterialCommunityIcons name="arrow-left" size={24} color={COLORS.white} />
          </TouchableWeb>
          <Text style={styles.headerTitle}>User Manual</Text>
        </View>
      </LinearGradient>

      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.introSection}>
          <MaterialCommunityIcons name="information" size={32} color={COLORS.primary} />
          <Text style={styles.introTitle}>Welcome to 876Nurses</Text>
          <Text style={styles.introText}>
            Your complete guide to using the 876Nurses app. 
            Tap on any section below to learn more.
          </Text>
        </View>

        <View style={styles.sectionsContainer}>
          {manualSections.map(section => (
            <ManualSection key={section.id} section={section} />
          ))}
        </View>

        <View style={styles.footerSection}>
          <MaterialCommunityIcons name="help-circle" size={24} color={COLORS.accent} />
          <Text style={styles.footerText}>
            Still need help? Contact our support team through the Help & FAQ section.
          </Text>
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
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.lg,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.white,
    flex: 1,
    textAlign: 'center',
    marginRight: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  introSection: {
    alignItems: 'center',
    padding: SPACING.xl,
    backgroundColor: COLORS.white,
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.lg,
    borderRadius: 16,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  introTitle: {
    fontSize: 20,
    fontFamily: 'Poppins_700Bold',
    color: COLORS.text,
    marginTop: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  introText: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.textLight,
    textAlign: 'center',
    lineHeight: 20,
  },
  sectionsContainer: {
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  sectionCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  sectionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionIconActive: {
    backgroundColor: COLORS.primary,
  },
  sectionHeaderContent: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.text,
    marginBottom: 2,
  },
  sectionTitleActive: {
    color: COLORS.primary,
  },
  sectionSubtitle: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.textLight,
  },
  sectionContent: {
    padding: SPACING.md,
    paddingTop: 0,
    gap: SPACING.md,
  },
  stepItem: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: {
    fontSize: 13,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.white,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.text,
    marginBottom: 4,
  },
  stepDetails: {
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.textLight,
    lineHeight: 19,
  },
  footerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.accent + '15',
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
    padding: SPACING.md,
    borderRadius: 12,
    gap: SPACING.sm,
  },
  footerText: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.accent,
    lineHeight: 19,
  },
});
