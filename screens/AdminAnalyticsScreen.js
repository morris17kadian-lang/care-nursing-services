import TouchableWeb from "../components/TouchableWeb";
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Modal, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, GRADIENTS, SPACING } from '../constants';
import { useAuth } from '../context/AuthContext';

export default function AdminAnalyticsScreen({ navigation }) {
  const { createNurseAccount } = useAuth();
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [createNurseModalVisible, setCreateNurseModalVisible] = useState(false);
  const [nurseToDelete, setNurseToDelete] = useState(null);
  const [nurseName, setNurseName] = useState('');
  const [nurseEmail, setNurseEmail] = useState('');
  const [nursePhone, setNursePhone] = useState('');
  const [nurseSpecialization, setNurseSpecialization] = useState('');
  const [nurseCode, setNurseCode] = useState('');

  // Sample nurses data - in real app, this would come from a database
  const nurses = [
    {
      id: '1',
      name: 'Sarah Johnson, RN',
      email: 'sarah.j@care.com',
      phone: '876-555-0101',
      specialization: 'Home Care',
      assignedClients: 5,
      status: 'available',
      code: 'NURSE123456',
      dateAdded: 'Oct 15, 2025'
    },
    {
      id: '2',
      name: 'Michael Chen, PT',
      email: 'michael.c@care.com',
      phone: '876-555-0102',
      specialization: 'Physiotherapy',
      assignedClients: 3,
      status: 'available',
      code: 'NURSE234567',
      dateAdded: 'Oct 18, 2025'
    },
    {
      id: '3',
      name: 'Emily Davis, RN',
      email: 'emily.d@care.com',
      phone: '876-555-0103',
      specialization: 'Clinical',
      assignedClients: 4,
      status: 'busy',
      code: 'NURSE345678',
      dateAdded: 'Oct 20, 2025'
    },
    {
      id: '4',
      name: 'James Rodriguez, CNA',
      email: 'james.r@care.com',
      phone: '876-555-0104',
      specialization: 'Patient Care',
      assignedClients: 2,
      status: 'available',
      code: 'NURSE456789',
      dateAdded: 'Oct 21, 2025'
    },
    {
      id: '5',
      name: 'Lisa Thompson, RN',
      email: 'lisa.t@care.com',
      phone: '876-555-0105',
      specialization: 'Wound Care',
      assignedClients: 6,
      status: 'available',
      code: 'NURSE567890',
      dateAdded: 'Oct 22, 2025'
    }
  ];

  const handleDeleteNurse = (nurse) => {
    setNurseToDelete(nurse);
    setDeleteModalVisible(true);
  };

  const confirmDelete = () => {
    // In real app, this would delete from database
    console.log('Deleting nurse:', nurseToDelete);
    setDeleteModalVisible(false);
    setNurseToDelete(null);
    Alert.alert('Success', `${nurseToDelete?.name} has been removed from the staff.`);
  };

  const generateNurseCode = () => {
    // Generate a unique 6-digit code
    const code = 'NURSE' + Math.floor(100000 + Math.random() * 900000);
    setNurseCode(code);
  };

  const handleCreateNurse = async () => {
    if (!nurseName || !nurseEmail || !nursePhone || !nurseSpecialization) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (!nurseCode) {
      Alert.alert('Error', 'Please generate a nurse code');
      return;
    }

    // Create nurse account in the system
    const nurseData = {
      name: nurseName,
      email: nurseEmail,
      phone: nursePhone,
      specialization: nurseSpecialization,
      nurseCode: nurseCode,
    };

    const result = await createNurseAccount(nurseData);

    if (result.success) {
      Alert.alert(
        'Nurse Account Created',
        `${nurseName} has been created with:\n\nCode: ${nurseCode}\nTemporary Password: temp123\n\nShare these credentials with the nurse for first login. They should change the password after logging in.`,
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
        style={styles.header}
      >
        <View style={styles.headerRow}>
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
          <View style={styles.statCard}>
            <LinearGradient
              colors={['#00D4FF', '#0099CC']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.statGradient}
            >
              <Text style={styles.statNumber}>{nurses.length}</Text>
              <Text style={styles.statLabel}>Total Staff</Text>
            </LinearGradient>
          </View>
          
          <View style={styles.statCard}>
            <LinearGradient
              colors={['#FF6B35', '#FF4500']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.statGradient}
            >
              <Text style={styles.statNumber}>{nurses.filter(n => n.status === 'available').length}</Text>
              <Text style={styles.statLabel}>Available</Text>
            </LinearGradient>
          </View>
          
          <View style={styles.statCard}>
            <LinearGradient
              colors={['#32CD32', '#228B22']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.statGradient}
            >
              <Text style={styles.statNumber}>{nurses.filter(n => n.status === 'busy').length}</Text>
              <Text style={styles.statLabel}>On Duty</Text>
            </LinearGradient>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>All Staff Members</Text>
          {nurses.map((nurse) => (
            <View key={nurse.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardTitleRow}>
                  <MaterialCommunityIcons 
                    name="account-heart" 
                    size={24} 
                    color={nurse.status === 'available' ? COLORS.success : COLORS.warning} 
                  />
                  <View style={styles.titleWithBadge}>
                    <Text style={styles.cardTitle}>{nurse.name}</Text>
                    <Text style={styles.cardSubtitle}>{nurse.specialization}</Text>
                  </View>
                </View>
                <View style={styles.headerActions}>
                  <View style={[styles.badge, { 
                    backgroundColor: nurse.status === 'available' ? COLORS.success + '20' : COLORS.warning + '20' 
                  }]}>
                    <Text style={[styles.badgeText, { 
                      color: nurse.status === 'available' ? COLORS.success : COLORS.warning 
                    }]}>
                      {nurse.status.toUpperCase()}
                    </Text>
                  </View>
                  <TouchableWeb 
                    style={styles.deleteButton}
                    onPress={() => handleDeleteNurse(nurse)}
                  >
                    <MaterialCommunityIcons name="delete-outline" size={20} color={COLORS.error} />
                  </TouchableWeb>
                </View>
              </View>
              <View style={styles.cardDetails}>
                <View style={styles.detailRow}>
                  <MaterialCommunityIcons name="email" size={16} color={COLORS.textLight} />
                  <Text style={styles.detailText}>{nurse.email}</Text>
                </View>
                <View style={styles.detailRow}>
                  <MaterialCommunityIcons name="phone" size={16} color={COLORS.textLight} />
                  <Text style={styles.detailText}>{nurse.phone}</Text>
                </View>
                <View style={styles.detailRow}>
                  <MaterialCommunityIcons name="badge-account" size={16} color={COLORS.textLight} />
                  <Text style={styles.detailText}>Code: {nurse.code}</Text>
                </View>
                <View style={styles.detailRow}>
                  <MaterialCommunityIcons name="calendar-plus" size={16} color={COLORS.textLight} />
                  <Text style={styles.detailText}>Added: {nurse.dateAdded}</Text>
                </View>
              </View>
              <View style={styles.clientInfo}>
                <MaterialCommunityIcons name="account-group" size={16} color={COLORS.primary} />
                <Text style={styles.clientCount}>{nurse.assignedClients} clients assigned</Text>
              </View>
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

      {/* Create Nurse Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={createNurseModalVisible}
        onRequestClose={() => setCreateNurseModalVisible(false)}
      >
        <TouchableWeb 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setCreateNurseModalVisible(false)}
        >
          <TouchableWeb activeOpacity={1} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Add New Staff Member</Text>
                <TouchableWeb onPress={() => setCreateNurseModalVisible(false)}>
                  <MaterialCommunityIcons name="close" size={24} color={COLORS.text} />
                </TouchableWeb>
              </View>
              <ScrollView style={styles.createNurseForm}>
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

                <Text style={styles.formLabel}>Unique Staff Code</Text>
                <View style={styles.codeContainer}>
                  <View style={styles.codeDisplay}>
                    <MaterialCommunityIcons name="key-variant" size={20} color={COLORS.primary} />
                    <Text style={styles.codeText}>{nurseCode || 'Click to generate'}</Text>
                  </View>
                  <TouchableWeb
                    style={styles.generateButton}
                    onPress={generateNurseCode}
                    activeOpacity={0.7}
                  >
                    <LinearGradient
                      colors={GRADIENTS.accent}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.generateButtonGradient}
                    >
                      <MaterialCommunityIcons name="refresh" size={18} color={COLORS.white} />
                      <Text style={styles.generateButtonText}>Generate</Text>
                    </LinearGradient>
                  </TouchableWeb>
                </View>

                <TouchableWeb
                  style={styles.createButton}
                  onPress={handleCreateNurse}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={GRADIENTS.primary}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.createButtonGradient}
                  >
                    <MaterialCommunityIcons name="account-plus" size={20} color={COLORS.white} />
                    <Text style={styles.createButtonText}>Add Staff Member</Text>
                  </LinearGradient>
                </TouchableWeb>
              </ScrollView>
            </View>
          </TouchableWeb>
        </TouchableWeb>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 20, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  welcomeText: { fontSize: 18, fontFamily: 'Poppins_700Bold', color: COLORS.white, flex: 1, textAlign: 'center', marginRight: 44 },
  iconButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255, 255, 255, 0.2)', justifyContent: 'center', alignItems: 'center', position: 'relative' },
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
  content: { flex: 1 },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginTop: 20,
  },
  statCard: {
    flex: 1,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  statGradient: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
  },
  statNumber: {
    fontSize: 28,
    fontFamily: 'Poppins_700Bold',
    color: COLORS.white,
    marginTop: 6,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 13,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.white,
    opacity: 0.9,
  },
  section: { padding: 20 },
  sectionTitle: { fontSize: 18, fontFamily: 'Poppins_600SemiBold', color: COLORS.text, marginBottom: 12 },
  card: { backgroundColor: COLORS.white, borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 3 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  cardTitle: { fontSize: 15, fontFamily: 'Poppins_600SemiBold', color: COLORS.text },
  titleWithBadge: { flex: 1 },
  cardSubtitle: { fontSize: 12, fontFamily: 'Poppins_400Regular', color: COLORS.textLight, marginTop: 2 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 11, fontFamily: 'Poppins_600SemiBold' },
  deleteButton: { padding: 6, borderRadius: 8, backgroundColor: COLORS.error + '10' },
  cardDetails: { gap: 8 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  detailText: { fontSize: 13, fontFamily: 'Poppins_400Regular', color: COLORS.text, flex: 1 },
  clientInfo: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: COLORS.border },
  clientCount: { fontSize: 13, fontFamily: 'Poppins_500Medium', color: COLORS.primary },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center' },
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
    borderRadius: 24,
    margin: 20,
    maxHeight: '80%',
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
  createNurseForm: {
    padding: 20,
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
    marginTop: 24,
    marginBottom: 12,
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
