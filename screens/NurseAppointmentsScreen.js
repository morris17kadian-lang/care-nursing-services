import TouchableWeb from "../components/TouchableWeb";
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  TextInput,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, GRADIENTS } from '../constants';
import { useAuth } from '../context/AuthContext';

export default function NurseAppointmentsScreen({ navigation }) {
  const { user } = useAuth();
  const [isAvailable, setIsAvailable] = useState(true);
  const [selectedCard, setSelectedCard] = useState(null);
  const [filteredAppointments, setFilteredAppointments] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [appointments, setAppointments] = useState([
    {
      id: '1',
      patient: 'John Smith',
      service: 'Home Nursing',
      date: 'Oct 25, 2025',
      time: '10:00 AM',
      duration: '2 hours',
      address: '123 Main St, Kingston',
      phone: '876-555-0123',
      status: 'assigned',
      notes: 'Patient requires assistance with daily medications and mobility'
    },
    {
      id: '2',
      patient: 'Mary Johnson',
      service: 'Physiotherapy',
      date: 'Oct 26, 2025',
      time: '2:00 PM',
      duration: '60 mins',
      address: '456 Oak Ave, Spanish Town',
      phone: '876-555-0456',
      status: 'assigned',
      notes: 'Post-surgery rehabilitation, knee replacement recovery'
    },
    {
      id: '3',
      patient: 'Robert Davis',
      service: 'Wound Care',
      date: 'Oct 27, 2025',
      time: '9:00 AM',
      duration: '45 mins',
      address: '789 Pine St, Portmore',
      phone: '876-555-0789',
      status: 'pending',
      notes: 'Diabetic foot ulcer dressing change'
    },
    {
      id: '4',
      patient: 'Sarah Williams',
      service: 'Blood Draw',
      date: 'Oct 28, 2025',
      time: '11:00 AM',
      duration: '30 mins',
      address: '321 Cedar Rd, Mandeville',
      phone: '876-555-0321',
      status: 'completed',
      notes: 'Routine blood work for diabetes monitoring'
    }
  ]);

  // Get all appointments
  const assignedAppointments = appointments;

  const handleAvailabilityToggle = (value) => {
    setIsAvailable(value);
    Alert.alert(
      value ? 'Available' : 'Unavailable',
      value 
        ? 'You are now available for new assignments.' 
        : 'You are marked as unavailable. New assignments will be paused.',
      [{ text: 'OK' }]
    );
  };

  const handleCardPress = (cardType) => {
    if (selectedCard === cardType) {
      // If same card is pressed, deselect and show all
      setSelectedCard(null);
      setFilteredAppointments([]);
    } else {
      // Select new card and filter appointments
      setSelectedCard(cardType);
      let filtered = [];
      
      switch (cardType) {
        case 'assigned':
          filtered = assignedAppointments.filter(apt => apt.status === 'assigned');
          break;
        case 'completed':
          filtered = assignedAppointments.filter(apt => apt.status === 'completed');
          break;
        case 'pending':
          filtered = assignedAppointments.filter(apt => apt.status === 'pending');
          break;
        default:
          filtered = assignedAppointments;
      }
      
      setFilteredAppointments(filtered);
    }
  };

  // Get appointments to display based on selection
  const displayedAppointments = selectedCard ? filteredAppointments : assignedAppointments;

  const handleCompleteAppointment = (appointmentId) => {
    Alert.alert(
      'Complete Appointment',
      'Mark this appointment as completed?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Complete',
          onPress: () => {
            setAppointments(prev => 
              prev.map(apt => 
                apt.id === appointmentId 
                  ? { ...apt, status: 'completed' }
                  : apt
              )
            );
            Alert.alert('Success', 'Appointment marked as completed!');
            
            // If we're viewing assigned appointments, refresh the filter
            if (selectedCard === 'assigned') {
              const updatedAppointments = appointments.map(apt => 
                apt.id === appointmentId ? { ...apt, status: 'completed' } : apt
              );
              setFilteredAppointments(updatedAppointments);
            }
          },
        },
      ]
    );
  };

  const handleSelfAssign = (appointmentId) => {
    Alert.alert(
      'Self Assign',
      'Assign this appointment to yourself?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Assign',
          onPress: () => {
            setAppointments(prev => 
              prev.map(apt => 
                apt.id === appointmentId 
                  ? { ...apt, status: 'assigned' }
                  : apt
              )
            );
            Alert.alert('Success', 'Appointment assigned to you!');
          },
        },
      ]
    );
  };

  const handleUpdateNotes = (appointmentId, newNotes) => {
    setAppointments(prev => 
      prev.map(apt => 
        apt.id === appointmentId 
          ? { ...apt, notes: newNotes }
          : apt
      )
    );
  };

  const onRefresh = () => {
    setRefreshing(true);
    
    // Simulate API call to refresh appointments
    setTimeout(() => {
      // Reset any filters and show all appointments
      setSelectedCard(null);
      setFilteredAppointments([]);
      
      // You can add logic here to fetch fresh data from API
      Alert.alert('Refreshed', 'Appointments have been updated!');
      
      setRefreshing(false);
    }, 1500);
  };

  const handleCallPatient = (phone) => {
    Alert.alert(
      'Call Patient',
      `Call ${phone}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Call', onPress: () => {} },
      ]
    );
  };

  const AppointmentCard = ({ appointment }) => {
    const [isEditingNotes, setIsEditingNotes] = useState(false);
    const [editedNotes, setEditedNotes] = useState(appointment.notes || '');
    
    const getStatusColor = (status) => {
      switch (status) {
        case 'assigned': return COLORS.primary;
        case 'completed': return COLORS.success;
        case 'pending': return COLORS.warning;
        default: return COLORS.textLight;
      }
    };
    
    const saveNotes = () => {
      handleUpdateNotes(appointment.id, editedNotes);
      setIsEditingNotes(false);
    };
    
    return (
      <View style={styles.appointmentCard}>
        <View style={styles.appointmentHeader}>
          <View style={styles.appointmentInfo}>
            <Text style={styles.patientName}>{appointment.patient}</Text>
            <Text style={styles.serviceName}>{appointment.service}</Text>
          </View>
          <View style={styles.headerActions}>
            <View style={[styles.statusBadge, { 
              backgroundColor: getStatusColor(appointment.status) + '20' 
            }]}>
              <Text style={[styles.statusText, { 
                color: getStatusColor(appointment.status)
              }]}>
                {appointment.status.toUpperCase()}
              </Text>
            </View>
            {appointment.status === 'pending' && (
              <TouchableWeb
                style={styles.selfAssignButton}
                onPress={() => handleSelfAssign(appointment.id)}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons name="plus" size={20} color={COLORS.primary} />
              </TouchableWeb>
            )}
          </View>
        </View>

        <View style={styles.appointmentDetails}>
          <View style={styles.detailRow}>
            <MaterialCommunityIcons name="calendar" size={16} color={COLORS.primary} />
            <Text style={styles.detailText}>{appointment.date} at {appointment.time}</Text>
          </View>
          <View style={styles.detailRow}>
            <MaterialCommunityIcons name="clock" size={16} color={COLORS.primary} />
            <Text style={styles.detailText}>Duration: {appointment.duration}</Text>
          </View>
          <View style={styles.detailRow}>
            <MaterialCommunityIcons name="map-marker" size={16} color={COLORS.primary} />
            <Text style={styles.detailText}>{appointment.address}</Text>
          </View>
          <View style={styles.detailRow}>
            <MaterialCommunityIcons name="phone" size={16} color={COLORS.primary} />
            <TouchableWeb onPress={() => handleCallPatient(appointment.phone)}>
              <Text style={[styles.detailText, styles.phoneText]}>{appointment.phone}</Text>
            </TouchableWeb>
          </View>
        </View>

        {/* Editable Notes Section */}
        <View style={styles.notesSection}>
          <View style={styles.notesHeader}>
            <Text style={styles.notesLabel}>Notes:</Text>
            {!isEditingNotes ? (
              <TouchableWeb
                style={styles.editNotesButton}
                onPress={() => setIsEditingNotes(true)}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons name="pencil" size={16} color={COLORS.primary} />
              </TouchableWeb>
            ) : (
              <View style={styles.notesActions}>
                <TouchableWeb
                  style={styles.saveNotesButton}
                  onPress={saveNotes}
                  activeOpacity={0.7}
                >
                  <MaterialCommunityIcons name="check" size={16} color={COLORS.success} />
                </TouchableWeb>
                <TouchableWeb
                  style={styles.cancelNotesButton}
                  onPress={() => {
                    setIsEditingNotes(false);
                    setEditedNotes(appointment.notes || '');
                  }}
                  activeOpacity={0.7}
                >
                  <MaterialCommunityIcons name="close" size={16} color={COLORS.error} />
                </TouchableWeb>
              </View>
            )}
          </View>
          
          {isEditingNotes ? (
            <TextInput
              style={styles.notesInput}
              value={editedNotes}
              onChangeText={setEditedNotes}
              placeholder="Add notes about this appointment..."
              placeholderTextColor={COLORS.textLight}
              multiline
              numberOfLines={3}
              maxLength={200}
            />
          ) : (
            <Text style={styles.notesText}>
              {appointment.notes || 'No notes added yet'}
            </Text>
          )}
        </View>

        {/* Action Buttons - Only show for assigned appointments */}
        {appointment.status === 'assigned' && (
          <View style={styles.actionButtons}>
            <TouchableWeb
              style={styles.completeButton}
              onPress={() => handleCompleteAppointment(appointment.id)}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={GRADIENTS.primary}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.completeButtonGradient}
              >
                <MaterialCommunityIcons name="check" size={16} color={COLORS.white} />
                <Text style={styles.completeButtonText}>Mark Complete</Text>
              </LinearGradient>
            </TouchableWeb>
          </View>
        )}
      </View>
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
          </TouchableWeb>
          <Text style={styles.welcomeText}>My Appointments</Text>
          
          {/* Availability Toggle */}
          <View style={styles.availabilityToggle}>
            <MaterialCommunityIcons 
              name={isAvailable ? "check-circle" : "pause-circle"} 
              size={20} 
              color={COLORS.white} 
            />
            <Switch
              value={isAvailable}
              onValueChange={handleAvailabilityToggle}
              trackColor={{ false: 'rgba(255,255,255,0.3)', true: 'rgba(255,255,255,0.5)' }}
              thumbColor={COLORS.white}
              style={styles.headerSwitch}
              ios_backgroundColor="rgba(255,255,255,0.3)"
            />
          </View>
        </View>
      </LinearGradient>

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
      >
        {/* Stats Summary */}
        <View style={styles.statsContainer}>
          <TouchableWeb 
            style={styles.statCard}
            onPress={() => handleCardPress('assigned')}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={selectedCard === 'assigned' ? ['#00D4FF', '#0099CC'] : ['#00D4FF', '#0099CC']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.statGradient, selectedCard === 'assigned' && styles.selectedCard]}
            >
              <Text style={styles.statNumber}>
                {assignedAppointments.filter(apt => apt.status === 'assigned').length}
              </Text>
              <Text style={styles.statLabel}>Assigned</Text>
            </LinearGradient>
          </TouchableWeb>
          
          <TouchableWeb 
            style={styles.statCard}
            onPress={() => handleCardPress('completed')}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={selectedCard === 'completed' ? ['#32CD32', '#228B22'] : ['#32CD32', '#228B22']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.statGradient, selectedCard === 'completed' && styles.selectedCard]}
            >
              <Text style={styles.statNumber}>
                {assignedAppointments.filter(apt => apt.status === 'completed').length}
              </Text>
              <Text style={styles.statLabel}>Completed</Text>
            </LinearGradient>
          </TouchableWeb>
          
          <TouchableWeb 
            style={styles.statCard}
            onPress={() => handleCardPress('pending')}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={selectedCard === 'pending' ? ['#FF6B35', '#FF4500'] : ['#FF6B35', '#FF4500']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.statGradient, selectedCard === 'pending' && styles.selectedCard]}
            >
              <Text style={styles.statNumber}>
                {assignedAppointments.filter(apt => apt.status === 'pending').length}
              </Text>
              <Text style={styles.statLabel}>Pending</Text>
            </LinearGradient>
          </TouchableWeb>
        </View>

        {/* Appointments Section */}
        <View style={styles.appointmentsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {selectedCard ? 
                `${selectedCard.charAt(0).toUpperCase() + selectedCard.slice(1)} Appointments` : 
                'My Appointments'
              }
            </Text>
            {selectedCard && (
              <TouchableWeb 
                style={styles.clearFilter}
                onPress={() => handleCardPress(selectedCard)}
                activeOpacity={0.7}
              >
                <Text style={styles.clearFilterText}>Show All</Text>
              </TouchableWeb>
            )}
          </View>
          
          {displayedAppointments.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons 
                name="calendar-outline" 
                size={48} 
                color={COLORS.textLight} 
              />
              <Text style={styles.emptyStateText}>
                {selectedCard ? 
                  `No ${selectedCard} appointments` : 
                  'No appointments assigned'
                }
              </Text>
            </View>
          ) : (
            displayedAppointments.map((appointment) => (
              <AppointmentCard key={appointment.id} appointment={appointment} />
            ))
          )}
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>
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
    marginBottom: 16,
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
  },
  availabilityToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerSwitch: {
    transform: [{ scaleX: 0.9 }, { scaleY: 0.9 }],
  },
  content: {
    flex: 1,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginTop: 20,
    marginBottom: 20,
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
    minHeight: 100,
  },
  selectedCard: {
    transform: [{ scale: 0.95 }],
  },
  statNumber: {
    fontSize: 24,
    fontFamily: 'Poppins_700Bold',
    color: COLORS.white,
    marginTop: 4,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.white,
    opacity: 0.9,
  },
  appointmentsSection: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Poppins_700Bold',
    color: COLORS.text,
  },
  clearFilter: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: COLORS.primary + '20',
    borderRadius: 16,
  },
  clearFilterText: {
    fontSize: 12,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.primary,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 16,
    fontFamily: 'Poppins_500Medium',
    color: COLORS.textLight,
    marginTop: 12,
    textAlign: 'center',
  },
  appointmentCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  appointmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selfAssignButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  appointmentInfo: {
    flex: 1,
  },
  patientName: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.text,
    marginBottom: 4,
  },
  serviceName: {
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
    color: COLORS.primary,
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
  appointmentDetails: {
    gap: 8,
    marginBottom: 12,
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
  phoneText: {
    color: COLORS.primary,
    textDecorationLine: 'underline',
  },
  notesSection: {
    backgroundColor: COLORS.background,
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  notesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  notesLabel: {
    fontSize: 12,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.textLight,
  },
  editNotesButton: {
    padding: 4,
  },
  notesActions: {
    flexDirection: 'row',
    gap: 8,
  },
  saveNotesButton: {
    padding: 4,
  },
  cancelNotesButton: {
    padding: 4,
  },
  notesInput: {
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.text,
    lineHeight: 18,
    backgroundColor: COLORS.white,
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: COLORS.primary + '30',
    textAlignVertical: 'top',
  },
  notesText: {
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.text,
    lineHeight: 18,
    fontStyle: 'italic',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  completeButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  completeButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
  },
  completeButtonText: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.white,
  },
  bottomPadding: {
    height: 20,
  },
});