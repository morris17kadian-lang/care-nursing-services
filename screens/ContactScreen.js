import TouchableWeb from "../components/TouchableWeb";
import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,

  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SectionHeader } from '../components/Cards';
import { COLORS, GRADIENTS, SPACING, CONTACT_INFO } from '../constants';

export default function ContactScreen() {
  const handleCall = () => {
    Linking.openURL(`tel:${CONTACT_INFO.phone}`);
  };

  const handleEmail = () => {
    Linking.openURL(`mailto:${CONTACT_INFO.email}`);
  };

  const handleInstagram = () => {
    Linking.openURL(
      `https://instagram.com/${CONTACT_INFO.instagram.replace('@', '')}`
    );
  };

  const handleMaps = () => {
    // Update with actual address when available
    Linking.openURL('https://maps.google.com/?q=Jamaica');
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
          <Text style={styles.headerTitle}>Contact & Support</Text>
        </View>
      </LinearGradient>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Quick Contact Actions */}
        <View style={styles.section}>
          <SectionHeader title="Contact Us" subtitle="Choose your preferred method" />

          <TouchableWeb
            style={styles.contactCard}
            onPress={handleCall}
            activeOpacity={0.7}
          >
            <LinearGradient
              colors={GRADIENTS.primary}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.contactGradient}
            >
              <View style={styles.contactIcon}>
                <MaterialCommunityIcons name="phone" size={24} color={COLORS.white} />
              </View>
              <View style={styles.contactContent}>
                <Text style={styles.contactLabel}>Call Us</Text>
                <Text style={styles.contactValue}>{CONTACT_INFO.phone}</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={24} color={COLORS.white} />
            </LinearGradient>
          </TouchableWeb>

          <TouchableWeb
            style={styles.contactCard}
            onPress={handleEmail}
            activeOpacity={0.7}
          >
            <LinearGradient
              colors={[COLORS.accent, COLORS.accentLight]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.contactGradient}
            >
              <View style={styles.contactIcon}>
                <MaterialCommunityIcons name="email" size={24} color={COLORS.white} />
              </View>
              <View style={styles.contactContent}>
                <Text style={styles.contactLabel}>Email Us</Text>
                <Text style={styles.contactValue} numberOfLines={1}>
                  {CONTACT_INFO.email}
                </Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={24} color={COLORS.white} />
            </LinearGradient>
          </TouchableWeb>

          <TouchableWeb
            style={styles.contactCard}
            onPress={handleInstagram}
            activeOpacity={0.7}
          >
            <LinearGradient
              colors={['#E1306C', '#C13584', '#833AB4']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.contactGradient}
            >
              <View style={styles.contactIcon}>
                <MaterialCommunityIcons name="instagram" size={24} color={COLORS.white} />
              </View>
              <View style={styles.contactContent}>
                <Text style={styles.contactLabel}>Follow Us</Text>
                <Text style={styles.contactValue}>{CONTACT_INFO.instagram}</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={24} color={COLORS.white} />
            </LinearGradient>
          </TouchableWeb>
        </View>

        {/* Opening Hours */}
        <View style={styles.section}>
          <SectionHeader title="Opening Hours" subtitle="When we're available" />

          <View style={styles.hoursCard}>
            <View style={styles.hourRow}>
              <MaterialCommunityIcons name="calendar-month" size={24} color={COLORS.primary} />
              <View style={styles.hourContent}>
                <Text style={styles.hourDay}>Monday - Friday</Text>
                <Text style={styles.hourTime}>9:00 AM - 5:00 PM</Text>
              </View>
            </View>

            <View style={styles.hourDivider} />

            <View style={styles.hourRow}>
              <MaterialCommunityIcons name="calendar-weekend" size={24} color={COLORS.primary} />
              <View style={styles.hourContent}>
                <Text style={styles.hourDay}>Saturday</Text>
                <Text style={styles.hourTime}>10:00 AM - 2:00 PM</Text>
              </View>
            </View>

            <View style={styles.hourDivider} />

            <View style={styles.hourRow}>
              <MaterialCommunityIcons name="calendar-remove" size={24} color={COLORS.textMuted} />
              <View style={styles.hourContent}>
                <Text style={styles.hourDay}>Sunday</Text>
                <Text style={[styles.hourTime, styles.closedText]}>Closed</Text>
              </View>
            </View>
          </View>

          {/* Emergency Banner */}
          <LinearGradient
            colors={[COLORS.error, '#ff6b6b']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.emergencyBanner}
          >
            <MaterialCommunityIcons name="phone-alert" size={28} color={COLORS.white} />
            <View style={styles.emergencyContent}>
              <Text style={styles.emergencyTitle}>24/7 Emergency Service</Text>
              <Text style={styles.emergencyText}>
                For urgent care needs, call us anytime
              </Text>
            </View>
          </LinearGradient>
        </View>

        {/* Location */}
        <View style={styles.section}>
          <SectionHeader title="Our Location" subtitle="Find us in Jamaica" />

          <TouchableWeb
            style={styles.locationCard}
            onPress={handleMaps}
            activeOpacity={0.7}
          >
            <View style={styles.locationIconContainer}>
              <MaterialCommunityIcons name="map-marker" size={32} color={COLORS.accent} />
            </View>
            <View style={styles.locationContent}>
              <Text style={styles.locationTitle}>Jamaica</Text>
              <Text style={styles.locationSubtitle}>
                Serving clients across Jamaica
              </Text>
              <View style={styles.viewMapButton}>
                <Text style={styles.viewMapText}>View on Map</Text>
                <MaterialCommunityIcons name="arrow-right" size={16} color={COLORS.accent} />
              </View>
            </View>
          </TouchableWeb>
        </View>

        {/* Additional Info */}
        <View style={[styles.section, styles.lastSection]}>
          <SectionHeader title="Why Contact Us?" subtitle="We're always ready to help" />

          <View style={styles.infoGrid}>
            {[
              {
                icon: 'clock-fast',
                title: 'Quick Response',
                desc: 'We aim to respond within 2 hours',
              },
              {
                icon: 'shield-check',
                title: 'Professional Team',
                desc: 'Licensed and experienced staff',
              },
              {
                icon: 'heart-pulse',
                title: 'Compassionate Care',
                desc: 'Your wellbeing is our priority',
              },
              {
                icon: 'home-heart',
                title: 'Home Visits',
                desc: 'Care in the comfort of your home',
              },
            ].map((item, index) => (
              <View key={index} style={styles.infoItem}>
                <View style={styles.infoIconContainer}>
                  <MaterialCommunityIcons name={item.icon} size={24} color={COLORS.accent} />
                </View>
                <Text style={styles.infoTitle}>{item.title}</Text>
                <Text style={styles.infoDesc}>{item.desc}</Text>
              </View>
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
  section: {
    marginBottom: SPACING.xl,
  },
  lastSection: {
    marginBottom: SPACING.xxl,
  },
  contactCard: {
    marginBottom: SPACING.md,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  contactGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
  },
  contactIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  contactContent: {
    flex: 1,
  },
  contactLabel: {
    fontSize: 12,
    fontFamily: 'Poppins_500Medium',
    color: COLORS.white,
    opacity: 0.9,
    marginBottom: 2,
  },
  contactValue: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.white,
  },
  hoursCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: SPACING.md,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 3,
  },
  hourRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  hourContent: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  hourDay: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.text,
    marginBottom: 2,
  },
  hourTime: {
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.textLight,
  },
  closedText: {
    color: COLORS.textMuted,
  },
  hourDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.sm,
  },
  emergencyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.lg,
    borderRadius: 16,
    marginTop: SPACING.md,
  },
  emergencyContent: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  emergencyTitle: {
    fontSize: 16,
    fontFamily: 'Poppins_700Bold',
    color: COLORS.white,
    marginBottom: 4,
  },
  emergencyText: {
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.white,
    opacity: 0.95,
  },
  locationCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: SPACING.lg,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 3,
  },
  locationIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: `${COLORS.accent}15`,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  locationContent: {
    flex: 1,
  },
  locationTitle: {
    fontSize: 18,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.text,
    marginBottom: 4,
  },
  locationSubtitle: {
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.textLight,
    marginBottom: SPACING.sm,
  },
  viewMapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewMapText: {
    fontSize: 13,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.accent,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  infoItem: {
    width: '48%',
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  infoIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: `${COLORS.accent}15`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  infoTitle: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.text,
    marginBottom: 4,
  },
  infoDesc: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.textLight,
    lineHeight: 18,
  },
});
