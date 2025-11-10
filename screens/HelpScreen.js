import TouchableWeb from "../components/TouchableWeb";
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Linking,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, GRADIENTS, SPACING, CONTACT_INFO } from '../constants';

export default function HelpScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [expandedFaq, setExpandedFaq] = useState(null);
  const [feedbackText, setFeedbackText] = useState('');

  const handleSendFeedback = () => {
    if (!feedbackText.trim()) {
      Alert.alert('Empty Feedback', 'Please enter your feedback before sending.');
      return;
    }

    Alert.alert(
      'Send Feedback',
      'How would you like to send your feedback?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Email', 
          onPress: () => {
            const body = encodeURIComponent(feedbackText);
            Linking.openURL(`mailto:${CONTACT_INFO.email}?subject=App Feedback&body=${body}`);
            setFeedbackText('');
          }
        },
        { 
          text: 'Call', 
          onPress: () => {
            Linking.openURL(`tel:${CONTACT_INFO.phone}`);
          }
        }
      ]
    );
  };

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

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
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
          <Text style={styles.headerTitle}>Help & FAQ</Text>
        </View>
      </LinearGradient>

      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* User Manual */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>User Manual</Text>
          <TouchableWeb
            style={styles.manualCard}
            onPress={() => navigation.navigate('UserManual')}
            activeOpacity={0.7}
          >
            <LinearGradient
              colors={GRADIENTS.primary}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.manualGradient}
            >
              <View style={styles.manualIconContainer}>
                <MaterialCommunityIcons name="book-open-page-variant" size={32} color={COLORS.white} />
              </View>
              <View style={styles.manualContent}>
                <Text style={styles.manualTitle}>View User Manual</Text>
                <Text style={styles.manualSubtitle}>Complete guide to using the CARE app</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={24} color={COLORS.white} />
            </LinearGradient>
          </TouchableWeb>
        </View>

        {/* Feedback Box */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Send Us Feedback</Text>
          <View style={styles.feedbackBox}>
            <View style={styles.feedbackBoxHeader}>
              <MaterialCommunityIcons name="message-reply-text" size={24} color={COLORS.accent} />
              <Text style={styles.feedbackBoxTitle}>Share Your Thoughts</Text>
            </View>
            <Text style={styles.feedbackBoxSubtitle}>
              Help us improve! Share your thoughts, suggestions, or report issues.
            </Text>
            <TextInput
              style={styles.feedbackInput}
              placeholder="Type your feedback here..."
              placeholderTextColor={COLORS.textLight}
              multiline
              numberOfLines={5}
              value={feedbackText}
              onChangeText={setFeedbackText}
              textAlignVertical="top"
            />
            <TouchableWeb
              style={styles.sendButton}
              onPress={handleSendFeedback}
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={GRADIENTS.accent}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.sendButtonGradient}
              >
                <MaterialCommunityIcons name="send" size={20} color={COLORS.white} />
                <Text style={styles.sendButtonText}>Send Feedback</Text>
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
    marginRight: 40, // Offset for back button
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
  // User Manual Card
  manualCard: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  manualGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  manualIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  manualContent: {
    flex: 1,
  },
  manualTitle: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.white,
    marginBottom: 2,
  },
  manualSubtitle: {
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.white,
    opacity: 0.9,
  },
  // Feedback Box
  feedbackBox: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: SPACING.lg,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  feedbackBoxHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  feedbackBoxTitle: {
    fontSize: 18,
    fontFamily: 'Poppins_700Bold',
    color: COLORS.text,
  },
  feedbackBoxSubtitle: {
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.textLight,
    marginBottom: SPACING.md,
    lineHeight: 18,
  },
  feedbackInput: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: SPACING.md,
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.text,
    minHeight: 120,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sendButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  sendButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    gap: SPACING.sm,
  },
  sendButtonText: {
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
});
