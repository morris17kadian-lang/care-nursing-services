import TouchableWeb from "../components/TouchableWeb";
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SPACING, GRADIENTS } from '../constants';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { useNurses } from '../context/NurseContext';
import { useProfileEdit } from '../context/ProfileEditContext';
import * as ImagePicker from 'expo-image-picker';
import ApiService from '../services/ApiService';

export default function NurseProfileScreen({ navigation, route }) {
  const { user, updateUserProfile } = useAuth();
  const { sendNotificationToUser } = useNotifications();
  const { nurses } = useNurses();
  const { createEditRequest, canEditProfile, revokeEditPermission, editRequests, refreshRequests } = useProfileEdit();
  const insets = useSafeAreaInsets();
  const [profilePhoto, setProfilePhoto] = useState(user?.profilePhoto || null);
  const [nurseStaffData, setNurseStaffData] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [hasPendingRequest, setHasPendingRequest] = useState(false);
  const [nursePayslips, setNursePayslips] = useState([]);
  const [payslipsExpanded, setPayslipsExpanded] = useState(false);
  const [formData, setFormData] = useState({
    username: user?.name || user?.username || '',
    email: user?.email || '',
    phone: user?.phone || '',
    specialization: user?.specialization || '',
    nurseCode: user?.nurseCode || '',
    bankName: user?.bankingDetails?.bankName || user?.bankName || '',
    accountNumber: user?.bankingDetails?.accountNumber || user?.accountNumber || '',
    accountHolderName: user?.bankingDetails?.accountHolderName || user?.accountHolderName || '',
    bankBranch: user?.bankingDetails?.bankBranch || user?.bankBranch || '',
  });

  const SectionDivider = () => (
    <LinearGradient
      colors={GRADIENTS.header}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={styles.sectionDivider}
    />
  );

  // Check for navigation params to open payslips
  useEffect(() => {
    if (route?.params?.showPaymentHistory) {
      setPayslipsExpanded(true);
      navigation.setParams({ showPaymentHistory: undefined });
    }
  }, [route?.params]);

  // Load payslips for this nurse - from backend with fallback to local storage
  useEffect(() => {
    const loadPayslips = async () => {
      try {
        if (!user?.id) return;

        const buildPayslipIdentity = (p) => {
          if (!p) return '';
          const explicit = p.id || p.payslipNumber || p.mongoId;
          if (explicit) return String(explicit);
          const staff = p.staffId || p.employeeId || p.nurseCode || p.code || p.staffName || 'unknown';
          const periodStart = p.periodStart || '';
          const periodEnd = p.periodEnd || '';
          const amount = p.netPay ?? '';
          return `${staff}-${periodStart}-${periodEnd}-${amount}`;
        };

        const dedupePayslips = (list) => {
          if (!Array.isArray(list)) return [];
          const map = new Map();
          list.forEach((p) => {
            const key = buildPayslipIdentity(p);
            if (!key) return;
            // Keep the most recently paid/created item for a given identity.
            const existing = map.get(key);
            if (!existing) {
              map.set(key, p);
              return;
            }
            const existingDate = new Date(existing?.paidDate || existing?.createdAt || 0).getTime();
            const nextDate = new Date(p?.paidDate || p?.createdAt || 0).getTime();
            if (nextDate >= existingDate) {
              map.set(key, p);
            }
          });
          return Array.from(map.values());
        };

        const userKeyCandidates = [
          user.id,
          user.nurseCode,
          user.code,
          formData?.nurseCode,
        ].filter(Boolean);

        // Try to fetch from backend first
        try {
          const response = await ApiService.makeRequest('/payslips', {
            method: 'GET'
          });
          
          if (response && response.success && Array.isArray(response.data)) {
            // Some backends return all payslips; filter to only this nurse.
            const filtered = response.data.filter((p) => {
              const payKeys = [
                p?.staffId,
                p?.nurseId,
                p?.userId,
                p?.employeeId,
                p?.nurseCode,
                p?.code,
              ].filter(Boolean);
              return payKeys.some((k) => userKeyCandidates.includes(k));
            });

            if (filtered.length > 0) {
              const deduped = dedupePayslips(filtered);
              deduped.sort((a, b) => new Date(b.paidDate || b.createdAt) - new Date(a.paidDate || a.createdAt));
              setNursePayslips(deduped);

              // Cache to local storage for offline access
              const payslipsJson = (await AsyncStorage.getItem('nursePayslips')) || '{}';
              const allPayslips = JSON.parse(payslipsJson);
              allPayslips[user.id] = deduped;
              await AsyncStorage.setItem('nursePayslips', JSON.stringify(allPayslips));
              return;
            }
            // If backend returns nothing for this nurse, fall back to local storage without overwriting.
          }
        } catch (backendError) {
          // Backend unavailable, falling back to local storage
        }
        
        // Fallback to local storage if backend unavailable
        const payslipsJson = await AsyncStorage.getItem('nursePayslips');
        if (payslipsJson) {
          const allPayslips = JSON.parse(payslipsJson);
          const myPayslips = dedupePayslips(allPayslips[user.id] || []);
          // Sort by paid date, most recent first
          myPayslips.sort((a, b) => new Date(b.paidDate) - new Date(a.paidDate));
          setNursePayslips(myPayslips);
        }
      } catch (error) {
        console.error('Error loading payslips:', error);
      }
    };
    
    loadPayslips();
    // Reload payslips when screen is focused
    const interval = setInterval(loadPayslips, 3000); // Check every 3 seconds
    return () => clearInterval(interval);
  }, [user?.id]);

  // Load nurse data from staff management
  useEffect(() => {
    if (user?.id) {
      // Find this nurse in the staff list (match by ID or email)
      const staffRecord = nurses.find(
        n => n.id === user.id || n.email === user.email || n.code === user.nurseCode
      );
      
      if (staffRecord) {
        // Found staff record
        setNurseStaffData(staffRecord);
        // Update form data with staff record
        setFormData({
          username: staffRecord.name || user?.name || user?.username || '',
          email: staffRecord.email || user?.email || '',
          phone: staffRecord.phone || user?.phone || '',
          specialization: staffRecord.specialization || user?.specialization || '',
          nurseCode: staffRecord.code || user?.nurseCode || '',
          bankName: staffRecord.bankName || user?.bankingDetails?.bankName || '',
          accountNumber: staffRecord.accountNumber || user?.bankingDetails?.accountNumber || '',
          accountHolderName: staffRecord.accountHolderName || user?.bankingDetails?.accountHolderName || '',
          bankBranch: staffRecord.bankBranch || user?.bankingDetails?.bankBranch || '',
        });
      }
    }
  }, [user, nurses]);

  // Sync profile photo when user data changes
  useEffect(() => {
    if (user?.profilePhoto) {
      setProfilePhoto(user.profilePhoto);
    }
  }, [user?.profilePhoto]);

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
    if (!isEditing) return;
    
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

  const handleRequestEditPermission = async () => {
    Alert.alert(
      'Request Edit Permission',
      'You need admin approval to edit your profile. Send a request to the administrator?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send Request',
          onPress: async () => {
            try {
              // Create tracked edit request
              await createEditRequest({
                nurseId: user?.id,
                nurseName: formData.username || user?.name,
                nurseCode: formData.nurseCode
              });

              // Send notification to admin
              await sendNotificationToUser(
                'admin-001',
                'admin',
                'Profile Edit Request',
                `${formData.username || user?.name} (${formData.nurseCode}) has requested permission to edit their profile`,
                {
                  type: 'profile_edit_request',
                  nurseId: user?.id,
                  nurseName: formData.username || user?.name,
                  nurseCode: formData.nurseCode,
                  requestedAt: new Date().toISOString()
                }
              );
              
              Alert.alert(
                'Request Sent',
                'Your edit request has been sent to the administrator. You will be notified once it is reviewed.',
                [{ text: 'OK' }]
              );
            } catch (error) {
              console.error('Failed to send edit request:', error);
              if (error.message && error.message.includes('pending edit request')) {
                Alert.alert('Request Pending', 'You already have a pending edit request awaiting approval.');
              } else {
                Alert.alert('Error', error.message || 'Failed to send request. Please try again.');
              }
            }
          }
        }
      ]
    );
  };

  // Check if editing is allowed
  useEffect(() => {
    const checkEditPermission = async () => {
      if (user?.id) {
        try {
          // First check locally in editRequests
          if (editRequests && editRequests.length > 0) {
            const approvedRequest = editRequests.find(req => 
              (req.nurseId === user.id || req.nurseId === user._id) && req.status === 'approved'
            );
            if (approvedRequest) {
              setIsEditing(true);
              return;
            }
          }
          
          // If not found locally, check backend
          const canEdit = await canEditProfile(user.id);
          setIsEditing(canEdit);
        } catch (error) {
          console.error('Failed to check edit permission:', error);
          setIsEditing(false);
        }
      }
    };

    checkEditPermission();
  }, [user, canEditProfile, editRequests]);

  const handleSave = async () => {
    try {
      // Save the profile updates including photo
      const updatedData = { ...formData, profilePhoto };
      await updateUserProfile(user?.id, updatedData);
      
      // Revoke edit permission after save
      await revokeEditPermission(user?.id);
      setIsEditing(false);
      
      Alert.alert('Success', 'Profile updated successfully');
    } catch (error) {
      console.error('Failed to save profile:', error);
      Alert.alert('Error', 'Failed to save changes. Please try again.');
    }
  };

  const handleCancelEdit = async () => {
    // Revoke edit permission
    await revokeEditPermission(user?.id);
    setIsEditing(false);
    
    // Reset form data
    setFormData({
      username: user?.name || user?.username || '',
      email: user?.email || '',
      phone: user?.phone || '',
      specialization: user?.specialization || '',
      nurseCode: user?.nurseCode || '',
      bankName: user?.bankingDetails?.bankName || user?.bankName || '',
      accountNumber: user?.bankingDetails?.accountNumber || user?.accountNumber || '',
      accountHolderName: user?.bankingDetails?.accountHolderName || user?.accountHolderName || '',
      bankBranch: user?.bankingDetails?.bankBranch || user?.bankBranch || '',
    });
    // Reset profile photo to original
    setProfilePhoto(user?.profilePhoto || null);
  };

  // Check for pending requests
  useEffect(() => {
    if (editRequests && user?.id) {
      const pending = editRequests.find(req => 
        (req.nurseId === user.id || req.nurseId === user._id) && req.status === 'pending'
      );
      setHasPendingRequest(!!pending);
    }
  }, [editRequests, user]);

  // Refresh requests on mount and when screen is focused
  useEffect(() => {
    refreshRequests();
    
    // Subscribe to focus events to refresh when returning to this screen
    const unsubscribe = navigation.addListener('focus', () => {
      refreshRequests();
    });
    
    return unsubscribe;
  }, [navigation, refreshRequests]);

  const handleShowPendingAlert = () => {
    Alert.alert(
      'Request Pending',
      'You already have a pending edit request awaiting approval from the administrator.'
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      {/* Watermark Logo */}
      <Image
        source={require('../assets/Images/Nurses-logo.png')}
        style={styles.watermarkLogo}
        resizeMode="contain"
      />
      
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
          <Text style={styles.headerTitle}>Nurse Profile</Text>
          {!isEditing ? (
            <TouchableWeb
              style={[styles.editButton, hasPendingRequest && styles.pendingButton]}
              onPress={hasPendingRequest ? handleShowPendingAlert : handleRequestEditPermission}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons 
                name={hasPendingRequest ? "clock-outline" : "lock-alert"} 
                size={24} 
                color={COLORS.white} 
              />
            </TouchableWeb>
          ) : (
            <View style={styles.editButtonsContainer}>
              <TouchableWeb
                style={styles.cancelButton}
                onPress={handleCancelEdit}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons name="close" size={20} color={COLORS.white} />
              </TouchableWeb>
              <TouchableWeb
                style={styles.saveButton}
                onPress={handleSave}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons name="check" size={20} color={COLORS.white} />
              </TouchableWeb>
            </View>
          )}
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
              onPress={handleChangePhoto}
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
                  <MaterialCommunityIcons name="account-heart" size={64} color={COLORS.white} />
                </LinearGradient>
              )}
            </TouchableWeb>
            {isEditing && (
              <TouchableWeb
                style={styles.cameraIconContainer}
                onPress={handleChangePhoto}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons name="camera" size={16} color={COLORS.white} />
              </TouchableWeb>
            )}
          </View>
          
          <Text style={styles.adminName}>{formData.username || user?.name || user?.username || 'Nurse'}</Text>
          <Text style={styles.adminRole}>{formData.specialization || 'Registered Nurse'}</Text>
          <LinearGradient
            colors={GRADIENTS.primary}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.adminBadge}
          >
            <MaterialCommunityIcons name="badge-account" size={16} color={COLORS.white} />
            <Text style={styles.adminBadgeText}>ID: {formData.nurseCode}</Text>
          </LinearGradient>
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
                  style={styles.editInput}
                  value={formData.username}
                  onChangeText={(text) => setFormData({ ...formData, username: text })}
                  placeholder="Full Name"
                  placeholderTextColor={COLORS.textLight}
                />
              ) : (
                <Text style={styles.infoValue}>{formData.username || 'Not set'}</Text>
              )}
            </View>
          </View>

          <View style={styles.infoCard}>
            <MaterialCommunityIcons name="email-outline" size={24} color={COLORS.primary} />
            <View style={styles.infoCardContent}>
              <Text style={styles.infoLabel}>Email</Text>
              {isEditing ? (
                <TextInput
                  style={styles.editInput}
                  value={formData.email}
                  onChangeText={(text) => setFormData({ ...formData, email: text })}
                  placeholder="Email"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  placeholderTextColor={COLORS.textLight}
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
                  style={styles.editInput}
                  value={formData.phone}
                  onChangeText={(text) => setFormData({ ...formData, phone: text })}
                  placeholder="Phone Number"
                  keyboardType="phone-pad"
                  placeholderTextColor={COLORS.textLight}
                />
              ) : (
                <Text style={styles.infoValue}>{formData.phone || 'Not set'}</Text>
              )}
            </View>
          </View>
        </View>

        <SectionDivider />

        {/* Banking Details Section */}
        <View style={styles.infoCardsContainer}>
          <Text style={styles.sectionHeading}>Banking Details</Text>
          <View style={styles.infoCard}>
            <MaterialCommunityIcons name="bank" size={24} color={COLORS.primary} />
            <View style={styles.infoCardContent}>
              <Text style={styles.infoLabel}>Bank Name</Text>
              {isEditing ? (
                <TextInput
                  style={styles.editInput}
                  value={formData.bankName}
                  onChangeText={(text) => setFormData({ ...formData, bankName: text })}
                  placeholder="Bank Name"
                  placeholderTextColor={COLORS.textLight}
                />
              ) : (
                <Text style={styles.infoValue}>{formData.bankName || 'Not set'}</Text>
              )}
            </View>
          </View>

          <View style={styles.infoCard}>
            <MaterialCommunityIcons name="numeric" size={24} color={COLORS.primary} />
            <View style={styles.infoCardContent}>
              <Text style={styles.infoLabel}>Account Number</Text>
              {isEditing ? (
                <TextInput
                  style={styles.editInput}
                  value={formData.accountNumber}
                  onChangeText={(text) => setFormData({ ...formData, accountNumber: text })}
                  placeholder="Account Number"
                  keyboardType="numeric"
                  placeholderTextColor={COLORS.textLight}
                />
              ) : (
                <Text style={styles.infoValue}>{formData.accountNumber || 'Not set'}</Text>
              )}
            </View>
          </View>

          <View style={styles.infoCard}>
            <MaterialCommunityIcons name="account" size={24} color={COLORS.primary} />
            <View style={styles.infoCardContent}>
              <Text style={styles.infoLabel}>Account Holder Name</Text>
              {isEditing ? (
                <TextInput
                  style={styles.editInput}
                  value={formData.accountHolderName}
                  onChangeText={(text) => setFormData({ ...formData, accountHolderName: text })}
                  placeholder="Account Holder Name"
                  placeholderTextColor={COLORS.textLight}
                />
              ) : (
                <Text style={styles.infoValue}>{formData.accountHolderName || 'Not set'}</Text>
              )}
            </View>
          </View>

          <View style={styles.infoCard}>
            <MaterialCommunityIcons name="map-marker" size={24} color={COLORS.primary} />
            <View style={styles.infoCardContent}>
              <Text style={styles.infoLabel}>Bank Branch</Text>
              {isEditing ? (
                <TextInput
                  style={styles.editInput}
                  value={formData.bankBranch}
                  onChangeText={(text) => setFormData({ ...formData, bankBranch: text })}
                  placeholder="Bank Branch"
                  placeholderTextColor={COLORS.textLight}
                />
              ) : (
                <Text style={styles.infoValue}>{formData.bankBranch || 'Not set'}</Text>
              )}
            </View>
          </View>
        </View>

        <SectionDivider />

        {/* Edit Request Info Banner */}
        {/* Moved to bottom of page */}

        {/* Editing Mode Banner */}
        {isEditing && (
          <View style={styles.editingBanner}>
            <MaterialCommunityIcons name="pencil" size={24} color={COLORS.success} />
            <View style={styles.editInfoText}>
              <Text style={styles.editingTitle}>Editing Mode Active</Text>
              <Text style={styles.editingDescription}>
                You can now edit your profile. Changes will be saved when you tap the check icon above.
              </Text>
            </View>
          </View>
        )}

        {/* Payslips Section */}
        <TouchableWeb 
          style={styles.sectionCard}
          onPress={() => setPayslipsExpanded((prev) => !prev)}
          activeOpacity={0.7}
        >
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>My Payslips</Text>
          </View>
          
          {nursePayslips.length === 0 ? (
            <View style={styles.emptyPayslipsPreviewCentered}>
              <Text style={styles.emptyPayslipsTextCentered}>No payslips yet</Text>
              <Text style={styles.emptyPayslipsSubtextCentered}>Payslips will appear here when marked as paid by admin</Text>
            </View>
          ) : (
            <View style={styles.payslipsPreview}>
              <View style={styles.latestPayslipPreviewCard}>
                <View style={styles.latestPayslipPreviewRow}>
                  <Text style={[styles.payslipsPreviewText, { flex: 1 }]}>
                    Latest: {nursePayslips[0]?.periodStart || 'N/A'} - {nursePayslips[0]?.periodEnd || 'N/A'}
                  </Text>
                  <MaterialCommunityIcons
                    name={payslipsExpanded ? 'chevron-up' : 'chevron-down'}
                    size={22}
                    color={COLORS.textLight}
                  />
                </View>
              </View>
            </View>
          )}

          {payslipsExpanded && nursePayslips.length > 0 && (
            <View style={styles.payslipsInlineList}>
              {(() => {
                const payslip = nursePayslips[0];
                const index = 0;
                return (
                  <View
                    key={`${payslip?.id || payslip?.mongoId || payslip?.payslipNumber || payslip?.paidDate || payslip?.createdAt || 'payslip'}-${index}`}
                    style={styles.payslipCard}
                  >
                  {/* Period Section */}
                  <View style={styles.payslipPeriodSection}>
                    <Text style={styles.payslipSectionLabel}>PAY PERIOD</Text>
                    <Text style={styles.payslipPeriod}>
                      {payslip.periodStart} - {payslip.periodEnd}
                    </Text>
                    <Text style={styles.payslipDate}>
                      Payment Date: {payslip.paidDate ? (() => {
                        // Handle "Feb 19, 2026" format
                        if (typeof payslip.paidDate === 'string') {
                          const match = payslip.paidDate.match(/^([A-Za-z]{3})\s+(\d{1,2}),?\s+(\d{4})$/);
                          if (match) {
                            const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                            const monthIndex = monthNames.findIndex(m => m === match[1]);
                            if (monthIndex !== -1) {
                              const d = new Date(parseInt(match[3]), monthIndex, parseInt(match[2]));
                              if (!isNaN(d.getTime())) {
                                return d.toLocaleDateString();
                              }
                            }
                          }
                        }
                        return new Date(payslip.paidDate).toLocaleDateString();
                      })() : 'N/A'}
                    </Text>
                  </View>

                  {/* Hours Breakdown Section */}
                  <View style={styles.payslipSection}>
                    <Text style={styles.payslipSectionTitle}>Hours Breakdown</Text>
                    <View style={styles.payslipTableHeader}>
                      <Text style={[styles.payslipTableHeaderText, { flex: 2, textAlign: 'left' }]}>Type</Text>
                      <Text style={[styles.payslipTableHeaderText, { flex: 1, textAlign: 'center' }]}>Hours</Text>
                      <Text style={[styles.payslipTableHeaderText, { flex: 1.5, textAlign: 'right' }]}>Amount</Text>
                    </View>

                    <View style={styles.payslipTableRow}>
                      <Text style={[styles.payslipTableCell, { flex: 2, textAlign: 'left' }]}>Regular Hours</Text>
                      <Text style={[styles.payslipTableCell, { flex: 1, textAlign: 'center' }]}>{payslip.regularHours}</Text>
                      <Text style={[styles.payslipTableCell, { flex: 1.5, textAlign: 'right' }]}>${parseFloat(payslip.regularPay || 0).toLocaleString()}</Text>
                    </View>

                    {parseFloat(payslip.overtimeHours || 0) > 0 && (
                      <View style={styles.payslipTableRow}>
                        <Text style={[styles.payslipTableCell, { flex: 2, textAlign: 'left' }]}>Overtime Hours</Text>
                        <Text style={[styles.payslipTableCell, { flex: 1, textAlign: 'center' }]}>{payslip.overtimeHours}</Text>
                        <Text style={[styles.payslipTableCell, { flex: 1.5, textAlign: 'right' }]}>${parseFloat(payslip.overtimePay || 0).toLocaleString()}</Text>
                      </View>
                    )}

                    {parseFloat(payslip.shiftHours || 0) > 0 && (
                      <View style={styles.payslipTableRow}>
                        <Text style={[styles.payslipTableCell, { flex: 2, textAlign: 'left' }]}>Shift Hours</Text>
                        <Text style={[styles.payslipTableCell, { flex: 1, textAlign: 'center' }]}>{payslip.shiftHours}</Text>
                        <Text style={[styles.payslipTableCell, { flex: 1.5, textAlign: 'right' }]}>${parseFloat(payslip.shiftPay || 0).toLocaleString()}</Text>
                      </View>
                    )}
                  </View>

                  {/* Payment Summary Section */}
                  <View style={styles.payslipTotalSection}>
                    <View style={styles.payslipTotalRow}>
                      <Text style={styles.payslipTotalLabel}>Gross Pay:</Text>
                      <Text style={styles.payslipTotalValue}>${parseFloat(payslip.grossPay || 0).toLocaleString()}</Text>
                    </View>

                    {parseFloat(payslip.deductions || 0) > 0 && (
                      <View style={styles.payslipTotalRow}>
                        <Text style={styles.payslipTotalLabel}>Deductions:</Text>
                        <Text style={[styles.payslipTotalValue, { color: COLORS.danger }]}>-${parseFloat(payslip.deductions || 0).toLocaleString()}</Text>
                      </View>
                    )}

                    <View style={styles.payslipFinalTotalRow}>
                      <Text style={styles.payslipFinalTotalLabel}>Net Pay:</Text>
                      <Text style={styles.payslipFinalTotalValue}>${parseFloat(payslip.netPay || 0).toLocaleString()}</Text>
                    </View>
                  </View>
                  </View>
                );
              })()}
            </View>
          )}
        </TouchableWeb>

        {/* Edit Request Info Banner - Bottom */}
        {!isEditing && (
          <View style={styles.editInfoBannerBottom}>
            <MaterialCommunityIcons name="information" size={20} color={COLORS.textLight} />
            <View style={styles.editInfoTextBottom}>
              <Text style={styles.editInfoDescriptionBottom}>
                To update your profile information, tap the lock icon to request edit permission from the administrator.
              </Text>
            </View>
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
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Poppins_700Bold',
    color: COLORS.white,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 12,
  },
  editButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pendingButton: {
    backgroundColor: 'rgba(255, 152, 0, 0.9)', // Orange for pending
  },
  editButtonsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  cancelButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 77, 77, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(46, 204, 113, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editInput: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 15,
    color: COLORS.text,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.primary,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  editingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'rgba(46, 204, 113, 0.1)',
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.success,
  },
  editingTitle: {
    fontSize: 15,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.success,
    marginBottom: 4,
  },
  editingDescription: {
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.text,
    lineHeight: 18,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
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
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  defaultAvatarGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileImage: {
    width: '100%',
    height: '100%',
  },
  cameraIconContainer: {
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
    marginBottom: 12,
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
  infoCardsContainer: {
    paddingHorizontal: 20,
    gap: 12,
    marginTop: 20,
  },
  sectionDivider: {
    height: 2,
    borderRadius: 2,
    marginHorizontal: 20,
    marginVertical: 12,
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
  sectionCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    marginTop: 16,
  },
  sectionHeading: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.text,
    marginBottom: 12,
    marginTop: 8,
    marginLeft: 4,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.text,
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
  editInfoBanner: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 20,
    marginTop: 24,
    gap: 12,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  editInfoBannerBottom: {
    padding: 20,
    paddingBottom: 40,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  editInfoTextBottom: {
    flex: 1,
  },
  editInfoDescriptionBottom: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.textLight,
    opacity: 0.5,
    textAlign: 'center',
    lineHeight: 18,
  },
  editInfoDescriptionFaded: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.textLight,
    opacity: 0.6,
    textAlign: 'center',
    lineHeight: 18,
  },
  editInfoText: {
    flex: 1,
  },
  editInfoTitle: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.text,
    marginBottom: 4,
  },
  editInfoDescription: {
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.textLight,
    lineHeight: 20,
  },
  payslipsList: {
    gap: 16,
  },
  payslipsInlineList: {
    marginTop: 16,
    gap: 16,
  },
  payslipCard: {
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
  payslipCompanyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  payslipCompanyInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  payslipCompanyName: {
    fontSize: 18,
    fontFamily: 'Poppins_700Bold',
    color: COLORS.primary,
    marginLeft: 8,
  },
  payslipNumber: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.text,
  },
  payslipPeriodSection: {
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  payslipSectionLabel: {
    fontSize: 12,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.textMuted,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  payslipPeriod: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.text,
    marginBottom: 4,
  },
  payslipDate: {
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.textLight,
  },
  payslipSection: {
    marginBottom: 20,
  },
  payslipSectionTitle: {
    fontSize: 15,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.text,
    marginBottom: 12,
  },
  payslipTableHeader: {
    flexDirection: 'row',
    paddingVertical: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 6,
    marginBottom: 8,
    paddingHorizontal: 12,
  },
  payslipTableHeaderText: {
    fontSize: 11,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
  },
  payslipTableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  payslipTableCell: {
    fontSize: 13,
    fontFamily: 'Poppins_500Medium',
    color: COLORS.text,
  },
  payslipTotalSection: {
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  payslipTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  payslipTotalLabel: {
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
    color: COLORS.textLight,
  },
  payslipTotalValue: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.text,
  },
  payslipFinalTotalRow: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  payslipFinalTotalLabel: {
    fontSize: 16,
    fontFamily: 'Poppins_700Bold',
    color: COLORS.text,
  },
  payslipFinalTotalValue: {
    fontSize: 18,
    fontFamily: 'Poppins_700Bold',
    color: COLORS.success,
  },
  emptyPayslips: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyPayslipsPreview: {
    paddingVertical: 16,
  },
  emptyPayslipsPreviewCentered: {
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyPayslipsText: {
    fontSize: 15,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.textLight,
    marginTop: 12,
  },
  emptyPayslipsTextCentered: {
    fontSize: 15,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.textLight,
    marginBottom: 4,
    textAlign: 'center',
  },
  emptyPayslipsSubtext: {
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.textLight,
    marginTop: 4,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  emptyPayslipsSubtextCentered: {
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.textLight,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  payslipBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 'auto',
  },
  payslipBadge: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
    marginRight: 8,
  },
  payslipBadgeText: {
    fontSize: 12,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.white,
  },
  payslipsPreview: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    marginTop: 12,
  },
  latestPayslipPreviewCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  latestPayslipPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    paddingTop: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'Poppins_700Bold',
    color: COLORS.text,
    marginLeft: 12,
  },
  modalScroll: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  emptyPayslipsModal: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyPayslipsModalText: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.textLight,
    marginTop: 16,
  },
  emptyPayslipsModalSubtext: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.textLight,
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  bottomPadding: {
    height: 80,
  },
});