import TouchableWeb from "../components/TouchableWeb";
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Linking,
  Image,
} from 'react-native';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, GRADIENTS, SPACING, CONTACT_INFO } from '../constants';

export default function AboutScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const ContactItem = ({ icon, title, value, onPress }) => (
    <TouchableWeb style={styles.contactItem} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.contactIcon}>
        <MaterialCommunityIcons name={icon} size={20} color={COLORS.primary} />
      </View>
      <View style={styles.contactContent}>
        <Text style={styles.contactTitle}>{title}</Text>
        <Text style={styles.contactValue}>{value}</Text>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={20} color={COLORS.textLight} />
    </TouchableWeb>
  );

  const FeatureCard = ({ icon, title, description }) => (
    <View style={styles.featureCard}>
      <LinearGradient
        colors={GRADIENTS.accent}
        style={styles.featureIcon}
      >
        <MaterialCommunityIcons name={icon} size={20} color={COLORS.white} />
      </LinearGradient>
      <View style={styles.featureTextContainer}>
        <Text style={styles.featureTitle}>{title}</Text>
        <Text style={styles.featureDescription}>{description}</Text>
      </View>
    </View>
  );

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
          <Text style={styles.headerTitle}>About CARE</Text>
          <View style={{ width: 44 }} />
        </View>
      </LinearGradient>

      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Logo Section */}
        <View style={styles.logoSection}>
          <View style={styles.logoContainer}>
            <Image 
              source={require('../assets/Images/ceo.png')} 
              style={styles.ceoImage}
              resizeMode="cover"
            />
          </View>
          <Text style={styles.appName}>CARE Nursing Services and More</Text>
          <Text style={styles.tagline}>
            Professional healthcare delivered with compassion and excellence
          </Text>
        </View>

        {/* Mission Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Our Mission</Text>
          <View style={styles.missionCard}>
            <Text style={styles.missionText}>
              At CARE, we're committed to providing exceptional nursing care that puts patients first. 
              Our team of certified professionals delivers compassionate, personalized healthcare services 
              in the comfort of your home.
            </Text>
          </View>
        </View>

        {/* Features */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Why Choose CARE</Text>
          <View style={styles.whyChooseContainer}>
            <FeatureCard
              icon="shield-check"
              title="Licensed & Certified"
              description="All nurses are fully licensed by the Nursing Council of Jamaica"
            />
            <FeatureCard
              icon="clock-fast"
              title="24/7 Availability"
              description="Round-the-clock care services and emergency response"
            />
            <FeatureCard
              icon="heart-pulse"
              title="Compassionate Care"
              description="Patient-centered approach with dignity and respect"
            />
            <FeatureCard
              icon="account-group"
              title="Experienced Team"
              description="Skilled professionals with years of healthcare experience"
            />
          </View>
        </View>

        {/* Contact Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Get in Touch</Text>
          <View style={styles.contactCard}>
            <ContactItem
              icon="phone"
              title="Phone"
              value={CONTACT_INFO.phone}
              onPress={() => Linking.openURL(`tel:${CONTACT_INFO.phone}`)}
            />
            <View style={styles.divider} />
            <ContactItem
              icon="email"
              title="Email"
              value={CONTACT_INFO.email}
              onPress={() => Linking.openURL(`mailto:${CONTACT_INFO.email}`)}
            />
            <View style={styles.divider} />
            <ContactItem
              icon="instagram"
              title="Instagram"
              value={CONTACT_INFO.instagram}
              onPress={() => Linking.openURL(`https://instagram.com/${CONTACT_INFO.instagram.replace('@', '')}`)}
            />
            <View style={styles.divider} />
            <ContactItem
              icon="whatsapp"
              title="WhatsApp"
              value={CONTACT_INFO.whatsapp}
              onPress={() => Linking.openURL(`https://wa.me/${CONTACT_INFO.whatsapp.replace(/\D/g, '')}`)}
            />
          </View>
        </View>

        {/* Legal Links */}
        <View style={styles.section}>
          <TouchableWeb
            style={styles.legalButton}
            onPress={() => navigation.navigate('Terms')}
          >
            <Text style={styles.legalButtonText}>Terms of Service</Text>
            <MaterialCommunityIcons name="chevron-right" size={20} color={COLORS.textLight} />
          </TouchableWeb>
          <TouchableWeb
            style={styles.legalButton}
            onPress={() => navigation.navigate('Privacy')}
          >
            <Text style={styles.legalButtonText}>Privacy Policy</Text>
            <MaterialCommunityIcons name="chevron-right" size={20} color={COLORS.textLight} />
          </TouchableWeb>
        </View>

        {/* Copyright */}
        <View style={styles.footer}>
          <Text style={styles.copyright}>
            © 2025 CARE Nursing Services and More. All rights reserved.
          </Text>
          <Text style={styles.version}>Version 1.0.0</Text>
          <Text style={styles.footerText}>
            Made with ❤️ in Jamaica
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
    paddingBottom: SPACING.xl,
  },
  logoSection: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
    paddingHorizontal: SPACING.lg,
  },
  logoContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 5,
    marginBottom: SPACING.md,
    overflow: 'hidden',
  },
  ceoImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginTop: 10,
  },
  appName: {
    fontSize: 20,
    fontFamily: 'Poppins_700Bold',
    color: COLORS.text,
    marginBottom: SPACING.xs,
    textAlign: 'center',
  },
  version: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.textLight,
    marginBottom: SPACING.sm,
  },
  tagline: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.textLight,
    textAlign: 'center',
    lineHeight: 22,
  },
  section: {
    padding: SPACING.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  missionCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: SPACING.lg,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  missionText: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.textLight,
    lineHeight: 24,
  },
  whyChooseContainer: {
    gap: SPACING.sm,
  },
  featureCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: SPACING.md,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: SPACING.sm,
    flexDirection: 'row',
    alignItems: 'center',
  },
  featureIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
    flexShrink: 0,
  },
  featureTextContainer: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 15,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.text,
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.textLight,
    lineHeight: 20,
  },
  contactCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    gap: SPACING.md,
  },
  contactIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactContent: {
    flex: 1,
  },
  contactTitle: {
    fontSize: 12,
    fontFamily: 'Poppins_500Medium',
    color: COLORS.textLight,
    marginBottom: 2,
  },
  contactValue: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.text,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginHorizontal: SPACING.md,
  },
  legalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  legalButtonText: {
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
    color: COLORS.text,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
    paddingHorizontal: SPACING.lg,
  },
  copyright: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.textLight,
    marginBottom: SPACING.xs,
  },
  footerText: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.textLight,
  },
});
