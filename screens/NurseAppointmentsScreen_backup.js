import { TouchableWeb } from "../components/TouchableWeb";
import React, { useState, useContext, useEffect } from 'react';
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
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, GRADIENTS } from '../constants';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { useAppointments } from '../context/AppointmentContext';
import { useNurses } from '../context/NurseContext';

export default function NurseAppointmentsScreen({ navigation }) {
  // Add error boundary check
  try {
    const { user } = useAuth();
    const { unreadCount } = useNotifications();
    const { nurses, updateNurseActiveStatus } = useNurses();
    const { 
      getAppointmentsByNurse, 
      acceptAppointment, 
      declineAppointment,
      completeAppointment,
      clearCompletedAppointments,
      updateNurseAvailability,
      updateAppointmentNotes
    } = useAppointments();
  
  // Find current nurse in NurseContext and get their availability status
  const currentNurse = nurses.find(nurse => nurse.code === user?.nurseCode);
  const [isAvailable, setIsAvailable] = useState(true);
  const [selectedCard, setSelectedCard] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  
  // Debug log to check nurse matching
  useEffect(() => {
    console.log('User nurseCode:', user?.nurseCode);
    console.log('Available nurses:', (nurses || []).map(n => ({ id: n.id, code: n.code, isActive: n.isActive })));
    console.log('Current nurse found:', currentNurse);
  }, [user?.nurseCode, nurses?.length]);

  // Initialize toggle state from nurse data only once when nurse is found
  useEffect(() => {
    if (currentNurse && currentNurse.isActive !== undefined) {
      console.log('Setting initial availability from nurse data:', currentNurse.isActive);
      setIsAvailable(currentNurse.isActive);
    }
  }, [currentNurse?.id, currentNurse?.isActive]);

  // Clear completed appointments for testing (call once on mount)
  useEffect(() => {
    const clearCompleted = async () => {
      try {
        await clearCompletedAppointments();
        console.log('Cleared completed appointments for testing');
      } catch (error) {
        console.error('Error clearing completed appointments:', error);
      }
    };
    clearCompleted();
  }, []); // Empty dependency array = runs once on mount
  
  // Get appointments for this nurse
  const nurseAppointments = getAppointmentsByNurse(currentNurse?.id || user?.id || 'nurse-1') || [];
  console.log('Looking for appointments with nurse ID:', currentNurse?.id || user?.id || 'nurse-1');
  console.log('Found nurse appointments:', nurseAppointments);
  console.log('nurseAppointments type:', typeof nurseAppointments, 'is array:', Array.isArray(nurseAppointments));
  
  const pendingAssignments = nurseAppointments.filter(app => app.status === 'nurse_assigned');
  const activeAppointments = nurseAppointments.filter(app => app.status === 'confirmed');
  const completedAppointments = nurseAppointments.filter(app => app.status === 'completed');

  // Only update contexts when user manually toggles (not on initial load)
  const handleAvailabilityToggle = (value) => {
    console.log('Toggling availability to:', value);
    console.log('Current nurse ID for update:', currentNurse?.id);
    
    setIsAvailable(value);
    
    if (currentNurse) {
      // Update nurse availability in contexts
      updateNurseAvailability(user?.id || 'nurse-1', value);
      updateNurseActiveStatus(currentNurse.id, value);
    }
    
    Alert.alert(
      value ? 'Available' : 'Offline',
      value 
        ? 'You are now available for new assignments.' 
        : 'You are marked as offline. New assignments will be paused.',
      [{ text: 'OK' }]
    );
  };

  const handleCardPress = (cardType) => {
    if (selectedCard === cardType) {
      // If same card is pressed, deselect and show all
      setSelectedCard(null);
    } else {
      // Select new card to filter appointments
      setSelectedCard(cardType);
    }
  };

  // Get appointments to display based on selection
  const getFilteredAppointments = () => {
    if (!Array.isArray(nurseAppointments)) {
      console.log('WARNING: nurseAppointments is not an array:', nurseAppointments);
      return [];
    }
    
    switch (selectedCard) {
      case 'pending':
        return nurseAppointments.filter(app => app.status === 'nurse_assigned');
      case 'active':
        return nurseAppointments.filter(app => app.status === 'confirmed'); 
      case 'completed':
        return nurseAppointments.filter(app => app.status === 'completed');
      default:
        return nurseAppointments.filter(app => app.status === 'nurse_assigned');
    }
  };

  const displayedAppointments = getFilteredAppointments();
  console.log('Displayed appointments:', displayedAppointments, 'selectedCard:', selectedCard);

  const handleCompleteAppointment = async (appointmentId) => {
    Alert.alert(
      'Complete Appointment',
      'Mark this appointment as completed?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Complete',
          onPress: async () => {
            try {
              await completeAppointment(appointmentId);
              Alert.alert('Success', 'Appointment marked as completed!');
            } catch (error) {
              Alert.alert('Error', 'Failed to complete appointment. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleSelfAssign = async (appointmentId) => {
    Alert.alert(
      'Assignment Response',
      'Would you like to accept or decline this assignment?',
      [
        { 
          text: 'Decline', 
          style: 'destructive',
          onPress: () => handleDeclineAssignment(appointmentId)
        },
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Accept',
          onPress: async () => {
            try {
              await acceptAppointment(appointmentId);
              Alert.alert('Success', 'Assignment accepted! It will now appear in your Active appointments.');
            } catch (error) {
              Alert.alert('Error', 'Failed to accept assignment. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleDeclineAssignment = async (appointmentId) => {
    Alert.prompt(
      'Decline Assignment',
      'Please provide a reason for declining (optional):',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Decline',
          onPress: async (reason) => {
            try {
              await declineAppointment(appointmentId, reason || '');
              Alert.alert('Assignment Declined', 'The assignment has been sent back to the admin for reassignment.');
            } catch (error) {
              Alert.alert('Error', 'Failed to decline assignment. Please try again.');
            }
          },
        },
      ],
      'plain-text'
    );
  };

  const onRefresh = () => {
    setRefreshing(true);
    
    // Simulate API call to refresh appointments
    setTimeout(() => {
      // Reset any filters and show all appointments
      setSelectedCard(null);
      
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
    return (
      <View style={styles.appointmentCard}>
        <Text>Test Card</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAvoidingView 
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
      >
        <LinearGradient
          colors={GRADIENTS.primary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <View style={styles.headerContent}>
            <TouchableWeb 
              onPress={() => navigation.navigate('Notifications')}
              style={styles.notificationButton}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons name="bell-outline" size={26} color={COLORS.white} />
              {unreadCount > 0 && (
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationBadgeText}>{unreadCount}</Text>
                </View>
              )}
            </TouchableWeb>

            <View style={styles.headerInfo}>
              <Text style={styles.headerTitle}>My Appointments</Text>
              <View style={styles.availabilityToggle}>
                <Text style={styles.availabilityLabel}>Available</Text>
                <Switch
                  value={isAvailable}
                  onValueChange={handleAvailabilityToggle}
                  trackColor={{ false: COLORS.lightGray, true: COLORS.success }}
                  thumbColor={isAvailable ? COLORS.white : COLORS.gray}
                />
              </View>
            </View>

            <TouchableWeb 
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
            style={[styles.statCard, selectedCard === 'pending' && styles.selectedCard]}
            onPress={() => handleCardPress('pending')}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={selectedCard === 'pending' ? ['#FF6B35', '#FF4500'] : ['#FF6B35', '#FF4500']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.statGradient, selectedCard === 'pending' && styles.selectedCard]}
            >
              <Text style={styles.statNumber}>{pendingAssignments.length}</Text>
              <Text style={styles.statLabel}>Pending</Text>
            </LinearGradient>
          </TouchableWeb>

          <TouchableWeb 
            style={[styles.statCard, selectedCard === 'active' && styles.selectedCard]}
            onPress={() => handleCardPress('active')}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={selectedCard === 'active' ? ['#4CAF50', '#2E7D32'] : ['#4CAF50', '#2E7D32']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.statGradient, selectedCard === 'active' && styles.selectedCard]}
            >
              <Text style={styles.statNumber}>{activeAppointments.length}</Text>
              <Text style={styles.statLabel}>Active</Text>
            </LinearGradient>
          </TouchableWeb>

          <TouchableWeb 
            style={[styles.statCard, selectedCard === 'completed' && styles.selectedCard]}
            onPress={() => handleCardPress('completed')}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={selectedCard === 'completed' ? ['#2196F3', '#1976D2'] : ['#2196F3', '#1976D2']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.statGradient, selectedCard === 'completed' && styles.selectedCard]}
            >
              <Text style={styles.statNumber}>{completedAppointments.length}</Text>
              <Text style={styles.statLabel}>Completed</Text>
            </LinearGradient>
          </TouchableWeb>
        </View>

        {/* Appointments List */}
        <ScrollView style={styles.appointmentsContainer} showsVerticalScrollIndicator={false}>
          {displayedAppointments.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="calendar-blank" size={64} color={COLORS.textLight} />
              <Text style={styles.emptyStateText}>No appointments found</Text>
            </View>
          ) : (
            (displayedAppointments || []).map((appointment) => (
              <AppointmentCard key={appointment.id} appointment={appointment} />
            ))
          )}
        </ScrollView>

        <View style={styles.bottomPadding} />
      </KeyboardAvoidingView>
    </SafeAreaView>
    </SafeAreaView>
  );
}

// Simple AppointmentCard component
const AppointmentCard = ({ appointment, onAccept, onDecline, showActions = false }) => {
  return (
    <View style={styles.appointmentCard}>
      <View style={styles.appointmentHeader}>
        <View style={styles.appointmentInfo}>
          <Text style={styles.patientName}>{appointment.patientName}</Text>
          <Text style={styles.serviceName}>{appointment.service}</Text>
          <Text style={styles.appointmentDate}>
            {new Date(appointment.scheduledDate).toLocaleDateString()} at {appointment.scheduledTime}
          </Text>
        </View>
        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>{appointment.status}</Text>
        </View>
      </View>
      {showActions && (
        <View style={styles.actionContainer}>
          <TouchableOpacity style={styles.acceptButton} onPress={() => onAccept(appointment.id)}>
            <Text style={styles.acceptButtonText}>Accept</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.declineButton} onPress={() => onDecline(appointment.id)}>
            <Text style={styles.declineButtonText}>Decline</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};
              colors={getStatusColor(appointment.status) === COLORS.success 
                ? [COLORS.success, COLORS.success + 'CC'] 
                : getStatusColor(appointment.status) === COLORS.primary
                ? [COLORS.primary, COLORS.primary + 'CC']
                : [COLORS.warning, COLORS.warning + 'CC']
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.statusBadge}
            >
              <Text style={styles.statusText}>
                {appointment.status.toUpperCase()}
              </Text>
            </LinearGradient>
            {appointment.status === 'nurse_assigned' && (
              <TouchableOpacity
                style={styles.selfAssignButton}
                onPress={() => handleSelfAssign(appointment.id)}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons name="check" size={20} color={COLORS.success} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.appointmentDetails}>
          <View style={styles.detailRow}>
            <MaterialCommunityIcons name="calendar" size={16} color={COLORS.primary} />
            <Text style={styles.detailText}>{appointment.preferredDate} at {appointment.preferredTime}</Text>
          </View>
          <View style={styles.detailRow}>
            <MaterialCommunityIcons name="medical-bag" size={16} color={COLORS.primary} />
            <Text style={styles.detailText}>Service: {appointment.service}</Text>
          </View>
          <View style={styles.detailRow}>
            <MaterialCommunityIcons name="map-marker" size={16} color={COLORS.primary} />
            <Text style={styles.detailText}>{appointment.address}</Text>
          </View>
          <View style={styles.detailRow}>
            <MaterialCommunityIcons name="phone" size={16} color={COLORS.primary} />
            <TouchableOpacity onPress={() => handleCallPatient(appointment.phone)}>
              <Text style={[styles.detailText, styles.phoneText]}>{appointment.phone}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Editable Notes Section */}
        <View style={styles.notesSection}>
          <View style={styles.notesHeader}>
            <Text style={styles.notesLabel}>Notes:</Text>
            {!isEditingNotes ? (
              <TouchableOpacity
                style={styles.editNotesButton}
                onPress={() => setIsEditingNotes(true)}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons name="pencil" size={16} color={COLORS.primary} />
              </TouchableOpacity>
            ) : (
              <View style={styles.notesActions}>
                <TouchableOpacity
                  style={styles.saveNotesButton}
                  onPress={saveNotes}
                  activeOpacity={0.7}
                >
                  <MaterialCommunityIcons name="check" size={16} color={COLORS.success} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.cancelNotesButton}
                  onPress={() => {
                    setIsEditingNotes(false);
                    setEditedNotes(appointment.notes || '');
                  }}
                  activeOpacity={0.7}
                >
                  <MaterialCommunityIcons name="close" size={16} color={COLORS.error} />
                </TouchableOpacity>
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

        {/* Action Buttons */}
        {appointment.status === 'nurse_assigned' && (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, styles.declineButton]}
              onPress={() => handleDeclineAssignment(appointment.id)}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons name="close" size={16} color={COLORS.white} />
              <Text style={styles.actionButtonText}>Decline</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.actionButton, styles.acceptButton]}
              onPress={() => handleSelfAssign(appointment.id)}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={GRADIENTS.success}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.actionButtonGradient}
              >
                <MaterialCommunityIcons name="check" size={16} color={COLORS.white} />
                <Text style={styles.actionButtonText}>Accept</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        {appointment.status === 'confirmed' && (
          <View style={styles.actionButtons}>
            <TouchableOpacity
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
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
    } catch (error) {
      console.error('Error in AppointmentCard:', error);
      return (
        <View style={styles.appointmentCard}>
          <Text>Error loading appointment</Text>
        </View>
      );
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAvoidingView 
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
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
            {unreadCount > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Text>
              </View>
            )}
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
              <Text style={styles.statLabel}>Active</Text>
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
            (displayedAppointments || []).map((appointment) => (
              appointment && appointment.id ? (
                <AppointmentCard key={appointment.id} appointment={appointment} />
              ) : null
            ))
          )}
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
  
  } catch (error) {
    console.error('Error in NurseAppointmentsScreen:', error);
    return (
      <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Error loading appointments. Please try again.</Text>
      </SafeAreaView>
    );
  }
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
    paddingHorizontal: 16, // Reduced padding for more space
    gap: 8, // Smaller gap for compact layout
    marginTop: 16, // Reduced margin
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    borderRadius: 20, // Smaller radius for more compact pills
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    marginHorizontal: 4, // Add spacing between pills
  },
  statGradient: {
    flex: 1,
    paddingHorizontal: 16, // Reduced horizontal padding
    paddingVertical: 8, // Reduced vertical padding for smaller size
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 36, // Much smaller height like the reference
    maxHeight: 40, // Limit maximum height
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
    fontSize: 12, // Smaller font to fit in compact pills
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.white,
    opacity: 1,
    textAlign: 'center',
    lineHeight: 14, // Tight line height for compact look
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
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 12,
    fontFamily: 'Poppins_700Bold',
    color: COLORS.white,
    textAlign: 'center',
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
  actionButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  declineButton: {
    backgroundColor: COLORS.error,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
  },
  acceptButton: {
    overflow: 'hidden',
  },
  actionButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
  },
  actionButtonText: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.white,
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
    borderColor: COLORS.white,
  },
  notificationBadgeText: {
    fontSize: 10,
    fontFamily: 'Poppins_700Bold',
    color: COLORS.white,
  },
});