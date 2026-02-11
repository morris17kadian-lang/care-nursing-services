import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Image,
  ScrollView,
  Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, SPACING, GRADIENTS } from '../constants';
import { resolveNurseDetails } from '../utils/resolveNurseDetails';

export default function NurseDetailsModal({
  visible,
  onClose,
  nurse,
  nursesRoster = null,
  footer = null,
  title = null,
}) {
  const resolvedNurse = useMemo(
    () => resolveNurseDetails(nurse, nursesRoster),
    [nurse, nursesRoster]
  );

  const nurseName =
    title ||
    resolvedNurse.fullName ||
    resolvedNurse.name ||
    'Unknown Nurse';

  const nurseCode =
    resolvedNurse.nurseCode ||
    resolvedNurse.licenseNumber ||
    resolvedNurse.code ||
    resolvedNurse.username ||
    'N/A';

  const specialty =
    resolvedNurse.specialization ||
    resolvedNurse.specialty ||
    'General Nursing';

  const emailValue = resolvedNurse.email;
  const phoneValue = resolvedNurse.phone;
  const email = emailValue || 'Not provided';
  const phone = phoneValue || 'Not provided';

  const canEmail = Boolean(emailValue && String(emailValue).trim());
  const canCall = Boolean(phoneValue && String(phoneValue).trim());

  const handleEmailPress = async () => {
    if (!canEmail) return;
    const url = `mailto:${String(emailValue).trim()}`;
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    }
  };

  const handlePhonePress = async () => {
    if (!canCall) return;
    const sanitized = String(phoneValue).trim().replace(/[^\d+]/g, '');
    const url = `tel:${sanitized}`;
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    }
  };

  const photoUri =
    resolvedNurse.nurseIdPhoto ||
    resolvedNurse.profilePhoto ||
    resolvedNurse.profileImage ||
    resolvedNurse.photoUrl ||
    null;

  return (
    <Modal
      visible={!!visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <LinearGradient
            colors={GRADIENTS.header}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.modalHeader}
          >
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons name="close" size={24} color={COLORS.white} />
            </TouchableOpacity>

            <View style={styles.modalPhotoCircle}>
              {photoUri ? (
                <Image source={{ uri: photoUri }} style={styles.modalNursePhoto} />
              ) : (
                <MaterialCommunityIcons name="account-heart" size={48} color={COLORS.primary} />
              )}
            </View>

            <Text style={styles.modalTitle}>{nurseName}</Text>
          </LinearGradient>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            <View style={styles.infoSection}>
              <View style={styles.infoRow}>
                <MaterialCommunityIcons name="badge-account" size={20} color={COLORS.primary} />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Nurse Code</Text>
                  <Text style={styles.infoValue}>{nurseCode}</Text>
                </View>
              </View>

              <View style={styles.infoRow}>
                <MaterialCommunityIcons name="medical-bag" size={20} color={COLORS.primary} />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Specialty</Text>
                  <Text style={styles.infoValue}>{specialty}</Text>
                </View>
              </View>

              <View style={styles.infoRow}>
                <MaterialCommunityIcons name="email-outline" size={20} color={COLORS.primary} />
                <TouchableOpacity
                  style={styles.infoContent}
                  onPress={handleEmailPress}
                  activeOpacity={canEmail ? 0.7 : 1}
                  disabled={!canEmail}
                >
                  <Text style={styles.infoLabel}>Email</Text>
                  <Text style={styles.infoValue}>{email}</Text>
                  {canEmail && <Text style={styles.infoHint}>Tap to email</Text>}
                </TouchableOpacity>
              </View>

              <View style={styles.infoRow}>
                <MaterialCommunityIcons name="phone" size={20} color={COLORS.primary} />
                <TouchableOpacity
                  style={styles.infoContent}
                  onPress={handlePhonePress}
                  activeOpacity={canCall ? 0.7 : 1}
                  disabled={!canCall}
                >
                  <Text style={styles.infoLabel}>Phone</Text>
                  <Text style={styles.infoValue}>{phone}</Text>
                  {canCall && <Text style={styles.infoHint}>Tap to call</Text>}
                </TouchableOpacity>
              </View>
            </View>

            {!!footer && <View style={styles.footerContainer}>{footer}</View>}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    width: '90%',
    maxWidth: 420,
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
    overflow: 'hidden',
  },
  modalHeader: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseButton: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  modalPhotoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
    overflow: 'hidden',
  },
  modalNursePhoto: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  modalTitle: {
    fontSize: 17,
    fontFamily: 'Poppins_700Bold',
    color: COLORS.white,
    marginTop: SPACING.sm,
    textAlign: 'center',
  },
  modalContent: {
    paddingBottom: SPACING.lg,
  },
  infoSection: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    gap: SPACING.sm,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 10,
    fontFamily: 'Poppins_500Medium',
    color: COLORS.textLight,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
    color: COLORS.text,
  },
  infoHint: {
    marginTop: 2,
    fontSize: 10,
    fontFamily: 'Poppins_500Medium',
    color: COLORS.textLight,
  },
  footerContainer: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.lg,
  },
});
