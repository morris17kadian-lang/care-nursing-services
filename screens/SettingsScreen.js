import TouchableWeb from "../components/TouchableWeb";
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Switch,
  Alert,
  Linking,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING, TYPOGRAPHY, GRADIENTS, CONTACT_INFO } from '../constants';
import { useAuth } from '../context/AuthContext';

export default function SettingsScreen({ navigation }) {
  const { user, logout } = useAuth();
  const [notifications, setNotifications] = React.useState(true);
  const [emailUpdates, setEmailUpdates] = React.useState(false);

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Sign Out', 
          style: 'destructive',
          onPress: logout
        }
      ]
    );
  };

  const handleProfile = () => {
    navigation.navigate('Profile');
  };

  const handlePrivacy = () => {
    navigation.navigate('PrivacySecurity');
  };

  const handleChangePassword = () => {
    navigation.navigate('ChangePassword');
  };

  const handleHelp = () => {
    navigation.navigate('Help');
  };

  const handleContactSupport = () => {
    Alert.alert(
      'Contact Support',
      `Choose how you'd like to reach us:`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Call',
          onPress: () => Linking.openURL(`tel:${CONTACT_INFO.phone}`)
        },
        { 
          text: 'Email',
          onPress: () => Linking.openURL(`mailto:${CONTACT_INFO.email}`)
        }
      ]
    );
  };

  const handleAbout = () => {
    navigation.navigate('About');
  };

  const handleNotificationToggle = (value) => {
    setNotifications(value);
    Alert.alert(
      value ? 'Enabled' : 'Disabled',
      value 
        ? 'You will receive push notifications for appointments and updates.'
        : 'Push notifications have been turned off. You may miss important updates.',
      [{ text: 'OK' }]
    );
  };

  const handleEmailToggle = (value) => {
    setEmailUpdates(value);
    if (value) {
      Alert.alert(
        'Email Updates Enabled',
        'You will receive news, updates, and promotional emails from CARE.',
        [{ text: 'OK' }]
      );
    }
  };

  const SettingItem = ({ icon, title, subtitle, onPress, showChevron = true, rightContent }) => (
    <TouchableWeb
      style={styles.settingItem}
      onPress={onPress}
      activeOpacity={0.7}
      disabled={!onPress}
    >
      <View style={styles.iconContainer}>
        <LinearGradient colors={GRADIENTS.primary} style={styles.iconGradient}>
          <MaterialCommunityIcons name={icon} size={24} color={COLORS.white} />
        </LinearGradient>
      </View>
      <View style={styles.settingContent}>
        <Text style={styles.settingTitle}>{title}</Text>
        {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
      </View>
      {rightContent || (showChevron && (
        <MaterialCommunityIcons name="chevron-right" size={24} color={COLORS.textLight} />
      ))}
    </TouchableWeb>
  );

  const SectionHeader = ({ title }) => (
    <Text style={styles.sectionHeader}>{title}</Text>
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Header */}
      <LinearGradient
        colors={GRADIENTS.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerRow}>
          <Text style={styles.welcomeText}>Settings</Text>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Account Section */}
        <SectionHeader title="ACCOUNT" />
        <View style={styles.section}>
          <SettingItem
            icon="account-circle"
            title="Profile"
            subtitle="Edit your personal information"
            onPress={handleProfile}
          />
          <SettingItem
            icon="shield-check"
            title="Privacy & Security"
            subtitle="Manage your privacy settings"
            onPress={handlePrivacy}
          />
          <SettingItem
            icon="lock"
            title="Change Password"
            subtitle="Update your password"
            onPress={handleChangePassword}
          />
        </View>

        {/* Notifications Section */}
        <SectionHeader title="NOTIFICATIONS" />
        <View style={styles.section}>
          <SettingItem
            icon="bell"
            title="Push Notifications"
            subtitle="Receive appointment reminders"
            showChevron={false}
            rightContent={
              <Switch
                value={notifications}
                onValueChange={handleNotificationToggle}
                trackColor={{ false: COLORS.border, true: COLORS.accent }}
                thumbColor={COLORS.white}
              />
            }
          />
          <SettingItem
            icon="email"
            title="Email Updates"
            subtitle="Get news and updates via email"
            showChevron={false}
            rightContent={
              <Switch
                value={emailUpdates}
                onValueChange={handleEmailToggle}
                trackColor={{ false: COLORS.border, true: COLORS.accent }}
                thumbColor={COLORS.white}
              />
            }
          />
        </View>

        {/* Support Section */}
        <SectionHeader title="SUPPORT" />
        <View style={styles.section}>
          <SettingItem
            icon="help-circle"
            title="Help & FAQ"
            subtitle="Get help with common questions"
            onPress={handleHelp}
          />
          <SettingItem
            icon="phone"
            title="Contact Support"
            subtitle="Reach out to our team"
            onPress={handleContactSupport}
          />
          <SettingItem
            icon="information"
            title="About"
            subtitle="Version 1.0.0"
            onPress={handleAbout}
          />
        </View>

        {/* Logout Button */}
        <TouchableWeb
          style={styles.logoutButton}
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#ff4757', '#ff6b81']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.logoutGradient}
          >
            <MaterialCommunityIcons name="logout" size={20} color={COLORS.white} />
            <Text style={styles.logoutText}>Sign Out</Text>
          </LinearGradient>
        </TouchableWeb>

        <View style={styles.footer}>
          <Text style={styles.footerText}>CARE Nursing Services</Text>
          <Text style={styles.footerSubtext}>© 2025 All rights reserved</Text>
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
  welcomeText: {
    fontSize: 18,
    fontFamily: 'Poppins_700Bold',
    color: COLORS.white,
    opacity: 0.98,
    textAlign: 'center',
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.xl,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: 'Poppins_700Bold',
    color: COLORS.white,
    marginBottom: SPACING.xs,
  },
  headerSubtitle: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.white,
    opacity: 0.9,
  },
  headerEmail: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.white,
    opacity: 0.8,
    marginTop: 2,
  },
  content: {
    flex: 1,
  },
  sectionHeader: {
    fontSize: 12,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.textLight,
    marginTop: SPACING.xl,
    marginBottom: SPACING.sm,
    marginHorizontal: SPACING.lg,
    letterSpacing: 1,
  },
  section: {
    backgroundColor: COLORS.card,
    marginHorizontal: SPACING.lg,
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
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  iconContainer: {
    marginRight: SPACING.md,
  },
  iconGradient: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.text,
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.textLight,
  },
  logoutButton: {
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.xl,
    marginBottom: SPACING.lg,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#ff4757',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 5,
  },
  logoutGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.lg,
    gap: SPACING.sm,
  },
  logoutText: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.white,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
  },
  footerText: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  footerSubtext: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.textLight,
  },
});
