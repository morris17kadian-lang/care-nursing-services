import TouchableWeb from "../components/TouchableWeb";
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
  Platform,
  KeyboardAvoidingView,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, GRADIENTS, SPACING } from '../constants';
import { useAuth } from '../context/AuthContext';

export default function ChangePasswordScreen({ navigation }) {
  const { changePassword } = useAuth();
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [isLoading, setIsLoading] = useState(false);

  const handleChangePassword = async () => {
    if (!formData.currentPassword || !formData.newPassword || !formData.confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (formData.newPassword.length < 8) {
      Alert.alert('Error', 'New password must be at least 8 characters long');
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      Alert.alert('Error', 'New passwords do not match');
      return;
    }

    setIsLoading(true);
    try {
      const result = await changePassword(formData.currentPassword, formData.newPassword);

      if (result.success) {
        Alert.alert(
          'Success',
          'Your password has been changed successfully!',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      } else {
        Alert.alert('Error', result.error || 'Failed to change password');
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      {/* Watermark Logo */}
      <Image
        source={require('../assets/Images/Nurses-logo.png')}
        style={styles.watermarkLogo}
        resizeMode="contain"
      />
      
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
            <MaterialCommunityIcons name="arrow-left" size={26} color={COLORS.white} />
          </TouchableWeb>
          <Text style={styles.welcomeText}>Change Password</Text>
        </View>
      </LinearGradient>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView 
          style={styles.scrollView} 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.form}>
          {/* Info Box */}
          <View style={styles.infoBox}>
            <MaterialCommunityIcons name="information" size={24} color={COLORS.info} />
            <Text style={styles.infoText}>
              Your password must be at least 8 characters long and contain a mix of letters, numbers, and symbols.
            </Text>
          </View>

          {/* Current Password */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Current Password</Text>
            <View style={styles.inputContainer}>
              <MaterialCommunityIcons name="lock" size={20} color={COLORS.primary} />
              <TextInput
                style={styles.input}
                placeholder="Enter current password"
                placeholderTextColor={COLORS.textMuted}
                value={formData.currentPassword}
                onChangeText={(text) => setFormData({ ...formData, currentPassword: text })}
                secureTextEntry={!showCurrent}
                autoCapitalize="none"
              />
              <TouchableWeb onPress={() => setShowCurrent(!showCurrent)}>
                <MaterialCommunityIcons
                  name={showCurrent ? 'eye-off' : 'eye'}
                  size={20}
                  color={COLORS.textLight}
                />
              </TouchableWeb>
            </View>
          </View>

          {/* New Password */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>New Password</Text>
            <View style={styles.inputContainer}>
              <MaterialCommunityIcons name="lock-plus" size={20} color={COLORS.primary} />
              <TextInput
                style={styles.input}
                placeholder="Enter new password"
                placeholderTextColor={COLORS.textMuted}
                value={formData.newPassword}
                onChangeText={(text) => setFormData({ ...formData, newPassword: text })}
                secureTextEntry={!showNew}
                autoCapitalize="none"
              />
              <TouchableWeb onPress={() => setShowNew(!showNew)}>
                <MaterialCommunityIcons
                  name={showNew ? 'eye-off' : 'eye'}
                  size={20}
                  color={COLORS.textLight}
                />
              </TouchableWeb>
            </View>
          </View>

          {/* Confirm Password */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Confirm New Password</Text>
            <View style={styles.inputContainer}>
              <MaterialCommunityIcons name="lock-check" size={20} color={COLORS.primary} />
              <TextInput
                style={styles.input}
                placeholder="Re-enter new password"
                placeholderTextColor={COLORS.textMuted}
                value={formData.confirmPassword}
                onChangeText={(text) => setFormData({ ...formData, confirmPassword: text })}
                secureTextEntry={!showConfirm}
                autoCapitalize="none"
              />
              <TouchableWeb onPress={() => setShowConfirm(!showConfirm)}>
                <MaterialCommunityIcons
                  name={showConfirm ? 'eye-off' : 'eye'}
                  size={20}
                  color={COLORS.textLight}
                />
              </TouchableWeb>
            </View>
          </View>

          {/* Password Requirements */}
          <View style={styles.requirementsBox}>
            <Text style={styles.requirementsTitle}>Password Requirements:</Text>
            <View style={styles.requirement}>
              <MaterialCommunityIcons
                name={formData.newPassword.length >= 8 ? 'check-circle' : 'circle-outline'}
                size={16}
                color={formData.newPassword.length >= 8 ? COLORS.success : COLORS.textLight}
              />
              <Text style={styles.requirementText}>At least 8 characters</Text>
            </View>
            <View style={styles.requirement}>
              <MaterialCommunityIcons
                name={/[A-Z]/.test(formData.newPassword) ? 'check-circle' : 'circle-outline'}
                size={16}
                color={/[A-Z]/.test(formData.newPassword) ? COLORS.success : COLORS.textLight}
              />
              <Text style={styles.requirementText}>One uppercase letter</Text>
            </View>
            <View style={styles.requirement}>
              <MaterialCommunityIcons
                name={/[0-9]/.test(formData.newPassword) ? 'check-circle' : 'circle-outline'}
                size={16}
                color={/[0-9]/.test(formData.newPassword) ? COLORS.success : COLORS.textLight}
              />
              <Text style={styles.requirementText}>One number</Text>
            </View>
          </View>

          {/* Update Button */}
          <TouchableWeb 
            style={[styles.updateButton, isLoading && { opacity: 0.7 }]} 
            onPress={handleChangePassword}
            disabled={isLoading}
          >
            <LinearGradient
                colors={GRADIENTS.header}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={styles.updateGradient}
            >
              <MaterialCommunityIcons 
                name={isLoading ? "loading" : "shield-check"} 
                size={20} 
                color={COLORS.white} 
              />
              <Text style={styles.updateText}>
                {isLoading ? 'Updating...' : 'Update Password'}
              </Text>
            </LinearGradient>
          </TouchableWeb>
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
    paddingBottom: 100,
  },
  form: {
    padding: SPACING.lg,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: COLORS.infoLight,
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.xl,
    gap: SPACING.sm,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.info,
    lineHeight: 20,
  },
  inputGroup: {
    marginBottom: SPACING.lg,
  },
  label: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    paddingHorizontal: SPACING.md,
    paddingVertical: Platform.OS === 'ios' ? SPACING.md : 0,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: SPACING.sm,
  },
  input: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.text,
    paddingVertical: Platform.OS === 'android' ? SPACING.sm : 0,
  },
  requirementsBox: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  requirementsTitle: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  requirement: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.xs,
  },
  requirementText: {
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.textLight,
  },
  updateButton: {
    marginTop: SPACING.md,
    borderRadius: 999,
    overflow: 'hidden',
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  updateGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    gap: SPACING.sm,
  },
  updateText: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.white,
  },
});
