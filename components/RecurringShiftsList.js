import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING, GRADIENTS } from '../constants';

const sanitizeMediaValue = (val) => {
  if (!val) return null;
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (!trimmed) return null;
    if (trimmed.toLowerCase() === 'undefined' || trimmed.toLowerCase() === 'null') return null;
    return trimmed;
  }
  if (typeof val === 'object' && typeof val.uri === 'string') {
    const trimmed = val.uri.trim();
    if (!trimmed || trimmed.toLowerCase() === 'undefined' || trimmed.toLowerCase() === 'null') return null;
    return trimmed;
  }
  return null;
};

const getInitials = (value) => {
  if (!value || typeof value !== 'string') return 'NA';
  const parts = value.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'NA';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

const getPhotoUri = (value) => {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && typeof value.uri === 'string') return value.uri;
  return null;
};

const resolveProfilePhoto = (record, clientsList = []) => {
  if (!record) return null;
  
  // First try direct photo fields on the record
  const directCandidates = [
    record.clientProfilePhoto,
    record.patientProfilePhoto,
    record.clientPhoto,
    record.patientPhoto,
    record.profilePhoto,
    record.profileImage,
    record.profileImageUrl,
    record.profilePicture,
    record.photoUrl,
    record.photoURL,
    record.photo,
    record.imageUrl,
    record.avatar,
    record.avatarUrl,
    record.clientAvatar,
    record.clientAvatarUrl,
    record.client?.profilePhoto,
    record.client?.profileImage,
    record.client?.profileImageUrl,
    record.client?.profilePicture,
    record.client?.photoUrl,
    record.client?.photoURL,
    record.client?.photo,
    record.client?.imageUrl,
    record.client?.avatar,
    record.client?.avatarUrl,
    record.patient?.profilePhoto,
    record.patient?.profileImage,
    record.patient?.profileImageUrl,
    record.patient?.profilePicture,
    record.patient?.photoUrl,
    record.patient?.photoURL,
    record.patient?.photo,
    record.patient?.imageUrl,
    record.patient?.avatar,
    record.patient?.avatarUrl,
  ].map(sanitizeMediaValue);
  const direct = directCandidates.find(Boolean);
  if (direct) return direct;

  // If no direct photo, look up by patientId/clientId in the clients list
  const clientId = record.clientId || record.patientId;
  if (clientId && Array.isArray(clientsList) && clientsList.length > 0) {
    const client = clientsList.find(c => String(c.id) === String(clientId));
    if (client) {
      const clientPhotoCandidates = [
        client.profilePhoto,
        client.profileImage,
        client.profileImageUrl,
        client.profilePicture,
        client.photoUrl,
        client.photoURL,
        client.photo,
        client.imageUrl,
        client.avatar,
        client.avatarUrl,
      ].map(sanitizeMediaValue);
      const clientPhoto = clientPhotoCandidates.find(Boolean);
      if (clientPhoto) return clientPhoto;
    }
  }

  return null;
};

export default function RecurringShiftsList({
  shifts = [],
  loading = false,
  onSelectShift,
  emptyMessage = 'No recurring shifts',
  clients = [],
}) {
  React.useEffect(() => {
    if (!Array.isArray(shifts) || shifts.length === 0) return;

    // Prefetch a limited set of images to reduce avatar "pop-in".
    const uris = [];
    for (const record of shifts) {
      const photo = resolveProfilePhoto(record, clients);
      const uri = getPhotoUri(photo);
      if (uri) uris.push(uri);
      if (uris.length >= 25) break;
    }

    const unique = [...new Set(uris)];
    unique.forEach((uri) => {
      Image.prefetch(uri).catch(() => null);
    });
  }, [shifts, clients]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!Array.isArray(shifts) || shifts.length === 0) {
    return (
      <View style={styles.center}>
        <MaterialCommunityIcons
          name="calendar-blank"
          size={48}
          color={COLORS.textMuted}
          style={{ marginBottom: SPACING.md }}
        />
        <Text style={styles.emptyText}>{emptyMessage}</Text>
      </View>
    );
  }

  const renderShift = (item) => {
    const displayName = item.patientName || item.clientName || 'Unknown Patient';
    const photo = resolveProfilePhoto(item, clients);
    const photoUri = getPhotoUri(photo);
    const initials = getInitials(displayName);

    return (
      <View style={styles.card}>
        <View style={styles.header}>
          {photoUri ? (
            <View style={styles.avatarWrapper}>
              <Image source={{ uri: photoUri }} style={styles.avatarImage} />
            </View>
          ) : (
            <View style={[styles.avatarWrapper, styles.avatarFallback]}>
              <Text style={styles.avatarInitials}>{initials}</Text>
            </View>
          )}
          <View style={styles.info}>
            <Text style={styles.clientText}>
              {displayName}
            </Text>
            <Text style={styles.subText}>
              {item.service}
            </Text>
          </View>
          <TouchableOpacity 
            style={styles.detailsButton} 
            onPress={() => onSelectShift && onSelectShift(item)}
          >
            <LinearGradient
              colors={GRADIENTS.header}
              style={styles.detailsButtonGradient}
            >
              <Text style={styles.detailsButtonText}>View</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View>
      {(Array.isArray(shifts) ? shifts : []).map((item, index) => (
        <View key={item.id || item._id || `shift-${index}`}>
          {renderShift(item)}
          {index < (Array.isArray(shifts) ? shifts : []).length - 1 ? <View style={{ height: 8 }} /> : null}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.xl,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.textMuted,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  info: {
    flex: 1,
    marginLeft: 8,
  },
  clientText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    fontFamily: 'Poppins_600SemiBold',
  },
  subText: {
    fontSize: 11,
    color: COLORS.textLight,
    marginTop: 2,
    fontFamily: 'Poppins_500Medium',
  },
  detailsButton: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  detailsButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    gap: 4,
  },
  detailsButtonText: {
    color: COLORS.white,
    fontSize: 12,
    fontFamily: 'Poppins_600SemiBold',
  },
  avatarWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 8,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E6ECF5',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarFallback: {
    backgroundColor: COLORS.primary,
  },
  avatarInitials: {
    color: COLORS.white,
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
  },
});
