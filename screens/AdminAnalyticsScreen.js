import TouchableWeb from "../components/TouchableWeb";
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Modal, Alert, Animated, PanResponder, KeyboardAvoidingView, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, GRADIENTS, SPACING } from '../constants';
import { useAuth } from '../context/AuthContext';
import { useNurses } from '../context/NurseContext';

export default function AdminAnalyticsScreen({ navigation }) {
  const { createNurseAccount } = useAuth();
  const { nurses, addNurse, updateNurseStatus, deleteNurse, getNursesByStatus } = useNurses();
  const insets = useSafeAreaInsets();
  const [selectedCard, setSelectedCard] = useState(null);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [createNurseModalVisible, setCreateNurseModalVisible] = useState(false);
  const [nurseDetailsModalVisible, setNurseDetailsModalVisible] = useState(false);
  const [nurseToDelete, setNurseToDelete] = useState(null);
  const [selectedNurseDetails, setSelectedNurseDetails] = useState(null);
  const [nurseName, setNurseName] = useState('');
  const [nurseEmail, setNurseEmail] = useState('');
  const [nursePhone, setNursePhone] = useState('');
  const [nurseSpecialization, setNurseSpecialization] = useState('');
  const [nurseCode, setNurseCode] = useState('');
  const [nurseEmergencyContact, setNurseEmergencyContact] = useState('');
  const [nurseEmergencyPhone, setNurseEmergencyPhone] = useState('');

  const handleCardPress = (cardType) => {
    if (selectedCard === cardType) {
      // If same card is pressed, deselect and show all
      setSelectedCard(null);
    } else {
      // Select new card to filter nurses
      setSelectedCard(cardType);
    }
  };

  // Get nurses to display based on selection
  const getDisplayedNurses = () => {
    switch (selectedCard) {
      case 'available':
        return nurses.filter(nurse => nurse.status === 'available' && nurse.isActive === true);
      case 'offline':
        return nurses.filter(nurse => nurse.isActive === false);
      case 'total':
      default:
        return nurses;
    }
  };

  const handleDeleteNurse = (nurse) => {
    setNurseToDelete(nurse);
    setDeleteModalVisible(true);
  };

  const confirmDelete = () => {
    deleteNurse(nurseToDelete.id);
    setDeleteModalVisible(false);
    setNurseToDelete(null);
    Alert.alert('Success', `${nurseToDelete?.name} has been removed from the staff.`);
  };

  const handleCreateNurse = async () => {
    if (!nurseName || !nurseEmail || !nursePhone || !nurseSpecialization || !nurseCode || !nurseEmergencyContact || !nurseEmergencyPhone) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    // Validate that staff code starts with ADMIN or NURSE
    const upperCode = nurseCode.toUpperCase();
    if (!upperCode.startsWith('ADMIN') && !upperCode.startsWith('NURSE')) {
      Alert.alert('Error', 'Staff code must start with ADMIN or NURSE (e.g., ADMIN002 or NURSE001)');
      return;
    }

    // Create staff account in the system
    const nurseData = {
      name: nurseName,
      email: nurseEmail,
      phone: nursePhone,
      specialization: nurseSpecialization,
      nurseCode: upperCode,
      emergencyContact: nurseEmergencyContact,
      emergencyPhone: nurseEmergencyPhone,
    };

    // Add to local nurse context
    const result = addNurse(nurseData);
    
    // Also create account in auth system
    await createNurseAccount(nurseData);

    if (result.success) {
      Alert.alert(
        'Nurse Account Created',
        `${nurseName} has been created with:\n\nUsername: ${nurseCode.toUpperCase()}\nTemporary Password: temp123\n\nShare these credentials with the nurse for first login. They should change the password after logging in.`,
        [
          {
            text: 'OK',
            onPress: () => {
              setCreateNurseModalVisible(false);
              setNurseName('');
              setNurseEmail('');
              setNursePhone('');
              setNurseSpecialization('');
              setNurseCode('');
              setNurseEmergencyContact('');
              setNurseEmergencyPhone('');
            },
          },
        ]
      );
    } else {
      Alert.alert('Error', result.error);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <LinearGradient
        colors={GRADIENTS.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 20 }]}
      >
        <View style={styles.headerRow}>
          <View style={styles.headerLeft} />
          <Text style={styles.welcomeText}>Staff Management</Text>
          <TouchableWeb 
            style={styles.iconButton}
            onPress={() => setCreateNurseModalVisible(true)}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="plus" size={28} color={COLORS.white} />
          </TouchableWeb>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <TouchableWeb 
            style={styles.statCard}
            onPress={() => handleCardPress('total')}
            activeOpacity={0.8}
          >
            {selectedCard === 'total' ? (
              <LinearGradient
                colors={GRADIENTS.header}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.statGradient}
              >
                <Text style={styles.statLabel}>Total Staff</Text>
              </LinearGradient>
            ) : (
              <View style={styles.inactiveStatCard}>
                <Text style={styles.inactiveStatLabel}>Total Staff</Text>
              </View>
            )}
          </TouchableWeb>
          
          <TouchableWeb 
            style={styles.statCard}
            onPress={() => handleCardPress('available')}
            activeOpacity={0.8}
          >
            {selectedCard === 'available' ? (
              <LinearGradient
                colors={GRADIENTS.header}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.statGradient}
              >
                <Text style={styles.statLabel}>Available</Text>
              </LinearGradient>
            ) : (
              <View style={styles.inactiveStatCard}>
                <Text style={styles.inactiveStatLabel}>Available</Text>
              </View>
            )}
          </TouchableWeb>
          
          <TouchableWeb 
            style={styles.statCard}
            onPress={() => handleCardPress('offline')}
            activeOpacity={0.8}
          >
            {selectedCard === 'offline' ? (
              <LinearGradient
                colors={GRADIENTS.header}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.statGradient}
              >
                <Text style={styles.statLabel}>Offline</Text>
              </LinearGradient>
            ) : (
              <View style={styles.inactiveStatCard}>
                <Text style={styles.inactiveStatLabel}>Offline</Text>
              </View>
            )}
          </TouchableWeb>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {selectedCard ? 
              `${selectedCard.charAt(0).toUpperCase() + selectedCard.slice(1)} Staff Members` :
              'All Staff Members'
            }
          </Text>
          {getDisplayedNurses().map((nurse) => (
            <View key={nurse.id} style={styles.compactCard}>
              <TouchableWeb
                onLongPress={() => {
                  setNurseToDelete(nurse);
                  setDeleteModalVisible(true);
                }}
                delayLongPress={500}
                activeOpacity={0.7}
              >
                <View style={styles.compactHeader}>
                  <MaterialCommunityIcons 
                    name="account-heart" 
                    size={20} 
                    color={nurse.status === 'available' ? COLORS.success : COLORS.warning} 
                  />
                  <View style={styles.compactInfo}>
                    <Text style={styles.compactClient}>{nurse.name}</Text>
                  </View>
                  <TouchableWeb
                    style={styles.detailsButton}
                    onPress={() => {
                      setSelectedNurseDetails(nurse);
                      setNurseDetailsModalVisible(true);
                    }}
                    activeOpacity={0.7}
                  >
                    <LinearGradient
                      colors={GRADIENTS.header}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.detailsButtonGradient}
                    >
                      <Text style={styles.detailsButtonText}>Details</Text>
                    </LinearGradient>
                  </TouchableWeb>
                </View>
              </TouchableWeb>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Delete Confirmation Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={deleteModalVisible}
        onRequestClose={() => setDeleteModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.deleteModal}>
            <MaterialCommunityIcons name="alert-circle" size={48} color={COLORS.error} />
            <Text style={styles.deleteTitle}>Remove Staff Member</Text>
            <Text style={styles.deleteMessage}>
              Are you sure you want to remove {nurseToDelete?.name} from your staff? This action cannot be undone.
            </Text>
            <View style={styles.deleteActions}>
              <TouchableWeb 
                style={styles.cancelButton}
                onPress={() => setDeleteModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableWeb>
              <TouchableWeb 
                style={styles.confirmButton}
                onPress={confirmDelete}
              >
                <Text style={styles.confirmButtonText}>Remove</Text>
              </TouchableWeb>
            </View>
          </View>
        </View>
      </Modal>

      {/* Nurse Details Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={nurseDetailsModalVisible}
        onRequestClose={() => setNurseDetailsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.detailsModalContent}>
            <View style={styles.detailsModalHeader}>
              <Text style={styles.detailsModalTitle}>Staff Member Details</Text>
              <TouchableWeb
                style={styles.closeButton}
                onPress={() => setNurseDetailsModalVisible(false)}
              >
                <MaterialCommunityIcons name="close" size={24} color={COLORS.text} />
              </TouchableWeb>
            </View>

            <ScrollView style={styles.detailsModalBody} showsVerticalScrollIndicator={false}>
              <View style={styles.detailsSection}>
                <View style={styles.detailItem}>
                  <MaterialCommunityIcons name="account" size={20} color={COLORS.primary} />
                  <View style={styles.detailContent}>
                    <Text style={styles.detailLabel}>Full Name</Text>
                    <Text style={styles.detailValue}>{selectedNurseDetails?.name}</Text>
                  </View>
                </View>

                <View style={styles.detailItem}>
                  <MaterialCommunityIcons name="email" size={20} color={COLORS.primary} />
                  <View style={styles.detailContent}>
                    <Text style={styles.detailLabel}>Email</Text>
                    <Text style={styles.detailValue}>{selectedNurseDetails?.email}</Text>
                  </View>
                </View>

                <View style={styles.detailItem}>
                  <MaterialCommunityIcons name="phone" size={20} color={COLORS.primary} />
                  <View style={styles.detailContent}>
                    <Text style={styles.detailLabel}>Phone</Text>
                    <Text style={styles.detailValue}>{selectedNurseDetails?.phone}</Text>
                  </View>
                </View>

                <View style={styles.detailItem}>
                  <MaterialCommunityIcons name="medical-bag" size={20} color={COLORS.primary} />
                  <View style={styles.detailContent}>
                    <Text style={styles.detailLabel}>Specialization</Text>
                    <Text style={styles.detailValue}>{selectedNurseDetails?.specialization}</Text>
                  </View>
                </View>

                <View style={styles.detailItem}>
                  <MaterialCommunityIcons name="badge-account" size={20} color={COLORS.primary} />
                  <View style={styles.detailContent}>
                    <Text style={styles.detailLabel}>Staff Code</Text>
                    <Text style={styles.detailValue}>{selectedNurseDetails?.code}</Text>
                  </View>
                </View>

                <View style={styles.detailItem}>
                  <MaterialCommunityIcons name="calendar-plus" size={20} color={COLORS.primary} />
                  <View style={styles.detailContent}>
                    <Text style={styles.detailLabel}>Date Added</Text>
                    <Text style={styles.detailValue}>{selectedNurseDetails?.dateAdded}</Text>
                  </View>
                </View>

                <View style={styles.detailItem}>
                  <MaterialCommunityIcons name="account-group" size={20} color={COLORS.primary} />
                  <View style={styles.detailContent}>
                    <Text style={styles.detailLabel}>Clients Assigned</Text>
                    <Text style={styles.detailValue}>{selectedNurseDetails?.assignedClients || 0}</Text>
                  </View>
                </View>

                <View style={styles.detailItem}>
                  <MaterialCommunityIcons name="account-heart" size={20} color={COLORS.primary} />
                  <View style={styles.detailContent}>
                    <Text style={styles.detailLabel}>Emergency Contact Name</Text>
                    <Text style={styles.detailValue}>{selectedNurseDetails?.emergencyContact || 'Not provided'}</Text>
                  </View>
                </View>

                <View style={styles.detailItem}>
                  <MaterialCommunityIcons name="phone-alert" size={20} color={COLORS.primary} />
                  <View style={styles.detailContent}>
                    <Text style={styles.detailLabel}>Emergency Contact Phone</Text>
                    <Text style={styles.detailValue}>{selectedNurseDetails?.emergencyPhone || 'Not provided'}</Text>
                  </View>
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Create Nurse Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={createNurseModalVisible}
        onRequestClose={() => setCreateNurseModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add New Staff Member</Text>
              <TouchableWeb onPress={() => setCreateNurseModalVisible(false)}>
                <MaterialCommunityIcons name="close" size={24} color={COLORS.text} />
              </TouchableWeb>
            </View>
            <ScrollView 
              style={styles.createNurseForm}
              contentContainerStyle={styles.createNurseFormContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.formLabel}>Full Name</Text>
              <View style={styles.formInput}>
                <MaterialCommunityIcons name="account" size={20} color={COLORS.textLight} />
                <TextInput
                  style={styles.input}
                  placeholder="e.g., Sarah Johnson, RN"
                  placeholderTextColor={COLORS.textLight}
                  value={nurseName}
                  onChangeText={setNurseName}
                />
              </View>

              <Text style={styles.formLabel}>Email</Text>
              <View style={styles.formInput}>
                <MaterialCommunityIcons name="email" size={20} color={COLORS.textLight} />
                <TextInput
                  style={styles.input}
                  placeholder="nurse@care.com"
                  placeholderTextColor={COLORS.textLight}
                  value={nurseEmail}
                  onChangeText={setNurseEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <Text style={styles.formLabel}>Phone Number</Text>
              <View style={styles.formInput}>
                <MaterialCommunityIcons name="phone" size={20} color={COLORS.textLight} />
                <TextInput
                  style={styles.input}
                  placeholder="876-555-0123"
                  placeholderTextColor={COLORS.textLight}
                  value={nursePhone}
                  onChangeText={setNursePhone}
                  keyboardType="phone-pad"
                />
              </View>

              <Text style={styles.formLabel}>Specialization</Text>
              <View style={styles.formInput}>
                <MaterialCommunityIcons name="medical-bag" size={20} color={COLORS.textLight} />
                <TextInput
                  style={styles.input}
                  placeholder="e.g., Home Care, Physiotherapy"
                  placeholderTextColor={COLORS.textLight}
                  value={nurseSpecialization}
                  onChangeText={setNurseSpecialization}
                />
              </View>

              <Text style={styles.formLabel}>Staff Code</Text>
              <View style={styles.formInput}>
                <MaterialCommunityIcons name="key-variant" size={20} color={COLORS.textLight} />
                <TextInput
                  style={styles.input}
                  placeholder="e.g., NURSE001 or ADMIN001"
                  placeholderTextColor={COLORS.textLight}
                  value={nurseCode}
                  onChangeText={setNurseCode}
                  autoCapitalize="characters"
                />
              </View>

              <Text style={styles.formLabel}>Emergency Contact Name</Text>
              <View style={styles.formInput}>
                <MaterialCommunityIcons name="account-alert" size={20} color={COLORS.textLight} />
                <TextInput
                  style={styles.input}
                  placeholder="Emergency contact full name"
                  placeholderTextColor={COLORS.textLight}
                  value={nurseEmergencyContact}
                  onChangeText={setNurseEmergencyContact}
                />
              </View>

              <Text style={styles.formLabel}>Emergency Contact Phone</Text>
              <View style={styles.formInput}>
                <MaterialCommunityIcons name="phone-alert" size={20} color={COLORS.textLight} />
                <TextInput
                  style={styles.input}
                  placeholder="876-555-0000"
                  placeholderTextColor={COLORS.textLight}
                  value={nurseEmergencyPhone}
                  onChangeText={setNurseEmergencyPhone}
                  keyboardType="phone-pad"
                />
              </View>
            </ScrollView>
            
            <View style={styles.modalFooter}>
              <TouchableWeb
                style={styles.modalCancelButton}
                onPress={() => setCreateNurseModalVisible(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableWeb>
              <TouchableWeb
                style={styles.createButton}
                onPress={handleCreateNurse}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={GRADIENTS.header}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.createButtonGradient}
                >
                  <MaterialCommunityIcons name="account-plus" size={20} color={COLORS.white} />
                  <Text style={styles.createButtonText}>Add Staff</Text>
                </LinearGradient>
              </TouchableWeb>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { paddingHorizontal: 20, paddingBottom: 20, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerLeft: { width: 44 }, // Same width as iconButton to balance
  welcomeText: { fontSize: 18, fontFamily: 'Poppins_700Bold', color: COLORS.white, flex: 1, textAlign: 'center' },
  iconButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255, 255, 255, 0.2)', justifyContent: 'center', alignItems: 'center', position: 'relative' },
  notificationBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: COLORS.error,
    borderRadius: 12,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  notificationBadgeText: {
    fontSize: 10,
    fontFamily: 'Poppins_700Bold',
    color: COLORS.white,
  },
  content: { flex: 1 },
  statsContainer: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 20,
    marginTop: 16,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
  },
  statGradient: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 36,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  inactiveStatCard: {
    backgroundColor: COLORS.white,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 36,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  statLabel: {
    fontSize: 11,
    fontFamily: 'Poppins_700Bold',
    color: COLORS.white,
    textAlign: 'center',
  },
  inactiveStatLabel: {
    fontSize: 11,
    fontFamily: 'Poppins_700Bold',
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  section: { 
    padding: 20,
    alignSelf: 'center',
    width: '100%',
    maxWidth: 450,
  },
  sectionTitle: { fontSize: 18, fontFamily: 'Poppins_600SemiBold', color: COLORS.text, marginBottom: 12 },
  card: { backgroundColor: COLORS.white, borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 3 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  cardTitle: { fontSize: 15, fontFamily: 'Poppins_600SemiBold', color: COLORS.text },
  titleWithBadge: { flex: 1 },
  cardSubtitle: { fontSize: 12, fontFamily: 'Poppins_400Regular', color: COLORS.textLight, marginTop: 2 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 36,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  statusText: {
    fontSize: 12,
    fontFamily: 'Poppins_700Bold',
    color: COLORS.white,
    textAlign: 'center',
  },
  deleteButton: { padding: 6, borderRadius: 8, backgroundColor: 'rgba(244, 67, 54, 0.1)' },
  cardDetails: { gap: 8 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  detailText: { fontSize: 13, fontFamily: 'Poppins_400Regular', color: COLORS.text, flex: 1 },
  clientInfo: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: COLORS.border },
  clientCount: { fontSize: 13, fontFamily: 'Poppins_500Medium', color: COLORS.primary },
  
  // Compact Card Styles (matching dashboard completed appointments)
  compactCard: {
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
  compactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  compactInfo: {
    flex: 1,
    marginLeft: 8,
  },
  compactClient: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.text,
  },
  compactService: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.textLight,
  },
  compactMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  compactDate: {
    fontSize: 11,
    fontFamily: 'Poppins_500Medium',
    color: COLORS.textLight,
  },
  detailsButton: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  detailsButtonGradient: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailsButtonText: {
    fontSize: 11,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.white,
  },
  
  // Details Modal Styles
  detailsModalContent: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    width: '100%',
    maxWidth: 380,
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  detailsModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  detailsModalTitle: {
    fontSize: 20,
    fontFamily: 'Poppins_700Bold',
    color: COLORS.text,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.lightGray,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailsModalBody: {
    padding: 20,
  },
  detailsSection: {
    gap: 16,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    fontFamily: 'Poppins_500Medium',
    color: COLORS.textLight,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.text,
  },
  
  modalOverlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0, 0, 0, 0.5)', 
    justifyContent: 'center', 
    alignItems: 'center',
    padding: 20,
  },
  deleteModal: { backgroundColor: COLORS.white, borderRadius: 20, padding: 24, margin: 20, alignItems: 'center', maxWidth: 320 },
  deleteTitle: { fontSize: 18, fontFamily: 'Poppins_600SemiBold', color: COLORS.text, marginTop: 16, marginBottom: 8 },
  deleteMessage: { fontSize: 14, fontFamily: 'Poppins_400Regular', color: COLORS.textLight, textAlign: 'center', marginBottom: 24 },
  deleteActions: { flexDirection: 'row', gap: 12 },
  cancelButton: { flex: 1, paddingVertical: 12, paddingHorizontal: 20, borderRadius: 12, backgroundColor: COLORS.background },
  cancelButtonText: { fontSize: 14, fontFamily: 'Poppins_600SemiBold', color: COLORS.text, textAlign: 'center' },
  confirmButton: { flex: 1, paddingVertical: 12, paddingHorizontal: 20, borderRadius: 12, backgroundColor: COLORS.error },
  confirmButtonText: { fontSize: 14, fontFamily: 'Poppins_600SemiBold', color: COLORS.white, textAlign: 'center' },
  modalContent: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    width: '100%',
    maxWidth: 380,
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
    overflow: 'hidden',
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
    fontSize: 20,
    fontFamily: 'Poppins_700Bold',
    color: COLORS.text,
  },
  createNurseForm: {
    maxHeight: '85%',
  },
  createNurseFormContent: {
    padding: 20,
    paddingBottom: 20,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: COLORS.lightGray,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelButtonText: {
    color: COLORS.textLight,
    fontSize: 15,
    fontFamily: 'Poppins_600SemiBold',
  },
  formLabel: {
    fontSize: 13,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.text,
    marginBottom: 8,
    marginTop: 12,
  },
  formInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.text,
  },
  codeContainer: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  codeDisplay: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 10,
  },
  codeText: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.primary,
    flex: 1,
  },
  generateButton: {
    borderRadius: 12,
    overflow: 'hidden',
    minWidth: 100,
  },
  generateButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    gap: 6,
  },
  generateButtonText: {
    fontSize: 13,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.white,
  },
  createButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  createButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  createButtonText: {
    fontSize: 15,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.white,
  },
});
