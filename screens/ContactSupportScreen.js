import TouchableWeb from "../components/TouchableWeb";
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
  Linking,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING, GRADIENTS, CONTACT_INFO } from '../constants';
import { useAuth } from '../context/AuthContext';

export default function ContactSupportScreen({ navigation }) {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [feedbackForm, setFeedbackForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    subject: '',
    message: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const handleCall = () => {
    Linking.openURL(`tel:${CONTACT_INFO.phone}`);
  };

  const handleEmail = () => {
    Linking.openURL(`mailto:${CONTACT_INFO.email}`);
  };

  const handleWhatsApp = () => {
    const phone = CONTACT_INFO.phone.replace(/[^0-9]/g, '');
    Linking.openURL(`whatsapp://send?phone=${phone}`);
  };

  const handleSubmitFeedback = async () => {
    if (!feedbackForm.subject.trim()) {
      Alert.alert('Required', 'Please enter a subject for your feedback.');
      return;
    }
    if (!feedbackForm.message.trim()) {
      Alert.alert('Required', 'Please enter your message.');
      return;
    }

    setSubmitting(true);
    try {
      // TODO: Implement actual API call to submit feedback
      // For now, simulate submission
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      Alert.alert(
        'Feedback Sent',
        'Thank you for your feedback! We will get back to you soon.',
        [
          {
            text: 'OK',
            onPress: () => {
              setFeedbackForm({
                name: user?.name || '',
                email: user?.email || '',
                subject: '',
                message: '',
              });
            }
          }
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to send feedback. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      {/* Header */}
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
          <Text style={styles.headerTitle}>Contact Support</Text>
          <View style={styles.backButton} />
        </View>
      </LinearGradient>

      {/* Watermark Logo */}
      <Image
        source={require('../assets/Images/Nurses-logo.png')}
        style={styles.watermarkLogo}
        resizeMode="contain"
      />

      <KeyboardAvoidingView 
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView 
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Contact Methods */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Get in Touch</Text>
            <Text style={styles.sectionSubtitle}>
              Choose your preferred method to reach our support team
            </Text>

            {/* Phone */}
            <TouchableWeb style={styles.contactCard} onPress={handleCall} activeOpacity={0.7}>
              <View style={[styles.iconCircle, { backgroundColor: COLORS.primary + '15' }]}>
                <MaterialCommunityIcons name="phone" size={24} color={COLORS.primary} />
              </View>
              <View style={styles.contactInfo}>
                <Text style={styles.contactTitle}>Phone</Text>
                <Text style={styles.contactDetail}>{CONTACT_INFO.phone}</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={24} color={COLORS.textLight} />
            </TouchableWeb>

            {/* Email */}
            <TouchableWeb style={styles.contactCard} onPress={handleEmail} activeOpacity={0.7}>
              <View style={[styles.iconCircle, { backgroundColor: '#10B981' + '15' }]}>
                <MaterialCommunityIcons name="email" size={24} color="#10B981" />
              </View>
              <View style={styles.contactInfo}>
                <Text style={styles.contactTitle}>Email</Text>
                <Text style={styles.contactDetail}>{CONTACT_INFO.email}</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={24} color={COLORS.textLight} />
            </TouchableWeb>

            {/* WhatsApp */}
            <TouchableWeb style={styles.contactCard} onPress={handleWhatsApp} activeOpacity={0.7}>
              <View style={[styles.iconCircle, { backgroundColor: '#25D366' + '15' }]}>
                <MaterialCommunityIcons name="whatsapp" size={24} color="#25D366" />
              </View>
              <View style={styles.contactInfo}>
                <Text style={styles.contactTitle}>WhatsApp</Text>
                <Text style={styles.contactDetail}>Message us directly</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={24} color={COLORS.textLight} />
            </TouchableWeb>
          </View>

          {/* Feedback Form */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Send Feedback</Text>
            <Text style={styles.sectionSubtitle}>
              We'd love to hear from you! Share your thoughts or report an issue.
            </Text>

            <View style={styles.form}>
              {/* Name */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Name</Text>
                <TextInput
                  style={styles.input}
                  value={feedbackForm.name}
                  onChangeText={(text) => setFeedbackForm({ ...feedbackForm, name: text })}
                  placeholder="Your name"
                  placeholderTextColor={COLORS.textLight}
                />
              </View>

              {/* Email */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  style={styles.input}
                  value={feedbackForm.email}
                  onChangeText={(text) => setFeedbackForm({ ...feedbackForm, email: text })}
                  placeholder="Your email"
                  placeholderTextColor={COLORS.textLight}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              {/* Subject */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  Subject <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={styles.input}
                  value={feedbackForm.subject}
                  onChangeText={(text) => setFeedbackForm({ ...feedbackForm, subject: text })}
                  placeholder="What is this about?"
                  placeholderTextColor={COLORS.textLight}
                />
              </View>

              {/* Message */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  Message <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={feedbackForm.message}
                  onChangeText={(text) => setFeedbackForm({ ...feedbackForm, message: text })}
                  placeholder="Tell us more..."
                  placeholderTextColor={COLORS.textLight}
                  multiline
                  numberOfLines={6}
                  textAlignVertical="top"
                />
              </View>

              {/* Submit Button */}
              <TouchableWeb
                style={styles.submitButton}
                onPress={handleSubmitFeedback}
                activeOpacity={0.8}
                disabled={submitting}
              >
                <LinearGradient
                  colors={submitting ? ['#ccc', '#999'] : GRADIENTS.header}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                  style={styles.submitGradient}
                >
                  {submitting ? (
                    <Text style={styles.submitText}>Sending...</Text>
                  ) : (
                    <>
                      <MaterialCommunityIcons name="send" size={20} color={COLORS.white} />
                      <Text style={styles.submitText}>Send Feedback</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableWeb>
            </View>
          </View>

          {/* Business Hours */}
          <View style={[styles.section, { marginBottom: 40 }]}>
            <View style={styles.infoCard}>
              <MaterialCommunityIcons name="clock-outline" size={24} color={COLORS.primary} />
              <View style={styles.infoCardContent}>
                <Text style={styles.infoCardTitle}>Business Hours</Text>
                <Text style={styles.infoCardText}>Monday - Friday: 8:00 AM - 6:00 PM</Text>
                <Text style={styles.infoCardText}>Saturday: 9:00 AM - 3:00 PM</Text>
                <Text style={styles.infoCardText}>Sunday: Closed</Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  watermarkLogo: {
    position: 'absolute',
    width: 250,
    height: 250,
    alignSelf: 'center',
    top: '40%',
    opacity: 0.05,
    zIndex: 0,
  },
  header: {
    paddingBottom: SPACING.lg,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Poppins_700Bold',
    color: COLORS.white,
    opacity: 0.98,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  sectionSubtitle: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.textLight,
    marginBottom: SPACING.lg,
  },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: SPACING.sm,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactInfo: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  contactTitle: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.text,
  },
  contactDetail: {
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.textLight,
    marginTop: 2,
  },
  form: {
    marginTop: SPACING.md,
  },
  inputGroup: {
    marginBottom: SPACING.lg,
  },
  label: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  required: {
    color: '#EF4444',
  },
  input: {
    backgroundColor: COLORS.white,
    borderRadius: 10,
    padding: SPACING.md,
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  textArea: {
    minHeight: 120,
    paddingTop: SPACING.md,
  },
  submitButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: SPACING.md,
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
  infoCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  infoCardContent: {
    marginLeft: SPACING.md,
    flex: 1,
  },
  infoCardTitle: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  infoCardText: {
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.textLight,
    lineHeight: 20,
  },
});
