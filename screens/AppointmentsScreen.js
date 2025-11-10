import TouchableWeb from "../components/TouchableWeb";
import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Modal,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, GRADIENTS, SPACING } from '../constants';
import { useAuth } from '../context/AuthContext';
import { useAppointments } from '../context/AppointmentContext';
import { useShifts } from '../context/ShiftContext';
import { useNotifications } from '../context/NotificationContext';
import InvoiceService from '../services/InvoiceService';

export default function AppointmentsScreen({ navigation }) {
  const { user } = useAuth();
  const { getUpcomingAppointments, getAppointmentHistory, appointments, clearAllAppointments, cancelAppointment } = useAppointments();
  const { shiftRequests } = useShifts(); // Add shift context to show approved shifts to patient
  const { sendNotificationToUser } = useNotifications();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState('upcoming');
  const [refreshKey, setRefreshKey] = useState(0);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);

  // Log user and context state on mount and updates
  // useEffect(() => {
  //   console.log('📱 AppointmentsScreen mounted/updated');
  //   console.log('  User:', user ? `${user.id} (${user.role})` : 'null');
  //   console.log('  ShiftRequests from context:', shiftRequests?.length || 0);
  // }, [user, shiftRequests]);

  // Clear all appointments function
  const handleClearAllAppointments = () => {
    Alert.alert(
      'Clear All Appointments',
      'Are you sure you want to delete ALL appointments? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Clear All', 
          style: 'destructive',
          onPress: async () => {
            await clearAllAppointments();
            Alert.alert('Success', 'All appointments have been cleared');
          }
        }
      ]
    );
  };

  // Handle viewing invoice with full data generation
  const handleViewInvoice = async (appointment) => {
    try {
      // Create comprehensive appointment data for invoice
      const appointmentData = {
        id: appointment.id,
        clientId: 'patient-current',
        clientName: 'You',
        clientEmail: 'patient@example.com',
        clientPhone: appointment.phone || '876-555-0100',
        clientAddress: appointment.address || '6 Reece Road, Kingston 10',
        serviceName: appointment.service,
        serviceType: appointment.service,
        appointmentDate: appointment.date,
        appointmentTime: appointment.time || appointment.scheduledTime || '10:00 AM',
        status: 'completed',
        notes: appointment.notes || 'Professional nursing services provided',
        duration: '45 mins',
        nurseId: appointment.nurseId || 'NURSE001',
        nurseName: appointment.nurseName || 'Care Professional',
        paymentMethod: 'Credit Card',
        isRecurring: false,
        totalSessions: 1
      };

      console.log('🔥 GENERATING INVOICE FOR PATIENT APPOINTMENT');
      const result = await InvoiceService.createInvoice(appointmentData);
      
      if (result.success) {
        console.log('✅ INVOICE GENERATED SUCCESSFULLY');
        
        // Close details modal and navigate to invoice display
        setDetailsModalVisible(false);
        setTimeout(() => {
          navigation.navigate('InvoiceDisplay', {
            invoiceData: result.invoice,
            clientName: 'You'
          });
        }, 300);
      } else {
        Alert.alert('Error', result.error || 'Failed to generate invoice');
      }
    } catch (error) {
      console.error('Error generating invoice:', error);
      Alert.alert('Error', 'Failed to generate invoice');
    }
  };

  // Force refresh when appointments change
  useEffect(() => {
    setRefreshKey(prev => prev + 1);
  }, [appointments, shiftRequests]);

  // Get patient ID first
  const patientId = user?.id;
  
  // Get real appointment data from context
  const upcomingAppointments = getUpcomingAppointments();
  const pastAppointments = getAppointmentHistory();
  
  // Get pending appointments that need patient action
  const pendingAppointments = React.useMemo(() => {
    return appointments.filter(appointment => {
      const matchesPatient = 
        appointment.patientId === patientId ||
        appointment.clientId === patientId ||
        appointment.userId === patientId ||
        (appointment.patientName === user?.name) ||
        (user?.role === 'patient' && !appointment.patientId); // Unassigned for testing
      
      return appointment.status === 'pending' && matchesPatient;
    });
  }, [appointments, patientId, user?.name, user?.role]);
  
  const approvedShifts = React.useMemo(() => {
    console.log('🔍 PATIENT PORTAL: Filtering approved shifts...');
    console.log('  Total shiftRequests:', shiftRequests?.length || 0);
    console.log('  Patient ID:', patientId);
    console.log('  User name:', user?.name);
    
    const filtered = shiftRequests.filter(shift => {
      const isApproved = shift.status === 'approved';
      
      // Enhanced client matching logic
      const matchesClient = 
        shift.clientId === patientId ||                    // Exact match
        shift.clientId === parseInt(patientId) ||          // String to number
        String(shift.clientId) === patientId ||            // Number to string
        shift.clientName === user?.name ||                 // Match by name
        (shift.clientId === 1 && patientId === 'PATIENT001') || // Test mapping: clientId 1 = PATIENT001
        (shift.clientId === '1' && patientId === 'PATIENT001') || // String version
        (shift.clientId === 1 && user?.username === 'testpatient') || // Username mapping
        (!shift.clientId && user?.role === 'patient') ||   // Unassigned shifts for patients
        (user?.role === 'patient' && shift.clientName && shift.clientName.toLowerCase().includes('test')); // Test users get test shifts
      
      if (isApproved) {
        console.log('  Shift:', shift.id, 'Status:', shift.status, 'ClientId:', shift.clientId, 'ClientName:', shift.clientName, 'Matches:', matchesClient);
      }
      
      return isApproved && matchesClient;
    });
    
    console.log('✅ PATIENT PORTAL: Filtered approved shifts:', filtered.length);
    if (filtered.length > 0) {
      console.log('  Approved shifts:', filtered.map(s => ({ id: s.id, service: s.service, clientId: s.clientId })));
    }
    
    return filtered;
  }, [shiftRequests, patientId, user?.name, user?.username, user?.role]);

  // Get completed shifts assigned to this patient for past appointments
  const completedShifts = React.useMemo(() => {
    const filtered = shiftRequests.filter(shift => {
      const isCompleted = shift.status === 'completed';
      
      // Match client
      const matchesClient = 
        shift.clientId === patientId ||                    // Exact match
        shift.clientId === parseInt(patientId) ||          // String to number
        String(shift.clientId) === patientId ||            // Number to string
        shift.clientName === user?.name ||                 // Match by name
        (shift.clientId === 1 && patientId === 'PATIENT001') || // Test mapping: clientId 1 = PATIENT001
        (shift.clientId === '1' && patientId === 'PATIENT001') || // String version
        (shift.clientId === 1 && user?.username === 'testpatient') || // Username mapping
        (user?.role === 'patient' && shift.clientName && shift.clientName.toLowerCase().includes('test')); // Test users get test shifts
      
      return isCompleted && matchesClient;
    });
    
    return filtered;
  }, [shiftRequests, patientId, user?.name, user?.username, user?.role]);
  
  // Combine appointments with approved shifts for patient
  const allUpcomingAppointments = [...upcomingAppointments, ...approvedShifts];
  const allPastAppointments = [...pastAppointments, ...completedShifts];
  
  // Get displayed appointments based on active tab
  const displayedAppointments = activeTab === 'upcoming' 
    ? allUpcomingAppointments 
    : activeTab === 'pending' 
    ? pendingAppointments 
    : allPastAppointments;

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed':
        return COLORS.success;
      case 'pending':
        return COLORS.warning;
      case 'completed':
        return COLORS.primary;
      default:
        return COLORS.textLight;
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'confirmed':
        return 'check-circle';
      case 'pending':
        return 'clock-outline';
      case 'completed':
        return 'checkbox-marked-circle';
      default:
        return 'circle-outline';
    }
  };

  // Check if patient is non-recurring (for invoice button visibility)
  const isNonRecurringPatient = (appointment) => {
    // For appointments, check if user has recurring appointments property set to false
    // This would typically come from user profile or appointment data
    // Since this is for completed appointments, we show invoice for non-recurring patients
    // If appointment doesn't explicitly indicate it's recurring, treat as non-recurring
    const isRecurring = appointment.isRecurring || 
                       appointment.hasRecurringAppointments || 
                       appointment.recurring ||
                       (user?.hasRecurringAppointments === true) ||
                       (appointment.serviceType && appointment.serviceType.includes('Recurring')) ||
                       (appointment.service && appointment.service.includes('Recurring'));
    
    console.log('🔍 Checking if appointment is non-recurring:', {
      appointmentId: appointment.id,
      isRecurring: appointment.isRecurring,
      hasRecurringAppointments: appointment.hasRecurringAppointments,
      userHasRecurring: user?.hasRecurringAppointments,
      service: appointment.service,
      finalIsRecurring: isRecurring,
      shouldShowInvoice: !isRecurring
    });
    
    return !isRecurring;
  };

  // Handle appointment cancellation
  const handleCancelAppointment = (appointment) => {
    Alert.alert(
      'Cancel Appointment',
      `Are you sure you want to cancel your appointment for ${appointment.service} on ${appointment.date}?`,
      [
        { text: 'No', style: 'cancel' },
        { 
          text: 'Yes, Cancel', 
          style: 'destructive',
          onPress: async () => {
            try {
              // In a real app, this would call an API to cancel the appointment
              // For now, we'll just show a success message
              Alert.alert(
                'Appointment Cancelled',
                'Your appointment has been cancelled successfully. You can rebook at any time.',
                [
                  { text: 'Book New Appointment', onPress: () => navigation.navigate('Book') },
                  { text: 'OK' }
                ]
              );
            } catch (error) {
              Alert.alert('Error', 'Failed to cancel appointment. Please try again.');
            }
          }
        }
      ]
    );
  };

  // Handle appointment rescheduling
  const handleRescheduleAppointment = (appointment) => {
    Alert.alert(
      'Reschedule Appointment',
      `Reschedule your appointment for ${appointment.service}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Reschedule', 
          onPress: () => {
            // Navigate to booking screen with pre-filled data
            navigation.navigate('Book', {
              reschedule: true,
              appointmentId: appointment.id,
              service: appointment.service,
              originalDate: appointment.date,
              originalTime: appointment.time
            });
          }
        }
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
        style={[styles.header, { paddingTop: insets.top + 20 }]}
      >
        <View style={styles.headerRow}>
          <View style={{ width: 44 }} />
          <Text style={styles.welcomeText}>My Appointments</Text>
          <View style={{ width: 44 }} />
        </View>
      </LinearGradient>

      {/* Tab Selector */}
      <View style={styles.tabContainer}>
        <TouchableWeb
          style={styles.tab}
          onPress={() => setActiveTab('pending')}
          activeOpacity={0.7}
        >
          {activeTab === 'pending' ? (
            <LinearGradient
              colors={GRADIENTS.header}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.activeTabGradient}
            >
              <Text style={styles.activeTabText}>
                Pending
              </Text>
            </LinearGradient>
          ) : (
            <View style={styles.inactiveTabContent}>
              <Text style={styles.tabText}>
                Pending
              </Text>
            </View>
          )}
        </TouchableWeb>
        <TouchableWeb
          style={styles.tab}
          onPress={() => setActiveTab('upcoming')}
          activeOpacity={0.7}
        >
          {activeTab === 'upcoming' ? (
            <LinearGradient
              colors={GRADIENTS.header}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.activeTabGradient}
            >
              <Text style={styles.activeTabText}>
                Upcoming
              </Text>
            </LinearGradient>
          ) : (
            <View style={styles.inactiveTabContent}>
              <Text style={styles.tabText}>
                Upcoming
              </Text>
            </View>
          )}
        </TouchableWeb>
        <TouchableWeb
          style={styles.tab}
          onPress={() => setActiveTab('past')}
          activeOpacity={0.7}
        >
          {activeTab === 'past' ? (
            <LinearGradient
              colors={GRADIENTS.header}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.activeTabGradient}
            >
              <Text style={styles.activeTabText}>
                Past
              </Text>
            </LinearGradient>
          ) : (
            <View style={styles.inactiveTabContent}>
              <Text style={styles.tabText}>
                Past
              </Text>
            </View>
          )}
        </TouchableWeb>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {displayedAppointments.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="calendar-blank" size={80} color={COLORS.border} />
            <Text style={styles.emptyTitle}>
              No {activeTab === 'pending' ? 'pending' : activeTab} appointments
            </Text>
            <Text style={styles.emptyText}>
              {activeTab === 'upcoming'
                ? 'Book a service to get started'
                : activeTab === 'pending'
                ? 'No appointments waiting for your confirmation'
                : 'Your completed appointments will appear here'}
            </Text>
            {(activeTab === 'upcoming' || activeTab === 'pending') && (
              <TouchableWeb
                style={styles.bookButton}
                onPress={() => navigation.navigate('Book')}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={GRADIENTS.header}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                  style={styles.bookButtonGradient}
                >
                  <MaterialCommunityIcons name="plus" size={20} color={COLORS.white} />
                  <Text style={styles.bookButtonText}>Book Appointment</Text>
                </LinearGradient>
              </TouchableWeb>
            )}
          </View>
        ) : (
          <View style={styles.appointmentsList}>
            {displayedAppointments.map((appointment) => {
              // Check if this is a shift or appointment
              const isShift = appointment.startTime && appointment.endTime && appointment.status === 'approved';
              const isConfirmed = appointment.status === 'confirmed' || appointment.status === 'approved' || appointment.status === 'nurse_assigned';
              const isRecurringInstance = appointment.isRecurringInstance || false;
              const recurringInfo = isRecurringInstance ? {
                instanceNumber: appointment.instanceNumber,
                totalInstances: appointment.totalInstances,
                frequency: appointment.recurringFrequency,
                seriesId: appointment.seriesId
              } : null;
              
              return (
              <View key={appointment.id} style={styles.appointmentCard}>
                {/* Simplified card for confirmed appointments (including shifts), pending appointments, and past appointments */}
                {((activeTab === 'upcoming' && isConfirmed) || activeTab === 'past' || activeTab === 'pending') ? (
                  <View style={styles.compactHeader}>
                    <MaterialCommunityIcons 
                      name={activeTab === 'pending' ? "alert" : (isShift ? "briefcase-check" : (isRecurringInstance ? "calendar-repeat" : "medical-bag"))} 
                      size={20} 
                      color={activeTab === 'past' ? COLORS.textLight : activeTab === 'pending' ? COLORS.warning : (isShift ? COLORS.accent : COLORS.primary)} 
                    />
                    <View style={styles.compactInfo}>
                      <Text style={styles.compactService}>
                        {appointment.service}
                        {isRecurringInstance && ` (${recurringInfo.instanceNumber}/${recurringInfo.totalInstances})`}
                      </Text>
                      {isRecurringInstance && (
                        <Text style={styles.recurringBadge}>
                          🔄 Recurring • {recurringInfo.frequency}
                        </Text>
                      )}
                    </View>
                    <TouchableWeb
                      style={styles.detailsButton}
                      activeOpacity={0.7}
                      onPress={() => {
                        setSelectedAppointment(appointment);
                        setDetailsModalVisible(true);
                      }}
                    >
                      <LinearGradient
                        colors={GRADIENTS.header}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.detailsButtonGradient}
                      >
                        <Text style={styles.detailsButtonText}>
                          {activeTab === 'pending' ? 'Details' : 'View'}
                        </Text>
                      </LinearGradient>
                    </TouchableWeb>
                  </View>
                ) : (
                  // Original detailed card for other statuses
                  <>
                <View style={styles.appointmentHeader}>
                  <View style={styles.appointmentTitleRow}>
                    <MaterialCommunityIcons 
                      name={isShift ? "briefcase-check" : "medical-bag"} 
                      size={24} 
                      color={isShift ? COLORS.accent : COLORS.primary} 
                    />
                    <Text style={styles.appointmentService}>
                      {isShift ? appointment.service : appointment.service}
                      {isShift ? ' (Confirmed)' : ''}
                    </Text>
                  </View>
                  <LinearGradient
                    colors={
                      isConfirmed
                        ? ['#4CAF50', '#2E7D32']
                        : [getStatusColor(appointment.status), getStatusColor(appointment.status)]
                    }
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.statusBadgeGradient}
                  >
                    <Text style={styles.statusText}>
                      {isConfirmed
                        ? 'CONFIRMED' 
                        : appointment.status.toUpperCase()
                      }
                    </Text>
                  </LinearGradient>
                </View>

                <View style={styles.appointmentDetails}>
                  <View style={styles.detailRow}>
                    <MaterialCommunityIcons name="calendar" size={18} color={COLORS.textLight} />
                    <Text style={styles.detailText}>
                      {isShift 
                        ? (appointment.date && !isNaN(new Date(appointment.date)) 
                            ? new Date(appointment.date).toLocaleDateString('en-US', { 
                                month: 'short', 
                                day: 'numeric', 
                                year: 'numeric' 
                              })
                            : appointment.date || appointment.preferredDate || 'N/A')
                        : (appointment.date && !isNaN(new Date(appointment.date)) 
                            ? new Date(appointment.date).toLocaleDateString('en-US', { 
                                month: 'short', 
                                day: 'numeric', 
                                year: 'numeric' 
                              })
                            : appointment.date || appointment.preferredDate || 'N/A')
                      }
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <MaterialCommunityIcons name="clock-outline" size={18} color={COLORS.textLight} />
                    <Text style={styles.detailText}>
                      {isShift 
                        ? `${appointment.startTime} - ${appointment.endTime}`
                        : (appointment.time || appointment.scheduledTime)
                      }
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <MaterialCommunityIcons name="account-circle" size={18} color={COLORS.textLight} />
                    <Text style={styles.detailText}>
                      {appointment.nurseName || 'Assigned Nurse'}
                    </Text>
                  </View>
                  {!isShift && (
                    <View style={styles.detailRow}>
                      <MaterialCommunityIcons name="map-marker" size={18} color={COLORS.textLight} />
                      <Text style={styles.detailText}>
                        {appointment.address || 'Home Visit'}
                      </Text>
                    </View>
                  )}
                </View>

                <View style={styles.appointmentFooter}>
                  {activeTab === 'upcoming' && !isShift && !isConfirmed && (
                    <>
                      <View style={styles.priceContainer}>
                        <Text style={styles.priceLabel}>Service Fee:</Text>
                        <Text style={styles.priceValue}>J$12,050</Text>
                      </View>
                      <View style={styles.actionButtons}>
                        <TouchableWeb style={styles.actionButton} activeOpacity={0.7}>
                          <MaterialCommunityIcons name="pencil" size={18} color={COLORS.primary} />
                        </TouchableWeb>
                        <TouchableWeb style={[styles.actionButton, styles.cancelButton]} activeOpacity={0.7}>
                          <MaterialCommunityIcons name="close" size={18} color={COLORS.error} />
                        </TouchableWeb>
                      </View>
                    </>
                  )}
                  {isShift && activeTab === 'upcoming' && (
                    <View style={styles.priceContainer}>
                      <Text style={styles.priceLabel}>Nurse:</Text>
                      <Text style={styles.priceValue}>{appointment.nurseName}</Text>
                    </View>
                  )}
                  {activeTab === 'pending' && !isShift && (
                    <View style={styles.centeredActionButtons}>
                      <TouchableWeb 
                        style={styles.rescheduleButton} 
                        activeOpacity={0.7}
                        onPress={() => handleRescheduleAppointment(appointment)}
                      >
                        <MaterialCommunityIcons name="calendar-edit" size={18} color={COLORS.primary} />
                        <Text style={styles.rescheduleButtonText}>Reschedule</Text>
                      </TouchableWeb>
                      <TouchableWeb 
                        style={styles.cancelAppointmentButton} 
                        activeOpacity={0.7}
                        onPress={() => handleCancelAppointment(appointment)}
                      >
                        <MaterialCommunityIcons name="close-circle" size={18} color={COLORS.error} />
                        <Text style={styles.cancelAppointmentButtonText}>Cancel</Text>
                      </TouchableWeb>
                    </View>
                  )}
                </View>
                  </>
                )}
              </View>
            );
            })}
          </View>
        )}

        {displayedAppointments.length > 0 && activeTab === 'upcoming' && (
          <TouchableWeb
            style={styles.addMoreButton}
            onPress={() => navigation.navigate('Book')}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={GRADIENTS.accent}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.addMoreGradient}
            >
              <MaterialCommunityIcons name="plus-circle" size={20} color={COLORS.white} />
              <Text style={styles.addMoreText}>Book Another Appointment</Text>
            </LinearGradient>
          </TouchableWeb>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Details Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={detailsModalVisible}
        onRequestClose={() => setDetailsModalVisible(false)}
      >
        <View style={styles.detailsModalOverlay}>
          <View style={styles.detailsModalContainer}>
            <View style={styles.detailsModalHeader}>
              <Text style={styles.detailsModalTitle}>Appointment Details</Text>
              <TouchableWeb onPress={() => setDetailsModalVisible(false)}>
                <MaterialCommunityIcons name="close" size={24} color={COLORS.text} />
              </TouchableWeb>
            </View>

            <ScrollView style={styles.detailsModalContent} showsVerticalScrollIndicator={false}>
              {selectedAppointment && (
                <>
                  <View style={styles.detailsSection}>
                    <Text style={styles.sectionTitle}>Service Information</Text>
                    <View style={styles.detailItem}>
                      <MaterialCommunityIcons name="medical-bag" size={20} color={COLORS.primary} />
                      <View style={styles.detailContent}>
                        <Text style={styles.detailLabel}>Service Type</Text>
                        <Text style={styles.detailValue}>{selectedAppointment.service || 'N/A'}</Text>
                      </View>
                    </View>
                    <View style={styles.detailItem}>
                      <MaterialCommunityIcons name="calendar" size={20} color={COLORS.primary} />
                      <View style={styles.detailContent}>
                        <Text style={styles.detailLabel}>Date</Text>
                        <Text style={styles.detailValue}>
                          {selectedAppointment.date && !isNaN(new Date(selectedAppointment.date))
                            ? new Date(selectedAppointment.date).toLocaleDateString('en-US', { 
                                month: 'short', 
                                day: 'numeric', 
                                year: 'numeric' 
                              })
                            : selectedAppointment.date || 'N/A'
                          }
                        </Text>
                      </View>
                    </View>
                    <View style={styles.detailItem}>
                      <MaterialCommunityIcons name="clock-outline" size={20} color={COLORS.primary} />
                      <View style={styles.detailContent}>
                        <Text style={styles.detailLabel}>Time</Text>
                        <Text style={styles.detailValue}>
                          {selectedAppointment.startTime && selectedAppointment.endTime
                            ? `${selectedAppointment.startTime} - ${selectedAppointment.endTime}`
                            : selectedAppointment.time || selectedAppointment.scheduledTime || 'N/A'}
                        </Text>
                      </View>
                    </View>
                    
                    <View style={styles.invoiceSection}>
                      <Text style={styles.invoiceLabel}>Invoice Management</Text>
                      
                      {/* Invoice History */}
                      <View style={styles.invoiceHistorySection}>
                        <Text style={styles.invoiceHistoryTitle}>Recent Invoices</Text>
                        {selectedAppointment.status === 'completed' ? (
                          <TouchableWeb
                            style={styles.invoiceHistoryItem}
                            onPress={() => handleViewInvoice(selectedAppointment)}
                            activeOpacity={0.7}
                          >
                            <View style={styles.invoiceHistoryInfo}>
                              <Text style={styles.invoiceHistoryId}>#{selectedAppointment.invoiceId || selectedAppointment.id?.slice(-6)}</Text>
                              {selectedAppointment.status === 'completed' && (
                                <Text style={styles.invoicePaidDate}>Paid: {selectedAppointment.date}</Text>
                              )}
                            </View>
                            <View style={styles.invoiceHistoryRight}>
                              <View style={[styles.invoiceHistoryStatus, { backgroundColor: '#4CAF50' }]}>
                                <Text style={styles.invoiceHistoryStatusText}>Emailed</Text>
                              </View>
                            </View>
                          </TouchableWeb>
                        ) : (
                          <TouchableWeb
                            style={styles.noInvoicesContainer}
                            onPress={() => handleViewInvoice(selectedAppointment)}
                            activeOpacity={0.7}
                          >
                            <MaterialCommunityIcons name="file-document-outline" size={40} color={COLORS.border} />
                            <Text style={styles.noInvoicesText}>No invoices generated yet</Text>
                            <Text style={styles.noInvoicesSubText}>Tap to generate and view invoice</Text>
                          </TouchableWeb>
                        )}
                      </View>
                    </View>
                  </View>

                  <View style={styles.detailsSection}>
                    <Text style={styles.sectionTitle}>Nurse Information</Text>
                    <View style={styles.detailItem}>
                      <MaterialCommunityIcons name="account-circle" size={20} color={COLORS.primary} />
                      <View style={styles.detailContent}>
                        <Text style={styles.detailLabel}>Assigned Nurse</Text>
                        <Text style={styles.detailValue}>
                          {selectedAppointment.nurseName || 'To be assigned'}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.detailsSection}>
                    <Text style={styles.sectionTitle}>Location</Text>
                    <View style={styles.detailItem}>
                      <MaterialCommunityIcons name="map-marker" size={20} color={COLORS.primary} />
                      <View style={styles.detailContent}>
                        <Text style={styles.detailLabel}>Address</Text>
                        <Text style={styles.detailValue}>
                          {selectedAppointment.address || 'Home Visit'}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {selectedAppointment.notes && selectedAppointment.notes.trim() && (
                    <View style={styles.detailsSection}>
                      <Text style={styles.sectionTitle}>Notes</Text>
                      <Text style={styles.detailsNotes}>{selectedAppointment.notes}</Text>
                    </View>
                  )}
                </>
              )}
            </ScrollView>

              {/* Action Buttons for Pending Appointments */}
              {selectedAppointment && selectedAppointment.status === 'pending' && (
                <View style={styles.modalFooter}>
                  <TouchableWeb
                    style={styles.modalCancelButton}
                    onPress={() => {
                      Alert.alert(
                        'Cancel Appointment',
                        'Are you sure you want to cancel this appointment?',
                        [
                          { text: 'No', style: 'cancel' },
                          {
                            text: 'Yes, Cancel',
                            style: 'destructive',
                            onPress: async () => {
                              try {
                                await cancelAppointment(selectedAppointment.id);
                                
                                // Send notification to admin about cancellation
                                try {
                                  await sendNotificationToUser(
                                    'admin',
                                    'Appointment Cancelled by Patient',
                                    `${user?.name || 'A patient'} has cancelled their appointment for ${selectedAppointment.service} on ${selectedAppointment.date}`,
                                    {
                                      type: 'appointment_cancelled',
                                      appointmentId: selectedAppointment.id,
                                      patientId: user?.id,
                                      patientName: user?.name,
                                      service: selectedAppointment.service,
                                      date: selectedAppointment.date,
                                      time: selectedAppointment.time || selectedAppointment.scheduledTime
                                    }
                                  );
                                  console.log('✅ Admin notified of appointment cancellation');
                                } catch (notifError) {
                                  console.error('Failed to send cancellation notification:', notifError);
                                }
                                
                                setDetailsModalVisible(false);
                                Alert.alert('Success', 'Appointment cancelled. Admin has been notified.');
                              } catch (error) {
                                Alert.alert('Error', 'Failed to cancel appointment');
                              }
                            }
                          }
                        ]
                      );
                    }}
                  >
                    <Text style={styles.modalCancelButtonText}>Cancel</Text>
                  </TouchableWeb>

                  <TouchableWeb
                    style={styles.modalRescheduleButton}
                    onPress={async () => {
                      setDetailsModalVisible(false);
                      
                      // Send notification to admin about reschedule request
                      try {
                        await sendNotificationToUser(
                          'admin',
                          'Appointment Reschedule Requested',
                          `${user?.name || 'A patient'} is rescheduling their appointment for ${selectedAppointment.service} (originally ${selectedAppointment.date})`,
                          {
                            type: 'appointment_reschedule',
                            appointmentId: selectedAppointment.id,
                            patientId: user?.id,
                            patientName: user?.name,
                            service: selectedAppointment.service,
                            originalDate: selectedAppointment.date,
                            originalTime: selectedAppointment.time || selectedAppointment.scheduledTime
                          }
                        );
                        console.log('✅ Admin notified of reschedule request');
                      } catch (notifError) {
                        console.error('Failed to send reschedule notification:', notifError);
                      }
                      
                      navigation.navigate('Book', { 
                        rescheduleAppointment: selectedAppointment 
                      });
                    }}
                  >
                    <LinearGradient
                      colors={GRADIENTS.header}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.modalRescheduleButtonGradient}
                    >
                      <MaterialCommunityIcons name="calendar-edit" size={18} color={COLORS.white} />
                      <Text style={styles.modalRescheduleButtonText}>Reschedule</Text>
                    </LinearGradient>
                  </TouchableWeb>
                </View>
              )}
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
  header: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  clearButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  welcomeText: {
    fontSize: 18,
    fontFamily: 'Poppins_700Bold',
    color: COLORS.white,
    opacity: 0.98,
    textAlign: 'center',
    alignSelf: 'center',
  },
  headerSubtitle: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.white,
    opacity: 0.9,
  },
  tabContainer: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 20,
    marginTop: 16,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
  },
  activeTabGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 20,
    minHeight: 36,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  inactiveTabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 20,
    minHeight: 36,
    backgroundColor: COLORS.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  tabText: {
    fontSize: 11,
    fontFamily: 'Poppins_700Bold',
    color: COLORS.textMuted,
  },
  activeTabText: {
    fontSize: 11,
    fontFamily: 'Poppins_700Bold',
    color: COLORS.white,
  },
  scrollView: {
    flex: 1,
  },
  appointmentsList: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  appointmentCard: {
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
  appointmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  appointmentTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  appointmentService: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.text,
    flex: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusBadgeGradient: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    minHeight: 36,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.white,
    textAlign: 'center',
  },
  appointmentDetails: {
    gap: 10,
    marginBottom: 16,
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
  appointmentFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  priceLabel: {
    fontSize: 13,
    fontFamily: 'Poppins_500Medium',
    color: COLORS.textLight,
  },
  priceValue: {
    fontSize: 18,
    fontFamily: 'Poppins_700Bold',
    color: COLORS.success, // Green color for money
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  centeredActionButtons: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: COLORS.error + '15',
  },
  rebookButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: COLORS.background,
  },
  rebookText: {
    fontSize: 13,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.accent,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingTop: 80,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.textLight,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  bookButton: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  bookButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    gap: 8,
  },
  bookButtonText: {
    fontSize: 15,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.white,
  },
  addMoreButton: {
    marginHorizontal: 20,
    marginTop: 8,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  addMoreGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  addMoreText: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.white,
  },
  bottomPadding: {
    height: 24,
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
  invoiceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.accent,
    marginRight: 8,
  },
  invoiceButtonText: {
    fontSize: 12,
    fontFamily: 'Poppins_500Medium',
    color: COLORS.accent,
    marginLeft: 4,
  },
  rescheduleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.primary,
    marginRight: 8,
  },
  rescheduleButtonText: {
    fontSize: 12,
    fontFamily: 'Poppins_500Medium',
    color: COLORS.primary,
    marginLeft: 4,
  },
  cancelAppointmentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.error + '15',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.error,
  },
  cancelAppointmentButtonText: {
    fontSize: 12,
    fontFamily: 'Poppins_500Medium',
    color: COLORS.error,
    marginLeft: 4,
  },
  // Compact confirmed appointment styles
  compactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  compactInfo: {
    flex: 1,
    marginLeft: 8,
  },
  compactService: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.text,
  },
  recurringBadge: {
    fontSize: 11,
    fontFamily: 'Poppins_500Medium',
    color: COLORS.primary,
    marginTop: 2,
  },
  compactDate: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.textLight,
    marginTop: 2,
  },
  confirmedButton: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  confirmedButtonGradient: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmedButtonText: {
    fontSize: 11,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.white,
  },
  // Details Modal Styles
  detailsModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  detailsModalContainer: {
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
    flexDirection: 'column',
    overflow: 'hidden',
  },
  detailsModalContent: {
    padding: 20,
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
    fontSize: 18,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.text,
  },
  detailsSection: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Poppins_700Bold',
    color: COLORS.text,
    marginBottom: 20,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
    paddingHorizontal: 0,
  },
  detailContent: {
    marginLeft: 16,
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.textLight,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 15,
    fontFamily: 'Poppins_500Medium',
    color: COLORS.text,
    lineHeight: 22,
  },
  detailsNotes: {
    fontSize: 15,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.text,
    lineHeight: 22,
    marginTop: 8,
  },
  // Invoice Section Styles
  invoiceSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  invoiceLabel: {
    fontSize: 12,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.textLight,
    marginBottom: 12,
  },
  invoiceHistorySection: {
    marginTop: 15,
  },
  invoiceHistoryTitle: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.text,
    marginBottom: 10,
  },
  invoiceHistoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 15,
    backgroundColor: COLORS.background,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  invoiceHistoryInfo: {
    flex: 1,
  },
  invoiceHistoryId: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.text,
  },
  invoiceHistoryDate: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.textLight,
    marginTop: 2,
  },
  invoiceHistoryRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  invoiceHistoryAmount: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.text,
  },
  invoiceHistoryStatus: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  invoiceHistoryStatusText: {
    fontSize: 10,
    fontFamily: 'Poppins_500Medium',
    color: COLORS.white,
  },
  invoicePaidDate: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.textLight,
    marginTop: 2,
  },
  noInvoicesContainer: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 15,
    backgroundColor: COLORS.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  noInvoicesText: {
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
    color: COLORS.textLight,
    marginTop: 8,
  },
  noInvoicesSubText: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.textLight,
    textAlign: 'center',
    marginTop: 4,
  },
  // Invoice Information Styles
  invoiceInfoContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.success + '10',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    gap: 12,
  },
  invoiceInfoTextContainer: {
    flex: 1,
  },
  invoiceInfoTitle: {
    fontSize: 15,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.success,
    marginBottom: 4,
  },
  invoiceInfoDescription: {
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.text,
    lineHeight: 18,
  },
  invoiceDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  // Invoice Preview Styles
  invoicePreview: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    marginTop: 8,
  },
  invoiceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    marginBottom: 16,
  },
  invoiceCompanyName: {
    fontSize: 16,
    fontFamily: 'Poppins_700Bold',
    color: COLORS.text,
  },
  invoiceCompanyDetails: {
    fontSize: 11,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.textLight,
    marginTop: 2,
  },
  invoiceNumberContainer: {
    alignItems: 'flex-end',
  },
  invoiceNumberLabel: {
    fontSize: 12,
    fontFamily: 'Poppins_700Bold',
    color: COLORS.textLight,
  },
  invoiceNumber: {
    fontSize: 18,
    fontFamily: 'Poppins_700Bold',
    color: COLORS.primary,
  },
  invoiceDetailsGrid: {
    marginBottom: 16,
  },
  invoiceDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  invoiceDetailLabel: {
    fontSize: 13,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.textLight,
  },
  invoiceDetailValue: {
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.text,
    textAlign: 'right',
    flex: 1,
    marginLeft: 16,
  },
  invoiceTable: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 12,
  },
  invoiceTableHeader: {
    flexDirection: 'row',
    backgroundColor: COLORS.lightGray,
    padding: 12,
  },
  invoiceTableHeaderText: {
    fontSize: 12,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.text,
  },
  invoiceTableRow: {
    flexDirection: 'row',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  invoiceTableCell: {
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.text,
  },
  invoiceTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: COLORS.primary + '10',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  invoiceTotalLabel: {
    fontSize: 14,
    fontFamily: 'Poppins_700Bold',
    color: COLORS.text,
  },
  invoiceTotalAmount: {
    fontSize: 16,
    fontFamily: 'Poppins_700Bold',
    color: COLORS.primary,
  },
  invoiceStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.success + '15',
    borderRadius: 8,
    padding: 8,
    gap: 6,
  },
  invoiceStatusText: {
    fontSize: 12,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.success,
  },
  // Modal Footer Action Buttons
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
    color: COLORS.error,
    fontSize: 15,
    fontFamily: 'Poppins_600SemiBold',
  },
  modalRescheduleButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  modalRescheduleButtonGradient: {
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  modalRescheduleButtonText: {
    color: COLORS.white,
    fontSize: 15,
    fontFamily: 'Poppins_600SemiBold',
  },
});
