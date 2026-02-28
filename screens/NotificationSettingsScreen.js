import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import TouchableWeb from '../components/TouchableWeb';
import { useNotifications } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import { COLORS, GRADIENTS, SPACING } from '../constants';
import ApiService from '../services/ApiService';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function NotificationSettingsScreen({ navigation }) {
  const { 
    pushPermissionStatus, 
    requestPushPermissions,
    pushToken 
  } = useNotifications();
  const { user } = useAuth();

  const [settings, setSettings] = useState({
    pushNotifications: false,
    // chatMessages: true, // REMOVED
    appointments: true,
    reminders: true,
    serviceUpdates: true,
    systemNotifications: false,
    emailNotifications: true,
  });

  // Load preferences from backend on mount
  useEffect(() => {
    loadNotificationPreferences();
  }, [user]);

  const loadNotificationPreferences = async () => {
    try {
      // Try backend first
      if (user) {
        try {
          const response = await ApiService.makeRequest('/settings/preferences', { method: 'GET' });
          if (response.success && response.data) {
            setSettings({
              pushNotifications: pushPermissionStatus === 'granted',
              // chatMessages: response.data.chatMessages ?? true, // REMOVED
              appointments: response.data.appointments ?? true,
              reminders: response.data.reminders ?? true,
              serviceUpdates: response.data.serviceUpdates ?? true,
              systemNotifications: response.data.systemNotifications ?? false,
              emailNotifications: response.data.emailNotifications ?? true,
            });
            return;
          }
        } catch (backendError) {
          // Backend unavailable for notification preferences
        }
      }

      // Fallback to AsyncStorage
      const stored = await AsyncStorage.getItem('notificationPreferences');
      if (stored) {
        const parsed = JSON.parse(stored);
        setSettings(prev => ({ ...prev, ...parsed }));
      }
    } catch (error) {
      console.error('Error loading notification preferences:', error);
    }

    // Update push notification status
    setSettings(prev => ({
      ...prev,
      pushNotifications: pushPermissionStatus === 'granted'
    }));
  };

  const saveNotificationPreference = async (key, value) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);

    try {
      // Try backend first
      if (user) {
        try {
          await ApiService.makeRequest('/settings/preferences', {
            method: 'PUT',
            body: JSON.stringify({ [key]: value })
          });
          // Notification preference synced to backend
        } catch (backendError) {
          // Backend sync failed, saved locally
        }
      }

      // Always save to AsyncStorage as backup
      await AsyncStorage.setItem('notificationPreferences', JSON.stringify(newSettings));
    } catch (error) {
      console.error('Error saving notification preference:', error);
    }
  };

  const handlePushNotificationToggle = async (value) => {
    if (value && pushPermissionStatus !== 'granted') {
      Alert.alert(
        'Enable Push Notifications',
        'Allow 876Nurses to send you important notifications about appointments, messages, and health reminders.',
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Enable',
            onPress: async () => {
              const status = await requestPushPermissions();
              if (status === 'granted') {
                setSettings(prev => ({ ...prev, pushNotifications: true }));
              } else {
                Alert.alert(
                  'Permission Denied',
                  'You can enable notifications later in your device settings.',
                  [{ text: 'OK' }]
                );
              }
            },
          },
        ]
      );
    } else {
      setSettings(prev => ({ ...prev, pushNotifications: value }));
      if (!value) {
        Alert.alert(
          'Notifications Disabled',
          'You can re-enable notifications anytime in Settings.',
          [{ text: 'OK' }]
        );
      }
    }
  };

  const handleSettingToggle = (key, value) => {
    saveNotificationPreference(key, value);
  };

  const SettingRow = ({ icon, title, subtitle, value, onToggle, iconColor = COLORS.primary }) => (
    <View style={styles.settingRow}>
      <View style={styles.settingLeft}>
        <View style={styles.settingText}>
          <Text style={styles.settingTitle}>{title}</Text>
          {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
        </View>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: COLORS.border, true: COLORS.primary + '40' }}
        thumbColor={value ? COLORS.primary : COLORS.textLight}
      />
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      {/* Header */}
      <LinearGradient
        colors={GRADIENTS.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerRow}>
          <TouchableWeb
            style={styles.iconButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="arrow-left" size={24} color={COLORS.white} />
          </TouchableWeb>
          <Text style={styles.headerTitle}>Notification Settings</Text>
          <View style={styles.iconButton} />
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Push Notifications Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Push Notifications</Text>
          <Text style={styles.sectionSubtitle}>
            Receive notifications even when the app is closed
          </Text>
          
          <SettingRow
            icon="bell-ring"
            title="Push Notifications"
            subtitle={
              pushPermissionStatus === 'granted' 
                ? "Enabled - you'll receive notifications on your device"
                : pushPermissionStatus === 'denied'
                ? "Disabled - enable in device settings"
                : "Not configured - tap to enable"
            }
            value={settings.pushNotifications}
            onToggle={handlePushNotificationToggle}
            iconColor={COLORS.accent}
          />
        </View>

        {/* Notification Types */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notification Types</Text>
          <Text style={styles.sectionSubtitle}>
            Choose which types of notifications you want to receive
          </Text>

          {/* Chat Messages Setting REMOVED */}

          <SettingRow
            icon="calendar-clock"
            title="Appointments"
            subtitle="Appointment reminders and updates"
            value={settings.appointments}
            onToggle={(value) => handleSettingToggle('appointments', value)}
            iconColor={COLORS.primary}
          />

          {/* Medication Reminders - Only show for patients */}
          {user?.role === 'patient' && (
            <SettingRow
              icon="pill"
              title="Medication Reminders"
              subtitle="Reminders to take medication"
              value={settings.reminders}
              onToggle={(value) => handleSettingToggle('reminders', value)}
              iconColor={COLORS.accent}
            />
          )}

          <SettingRow
            icon="medical-bag"
            title="Service Updates"
            subtitle="New healthcare services and updates"
            value={settings.serviceUpdates}
            onToggle={(value) => handleSettingToggle('serviceUpdates', value)}
            iconColor="#95E1D3"
          />

          <SettingRow
            icon="information"
            title="System Notifications"
            subtitle="App updates and maintenance notices"
            value={settings.systemNotifications}
            onToggle={(value) => handleSettingToggle('systemNotifications', value)}
            iconColor="#6C5CE7"
          />
        </View>

        {/* Email Notifications */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Email Notifications</Text>
          <Text style={styles.sectionSubtitle}>
            Receive updates and notifications via email
          </Text>

          <SettingRow
            icon="email-outline"
            title="Email Updates"
            subtitle="Receive appointment confirmations and updates via email"
            value={settings.emailNotifications}
            onToggle={(value) => handleSettingToggle('emailNotifications', value)}
            iconColor="#FFA726"
          />
        </View>

        {/* Status Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Status</Text>
          <View style={styles.statusCard}>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Permission Status:</Text>
              <Text style={[
                styles.statusValue,
                { color: pushPermissionStatus === 'granted' ? COLORS.success : COLORS.error }
              ]}>
                {pushPermissionStatus === 'granted' ? 'Granted' : 
                 pushPermissionStatus === 'denied' ? 'Denied' : 'Not Set'}
              </Text>
            </View>
            {pushToken && (
              <View style={styles.statusRow}>
                <Text style={styles.statusLabel}>Device Registered:</Text>
                <Text style={[styles.statusValue, { color: COLORS.success }]}>Yes</Text>
              </View>
            )}
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
    justifyContent: 'space-between',
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.white,
  },
  content: {
    flex: 1,
    padding: SPACING.md,
  },
  section: {
    marginBottom: SPACING.xl,
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
    lineHeight: 20,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.white,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: 16,
    marginBottom: SPACING.md,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  settingText: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.text,
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.textLight,
    lineHeight: 18,
  },
  statusCard: {
    backgroundColor: COLORS.white,
    padding: SPACING.lg,
    borderRadius: 16,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  statusLabel: {
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
    color: COLORS.text,
  },
  statusValue: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
  },
});