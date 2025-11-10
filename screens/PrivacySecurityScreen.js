import TouchableWeb from "../components/TouchableWeb";
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, GRADIENTS, SPACING } from '../constants';

export default function PrivacySecurityScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [settings, setSettings] = useState({
    dataCollection: true,
    shareWithPartners: false,
    locationTracking: false,
    twoFactorAuth: false,
    biometric: true,
  });

  const handleToggle = (key, value) => {
    setSettings({ ...settings, [key]: value });
    
    const messages = {
      dataCollection: value ? 'Data collection enabled for better service' : 'Data collection disabled',
      shareWithPartners: value ? 'Data sharing with partners enabled' : 'Data sharing disabled',
      locationTracking: value ? 'Location services enabled' : 'Location services disabled',
      twoFactorAuth: value ? 'Two-factor authentication enabled' : 'Two-factor authentication disabled',
      biometric: value ? 'Biometric login enabled' : 'Biometric login disabled',
    };

    Alert.alert('Updated', messages[key]);
  };

  const SettingItem = ({ icon, title, subtitle, value, onToggle, iconColor = COLORS.primary }) => (
    <View style={styles.settingItem}>
      <View style={styles.settingContent}>
        <Text style={styles.settingTitle}>{title}</Text>
        <Text style={styles.settingSubtitle}>{subtitle}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: COLORS.border, true: COLORS.accent }}
        thumbColor={COLORS.white}
      />
    </View>
  );

  const InfoCard = ({ icon, title, description, iconColor = COLORS.info }) => (
    <View style={styles.infoCard}>
      <View style={styles.infoContent}>
        <Text style={styles.infoTitle}>{title}</Text>
        <Text style={styles.infoDescription}>{description}</Text>
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
          <TouchableWeb 
            style={styles.iconButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="arrow-left" size={26} color={COLORS.white} />
          </TouchableWeb>
          <Text style={styles.welcomeText}>Privacy & Security</Text>
          <View style={{ width: 44 }} />
        </View>
      </LinearGradient>

      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Privacy Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Privacy Controls</Text>
          <View style={styles.settingsCard}>
            <SettingItem
              icon="database"
              title="Data Collection"
              subtitle="Allow CARE to collect usage data"
              value={settings.dataCollection}
              onToggle={(value) => handleToggle('dataCollection', value)}
            />
            <View style={styles.divider} />
            <SettingItem
              icon="share-variant"
              title="Share with Partners"
              subtitle="Share data with trusted healthcare partners"
              value={settings.shareWithPartners}
              onToggle={(value) => handleToggle('shareWithPartners', value)}
            />
            <View style={styles.divider} />
            <SettingItem
              icon="map-marker"
              title="Location Tracking"
              subtitle="Allow location access for nearby services"
              value={settings.locationTracking}
              onToggle={(value) => handleToggle('locationTracking', value)}
            />
          </View>
        </View>

        {/* Security Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Security Settings</Text>
          <View style={styles.settingsCard}>
            <SettingItem
              icon="shield-lock"
              title="Two-Factor Authentication"
              subtitle="Add extra layer of security"
              value={settings.twoFactorAuth}
              onToggle={(value) => handleToggle('twoFactorAuth', value)}
              iconColor={COLORS.success}
            />
            <View style={styles.divider} />
            <SettingItem
              icon="fingerprint"
              title="Biometric Login"
              subtitle="Use fingerprint or face ID"
              value={settings.biometric}
              onToggle={(value) => handleToggle('biometric', value)}
              iconColor={COLORS.success}
            />
          </View>
        </View>

        {/* Info Cards */}
        <View style={styles.section}>
          <InfoCard
            icon="lock-check"
            title="Your Data is Encrypted"
            description="All your personal and medical information is encrypted using industry-standard security protocols."
            iconColor={COLORS.success}
          />
          
          <InfoCard
            icon="account-lock"
            title="Account Security"
            description="We use advanced security measures to protect your account from unauthorized access."
            iconColor={COLORS.info}
          />
          
          <InfoCard
            icon="file-document-outline"
            title="Data Protection"
            description="Your data is stored securely and never sold to third parties. View our privacy policy for details."
            iconColor={COLORS.primary}
          />
        </View>

        {/* Action Buttons */}
        <View style={styles.section}>
          <TouchableWeb
            style={styles.actionButton}
            onPress={() => Alert.alert('Privacy Policy', 'Opening privacy policy...')}
          >
            <MaterialCommunityIcons name="file-document" size={20} color={COLORS.primary} />
            <Text style={styles.actionButtonText}>View Privacy Policy</Text>
            <MaterialCommunityIcons name="chevron-right" size={20} color={COLORS.textLight} />
          </TouchableWeb>

          <TouchableWeb
            style={styles.actionButton}
            onPress={() => Alert.alert('Download Data', 'Preparing your data for download...')}
          >
            <MaterialCommunityIcons name="download" size={20} color={COLORS.primary} />
            <Text style={styles.actionButtonText}>Download My Data</Text>
            <MaterialCommunityIcons name="chevron-right" size={20} color={COLORS.textLight} />
          </TouchableWeb>

          <TouchableWeb
            style={[styles.actionButton, styles.dangerButton]}
            onPress={() => Alert.alert(
              'Delete Account',
              'Are you sure you want to delete your account? This action cannot be undone.',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive' }
              ]
            )}
          >
            <MaterialCommunityIcons name="delete-forever" size={20} color={COLORS.error} />
            <Text style={[styles.actionButtonText, styles.dangerText]}>Delete Account</Text>
            <MaterialCommunityIcons name="chevron-right" size={20} color={COLORS.error} />
          </TouchableWeb>
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
  welcomeText: {
    fontSize: 18,
    fontFamily: 'Poppins_700Bold',
    color: COLORS.white,
    opacity: 0.98,
    textAlign: 'center',
    flex: 1,
    marginHorizontal: 12,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: COLORS.error,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  notificationBadgeText: {
    fontSize: 10,
    fontFamily: 'Poppins_700Bold',
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
  settingsCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    gap: SPACING.md,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 15,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.text,
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.textLight,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginHorizontal: SPACING.md,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    gap: SPACING.md,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 15,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.text,
    marginBottom: 4,
  },
  infoDescription: {
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.textLight,
    lineHeight: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    gap: SPACING.md,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  actionButtonText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
    color: COLORS.text,
  },
  dangerButton: {
    borderWidth: 1,
    borderColor: COLORS.errorLight,
  },
  dangerText: {
    color: COLORS.error,
  },
});
