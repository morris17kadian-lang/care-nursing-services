import TouchableWeb from "../components/TouchableWeb";
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, GRADIENTS, SPACING } from '../constants';

export default function PrivacyPolicyScreen({ navigation }) {
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
          <Text style={styles.headerTitle}>Privacy Policy</Text>
          <View style={{ width: 40 }} />
        </View>
      </LinearGradient>

      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.document}>
          <Text style={styles.updateDate}>Last Updated: October 22, 2025</Text>

          <View style={styles.introCard}>
            <MaterialCommunityIcons name="shield-lock" size={40} color={COLORS.primary} />
            <Text style={styles.introText}>
              CARE Nursing Services is committed to protecting your privacy and personal information. 
              This policy explains how we collect, use, and safeguard your data.
            </Text>
          </View>

          <Text style={styles.section}>
            <Text style={styles.sectionTitle}>1. Information We Collect{'\n'}</Text>
            <Text style={styles.bodyText}>
              We collect the following types of information:{'\n\n'}
              
              <Text style={styles.subTitle}>Personal Information:{'\n'}</Text>
              • Full name and contact details{'\n'}
              • Home address{'\n'}
              • Email address and phone number{'\n'}
              • Emergency contact information{'\n\n'}
              
              <Text style={styles.subTitle}>Medical Information:{'\n'}</Text>
              • Health conditions and medical history{'\n'}
              • Current medications{'\n'}
              • Treatment preferences{'\n'}
              • Healthcare provider information{'\n\n'}
              
              <Text style={styles.subTitle}>Usage Data:{'\n'}</Text>
              • App usage patterns{'\n'}
              • Service booking history{'\n'}
              • Communication preferences{'\n'}
              • Device information
            </Text>
          </Text>

          <Text style={styles.section}>
            <Text style={styles.sectionTitle}>2. How We Use Your Information{'\n'}</Text>
            <Text style={styles.bodyText}>
              Your information is used to:{'\n\n'}
              • Provide healthcare services{'\n'}
              • Schedule and manage appointments{'\n'}
              • Communicate with you about services{'\n'}
              • Process payments{'\n'}
              • Improve our services{'\n'}
              • Send important updates and notifications{'\n'}
              • Comply with legal and regulatory requirements{'\n'}
              • Ensure safety and quality of care
            </Text>
          </Text>

          <Text style={styles.section}>
            <Text style={styles.sectionTitle}>3. Data Security{'\n'}</Text>
            <Text style={styles.bodyText}>
              We implement industry-standard security measures:{'\n\n'}
              • End-to-end encryption for sensitive data{'\n'}
              • Secure servers with regular security audits{'\n'}
              • Access controls and authentication{'\n'}
              • Regular staff training on data protection{'\n'}
              • Compliance with healthcare privacy regulations{'\n\n'}
              
              While we strive to protect your information, no method of transmission over the internet is 100% secure. We cannot guarantee absolute security.
            </Text>
          </Text>

          <Text style={styles.section}>
            <Text style={styles.sectionTitle}>4. Information Sharing{'\n'}</Text>
            <Text style={styles.bodyText}>
              We may share your information with:{'\n\n'}
              
              <Text style={styles.subTitle}>Healthcare Providers:{'\n'}</Text>
              • Licensed nurses providing your care{'\n'}
              • Coordinating physicians (with your consent){'\n'}
              • Medical laboratories or pharmacies{'\n\n'}
              
              <Text style={styles.subTitle}>Service Providers:{'\n'}</Text>
              • Payment processors{'\n'}
              • Technology service providers{'\n'}
              • Analytics services{'\n\n'}
              
              <Text style={styles.subTitle}>Legal Requirements:{'\n'}</Text>
              • When required by law{'\n'}
              • To protect rights and safety{'\n'}
              • In response to legal process{'\n\n'}
              
              We NEVER sell your personal information to third parties.
            </Text>
          </Text>

          <Text style={styles.section}>
            <Text style={styles.sectionTitle}>5. Your Rights{'\n'}</Text>
            <Text style={styles.bodyText}>
              You have the right to:{'\n\n'}
              • Access your personal information{'\n'}
              • Request corrections to your data{'\n'}
              • Request deletion of your data{'\n'}
              • Opt-out of marketing communications{'\n'}
              • Download your data{'\n'}
              • Withdraw consent for data processing{'\n'}
              • File a complaint with regulatory authorities
            </Text>
          </Text>

          <Text style={styles.section}>
            <Text style={styles.sectionTitle}>6. Data Retention{'\n'}</Text>
            <Text style={styles.bodyText}>
              We retain your information for as long as necessary to:{'\n\n'}
              • Provide ongoing services{'\n'}
              • Comply with legal obligations{'\n'}
              • Resolve disputes{'\n'}
              • Maintain medical records as required by law{'\n\n'}
              
              Medical records are typically retained for 7 years in accordance with healthcare regulations.
            </Text>
          </Text>

          <Text style={styles.section}>
            <Text style={styles.sectionTitle}>7. Children's Privacy{'\n'}</Text>
            <Text style={styles.bodyText}>
              Our services are not intended for children under 13. We do not knowingly collect information from children. Parents or guardians may book services on behalf of minors.
            </Text>
          </Text>

          <Text style={styles.section}>
            <Text style={styles.sectionTitle}>8. Cookies and Tracking{'\n'}</Text>
            <Text style={styles.bodyText}>
              We use cookies and similar technologies to:{'\n\n'}
              • Remember your preferences{'\n'}
              • Analyze app usage{'\n'}
              • Improve user experience{'\n'}
              • Provide personalized content{'\n\n'}
              
              You can disable cookies in your device settings, though this may limit some app features.
            </Text>
          </Text>

          <Text style={styles.section}>
            <Text style={styles.sectionTitle}>9. Changes to Privacy Policy{'\n'}</Text>
            <Text style={styles.bodyText}>
              We may update this Privacy Policy periodically. We will notify you of significant changes through:{'\n\n'}
              • In-app notifications{'\n'}
              • Email notifications{'\n'}
              • Updates on our website{'\n\n'}
              
              Continued use of our services after changes constitutes acceptance of the updated policy.
            </Text>
          </Text>

          <Text style={styles.section}>
            <Text style={styles.sectionTitle}>10. Contact Us{'\n'}</Text>
            <Text style={styles.bodyText}>
              For privacy-related questions or requests:{'\n\n'}
              Email: nursingservicesandmorecare@gmail.com{'\n'}
              Phone: 876-288-7304{'\n'}
              Instagram: @carenursingservices{'\n\n'}
              
              We will respond to all privacy inquiries within 30 days.
            </Text>
          </Text>

          <View style={styles.footer}>
            <MaterialCommunityIcons name="lock-check" size={32} color={COLORS.success} />
            <Text style={styles.footerTitle}>Your Privacy Matters</Text>
            <Text style={styles.footerText}>
              We are committed to transparency and protecting your personal health information in accordance with all applicable privacy laws and regulations.
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
  document: {
    padding: SPACING.lg,
  },
  updateDate: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.textLight,
    marginBottom: SPACING.lg,
    textAlign: 'center',
  },
  introCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: SPACING.lg,
    alignItems: 'center',
    marginBottom: SPACING.xl,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  introText: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.textLight,
    textAlign: 'center',
    marginTop: SPACING.md,
    lineHeight: 22,
  },
  section: {
    marginBottom: SPACING.xl,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  subTitle: {
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.primary,
  },
  bodyText: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.textLight,
    lineHeight: 24,
  },
  footer: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: SPACING.lg,
    alignItems: 'center',
    marginTop: SPACING.lg,
    marginBottom: SPACING.xl,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  footerTitle: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.text,
    marginTop: SPACING.md,
    marginBottom: SPACING.xs,
  },
  footerText: {
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.textLight,
    textAlign: 'center',
    lineHeight: 22,
  },
});
