import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Image,
  ScrollView,
  Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, SPACING, GRADIENTS } from '../constants';
import { resolveNurseDetails } from '../utils/resolveNurseDetails';
import NurseDetailsModal from './NurseDetailsModal';

export default function NurseInfoCard({ 
  nurse, 
  onPress, 
  style = {},
  variant = 'card',
  showViewButton = true,
  nursesRoster = null,
  isCoverage = false,
  primaryNurseName = null,
  compact = false,
  openDetailsOnPress = false,
  avatarSize = 60,
  actionButton = null,
  hideSpecialty = false,
  hideCode = false
}) {
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const nurseObj = nurse && typeof nurse === 'object' ? nurse : {};

  const resolvedNurse = useMemo(
    () => resolveNurseDetails(nurse, nursesRoster),
    [nurse, nursesRoster]
  );

  const handleViewPress = () => {
    setShowDetailsModal(true);
  };

  const handleCardPress = () => {
    if (openDetailsOnPress) {
      setShowDetailsModal(true);
    }
    if (onPress) {
      onPress(nurse);
    }
  };

  const nurseName = resolvedNurse.fullName || resolvedNurse.name || 'Unknown Nurse';
  const nurseCode = resolvedNurse.nurseCode || resolvedNurse.licenseNumber || resolvedNurse.code || 'N/A';
  const specialty = resolvedNurse.specialization || resolvedNurse.specialty || 'General Nursing';
  const nurseId = resolvedNurse._id?.$oid || resolvedNurse.id || resolvedNurse._id || 'N/A';
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
    const sanitized = String(phoneValue).trim().replace(/[\s()-]/g, '');
    const url = `tel:${sanitized}`;
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    }
  };

  const containerStyle = variant === 'embedded' ? styles.embeddedContainer : styles.container;

  return (
    <>
      <TouchableOpacity 
        style={[containerStyle, style]} 
        onPress={handleCardPress}
        activeOpacity={0.7}
      >
        <View style={styles.cardContent}>
          <View style={[styles.avatarContainer, { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 }]}>
            {resolvedNurse.nurseIdPhoto || resolvedNurse.profilePhoto || resolvedNurse.profileImage || resolvedNurse.photoUrl ? (
              <Image 
                source={{ uri: resolvedNurse.nurseIdPhoto || resolvedNurse.profilePhoto || resolvedNurse.profileImage || resolvedNurse.photoUrl }} 
                style={[styles.nursePhoto, { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 }]}
              />
            ) : (
              <MaterialCommunityIcons 
                name="account-heart" 
                size={avatarSize > 40 ? 32 : 16} 
                color={COLORS.white} 
              />
            )}
          </View>
          
          <View style={styles.nurseInfo}>
            <Text style={styles.nurseName} numberOfLines={1}>
              {nurseName}
            </Text>
          </View>
          
          {isCoverage && primaryNurseName && (
            <View style={styles.coverageBanner}>
              <MaterialCommunityIcons name="account-switch" size={16} color="#F59E0B" />
              <Text style={styles.coverageBannerText}>
                Covering for {primaryNurseName}
              </Text>
            </View>
          )}
          
          {actionButton && (
            <View style={{ marginRight: 8, justifyContent: 'center' }}>
              {actionButton}
            </View>
          )}

          {showViewButton && (
            <TouchableOpacity 
              style={styles.viewButton}
              onPress={handleViewPress}
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={GRADIENTS.header}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={styles.viewButtonGradient}
              >
                <Text style={styles.viewButtonText}>View</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>

      <NurseDetailsModal
        visible={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        nurse={nurse}
        nursesRoster={nursesRoster}
        title={nurseName}
      />
    </>
  );
}

const styles = StyleSheet.create({
  // Card Styles
  container: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.primary,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    padding: SPACING.lg,
  },
  embeddedContainer: {
    backgroundColor: 'transparent',
    borderRadius: 0,
    borderWidth: 0,
    borderColor: 'transparent',
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
    padding: 0,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
    overflow: 'hidden',
  },
  nursePhoto: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  nurseInfo: {
    flex: 1,
  },
  nurseName: {
    fontSize: 18,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.text,
  },
  nurseSpecialty: {
    marginTop: 2,
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.textLight,
  },
  nurseCode: {
    marginTop: 2,
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.primary,
  },
  viewButton: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  viewButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    gap: 4,
  },
  viewButtonText: {
    color: COLORS.white,
    fontSize: 12,
    fontFamily: 'Poppins_600SemiBold',
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    width: '90%',
    maxWidth: 500,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 15,
  },
  modalHeader: {
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.lg,
    alignItems: 'center',
    position: 'relative',
  },
  modalCloseButton: {
    position: 'absolute',
    top: SPACING.md,
    right: SPACING.md,
    padding: 4,
    zIndex: 10,
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
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.text,
  },
  infoHint: {
    marginTop: 2,
    fontSize: 10,
    fontFamily: 'Poppins_500Medium',
    color: COLORS.textLight,
  },
  coverageBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginTop: 8,
    gap: 6,
  },
  coverageBannerText: {
    fontSize: 11,
    fontFamily: 'Poppins_600SemiBold',
    color: '#92400E',
    flex: 1,
  },
});