import TouchableWeb from "../components/TouchableWeb";
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, GRADIENTS, SPACING } from '../constants';

export default function TermsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  
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
            <MaterialCommunityIcons name="arrow-left" size={26} color={COLORS.white} />
          </TouchableWeb>
          <Text style={styles.headerTitle}>Terms of Service</Text>
          <View style={{ width: 44 }} />
        </View>
      </LinearGradient>

      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.document}>
          <Text style={styles.updateDate}>Last Updated: October 22, 2025</Text>

          <Text style={styles.section}>
            <Text style={styles.sectionTitle}>1. Acceptance of Terms{'\n'}</Text>
            <Text style={styles.bodyText}>
              By accessing and using the CARE Nursing Services mobile application, you accept and agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our services.
            </Text>
          </Text>

          <Text style={styles.section}>
            <Text style={styles.sectionTitle}>2. Services Provided{'\n'}</Text>
            <Text style={styles.bodyText}>
              CARE provides professional nursing and healthcare services including but not limited to:{'\n\n'}
              • Home nursing care{'\n'}
              • Elder care services{'\n'}
              • Post-surgery care{'\n'}
              • Wound care and dressings{'\n'}
              • IV therapy{'\n'}
              • Health monitoring{'\n'}
              • Emergency response services{'\n\n'}
              All services are provided by licensed and certified healthcare professionals.
            </Text>
          </Text>

          <Text style={styles.section}>
            <Text style={styles.sectionTitle}>3. Booking and Appointments{'\n'}</Text>
            <Text style={styles.bodyText}>
              • Appointments must be booked through the CARE mobile app{'\n'}
              • We will confirm all appointments within 24 hours{'\n'}
              • Cancellations must be made at least 24 hours in advance{'\n'}
              • Late cancellations may incur a fee{'\n'}
              • Emergency services are available 24/7
            </Text>
          </Text>

          <Text style={styles.section}>
            <Text style={styles.sectionTitle}>4. Payment Terms{'\n'}</Text>
            <Text style={styles.bodyText}>
              • Payment is required for all services rendered{'\n'}
              • We accept cash, credit/debit cards, and bank transfers{'\n'}
              • Prices may vary based on service type and duration{'\n'}
              • Additional charges may apply for travel to remote areas{'\n'}
              • Payment receipts will be provided electronically
            </Text>
          </Text>

          <Text style={styles.section}>
            <Text style={styles.sectionTitle}>5. Patient Responsibilities{'\n'}</Text>
            <Text style={styles.bodyText}>
              You agree to:{'\n\n'}
              • Provide accurate medical and contact information{'\n'}
              • Disclose all relevant medical conditions{'\n'}
              • Follow healthcare professional instructions{'\n'}
              • Maintain a safe environment for healthcare providers{'\n'}
              • Treat our staff with respect and dignity
            </Text>
          </Text>

          <Text style={styles.section}>
            <Text style={styles.sectionTitle}>6. Limitation of Liability{'\n'}</Text>
            <Text style={styles.bodyText}>
              CARE Nursing Services and its healthcare professionals will exercise reasonable care and skill in providing services. However, we are not liable for outcomes beyond our control or for complications arising from pre-existing medical conditions.
            </Text>
          </Text>

          <Text style={styles.section}>
            <Text style={styles.sectionTitle}>7. Privacy and Confidentiality{'\n'}</Text>
            <Text style={styles.bodyText}>
              We maintain strict confidentiality of all patient information in accordance with healthcare privacy laws and regulations. Please refer to our Privacy Policy for detailed information.
            </Text>
          </Text>

          <Text style={styles.section}>
            <Text style={styles.sectionTitle}>8. Termination{'\n'}</Text>
            <Text style={styles.bodyText}>
              We reserve the right to terminate services if:{'\n\n'}
              • Payment terms are not met{'\n'}
              • False information is provided{'\n'}
              • Staff safety is compromised{'\n'}
              • Terms of service are violated
            </Text>
          </Text>

          <Text style={styles.section}>
            <Text style={styles.sectionTitle}>9. Changes to Terms{'\n'}</Text>
            <Text style={styles.bodyText}>
              CARE reserves the right to modify these terms at any time. Users will be notified of significant changes. Continued use of the service constitutes acceptance of modified terms.
            </Text>
          </Text>

          <Text style={styles.section}>
            <Text style={styles.sectionTitle}>10. Contact Information{'\n'}</Text>
            <Text style={styles.bodyText}>
              For questions about these Terms of Service, please contact us:{'\n\n'}
              Email: care@nursingcareja.com{'\n'}
              Phone: 876-288-7304{'\n'}
              Instagram: @carenursingservices
            </Text>
          </Text>

          <View style={styles.footer}>
            <MaterialCommunityIcons name="shield-check" size={32} color={COLORS.primary} />
            <Text style={styles.footerText}>
              By using CARE services, you acknowledge that you have read, understood, and agree to these Terms of Service.
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
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Poppins_700Bold',
    color: COLORS.white,
    flex: 1,
    textAlign: 'center',
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
    marginBottom: SPACING.xl,
    textAlign: 'center',
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
  footerText: {
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.textLight,
    textAlign: 'center',
    marginTop: SPACING.md,
    lineHeight: 22,
  },
});
