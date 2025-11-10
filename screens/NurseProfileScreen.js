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
  Modal,
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

export default function NurseProfileScreen({ navigation }) {
  const { user, updateUser } = useAuth();
  const { sendNotificationToUser } = useNotifications();
  const { nurses } = useNurses();
  const { createEditRequest, canEditProfile, revokeEditPermission } = useProfileEdit();
  const insets = useSafeAreaInsets();
  const [profilePhoto, setProfilePhoto] = useState(user?.profilePhoto || null);
  const [nurseStaffData, setNurseStaffData] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [nursePayslips, setNursePayslips] = useState([]);
  const [payslipModalVisible, setPayslipModalVisible] = useState(false);
  const [formData, setFormData] = useState({
    username: user?.username || '',
    email: user?.email || '',
    phone: user?.phone || '',
    specialization: user?.specialization || '',
    nurseCode: user?.nurseCode || '',
    experience: user?.experience || '',
    qualification: user?.qualification || '',
    address: user?.address || '',
    emergencyContact: user?.emergencyContact || '',
    emergencyPhone: user?.emergencyPhone || '',
  });

  // Load payslips for this nurse
  useEffect(() => {
    const loadPayslips = async () => {
      try {
        const payslipsJson = await AsyncStorage.getItem('nursePayslips');
        if (payslipsJson && user?.id) {
          const allPayslips = JSON.parse(payslipsJson);
          const myPayslips = allPayslips[user.id] || [];
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
        console.log('👨‍⚕️ Found staff record:', staffRecord);
        setNurseStaffData(staffRecord);
        // Update form data with staff record
        setFormData({
          username: staffRecord.name || user?.username || '',
          email: staffRecord.email || user?.email || '',
          phone: staffRecord.phone || user?.phone || '',
          specialization: staffRecord.specialization || user?.specialization || '',
          nurseCode: staffRecord.code || user?.nurseCode || '',
          experience: user?.experience || '',
          qualification: user?.qualification || '',
          address: user?.address || '',
          emergencyContact: user?.emergencyContact || '',
          emergencyPhone: user?.emergencyPhone || '',
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
              Alert.alert('Error', 'Failed to send request. Please try again.');
            }
          }
        }
      ]
    );
  };

  // Check if editing is allowed
  useEffect(() => {
    if (user?.id) {
      const canEdit = canEditProfile(user.id);
      setIsEditing(canEdit);
    }
  }, [user]);

  const handleSave = async () => {
    try {
      // Save the profile updates including photo
      const updatedData = { ...formData, profilePhoto };
      await updateUser(updatedData);
      
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
      username: user?.username || '',
      email: user?.email || '',
      phone: user?.phone || '',
      specialization: user?.specialization || '',
      nurseCode: user?.nurseCode || '',
      experience: user?.experience || '',
      qualification: user?.qualification || '',
      address: user?.address || '',
      emergencyContact: user?.emergencyContact || '',
      emergencyPhone: user?.emergencyPhone || '',
    });
    // Reset profile photo to original
    setProfilePhoto(user?.profilePhoto || null);
  };

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
          <Text style={styles.headerTitle}>Nurse Profile</Text>
          {!isEditing ? (
            <TouchableWeb
              style={styles.editButton}
              onPress={handleRequestEditPermission}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons 
                name="lock-alert" 
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
                  end={{ x: 1, y: 1 }}
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
          
          <Text style={styles.adminName}>{formData.username}</Text>
          <Text style={styles.adminRole}>{formData.specialization || 'Registered Nurse'}</Text>
          <LinearGradient
            colors={GRADIENTS.primary}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.adminBadge}
          >
            <MaterialCommunityIcons name="badge-account" size={16} color={COLORS.white} />
            <Text style={styles.adminBadgeText}>ID: {formData.nurseCode}</Text>
          </LinearGradient>
          
          {/* Staff Status Badge */}
          {nurseStaffData && (
            <View style={styles.staffInfoBadge}>
              <MaterialCommunityIcons 
                name={nurseStaffData.isActive ? "check-circle" : "alert-circle"} 
                size={16} 
                color={nurseStaffData.isActive ? COLORS.success : COLORS.error} 
              />
              <Text style={[
                styles.staffStatusText,
                { color: nurseStaffData.isActive ? COLORS.success : COLORS.error }
              ]}>
                {nurseStaffData.isActive ? 'Active Staff' : 'Inactive'}
              </Text>
              <Text style={styles.staffDateText}>
                Added: {nurseStaffData.dateAdded}
              </Text>
            </View>
          )}
        </View>

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

          <View style={styles.infoCard}>
            <MaterialCommunityIcons name="school" size={24} color={COLORS.primary} />
            <View style={styles.infoCardContent}>
              <Text style={styles.infoLabel}>Qualification</Text>
              {isEditing ? (
                <TextInput
                  style={styles.editInput}
                  value={formData.qualification}
                  onChangeText={(text) => setFormData({ ...formData, qualification: text })}
                  placeholder="Qualification"
                  placeholderTextColor={COLORS.textLight}
                />
              ) : (
                <Text style={styles.infoValue}>{formData.qualification || 'Not set'}</Text>
              )}
            </View>
          </View>

          <View style={styles.infoCard}>
            <MaterialCommunityIcons name="calendar-clock" size={24} color={COLORS.primary} />
            <View style={styles.infoCardContent}>
              <Text style={styles.infoLabel}>Experience</Text>
              {isEditing ? (
                <TextInput
                  style={styles.editInput}
                  value={formData.experience}
                  onChangeText={(text) => setFormData({ ...formData, experience: text })}
                  placeholder="Years of Experience"
                  placeholderTextColor={COLORS.textLight}
                />
              ) : (
                <Text style={styles.infoValue}>{formData.experience || 'Not set'}</Text>
              )}
            </View>
          </View>

          <View style={styles.infoCard}>
            <MaterialCommunityIcons name="map-marker-outline" size={24} color={COLORS.primary} />
            <View style={styles.infoCardContent}>
              <Text style={styles.infoLabel}>Address</Text>
              {isEditing ? (
                <TextInput
                  style={styles.editInput}
                  value={formData.address}
                  onChangeText={(text) => setFormData({ ...formData, address: text })}
                  placeholder="Address"
                  placeholderTextColor={COLORS.textLight}
                />
              ) : (
                <Text style={styles.infoValue}>{formData.address || 'Not set'}</Text>
              )}
            </View>
          </View>

          <View style={styles.infoCard}>
            <MaterialCommunityIcons name="account-heart" size={24} color={COLORS.primary} />
            <View style={styles.infoCardContent}>
              <Text style={styles.infoLabel}>Emergency Contact</Text>
              {isEditing ? (
                <TextInput
                  style={styles.editInput}
                  value={formData.emergencyContact}
                  onChangeText={(text) => setFormData({ ...formData, emergencyContact: text })}
                  placeholder="Emergency Contact Name"
                  placeholderTextColor={COLORS.textLight}
                />
              ) : (
                <Text style={styles.infoValue}>{formData.emergencyContact || 'Not set'}</Text>
              )}
            </View>
          </View>

          <View style={styles.infoCard}>
            <MaterialCommunityIcons name="phone-alert" size={24} color={COLORS.primary} />
            <View style={styles.infoCardContent}>
              <Text style={styles.infoLabel}>Emergency Phone</Text>
              {isEditing ? (
                <TextInput
                  style={styles.editInput}
                  value={formData.emergencyPhone}
                  onChangeText={(text) => setFormData({ ...formData, emergencyPhone: text })}
                  placeholder="Emergency Phone Number"
                  keyboardType="phone-pad"
                  placeholderTextColor={COLORS.textLight}
                />
              ) : (
                <Text style={styles.infoValue}>{formData.emergencyPhone || 'Not set'}</Text>
              )}
            </View>
          </View>
        </View>

        {/* Edit Request Info Banner */}
        {!isEditing && (
          <View style={styles.editInfoBanner}>
            <MaterialCommunityIcons name="information" size={24} color={COLORS.primary} />
            <View style={styles.editInfoText}>
              <Text style={styles.editInfoTitle}>Profile Editing</Text>
              <Text style={styles.editInfoDescription}>
                To update your profile information, tap the lock icon above to request edit permission from the administrator.
              </Text>
            </View>
          </View>
        )}

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
          onPress={() => setPayslipModalVisible(true)}
          activeOpacity={0.7}
        >
          <View style={styles.sectionHeaderRow}>
            <MaterialCommunityIcons name="receipt-text" size={24} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>My Payslips</Text>
            <View style={styles.payslipBadgeContainer}>
              {nursePayslips.length > 0 && (
                <View style={styles.payslipBadge}>
                  <Text style={styles.payslipBadgeText}>{nursePayslips.length}</Text>
                </View>
              )}
              <MaterialCommunityIcons name="chevron-down" size={24} color={COLORS.textLight} />
            </View>
          </View>
          
          {nursePayslips.length === 0 ? (
            <View style={styles.emptyPayslipsPreview}>
              <Text style={styles.emptyPayslipsText}>No payslips yet</Text>
              <Text style={styles.emptyPayslipsSubtext}>Payslips will appear here when marked as paid by admin</Text>
            </View>
          ) : (
            <View style={styles.payslipsPreview}>
              <Text style={styles.payslipsPreviewText}>
                Latest: {nursePayslips[0]?.periodStart} - {nursePayslips[0]?.periodEnd}
              </Text>
              <Text style={styles.payslipsPreviewAmount}>
                J${parseFloat(nursePayslips[0]?.netPay || 0).toLocaleString()}
              </Text>
            </View>
          )}
        </TouchableWeb>

        <View style={styles.bottomPadding} />
      </ScrollView>
      </KeyboardAvoidingView>

      {/* Payslip Modal */}
      <Modal
        visible={payslipModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setPayslipModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <MaterialCommunityIcons name="receipt-text" size={24} color={COLORS.primary} />
                <Text style={styles.modalTitle}>My Payslips</Text>
              </View>
              <TouchableWeb 
                onPress={() => setPayslipModalVisible(false)}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons name="close" size={24} color={COLORS.textLight} />
              </TouchableWeb>
            </View>

            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              {nursePayslips.length === 0 ? (
                <View style={styles.emptyPayslipsModal}>
                  <MaterialCommunityIcons name="receipt" size={64} color={COLORS.border} />
                  <Text style={styles.emptyPayslipsModalText}>No payslips yet</Text>
                  <Text style={styles.emptyPayslipsModalSubtext}>
                    Payslips will appear here when marked as paid by admin
                  </Text>
                </View>
              ) : (
                <View style={styles.payslipsList}>
                  {nursePayslips.map((payslip, index) => (
                    <View key={index} style={styles.payslipItem}>
                      <View style={styles.payslipHeader}>
                        <View style={styles.payslipInfo}>
                          <Text style={styles.payslipPeriod}>
                            {payslip.periodStart} - {payslip.periodEnd}
                          </Text>
                          <Text style={styles.payslipDate}>
                            Paid: {new Date(payslip.paidDate).toLocaleDateString()}
                          </Text>
                        </View>
                        <View style={styles.payslipAmount}>
                          <Text style={styles.payslipAmountLabel}>Net Pay</Text>
                          <Text style={styles.payslipAmountValue}>
                            J${parseFloat(payslip.netPay).toLocaleString()}
                          </Text>
                        </View>
                      </View>
                      
                      <View style={styles.payslipDetails}>
                        <View style={styles.payslipDetailRow}>
                          <Text style={styles.payslipDetailLabel}>Regular Hours:</Text>
                          <Text style={styles.payslipDetailValue}>{payslip.regularHours} hrs</Text>
                        </View>
                        {parseFloat(payslip.overtimeHours || 0) > 0 && (
                          <View style={styles.payslipDetailRow}>
                            <Text style={styles.payslipDetailLabel}>Overtime:</Text>
                            <Text style={styles.payslipDetailValue}>{payslip.overtimeHours} hrs</Text>
                          </View>
                        )}
                        {parseFloat(payslip.shiftHours || 0) > 0 && (
                          <View style={styles.payslipDetailRow}>
                            <Text style={styles.payslipDetailLabel}>Shift Hours:</Text>
                            <Text style={styles.payslipDetailValue}>{payslip.shiftHours} hrs</Text>
                          </View>
                        )}
                        <View style={styles.payslipDetailRow}>
                          <Text style={styles.payslipDetailLabel}>Gross Pay:</Text>
                          <Text style={styles.payslipDetailValue}>
                            J${parseFloat(payslip.grossPay).toLocaleString()}
                          </Text>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
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
  staffInfoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
  },
  staffStatusText: {
    fontSize: 13,
    fontFamily: 'Poppins_600SemiBold',
  },
  staffDateText: {
    fontSize: 11,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.textLight,
    marginLeft: 4,
  },
  infoCardsContainer: {
    paddingHorizontal: 20,
    gap: 12,
    marginTop: 20,
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
    gap: 12,
  },
  payslipItem: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  payslipHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  payslipInfo: {
    flex: 1,
  },
  payslipPeriod: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.text,
    marginBottom: 4,
  },
  payslipDate: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.textLight,
  },
  payslipAmount: {
    alignItems: 'flex-end',
  },
  payslipAmountLabel: {
    fontSize: 11,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.textLight,
    marginBottom: 2,
  },
  payslipAmountValue: {
    fontSize: 18,
    fontFamily: 'Poppins_700Bold',
    color: COLORS.success,
  },
  payslipDetails: {
    gap: 8,
  },
  payslipDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  payslipDetailLabel: {
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.textLight,
  },
  payslipDetailValue: {
    fontSize: 13,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.text,
  },
  emptyPayslips: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyPayslipsPreview: {
    paddingVertical: 16,
  },
  emptyPayslipsText: {
    fontSize: 15,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.textLight,
    marginTop: 12,
  },
  emptyPayslipsSubtext: {
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.textLight,
    marginTop: 4,
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
  payslipsPreviewText: {
    fontSize: 13,
    fontFamily: 'Poppins_500Medium',
    color: COLORS.text,
    marginBottom: 4,
  },
  payslipsPreviewAmount: {
    fontSize: 18,
    fontFamily: 'Poppins_700Bold',
    color: COLORS.success,
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