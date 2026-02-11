import TouchableWeb from "../components/TouchableWeb";
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Image,
  Alert,
  Platform,
  StatusBar,
  Modal,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { COLORS, GRADIENTS, SPACING } from '../constants';
import { useAuth } from '../context/AuthContext';
import { useNurses } from '../context/NurseContext';
import FirebaseService from '../services/FirebaseService';

export default function ProfileScreen({ navigation }) {
  const { user, updateUser } = useAuth();
  const { nurses } = useNurses();
  const insets = useSafeAreaInsets();
  const [isEditing, setIsEditing] = useState(false);
  const [transactionModalVisible, setTransactionModalVisible] = useState(false);
  const [analyticsModalVisible, setAnalyticsModalVisible] = useState(false);
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState(user?.profilePhoto || null);
  const [staffData, setStaffData] = useState(null);
  const [profileRecord, setProfileRecord] = useState(null);
  const [formData, setFormData] = useState({
    fullName: user?.fullName || user?.username || '',
    email: user?.email || '',
    phone: user?.phone || '',
    address: typeof user?.address === 'object' && user?.address?.street 
      ? user.address.street 
      : (typeof user?.address === 'string' ? user.address : ''),
  });

  const resolveStaffCode = React.useCallback((source) => {
    const v =
      source?.adminCode ||
      source?.nurseCode ||
      source?.code ||
      source?.staffCode ||
      source?.employeeId ||
      source?.username ||
      source?.email ||
      '';
    return typeof v === 'string' ? v.trim() : String(v || '').trim();
  }, []);

  const resolveAddressText = React.useCallback((source) => {
    const address = source?.address;
    if (typeof address === 'string' && address.trim()) return address.trim();
    if (address && typeof address === 'object') {
      const parts = [
        address.street,
        address.line1,
        address.line2,
        address.city,
        address.town,
        address.parish,
        address.state,
        address.country,
        address.postalCode,
      ]
        .filter((p) => typeof p === 'string' && p.trim())
        .map((p) => p.trim());
      if (parts.length) return parts.join(', ');
    }

    const candidates = [
      source?.streetAddress,
      source?.homeAddress,
      source?.clientAddress,
      source?.location,
      source?.addressLine1,
      source?.locationDetails?.address,
      source?.locationDetails?.street,
      source?.locationDetails?.location,
    ]
      .filter((p) => typeof p === 'string' && p.trim())
      .map((p) => p.trim());

    return candidates[0] || '';
  }, []);

  const resolveCreatedDateDisplay = React.useCallback((source) => {
    const raw =
      source?.createdAt ||
      source?.createdDate ||
      source?.dateCreated ||
      source?.dateAdded ||
      source?.createdOn ||
      source?.timestamp ||
      null;

    if (!raw) return '';

    let dateValue = null;

    if (raw instanceof Date) {
      dateValue = raw;
    } else if (typeof raw === 'string') {
      // Handle "Feb 19, 2026" format from BookScreen
      const match = raw.match(/^([A-Za-z]{3})\s+(\d{1,2}),?\s+(\d{4})$/);
      if (match) {
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const monthIndex = monthNames.findIndex(m => m === match[1]);
        if (monthIndex !== -1) {
          const d = new Date(parseInt(match[3]), monthIndex, parseInt(match[2]));
          if (!isNaN(d.getTime())) {
            dateValue = d;
          }
        }
      }
      
      if (!dateValue) {
        const d = new Date(raw);
        if (!Number.isNaN(d.getTime())) dateValue = d;
      }
    } else if (typeof raw === 'number') {
      const d = new Date(raw);
      if (!Number.isNaN(d.getTime())) dateValue = d;
    } else if (typeof raw === 'object') {
      // Firestore Timestamp-like
      if (typeof raw.toDate === 'function') {
        try {
          const d = raw.toDate();
          if (d && !Number.isNaN(d.getTime())) dateValue = d;
        } catch {
          // ignore
        }
      } else if (typeof raw.seconds === 'number') {
        const d = new Date(raw.seconds * 1000);
        if (!Number.isNaN(d.getTime())) dateValue = d;
      }
    }

    if (!dateValue) return '';
    return dateValue.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }, []);

  const getProfileSource = React.useCallback(() => profileRecord || user || {}, [profileRecord, user]);

  // Fetch canonical profile record (admins/nurses/users) so fields like staff code + address are available.
  useEffect(() => {
    let isCancelled = false;

    const fetchProfile = async () => {
      if (!user) {
        setProfileRecord(null);
        return;
      }

      try {
        let result = null;

        if (user?.id) {
          result = await FirebaseService.getUser(user.id);
        }

        if ((!result || !result.success) && user?.username) {
          result = await FirebaseService.getUserByUsername(user.username);
        }

        if ((!result || !result.success) && user?.email) {
          result = await FirebaseService.getUserByEmail(user.email);
        }

        if (!isCancelled) {
          setProfileRecord(result && result.success ? result.user : null);
        }
      } catch (e) {
        if (!isCancelled) setProfileRecord(null);
      }
    };

    fetchProfile();
    return () => {
      isCancelled = true;
    };
  }, [user?.id, user?.username, user?.email, user]);

  // Load staff data if user is a nurse or admin
  useEffect(() => {
    // First update from user context data (API login response)
    setFormData(prev => ({
      ...prev,
      fullName: user?.fullName || user?.username || prev.fullName || '',
    }));

    if (user?.role === 'nurse' && user?.id) {
      const staffRecord = nurses.find(
        n => n.id === user.id || n.email === user.email || n.code === user.nurseCode
      );
      if (staffRecord) {
        setStaffData(staffRecord);
        // Update fullName from staff record if available
        setFormData(prev => ({
          ...prev,
          fullName: staffRecord.name || staffRecord.username || staffRecord.fullName || user?.fullName || user?.username || prev.fullName || '',
        }));
      }
    }
  }, [user, nurses]);

  // Sync profile photo when user data changes
  useEffect(() => {
    if (user?.profilePhoto) {
      setProfilePhoto(user.profilePhoto);
    }
  }, [user?.profilePhoto]);

  // Sync email, phone and address when user data changes
  useEffect(() => {
    if (!isEditing) {
      const source = getProfileSource();
      const addressValue = resolveAddressText(source);
      const nameValue =
        source?.fullName ||
        source?.name ||
        source?.username ||
        user?.fullName ||
        user?.username ||
        '';
      
      setFormData(prev => ({
        ...prev,
        fullName: nameValue || prev.fullName || '',
        email: source?.email || user?.email || '',
        phone: source?.phone || user?.phone || '',
        address: addressValue,
      }));
    }
  }, [user?.email, user?.phone, user?.address, profileRecord, isEditing, resolveAddressText, getProfileSource]);

  const handleSave = async () => {
    try {
      const updatedData = { ...formData, profilePhoto };
      await updateUser(updatedData);
      setIsEditing(false);
      Alert.alert('Success', 'Profile updated successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    }
  };

  const handleCancel = () => {
    const source = getProfileSource();
    const addressValue = resolveAddressText(source);
    
    setFormData({
      fullName: source?.fullName || source?.name || source?.username || user?.fullName || user?.username || '',
      email: source?.email || user?.email || '',
      phone: source?.phone || user?.phone || '',
      address: addressValue,
    });
    setProfilePhoto(user?.profilePhoto || null);
    setIsEditing(false);
  };

  const pickImageFromGallery = async () => {
    // Request permission
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (permissionResult.granted === false) {
      Alert.alert("Permission Required", "Permission to access gallery is required to change profile photo.");
      return;
    }

    // Launch image picker
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled) {
      // Convert to base64 to persist across sessions
      const base64Image = `data:image/jpeg;base64,${result.assets[0].base64}`;
      setProfilePhoto(base64Image);
    }
  };

  const takePhotoWithCamera = async () => {
    // Request permission
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    
    if (permissionResult.granted === false) {
      Alert.alert("Permission Required", "Permission to access camera is required to take a photo.");
      return;
    }

    // Launch camera
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled) {
      // Convert to base64 to persist across sessions
      const base64Image = `data:image/jpeg;base64,${result.assets[0].base64}`;
      setProfilePhoto(base64Image);
    }
  };

  const handleChangePhoto = () => {
    Alert.alert(
      'Change Photo',
      'Choose an option',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Take Photo', onPress: takePhotoWithCamera },
        { text: 'Choose from Gallery', onPress: pickImageFromGallery },
      ]
    );
  };

  const ProfileField = ({ icon, label, value, onChangeText, editable = true, multiline = false }) => (
    <View style={styles.fieldContainer}>
      <View style={styles.fieldHeader}>
        <MaterialCommunityIcons name={icon} size={20} color={COLORS.primary} />
        <Text style={styles.fieldLabel}>{label}</Text>
      </View>
      {isEditing && editable ? (
        <TextInput
          style={[styles.fieldInput, multiline && styles.multilineInput]}
          value={value}
          onChangeText={onChangeText}
          multiline={multiline}
          numberOfLines={multiline ? 3 : 1}
          placeholder={`Enter ${label.toLowerCase()}`}
          placeholderTextColor={COLORS.textLight}
        />
      ) : (
        <Text style={styles.fieldValue}>{value || 'Not set'}</Text>
      )}
    </View>
  );

  const SectionDivider = () => (
    <LinearGradient
      colors={GRADIENTS.header}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={styles.sectionDivider}
    />
  );

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      {/* Header */}
      <LinearGradient
        colors={GRADIENTS.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 20, paddingBottom: 20 }]}
      >
        <View style={styles.headerRow}>
          <TouchableWeb 
            style={styles.iconButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="arrow-left" size={26} color={COLORS.white} />
          </TouchableWeb>
          <Text style={styles.headerTitle}>My Profile</Text>
          <TouchableWeb
            style={styles.editButton}
            onPress={isEditing ? handleSave : () => setIsEditing(true)}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons 
              name={isEditing ? "check" : "pencil"} 
              size={24} 
              color={COLORS.white} 
            />
          </TouchableWeb>
        </View>
      </LinearGradient>

      <KeyboardAvoidingView 
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView 
          style={styles.content} 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
        {/* Profile Avatar Section */}
        <View style={styles.profileSection}>
          <View style={styles.avatarWrapper}>
            <TouchableWeb
              style={styles.avatarContainer}
              onPress={isEditing ? handleChangePhoto : null}
              activeOpacity={isEditing ? 0.8 : 1}
              disabled={!isEditing}
            >
              {profilePhoto ? (
                <Image source={{ uri: profilePhoto }} style={styles.profileImage} />
              ) : (
                <LinearGradient
                  colors={GRADIENTS.primary}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                  style={styles.defaultAvatarGradient}
                >
                  <MaterialCommunityIcons name="shield-account" size={64} color={COLORS.white} />
                </LinearGradient>
              )}
            </TouchableWeb>
            {isEditing && (
              <TouchableWeb
                style={styles.cameraButton}
                onPress={handleChangePhoto}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons name="camera" size={16} color={COLORS.white} />
              </TouchableWeb>
            )}
          </View>
          
          <Text style={styles.adminName}>{formData.fullName || 'User'}</Text>

          {(() => {
            const staffCode = resolveStaffCode(getProfileSource());
            if (!staffCode) return null;
            return (
              <LinearGradient
                colors={GRADIENTS.primary}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={styles.adminBadge}
              >
                <MaterialCommunityIcons name="badge-account" size={16} color={COLORS.white} />
                <Text style={styles.adminBadgeText}>ID: {staffCode}</Text>
              </LinearGradient>
            );
          })()}
        </View>

        <SectionDivider />

        {/* Simple Info Cards - Stacked Vertically */}
        <View style={styles.infoCardsContainer}>
          <View style={styles.infoCard}>
            <MaterialCommunityIcons name="account" size={24} color={COLORS.primary} />
            <View style={styles.infoCardContent}>
              <Text style={styles.infoLabel}>Full Name</Text>
              {isEditing ? (
                <TextInput
                  style={styles.infoInput}
                  value={formData.fullName}
                  onChangeText={(text) => setFormData({...formData, fullName: text})}
                  placeholder="Enter full name"
                  placeholderTextColor={COLORS.textLight}
                />
              ) : (
                <Text style={styles.infoValue}>{formData.fullName || 'Not set'}</Text>
              )}
            </View>
          </View>

          <View style={styles.infoCard}>
            <MaterialCommunityIcons name="email-outline" size={24} color={COLORS.primary} />
            <View style={styles.infoCardContent}>
              <Text style={styles.infoLabel}>Email</Text>
              {isEditing ? (
                <TextInput
                  style={styles.infoInput}
                  value={formData.email}
                  onChangeText={(text) => setFormData({...formData, email: text})}
                  placeholder="Enter email"
                  placeholderTextColor={COLORS.textLight}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              ) : (
                <Text style={styles.infoValue}>{formData.email || 'Not set'}</Text>
              )}
            </View>
          </View>
          
          <View style={styles.infoCard}>
            <MaterialCommunityIcons name="phone-outline" size={24} color={COLORS.primary} />
            <View style={styles.infoCardContent}>
              <Text style={styles.infoLabel}>Phone</Text>
              {isEditing ? (
                <TextInput
                  style={styles.infoInput}
                  value={formData.phone}
                  onChangeText={(text) => setFormData({...formData, phone: text})}
                  placeholder="Enter phone number"
                  placeholderTextColor={COLORS.textLight}
                  keyboardType="phone-pad"
                />
              ) : (
                <Text style={styles.infoValue}>{formData.phone || 'Not set'}</Text>
              )}
            </View>
          </View>

          <View style={styles.infoCard}>
            <MaterialCommunityIcons name="home-outline" size={24} color={COLORS.primary} />
            <View style={styles.infoCardContent}>
              <Text style={styles.infoLabel}>Address</Text>
              {isEditing ? (
                <TextInput
                  style={styles.infoInput}
                  value={formData.address}
                  onChangeText={(text) => setFormData({...formData, address: text})}
                  placeholder="Enter address"
                  placeholderTextColor={COLORS.textLight}
                  multiline={true}
                  numberOfLines={2}
                />
              ) : (
                <Text style={styles.infoValue}>{formData.address || 'Not set'}</Text>
              )}
            </View>
          </View>

          {/* Staff-specific details - READ ONLY */}
          {staffData && (
            <>
              {staffData.specialization && (
                <View style={styles.infoCard}>
                  <MaterialCommunityIcons name="briefcase-outline" size={24} color={COLORS.primary} />
                  <View style={styles.infoCardContent}>
                    <Text style={styles.infoLabel}>Specialization</Text>
                    <Text style={styles.infoValue}>{staffData.specialization}</Text>
                  </View>
                </View>
              )}

              {(staffData.bankName || staffData.accountNumber || staffData.accountHolderName || staffData.bankBranch) && (
                <>
                  <SectionDivider />
                  <Text style={styles.sectionTitle}>Banking Details</Text>
                  
                  {staffData.bankName && (
                    <View style={styles.infoCard}>
                      <MaterialCommunityIcons name="bank" size={24} color={COLORS.primary} />
                      <View style={styles.infoCardContent}>
                        <Text style={styles.infoLabel}>Bank Name</Text>
                        <Text style={styles.infoValue}>{staffData.bankName}</Text>
                      </View>
                    </View>
                  )}

                  {staffData.accountHolderName && (
                    <View style={styles.infoCard}>
                      <MaterialCommunityIcons name="account-outline" size={24} color={COLORS.primary} />
                      <View style={styles.infoCardContent}>
                        <Text style={styles.infoLabel}>Account Holder</Text>
                        <Text style={styles.infoValue}>{staffData.accountHolderName}</Text>
                      </View>
                    </View>
                  )}

                  {staffData.accountNumber && (
                    <View style={styles.infoCard}>
                      <MaterialCommunityIcons name="credit-card-outline" size={24} color={COLORS.primary} />
                      <View style={styles.infoCardContent}>
                        <Text style={styles.infoLabel}>Account Number</Text>
                        <Text style={styles.infoValue}>{staffData.accountNumber}</Text>
                      </View>
                    </View>
                  )}

                  {staffData.bankBranch && (
                    <View style={styles.infoCard}>
                      <MaterialCommunityIcons name="map-marker-radius-outline" size={24} color={COLORS.primary} />
                      <View style={styles.infoCardContent}>
                        <Text style={styles.infoLabel}>Bank Branch</Text>
                        <Text style={styles.infoValue}>{staffData.bankBranch}</Text>
                      </View>
                    </View>
                  )}
                </>
              )}
            </>
          )}
        </View>

        {isEditing && (
          <View style={styles.actionButtons}>
            <TouchableWeb
              style={styles.cancelButton}
              onPress={handleCancel}
              activeOpacity={0.8}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableWeb>
          </View>
        )}

        <View style={styles.bottomPadding} />
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
  flex: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    zIndex: 1000,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Poppins_700Bold',
    color: COLORS.white,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 12,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: COLORS.error,
    borderRadius: 12,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  notificationBadgeText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  profileSection: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 30,
    backgroundColor: COLORS.white,
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 16,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 16,
  },
  avatarContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: COLORS.white,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  defaultAvatarGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileImage: {
    width: '100%',
    height: '100%',
    borderRadius: 56,
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: COLORS.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  adminName: {
    fontSize: 24,
    fontFamily: 'Poppins_700Bold',
    color: COLORS.text,
    marginBottom: 4,
    textAlign: 'center',
  },
  adminRole: {
    fontSize: 16,
    fontFamily: 'Poppins_500Medium',
    color: COLORS.textLight,
    marginBottom: 12,
    textAlign: 'center',
  },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
    marginTop: 8,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  adminBadgeText: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.white,
  },
  // Quick Stats Row
  quickStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 16,
    padding: 16,
    marginTop: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  quickStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  quickStatDivider: {
    width: 1,
    height: 40,
    backgroundColor: COLORS.border,
  },
  quickStatNumber: {
    fontSize: 18,
    fontFamily: 'Poppins_700Bold',
    color: COLORS.text,
    marginTop: 4,
  },
  quickStatLabel: {
    fontSize: 12,
    fontFamily: 'Poppins_500Medium',
    color: COLORS.textLight,
    marginTop: 2,
  },
  infoCardsContainer: {
    paddingHorizontal: 20,
    gap: 12,
    marginTop: 20,
  },
  sectionDivider: {
    height: 2,
    borderRadius: 2,
    marginVertical: 16,
    marginHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.textLight,
    marginLeft: 12,
    marginBottom: 12,
  },
  infoCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    gap: 12,
  },
  infoCardContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    fontFamily: 'Poppins_500Medium',
    color: COLORS.textLight,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.text,
  },
  infoInput: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: COLORS.background,
    marginTop: 4,
  },
  multilineInfoInput: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.text,
    marginBottom: 12,
  },
  sectionHeaderWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 8,
  },
  // Management Grid Styles
  managementGrid: {
    gap: 16,
  },
  managementRow: {
    flexDirection: 'row',
    gap: 16,
  },
  managementCard: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  managementCardGradient: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
  },
  managementCardTitle: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.white,
    marginTop: 8,
    textAlign: 'center',
  },
  managementCardSubtitle: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.white,
    opacity: 0.9,
    marginTop: 4,
    textAlign: 'center',
  },
  managementCardFull: {
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  managementCardFullGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    gap: 16,
  },
  managementCardFullContent: {
    flex: 1,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  fieldContainer: {
    marginBottom: 20,
  },
  fieldHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  fieldLabel: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.text,
  },
  fieldValue: {
    fontSize: 16,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.text,
    paddingVertical: 4,
  },
  fieldInput: {
    fontSize: 16,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: COLORS.background,
  },
  multilineInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginTop: 20,
    marginBottom: 40,
    paddingBottom: 20,
  },
  cancelButton: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.primary,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.primary,
  },
  saveButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  saveButtonGradient: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.white,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    margin: 20,
    maxHeight: '90%',
    width: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.text,
  },
  modalBody: {
    maxHeight: 500,
  },
  // Price Section Styles
  priceSection: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  priceSectionTitle: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.text,
    marginBottom: 16,
  },
  priceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  priceItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  priceItemInfo: {
    marginLeft: 12,
    flex: 1,
  },
  priceItemName: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.text,
    marginBottom: 2,
  },
  priceItemDescription: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.textLight,
  },
  priceItemAmount: {
    fontSize: 16,
    fontFamily: 'Poppins_700Bold',
    color: COLORS.success,
  },
  // Package Deal Styles
  packageItem: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
  },
  packageGradient: {
    padding: 16,
    alignItems: 'center',
  },
  packageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  packageName: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.white,
    marginLeft: 8,
  },
  packageDescription: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.white,
    opacity: 0.9,
    marginBottom: 8,
    textAlign: 'center',
  },
  packagePrice: {
    fontSize: 20,
    fontFamily: 'Poppins_700Bold',
    color: COLORS.white,
    marginBottom: 4,
  },
  packageSavings: {
    fontSize: 12,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.white,
    opacity: 0.8,
  },
  // Modal Actions
  modalActions: {
    padding: 20,
  },
  updatePricesButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  updateButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  updateButtonText: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.white,
  },
  // Payment Section Styles (unchanged existing styles)
  paymentStatsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  paymentStatCard: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  paymentStatGradient: {
    padding: 16,
    alignItems: 'center',
  },
  paymentStatValue: {
    fontSize: 18,
    fontFamily: 'Poppins_700Bold',
    color: COLORS.white,
    marginTop: 8,
  },
  paymentStatLabel: {
    fontSize: 12,
    fontFamily: 'Poppins_500Medium',
    color: COLORS.white,
    opacity: 0.9,
    marginTop: 4,
  },
  paymentActionsContainer: {
    gap: 12,
  },
  paymentActionCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  paymentActionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  paymentActionTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  paymentActionTitle: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.text,
    marginBottom: 2,
  },
  paymentActionSubtitle: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.textLight,
  },
  bottomPadding: {
    height: 80,
  },
});
