import TouchableWeb from "../components/TouchableWeb";
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, GRADIENTS, SPACING, CONTACT_INFO } from '../constants';

export default function HelpScreen({ navigation }) {
  const [expandedFaq, setExpandedFaq] = useState(null);

  const faqs = [
    {
      id: 1,
      question: 'How do I book an appointment?',
      answer: 'Tap the "Book" tab at the bottom of the screen, fill in your details including service type, preferred date and time, and submit. Our team will contact you within 24 hours to confirm.',
    },
    {
      id: 2,
      question: 'What services do you provide?',
      answer: 'We offer a wide range of nursing services including Home Care, Elder Care, Post-Surgery Care, Wound Care, IV Therapy, Health Monitoring, and Emergency Response. Check the Home screen for complete details.',
    },
    {
      id: 3,
      question: 'How can I cancel or reschedule?',
      answer: 'Go to the Appointments tab, select the appointment you want to modify, and choose either "Reschedule" or "Cancel". Please provide at least 24 hours notice when possible.',
    },
    {
      id: 4,
      question: 'What are your service areas?',
      answer: 'We currently serve all parishes in Jamaica. Enter your address when booking to confirm availability in your area. Some remote locations may have additional travel fees.',
    },
    {
      id: 5,
      question: 'What payment methods do you accept?',
      answer: 'We accept cash, credit/debit cards, bank transfers, and mobile payment apps. Payment can be made before or after service delivery.',
    },
    {
      id: 6,
      question: 'Are your nurses certified?',
      answer: 'Yes! All our nurses are fully licensed and certified by the Nursing Council of Jamaica. They undergo regular training and background checks.',
    },
    {
      id: 7,
      question: 'Do you provide 24/7 services?',
      answer: 'Yes, we offer round-the-clock care services and emergency response. Use our emergency hotline for urgent needs.',
    },
    {
      id: 8,
      question: 'How do I update my profile?',
      answer: 'Go to Settings > Profile to edit your personal information, emergency contacts, and other account details.',
    },
  ];

  const FAQItem = ({ faq }) => {
    const isExpanded = expandedFaq === faq.id;

    return (
      <TouchableWeb
        style={styles.faqItem}
        onPress={() => setExpandedFaq(isExpanded ? null : faq.id)}
        activeOpacity={0.7}
      >
        <View style={styles.faqHeader}>
          <View style={styles.faqIconContainer}>
            <MaterialCommunityIcons 
              name="help-circle" 
              size={20} 
              color={isExpanded ? COLORS.primary : COLORS.textLight} 
            />
          </View>
          <Text style={[styles.faqQuestion, isExpanded && styles.faqQuestionActive]}>
            {faq.question}
          </Text>
          <MaterialCommunityIcons
            name={isExpanded ? 'chevron-up' : 'chevron-down'}
            size={24}
            color={COLORS.textLight}
          />
        </View>
        {isExpanded && (
          <View style={styles.faqAnswer}>
            <Text style={styles.faqAnswerText}>{faq.answer}</Text>
          </View>
        )}
      </TouchableWeb>
    );
  };

  const ContactCard = ({ icon, title, value, onPress, iconColor }) => (
    <TouchableWeb style={styles.contactCard} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.contactIcon, { backgroundColor: iconColor + '15' }]}>
        <MaterialCommunityIcons name={icon} size={24} color={iconColor} />
      </View>
      <View style={styles.contactContent}>
        <Text style={styles.contactTitle}>{title}</Text>
        <Text style={styles.contactValue} numberOfLines={1}>{value}</Text>
      </View>
    </TouchableWeb>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient
        colors={GRADIENTS.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerRow}>
          <TouchableWeb onPress={() => navigation.goBack()} style={styles.backButton}>
            <MaterialCommunityIcons name="arrow-left" size={24} color={COLORS.white} />
          </TouchableWeb>
          <Text style={styles.headerTitle}>Help & FAQ</Text>
        </View>
      </LinearGradient>

      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Quick Contact */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Contact</Text>
          <View style={styles.contactGrid}>
            <ContactCard
              icon="phone"
              title="Call Us"
              value={CONTACT_INFO.phone}
              onPress={() => Linking.openURL(`tel:${CONTACT_INFO.phone}`)}
              iconColor={COLORS.success}
            />
            <ContactCard
              icon="email"
              title="Email"
              value={CONTACT_INFO.email}
              onPress={() => Linking.openURL(`mailto:${CONTACT_INFO.email}`)}
              iconColor={COLORS.primary}
            />
            <ContactCard
              icon="whatsapp"
              title="WhatsApp"
              value={CONTACT_INFO.whatsapp}
              onPress={() => Linking.openURL(`https://wa.me/${CONTACT_INFO.whatsapp.replace(/\D/g, '')}`)}
              iconColor="#25D366"
            />
            <ContactCard
              icon="instagram"
              title="Instagram"
              value={CONTACT_INFO.instagram}
              onPress={() => Linking.openURL(`https://instagram.com/${CONTACT_INFO.instagram.replace('@', '')}`)}
              iconColor="#E4405F"
            />
          </View>
        </View>

        {/* Emergency Alert */}
        <View style={styles.section}>
          <View style={styles.emergencyCard}>
            <View style={styles.emergencyHeader}>
              <MaterialCommunityIcons name="alert-circle" size={32} color={COLORS.error} />
              <View style={styles.emergencyContent}>
                <Text style={styles.emergencyTitle}>Emergency?</Text>
                <Text style={styles.emergencyText}>For urgent medical needs, call our 24/7 hotline</Text>
              </View>
            </View>
            <TouchableWeb
              style={styles.emergencyButton}
              onPress={() => Linking.openURL(`tel:${CONTACT_INFO.emergency}`)}
            >
              <LinearGradient
                colors={[COLORS.error, '#FF6B6B']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.emergencyGradient}
              >
                <MaterialCommunityIcons name="phone" size={20} color={COLORS.white} />
                <Text style={styles.emergencyButtonText}>Call Emergency: {CONTACT_INFO.emergency}</Text>
              </LinearGradient>
            </TouchableWeb>
          </View>
        </View>

        {/* FAQ Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
          <View style={styles.faqContainer}>
            {faqs.map(faq => (
              <FAQItem key={faq.id} faq={faq} />
            ))}
          </View>
        </View>

        {/* Additional Help */}
        <View style={styles.section}>
          <View style={styles.helpCard}>
            <MaterialCommunityIcons name="information" size={24} color={COLORS.info} />
            <Text style={styles.helpText}>
              Can't find what you're looking for? Our support team is here to help!
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
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
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
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  section: {
    padding: SPACING.lg,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  sectionDescription: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  contactGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginTop: SPACING.xs,
  },
  contactCard: {
    flexDirection: 'column',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: SPACING.md,
    width: '48%',
    gap: SPACING.xs,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  contactIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactContent: {
    alignItems: 'center',
  },
  contactTitle: {
    fontSize: 13,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.text,
    marginBottom: 2,
    textAlign: 'center',
  },
  contactValue: {
    fontSize: 11,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.textLight,
    textAlign: 'center',
  },
  contactIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactContent: {
    flex: 1,
  },
  contactTitle: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.text,
    marginBottom: 2,
  },
  contactValue: {
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.textLight,
  },
  emergencyCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: SPACING.lg,
    borderWidth: 2,
    borderColor: COLORS.errorLight,
    shadowColor: COLORS.error,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  emergencyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  emergencyContent: {
    flex: 1,
  },
  emergencyTitle: {
    fontSize: 18,
    fontFamily: 'Poppins_700Bold',
    color: COLORS.error,
    marginBottom: 2,
  },
  emergencyText: {
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.textLight,
  },
  emergencyButton: {
    borderRadius: 999,
    overflow: 'hidden',
  },
  emergencyGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    gap: SPACING.sm,
  },
  emergencyButtonText: {
    fontSize: 15,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.white,
  },
  faqContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  faqItem: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  faqHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  faqIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  faqQuestion: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
    color: COLORS.text,
  },
  faqQuestionActive: {
    color: COLORS.primary,
    fontFamily: 'Poppins_600SemiBold',
  },
  faqAnswer: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
    paddingLeft: 60,
  },
  faqAnswerText: {
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.textLight,
    lineHeight: 20,
  },
  helpCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.infoLight,
    borderRadius: 12,
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  helpText: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.info,
    lineHeight: 20,
  },
});
