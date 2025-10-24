import TouchableWeb from "../components/TouchableWeb";
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Modal,
  Alert,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, GRADIENTS, SPACING } from '../constants';
import { useAuth } from '../context/AuthContext';

export default function AdminDashboardScreen({ navigation }) {
  const { user, createNurseAccount } = useAuth();
  const [activeTab, setActiveTab] = useState('clients');
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [createNurseModalVisible, setCreateNurseModalVisible] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [nurseName, setNurseName] = useState('');
  const [nurseEmail, setNurseEmail] = useState('');
  const [nursePhone, setNursePhone] = useState('');
  const [nurseSpecialization, setNurseSpecialization] = useState('');
  const [nurseCode, setNurseCode] = useState('');
  const [selectedCard, setSelectedCard] = useState(null);
  const [assignments, setAssignments] = useState({});

  // Sample data - in real app, this would come from a database
  const clients = [
    {
      id: '1',
      name: 'John Smith',
      email: 'john@example.com',
      phone: '876-555-0123',
      nextAppointment: 'Oct 25, 10:00 AM',
      service: 'Home Nursing',
      status: 'active',
      price: '$80',
      paymentMethod: 'Credit Card',
      isSubscriber: false,
    },
    {
      id: '2',
      name: 'Mary Johnson',
      email: 'mary@example.com',
      phone: '876-555-0456',
      nextAppointment: 'Oct 28, 2:00 PM',
      service: 'Physiotherapy',
      status: 'active',
      price: '$280/month',
      paymentMethod: 'Monthly Subscription',
      isSubscriber: true,
    },
    {
      id: '3',
      name: 'Robert Davis',
      email: 'robert@example.com',
      phone: '876-555-0789',
      nextAppointment: 'Nov 2, 9:00 AM',
      service: 'Blood Draws',
      status: 'pending',
      price: '$50',
      paymentMethod: 'Debit Card',
      isSubscriber: false,
    },
  ];

  const nurses = [
    {
      id: '1',
      name: 'Sarah Johnson, RN',
      email: 'sarah.j@care.com',
      specialization: 'Home Care',
      assignedClients: 5,
      status: 'available',
      code: 'NURSE123456',
    },
    {
      id: '2',
      name: 'Michael Chen, PT',
      email: 'michael.c@care.com',
      specialization: 'Physiotherapy',
      assignedClients: 3,
      status: 'available',
      code: 'NURSE234567',
    },
    {
      id: '3',
      name: 'Emily Davis, RN',
      email: 'emily.d@care.com',
      specialization: 'Clinical',
      assignedClients: 4,
      status: 'busy',
      code: 'NURSE345678',
    },
  ];

  const appointments = [
    {
      id: '1',
      client: 'John Smith',
      service: 'Home Nursing',
      date: 'Oct 25, 2025',
      time: '10:00 AM',
      nurse: 'Sarah Johnson, RN',
      status: 'confirmed'
    },
    {
      id: '2',
      client: 'Mary Johnson',
      service: 'Physiotherapy',
      date: 'Oct 28, 2025',
      time: '2:00 PM',
      nurse: 'Michael Chen, PT',
      status: 'confirmed'
    },
    {
      id: '3',
      client: 'Robert Davis',
      service: 'Blood Draws',
      date: 'Nov 2, 2025',
      time: '9:00 AM',
      nurse: 'Emily Davis, RN',
      status: 'pending'
    }
  ];

  const activeNurses = nurses.filter(nurse => nurse.status === 'available');

  const pendingAssignments = [
    {
      id: '1',
      client: 'John Smith',
      service: 'Home Nursing',
      date: 'Oct 25, 2025',
      time: '10:00 AM',
      duration: '2 hours',
      assignedTo: null,
    },
    {
      id: '2',
      client: 'Mary Johnson',
      service: 'Physiotherapy',
      date: 'Oct 28, 2025',
      time: '2:00 PM',
      duration: '60 mins',
      assignedTo: null,
    },
    {
      id: '3',
      client: 'Sarah Williams',
      service: 'Blood Draws',
      date: 'Oct 29, 2025',
      time: '11:00 AM',
      duration: '30 mins',
      assignedTo: null,
    },
    {
      id: '4',
      client: 'David Brown',
      service: 'Wound Care',
      date: 'Oct 30, 2025',
      time: '3:00 PM',
      duration: '45 mins',
      assignedTo: null,
    },
    {
      id: '5',
      client: 'Lisa Garcia',
      service: 'Medication Management',
      date: 'Nov 1, 2025',
      time: '9:30 AM',
      duration: '90 mins',
      assignedTo: null,
    },
  ];

  const completedAssignments = [
    {
      id: '1',
      client: 'Emma Wilson',
      service: 'Home Nursing',
      date: 'Oct 23, 2025',
      time: '9:00 AM',
      completedAt: 'Oct 23, 2025 at 11:30 AM',
      nurse: 'Sarah Johnson, RN',
      duration: '2.5 hours',
      notes: 'Administered medication, checked vitals, patient stable and responsive. Follow-up recommended in 3 days.',
      patientSatisfaction: 5,
      nextAppointment: 'Oct 26, 2025'
    },
    {
      id: '2',
      client: 'Thomas Anderson',
      service: 'Physiotherapy',
      date: 'Oct 22, 2025',
      time: '3:00 PM',
      completedAt: 'Oct 22, 2025 at 4:15 PM',
      nurse: 'Michael Chen, PT',
      duration: '75 mins',
      notes: 'Completed mobility exercises, patient showing good progress. Range of motion improved by 15%. Continue current treatment plan.',
      patientSatisfaction: 4,
      nextAppointment: 'Oct 25, 2025'
    },
    {
      id: '3',
      client: 'Margaret Davis',
      service: 'Wound Care',
      date: 'Oct 22, 2025',
      time: '1:00 PM',
      completedAt: 'Oct 22, 2025 at 1:45 PM',
      nurse: 'Emily Davis, RN',
      duration: '45 mins',
      notes: 'Wound dressing changed, healing progress excellent. No signs of infection. Patient education provided on home care.',
      patientSatisfaction: 5,
      nextAppointment: 'Oct 24, 2025'
    },
    {
      id: '4',
      client: 'James Miller',
      service: 'Blood Draws',
      date: 'Oct 21, 2025',
      time: '8:30 AM',
      completedAt: 'Oct 21, 2025 at 8:45 AM',
      nurse: 'Sarah Johnson, RN',
      duration: '15 mins',
      notes: 'Blood samples collected successfully for routine lab work. Patient tolerated procedure well. Results expected in 24-48 hours.',
      patientSatisfaction: 5,
      nextAppointment: 'Nov 21, 2025'
    },
    {
      id: '5',
      client: 'Patricia Garcia',
      service: 'Medication Management',
      date: 'Oct 20, 2025',
      time: '11:00 AM',
      completedAt: 'Oct 20, 2025 at 12:30 PM',
      nurse: 'Emily Davis, RN',
      duration: '90 mins',
      notes: 'Medication review completed, dosage adjustments made. Patient education on new medication schedule. Pill organizer set up for the week.',
      patientSatisfaction: 4,
      nextAppointment: 'Oct 27, 2025'
    }
  ];

  const handleAssignNurse = (appointment) => {
    setSelectedAppointment(appointment);
    setAssignModalVisible(true);
  };

  const confirmAssignment = (nurse) => {
    Alert.alert(
      'Confirm Assignment',
      `Assign ${selectedAppointment.client}'s ${selectedAppointment.service} to ${nurse.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: () => {
            // Update assignments state to track assigned nurses
            setAssignments(prev => ({
              ...prev,
              [selectedAppointment.id]: {
                nurse: nurse,
                assignedAt: new Date().toLocaleString()
              }
            }));
            
            Alert.alert('Success', `${selectedAppointment.client}'s ${selectedAppointment.service} has been assigned to ${nurse.name}!`);
            setAssignModalVisible(false);
            setSelectedAppointment(null);
          },
        },
      ]
    );
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

  const handleDeleteNurse = (nurse) => {
    Alert.alert(
      'Delete Nurse',
      `Are you sure you want to delete ${nurse.name}?\n\nThis action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            // In real app, delete nurse from database
            Alert.alert('Success', `${nurse.name} has been removed.`);
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
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
            onPress={() => navigation.navigate('Notifications')}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="bell-outline" size={26} color={COLORS.white} />
            <View style={styles.notificationBadge}>
              <Text style={styles.notificationBadgeText}>3</Text>
            </View>
          </TouchableWeb>
          <Text style={styles.welcomeText}>Welcome, {user?.username}!</Text>
          <TouchableWeb 
            style={styles.iconButton}
            onPress={() => navigation.navigate('Profile')}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="account-circle-outline" size={26} color={COLORS.white} />
          </TouchableWeb>
        </View>
      </LinearGradient>

      {/* Stats Cards */}
      <View style={styles.statsContainer}>
        <TouchableWeb 
          style={styles.statCard}
          onPress={() => setSelectedCard(selectedCard === 'appointments' ? null : 'appointments')}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#00D4FF', '#0099CC']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.statGradient}
          >
            <Text style={styles.statNumber}>{appointments.length}</Text>
            <Text style={styles.statLabel}>Appointments</Text>
          </LinearGradient>
        </TouchableWeb>
        
        <TouchableWeb 
          style={styles.statCard}
          onPress={() => setSelectedCard(selectedCard === 'nurses' ? null : 'nurses')}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#FF7F50', '#FF6347', '#FF4500']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.statGradient}
          >
            <Text style={styles.statNumber}>{activeNurses.length}</Text>
            <Text style={styles.statLabel}>Active Nurses</Text>
          </LinearGradient>
        </TouchableWeb>
        
        <TouchableWeb 
          style={styles.statCard}
          onPress={() => setSelectedCard(selectedCard === 'pending' ? null : 'pending')}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#32CD32', '#228B22']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.statGradient}
          >
            <Text style={styles.statNumber}>{pendingAssignments.length}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </LinearGradient>
        </TouchableWeb>

        <TouchableWeb 
          style={styles.statCard}
          onPress={() => setSelectedCard(selectedCard === 'completed' ? null : 'completed')}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#DA70D6', '#9370DB', '#8A2BE2']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.statGradient}
          >
            <Text style={styles.statNumber}>{completedAssignments.length}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </LinearGradient>
        </TouchableWeb>
      </View>

      {/* Content Area */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {selectedCard === 'appointments' && (
          <View style={styles.contentSection}>
            <Text style={styles.sectionTitle}>Upcoming Appointments</Text>
            {appointments.map((appointment) => (
              <View key={appointment.id} style={styles.contentCard}>
                <View style={styles.appointmentHeader}>
                  <MaterialCommunityIcons name="calendar-clock" size={24} color={COLORS.primary} />
                  <View style={styles.appointmentInfo}>
                    <Text style={styles.appointmentClient}>{appointment.client}</Text>
                    <Text style={styles.appointmentService}>{appointment.service}</Text>
                  </View>
                  <View style={styles.appointmentTime}>
                    <Text style={styles.timeText}>{appointment.date}</Text>
                    <Text style={styles.timeText}>{appointment.time}</Text>
                  </View>
                </View>
                <View style={styles.appointmentDetails}>
                  <Text style={styles.nurseAssigned}>Nurse: {appointment.nurse}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: appointment.status === 'confirmed' ? COLORS.success + '20' : COLORS.warning + '20' }]}>
                    <Text style={[styles.statusText, { color: appointment.status === 'confirmed' ? COLORS.success : COLORS.warning }]}>
                      {appointment.status.toUpperCase()}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        {selectedCard === 'nurses' && (
          <View style={styles.contentSection}>
            <Text style={styles.sectionTitle}>Active Nurses</Text>
            {activeNurses.map((nurse) => (
              <View key={nurse.id} style={styles.contentCard}>
                <View style={styles.nurseHeader}>
                  <MaterialCommunityIcons name="account-heart" size={24} color={COLORS.accent} />
                  <View style={styles.nurseInfo}>
                    <Text style={styles.nurseName}>{nurse.name}</Text>
                    <Text style={styles.nurseSpecialization}>{nurse.specialization}</Text>
                  </View>
                  <View style={styles.nurseStats}>
                    <Text style={styles.clientCount}>{nurse.assignedClients} clients</Text>
                    <View style={styles.availableBadge}>
                      <Text style={styles.availableText}>AVAILABLE</Text>
                    </View>
                  </View>
                </View>
                <View style={styles.nurseContact}>
                  <Text style={styles.nurseEmail}>{nurse.email}</Text>
                  <Text style={styles.nurseCode}>Code: {nurse.code}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {selectedCard === 'pending' && (
          <View style={styles.contentSection}>
            <Text style={styles.sectionTitle}>Pending Assignments</Text>
            {pendingAssignments.map((assignment) => {
              const assignedNurse = assignments[assignment.id];
              const isAssigned = !!assignedNurse;
              
              return (
                <View key={assignment.id} style={styles.contentCard}>
                  <View style={styles.pendingHeader}>
                    <MaterialCommunityIcons 
                      name={isAssigned ? "calendar-check" : "calendar-alert"} 
                      size={24} 
                      color={isAssigned ? COLORS.success : COLORS.warning} 
                    />
                    <View style={styles.pendingInfo}>
                      <Text style={styles.pendingClient}>{assignment.client}</Text>
                      <Text style={styles.pendingService}>{assignment.service}</Text>
                    </View>
                    {!isAssigned ? (
                      <TouchableWeb style={styles.assignBtn} onPress={() => handleAssignNurse(assignment)}>
                        <Text style={styles.assignBtnText}>Assign</Text>
                      </TouchableWeb>
                    ) : (
                      <View style={styles.assignedBadge}>
                        <Text style={styles.assignedBadgeText}>Assigned</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.pendingDetails}>
                    <Text style={styles.pendingTime}>{assignment.date} at {assignment.time}</Text>
                    <Text style={styles.pendingDuration}>Duration: {assignment.duration}</Text>
                  </View>
                  {isAssigned && (
                    <View style={styles.assignmentInfo}>
                      <Text style={styles.assignedToText}>
                        Assigned to: {assignedNurse.nurse.name}
                      </Text>
                      <Text style={styles.assignedAtText}>
                        Assigned: {assignedNurse.assignedAt}
                      </Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}

        {selectedCard === 'completed' && (
          <View style={styles.contentSection}>
            <Text style={styles.sectionTitle}>Completed Assignments</Text>
            {completedAssignments.map((completed) => (
              <View key={completed.id} style={styles.contentCard}>
                <View style={styles.completedHeader}>
                  <MaterialCommunityIcons name="check-circle" size={24} color={COLORS.success} />
                  <View style={styles.completedInfo}>
                    <Text style={styles.completedClient}>{completed.client}</Text>
                    <Text style={styles.completedService}>{completed.service}</Text>
                  </View>
                  <View style={styles.completedTime}>
                    <Text style={styles.completedDate}>{completed.date}</Text>
                    <Text style={styles.completedAtText}>{completed.completedAt}</Text>
                  </View>
                </View>
                
                <View style={styles.completedDetails}>
                  <View style={styles.detailRow}>
                    <MaterialCommunityIcons name="account-heart" size={16} color={COLORS.primary} />
                    <Text style={styles.detailText}>Nurse: {completed.nurse}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <MaterialCommunityIcons name="clock-outline" size={16} color={COLORS.primary} />
                    <Text style={styles.detailText}>Duration: {completed.duration}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <MaterialCommunityIcons name="calendar-plus" size={16} color={COLORS.primary} />
                    <Text style={styles.detailText}>Next: {completed.nextAppointment}</Text>
                  </View>
                </View>

                <View style={styles.notesSection}>
                  <Text style={styles.notesLabel}>Nurse Notes:</Text>
                  <Text style={styles.notesText}>{completed.notes}</Text>
                </View>

                <View style={styles.satisfactionSection}>
                  <Text style={styles.satisfactionLabel}>Patient Satisfaction:</Text>
                  <View style={styles.starsContainer}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <MaterialCommunityIcons
                        key={star}
                        name={star <= completed.patientSatisfaction ? "star" : "star-outline"}
                        size={16}
                        color={star <= completed.patientSatisfaction ? "#FFD700" : COLORS.textLight}
                      />
                    ))}
                    <Text style={styles.satisfactionScore}>({completed.patientSatisfaction}/5)</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

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
              <Text style={styles.modalTitle}>Create New Nurse</Text>
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

              <Text style={styles.formLabel}>Unique Nurse Code</Text>
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
                  <Text style={styles.createButtonText}>Create Nurse</Text>
                </LinearGradient>
              </TouchableWeb>
            </ScrollView>
          </View>
        </TouchableWeb>
        </TouchableWeb>
      </Modal>

      {/* Assign Nurse Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={assignModalVisible}
        onRequestClose={() => setAssignModalVisible(false)}
      >
        <TouchableWeb 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setAssignModalVisible(false)}
        >
          <TouchableWeb activeOpacity={1} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  Assign Nurse - {selectedAppointment?.client}
                </Text>
                <TouchableWeb onPress={() => setAssignModalVisible(false)}>
                  <MaterialCommunityIcons name="close" size={24} color={COLORS.text} />
                </TouchableWeb>
              </View>
              <View style={styles.nurseList}>
                <Text style={styles.sectionTitle}>Available Nurses</Text>
                {activeNurses.map((nurse) => (
                  <View key={nurse.id} style={styles.nurseItem}>
                    <View style={styles.nurseItemLeft}>
                      <MaterialCommunityIcons 
                        name="account-heart" 
                        size={32} 
                        color={COLORS.primary} 
                      />
                      <View>
                        <Text style={styles.nurseItemName}>{nurse.name}</Text>
                        <Text style={styles.nurseItemSpecialization}>{nurse.specialization}</Text>
                        <Text style={styles.clientCount}>{nurse.assignedClients} clients assigned</Text>
                      </View>
                    </View>
                    <TouchableWeb
                      style={styles.assignButton}
                      onPress={() => confirmAssignment(nurse)}
                      activeOpacity={0.8}
                    >
                      <LinearGradient
                        colors={GRADIENTS.primary}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.assignButtonGradient}
                      >
                        <MaterialCommunityIcons name="check" size={16} color={COLORS.white} />
                        <Text style={styles.assignButtonText}>Assign</Text>
                      </LinearGradient>
                    </TouchableWeb>
                  </View>
                ))}
              </View>
            </View>
          </TouchableWeb>
        </TouchableWeb>
      </Modal>
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
  content: {
    flex: 1,
  },
  contentSection: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Poppins_700Bold',
    color: COLORS.text,
    marginBottom: 12,
  },
  contentCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  appointmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  appointmentInfo: {
    flex: 1,
    marginLeft: 12,
  },
  appointmentClient: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.text,
  },
  appointmentService: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.textLight,
  },
  appointmentTime: {
    alignItems: 'flex-end',
  },
  timeText: {
    fontSize: 12,
    fontFamily: 'Poppins_500Medium',
    color: COLORS.primary,
  },
  appointmentDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  nurseAssigned: {
    fontSize: 13,
    fontFamily: 'Poppins_500Medium',
    color: COLORS.textLight,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 10,
    fontFamily: 'Poppins_600SemiBold',
  },
  nurseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  nurseInfo: {
    flex: 1,
    marginLeft: 12,
  },
  nurseName: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.text,
  },
  nurseSpecialization: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.textLight,
  },
  nurseStats: {
    alignItems: 'flex-end',
  },
  clientCount: {
    fontSize: 12,
    fontFamily: 'Poppins_500Medium',
    color: COLORS.textLight,
    marginBottom: 4,
  },
  availableBadge: {
    backgroundColor: COLORS.success + '20',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  availableText: {
    fontSize: 10,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.success,
  },
  nurseContact: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  nurseEmail: {
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.textLight,
  },
  nurseCode: {
    fontSize: 13,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.primary,
  },
  pendingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  pendingInfo: {
    flex: 1,
    marginLeft: 12,
  },
  pendingClient: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.text,
  },
  pendingService: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.textLight,
  },
  assignBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  assignBtnText: {
    fontSize: 12,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.white,
  },
  pendingDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  pendingTime: {
    fontSize: 13,
    fontFamily: 'Poppins_500Medium',
    color: COLORS.textLight,
  },
  pendingDuration: {
    fontSize: 13,
    fontFamily: 'Poppins_500Medium',
    color: COLORS.textLight,
  },
  tabContainer: {
    paddingHorizontal: 20,
    marginTop: 20,
    gap: 8,
  },
  tab: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    minWidth: 90,
  },
  activeTab: {
    backgroundColor: COLORS.primary,
  },
  tabText: {
    fontSize: 13,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.text,
  },
  activeTabText: {
    color: COLORS.white,
  },
  content: {
    flex: 1,
    marginTop: 16,
  },
  scrollContent: {
    paddingBottom: SPACING.xl,
  },
  listContainer: {
    paddingHorizontal: 20,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  cardTitle: {
    fontSize: 15,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.text,
  },
  titleWithBadge: {
    flex: 1,
  },
  subscriberBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFD70020',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 4,
    alignSelf: 'flex-start',
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#FFD70040',
  },
  subscriberBadgeText: {
    fontSize: 10,
    fontFamily: 'Poppins_600SemiBold',
    color: '#B8860B',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  deleteButton: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: COLORS.error + '10',
  },
  cardSubtitle: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.textLight,
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 11,
    fontFamily: 'Poppins_600SemiBold',
  },
  cardDetails: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.text,
    flex: 1,
  },
  paymentInfoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 12,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.success + '10',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
    flex: 1,
  },
  priceText: {
    fontSize: 14,
    fontFamily: 'Poppins_700Bold',
    color: COLORS.success,
  },
  paymentMethodContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.accent + '10',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
    flex: 1,
  },
  paymentMethodText: {
    fontSize: 12,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.accent,
  },
  assignButton: {
    borderRadius: 10,
    overflow: 'hidden',
    minWidth: 80,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  assignButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 6,
  },
  assignButtonText: {
    fontSize: 13,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.white,
  },
  assignedBadge: {
    backgroundColor: COLORS.success + '20',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.success + '40',
  },
  assignedBadgeText: {
    fontSize: 12,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.success,
  },
  assignmentInfo: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.success + '05',
    padding: 12,
    borderRadius: 8,
  },
  assignedToText: {
    fontSize: 13,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.success,
    marginBottom: 4,
  },
  assignedAtText: {
    fontSize: 11,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.textLight,
  },
  bottomPadding: {
    height: 24,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
  },
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
  nurseList: {
    padding: 20,
  },
  nurseItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: COLORS.background,
    borderRadius: 12,
    marginBottom: 12,
  },
  nurseItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  nurseItemName: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.text,
  },
  nurseItemSpecialization: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.textLight,
    marginTop: 2,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  fabGradient: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
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
  // New Tab Styles
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.text,
    marginTop: 8,
    marginBottom: 12,
  },
  analyticsCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  analyticsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  analyticsLabel: {
    fontSize: 15,
    fontFamily: 'Poppins_500Medium',
    color: COLORS.textLight,
  },
  analyticsValue: {
    fontSize: 18,
    fontFamily: 'Poppins_700Bold',
    color: COLORS.primary,
  },
  serviceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  serviceName: {
    fontSize: 15,
    fontFamily: 'Poppins_500Medium',
    color: COLORS.text,
  },
  serviceCount: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.primary,
  },
  appointmentItem: {
    flexDirection: 'row',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 16,
  },
  appointmentLeft: {
    alignItems: 'center',
    paddingRight: 16,
    borderRightWidth: 2,
    borderRightColor: COLORS.primary,
  },
  appointmentDate: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.primary,
  },
  appointmentTime: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.textLight,
  },
  appointmentRight: {
    flex: 1,
  },
  appointmentClient: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.text,
    marginBottom: 4,
  },
  appointmentService: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.textLight,
    marginBottom: 2,
  },
  appointmentNurse: {
    fontSize: 13,
    fontFamily: 'Poppins_500Medium',
    color: COLORS.accent,
  },
  completedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  completedDetails: {
    flex: 1,
  },
  completedClient: {
    fontSize: 15,
    fontFamily: 'Poppins_500Medium',
    color: COLORS.text,
  },
  completedTime: {
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.textLight,
  },
  paymentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  paymentLeft: {
    flex: 1,
  },
  paymentClient: {
    fontSize: 15,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.text,
    marginBottom: 4,
  },
  paymentDate: {
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.textLight,
  },
  paymentRight: {
    alignItems: 'flex-end',
  },
  paymentAmount: {
    fontSize: 16,
    fontFamily: 'Poppins_700Bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  paymentStatus: {
    fontSize: 12,
    fontFamily: 'Poppins_600SemiBold',
  },
  renewalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  renewalDetails: {
    flex: 1,
  },
  renewalClient: {
    fontSize: 15,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.text,
    marginBottom: 4,
  },
  renewalDate: {
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.textLight,
  },
  renewalAmount: {
    fontSize: 14,
    fontFamily: 'Poppins_700Bold',
    color: COLORS.primary,
  },
  serviceManageItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  serviceManageInfo: {
    flex: 1,
  },
  serviceManageName: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.text,
    marginBottom: 4,
  },
  serviceManagePrice: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.primary,
    marginBottom: 4,
  },
  serviceManageDesc: {
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.textLight,
  },
  serviceManageToggle: {
    paddingLeft: 12,
  },
  serviceStatus: {
    fontSize: 13,
    fontFamily: 'Poppins_600SemiBold',
  },
  // Completed assignments styles
  completedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  completedInfo: {
    flex: 1,
    marginLeft: 12,
  },
  completedClient: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.text,
  },
  completedService: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.textLight,
  },
  completedTime: {
    alignItems: 'flex-end',
  },
  completedDate: {
    fontSize: 12,
    fontFamily: 'Poppins_500Medium',
    color: COLORS.primary,
  },
  completedAtText: {
    fontSize: 11,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.success,
    marginTop: 2,
  },
  completedDetails: {
    gap: 8,
    marginBottom: 12,
  },
  notesSection: {
    backgroundColor: COLORS.background,
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  notesLabel: {
    fontSize: 13,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.text,
    marginBottom: 6,
  },
  notesText: {
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.textLight,
    lineHeight: 18,
  },
  satisfactionSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  satisfactionLabel: {
    fontSize: 13,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.text,
  },
  starsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  satisfactionScore: {
    fontSize: 12,
    fontFamily: 'Poppins_500Medium',
    color: COLORS.textLight,
    marginLeft: 6,
  },
});
