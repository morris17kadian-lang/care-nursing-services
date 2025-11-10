import { TouchableWeb } from "../components/TouchableWeb";
import React, { useState, useContext, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Modal,
  Alert,
  Image,
  RefreshControl,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, GRADIENTS, SPACING } from '../constants';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { useAppointments } from '../context/AppointmentContext';
import { useNurses } from '../context/NurseContext';
import { useShifts } from '../context/ShiftContext';
import { useProfileEdit } from '../context/ProfileEditContext';
import InvoiceService from '../services/InvoiceService';

export default function AdminDashboardScreen({ navigation, route }) {
  const { user, createNurseAccount } = useAuth();
  const { unreadCount, sendNotificationToUser } = useNotifications();
  const insets = useSafeAreaInsets();
  const { 
    appointments, 
    getAppointmentsByStatus, 
    assignNurse, 
    getAvailableNurses,
    clearCompletedAppointments,
    clearAllAppointments,
    refreshAppointments,
    cancelAppointment
  } = useAppointments();
  const { nurses, getAvailableNurses: getAvailableNursesFromContext } = useNurses();
  const { 
    getPendingShiftRequests, 
    approveShiftRequest, 
    denyShiftRequest,
    shiftRequests,
    refreshShiftRequests,
    clearAllShiftRequests
  } = useShifts();
  const { getPendingEditRequests, approveEditRequest, denyEditRequest } = useProfileEdit();
  
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [createNurseModalVisible, setCreateNurseModalVisible] = useState(false);
  const [appointmentDetailsModalVisible, setAppointmentDetailsModalVisible] = useState(false);
  const [nurseDetailsModalVisible, setNurseDetailsModalVisible] = useState(false);
  const [shiftRequestModalVisible, setShiftRequestModalVisible] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [selectedAppointmentDetails, setSelectedAppointmentDetails] = useState(null);
  const [selectedNurseDetails, setSelectedNurseDetails] = useState(null);
  const [selectedShiftRequest, setSelectedShiftRequest] = useState(null);
  const [nurseName, setNurseName] = useState('');
  const [nurseEmail, setNurseEmail] = useState('');
  const [nursePhone, setNursePhone] = useState('');
  const [nurseSpecialization, setNurseSpecialization] = useState('');
  const [nurseCode, setNurseCode] = useState('');
  const [staffRole, setStaffRole] = useState('nurse'); // 'nurse' or 'admin'
  const [selectedCard, setSelectedCard] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0); // Add refresh trigger
  const [lastShiftCount, setLastShiftCount] = useState(0); // Track changes
  const [refreshing, setRefreshing] = useState(false);

  // Pull to refresh handler
  const onRefresh = async () => {
    setRefreshing(true);
    console.log('🔄 Pull to refresh triggered');
    try {
      await Promise.all([
        refreshAppointments(),
        refreshShiftRequests()
      ]);
      console.log('✅ Refresh complete');
    } catch (error) {
      console.error('❌ Refresh error:', error);
    } finally {
      setRefreshing(false);
    }
  };

  // Clear all AsyncStorage data for testing
  const clearAllData = async () => {
    Alert.alert('Clear All Data', 'This will clear all appointments and shift data. Are you sure?', [
      {
        text: 'Cancel',
        onPress: () => {},
        style: 'cancel'
      },
      {
        text: 'Clear All',
        onPress: async () => {
          try {
            // Clear from contexts first
            await clearAllAppointments();
            await clearAllShiftRequests();
            
            // Then clear from AsyncStorage
            const keysToRemove = [
              '@care_appointments',
              '@care_shift_requests_global',
              '@care_nurses',
              '@care_appointments_global',
              '@ShiftContext_shifts',
              '@AppointmentContext_appointments',
              '@NurseContext_nurses',
            ];
            
            await Promise.all(keysToRemove.map(key => AsyncStorage.removeItem(key)));
            
            // Also clear all keys that match patterns
            const allKeys = await AsyncStorage.getAllKeys();
            const keysToDelete = allKeys.filter(key => 
              key.includes('appointment') || 
              key.includes('shift') || 
              key.includes('nurse') ||
              key.includes('care')
            );
            await Promise.all(keysToDelete.map(key => AsyncStorage.removeItem(key)));
            
            Alert.alert('Success', 'All data cleared. Restarting...');
            // Force refresh
            window.location.reload?.();
          } catch (error) {
            Alert.alert('Error', 'Failed to clear data: ' + error.message);
          }
        },
        style: 'destructive'
      }
    ]);
  };

  // Handle navigation parameters from notifications
  useEffect(() => {
    if (route?.params?.initialTab) {
      setSelectedCard(route.params.initialTab);
      
      // If highlighting a specific shift request, open the modal
      if (route.params.highlightShiftRequest && route.params.initialTab === 'pending') {
        const shiftRequest = getPendingShiftRequests().find(
          request => request.id === route.params.highlightShiftRequest
        );
        if (shiftRequest) {
          setSelectedShiftRequest(shiftRequest);
          setShiftRequestModalVisible(true);
        }
      }
      
      // Clear the params after handling
      navigation.setParams({ 
        initialTab: undefined, 
        highlightShiftRequest: undefined 
      });
    }
  }, [route?.params, navigation]);

  // Get appointments from context - Fix duplicate and count issues
  const allAppointments = appointments || [];
  const pendingAssignments = getAppointmentsByStatus('pending') || []; // Only unassigned appointments
  const nurseAssignedAppointments = getAppointmentsByStatus('nurse_assigned') || []; // Assigned but waiting for nurse response
  const confirmedAppointments = getAppointmentsByStatus('confirmed') || [];
  const completedAppointments = getAppointmentsByStatus('completed') || [];
  const availableNurses = getAvailableNursesFromContext() || []; // Use NurseContext instead of AppointmentContext
  
  // Get shift data to include in appointment sections - MEMOIZED
  const activeShifts = useMemo(
    () => shiftRequests?.filter(request => request.status === 'active') || [],
    [shiftRequests]
  );
  
  const completedShifts = useMemo(
    () => shiftRequests?.filter(request => request.status === 'completed') || [],
    [shiftRequests]
  );
  
  const confirmedShifts = useMemo(
    () => shiftRequests?.filter(request => request.status === 'approved') || [],
    [shiftRequests]
  );
  
  // Get pending shift requests - MEMOIZED
  const pendingShiftRequests = useMemo(() => {
    const pending = getPendingShiftRequests() || [];
    console.log('🔍 ADMIN: getPendingShiftRequests returned:', pending.length, 'pending requests');
    console.log('🔍 ADMIN: Total shiftRequests in context:', shiftRequests?.length || 0);
    if (pending.length > 0) {
      console.log('📋 ADMIN: Pending requests details:', pending.map(r => ({ 
        id: r.id, 
        nurseId: r.nurseId,
        nurseName: r.nurseName,
        service: r.service, 
        status: r.status 
      })));
    }
    return pending;
  }, [shiftRequests, getPendingShiftRequests]);

  // Get pending profile edit requests - MEMOIZED
  const pendingProfileEditRequests = useMemo(
    () => getPendingEditRequests() || [],
    [getPendingEditRequests]
  );
  
  // Combined data for admin display
  const allConfirmedAppointments = [...confirmedAppointments, ...confirmedShifts];
  const allActiveAppointments = [...confirmedAppointments, ...activeShifts]; // Active includes confirmed + active shifts
  const allCompletedAppointments = [...completedAppointments, ...completedShifts];
  
  // Helper function to format shift data to look like appointment data
  const formatShiftAsAppointment = (shift) => {
    // Mock client data lookup - in real app this would fetch from client management
    const getClientDetails = (clientId, clientName) => {
      // Mock client database - updated with PATIENT001 details
      const clients = {
        '1': { email: 'testpatient@care.com', phone: '+1 (555) 987-6543', address: '456 Oak Ave, Town, State 67890' },
        'PATIENT001': { email: 'testpatient@care.com', phone: '+1 (555) 987-6543', address: '456 Oak Ave, Town, State 67890' },
        'patient-001': { email: 'testpatient@care.com', phone: '+1 (555) 987-6543', address: '456 Oak Ave, Town, State 67890' }
      };
      
      return clients[clientId] || clients[clientName] || {
        email: 'client@care.com',
        phone: '+1 (555) 000-0000', 
        address: 'Address on file'
      };
    };

    const clientDetails = getClientDetails(shift.clientId, shift.clientName);

    const formattedShift = {
      ...shift,
      patientName: shift.clientName || 'Shift Assignment',
      serviceName: shift.service,
      scheduledTime: `${shift.date} ${shift.startTime || ''}`.trim(),
      duration: '1 hour', // default duration
      nurseAssigned: shift.nurseName || 'Assigned Nurse',
      // Include client contact details
      email: clientDetails.email,
      phone: clientDetails.phone,
      address: clientDetails.address,
      isShift: true, // flag to identify shifts
      type: shift.status === 'active' ? 'active_shift' : 
            shift.status === 'completed' ? 'completed_shift' : 
            'approved_shift'
    };

    return formattedShift;
  };
  
  // Format shifts before combining - MEMOIZED to prevent re-renders
  const formattedConfirmedShifts = useMemo(
    () => confirmedShifts.map(formatShiftAsAppointment),
    [confirmedShifts]
  );
  const formattedActiveShifts = useMemo(
    () => activeShifts.map(formatShiftAsAppointment),
    [activeShifts]
  );
  const formattedCompletedShifts = useMemo(
    () => completedShifts.map(formatShiftAsAppointment),
    [completedShifts]
  );
  
  // Update combined arrays with formatted data - MEMOIZED
  const finalConfirmedAppointments = useMemo(
    () => [...confirmedAppointments, ...formattedConfirmedShifts],
    [confirmedAppointments, formattedConfirmedShifts]
  );
  const finalActiveAppointments = useMemo(
    () => [...confirmedAppointments, ...formattedActiveShifts],
    [confirmedAppointments, formattedActiveShifts]
  );
  const finalCompletedAppointments = useMemo(
    () => [...completedAppointments, ...formattedCompletedShifts],
    [completedAppointments, formattedCompletedShifts]
  );
  
  // Only log when shift counts change to avoid spam
  useEffect(() => {
    const currentCount = shiftRequests?.length || 0;
    const currentActiveCount = formattedActiveShifts.length;
    const currentCompletedCount = formattedCompletedShifts.length;
    
    if (currentCount !== lastShiftCount) {
      console.log('🏥 ADMIN: Total shift requests:', currentCount);
      console.log('⏳ ADMIN: Pending shift requests:', pendingShiftRequests.length);
      console.log('✅ ADMIN: Active shifts:', currentActiveCount);
      console.log('✔️ ADMIN: Completed shifts:', currentCompletedCount);
      console.log('📋 ADMIN: Confirmed/Approved shifts:', formattedConfirmedShifts.length);
      
      if (currentCount > 0) {
        console.log('📊 ADMIN: All shift requests:', shiftRequests.map(r => ({ 
          id: r.id, 
          nurseId: r.nurseId, 
          service: r.service, 
          status: r.status 
        })));
      }
      
      if (currentCompletedCount > 0) {
        console.log('🎉 ADMIN: Completed shifts details:', formattedCompletedShifts.map(s => ({
          id: s.id,
          clientName: s.clientName,
          service: s.service,
          status: s.status,
          actualStartTime: s.actualStartTime,
          actualEndTime: s.actualEndTime
        })));
      }
      
      setLastShiftCount(currentCount);
    }
  }, [shiftRequests?.length, pendingShiftRequests.length, lastShiftCount, formattedActiveShifts.length, formattedCompletedShifts.length, formattedConfirmedShifts.length]);

  // Add polling for new shift requests
  useEffect(() => {
    // Immediate refresh when admin dashboard loads
    refreshShiftRequests();
    
    // Reduced polling frequency to prevent log spam
    const interval = setInterval(async () => {
      await refreshShiftRequests();
      setRefreshKey(prev => prev + 1);
    }, 600000); // 10 minutes - use pull-to-refresh for immediate updates
    
    return () => clearInterval(interval);
  }, []); // Empty dependency - only run on mount

  // Refresh data when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      // Only log once when focused, not repeatedly
      const refreshData = async () => {
        await refreshShiftRequests();
        setRefreshKey(prev => prev + 1);
        
        // Process any due recurring invoices when admin accesses dashboard
        try {
          const processedCount = await InvoiceService.processDueRecurringInvoices();
          if (processedCount > 0) {
            console.log(`📋 Processed ${processedCount} recurring invoices`);
          }
        } catch (error) {
          console.error('Error processing recurring invoices:', error);
        }
      };
      refreshData();
    }, []) // Remove refreshShiftRequests dependency to prevent repeated calls
  );

  // Total appointments count (including shifts)
  const totalAppointmentsCount = pendingAssignments.length + nurseAssignedAppointments.length + finalConfirmedAppointments.length + finalCompletedAppointments.length;

  // Combine pending and nurse_assigned for display purposes, but track them separately for counts
  const allPendingForDisplay = [...pendingAssignments, ...nurseAssignedAppointments];

  // Clean logging - only show counts when issues occur
  useEffect(() => {
    // Only log critical issues, not routine operations
    if (completedAppointments.length > 0 && completedAppointments.some(apt => !apt.completionNotes && !apt.nurseNotes)) {
      console.log('Admin Dashboard - Some completed appointments missing notes');
    }
  }, [completedAppointments.length]);

  const activeNurses = getAvailableNursesFromContext();

  const handleAssignNurse = (appointment) => {
    console.log('Opening assign modal for appointment:', appointment.id);
    console.log('Available nurses from context:', availableNurses);
    setSelectedAppointment(appointment);
    setAssignModalVisible(true);
  };

  const handleViewAppointmentDetails = (appointment) => {
    // Ensure patient contact info is included - check all possible field names
    const appointmentWithDetails = {
      ...appointment,
      // Map email from various possible field names
      email: appointment.email || 
             appointment.patientEmail || 
             appointment.clientEmail || 
             appointment.patient?.email ||
             'N/A',
      // Map phone from various possible field names
      phone: appointment.phone || 
             appointment.patientPhone || 
             appointment.clientPhone || 
             appointment.patient?.phone ||
             'N/A',
    };
    setSelectedAppointmentDetails(appointmentWithDetails);
    setAppointmentDetailsModalVisible(true);
  };

  const confirmAssignment = async (nurse) => {
    console.log('Confirming assignment:', {
      selectedAppointment,
      nurse,
      appointmentId: selectedAppointment?.id,
      nurseId: nurse?.id
    });
    
    Alert.alert(
      'Confirm Assignment',
      `Assign ${selectedAppointment?.patientName || selectedAppointment?.client || 'this appointment'} to ${nurse.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              console.log('Attempting to assign nurse:', selectedAppointment.id, nurse.id);
              await assignNurse(selectedAppointment.id, nurse.id);
              
              // Send notification to the assigned nurse
              try {
                await sendNotificationToUser(
                  nurse.id,
                  'nurse',
                  'New Appointment Assignment',
                  `You have been assigned to ${selectedAppointment.patientName || 'a patient'} for ${selectedAppointment.service || 'an appointment'} on ${selectedAppointment.date || selectedAppointment.preferredDate || 'TBD'}`,
                  {
                    type: 'appointment_assigned',
                    appointmentId: selectedAppointment.id,
                    patientName: selectedAppointment.patientName,
                    service: selectedAppointment.service,
                    date: selectedAppointment.date || selectedAppointment.preferredDate
                  }
                );
                console.log('✅ Notification sent to nurse:', nurse.id);
              } catch (notifError) {
                console.error('Failed to send notification to nurse:', notifError);
              }
              
              Alert.alert('Success', `Appointment has been assigned to ${nurse.name}!`);
              setAssignModalVisible(false);
              setSelectedAppointment(null);
            } catch (error) {
              console.error('Assignment error:', error);
              Alert.alert('Error', 'Failed to assign nurse. Please try again.');
            }
          },
        },
      ]
    );
  };

  const generateNurseCode = () => {
    // Generate a unique code based on role
    const prefix = staffRole === 'admin' ? 'ADMIN' : 'NURSE';
    const code = prefix + Math.floor(100 + Math.random() * 900);
    setNurseCode(code);
  };

  const handleCreateNurse = async () => {
    if (!nurseName || !nurseEmail || !nursePhone) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (staffRole === 'nurse' && !nurseSpecialization) {
      Alert.alert('Error', 'Please enter a specialization for the nurse');
      return;
    }

    if (!nurseCode) {
      Alert.alert('Error', `Please generate a ${staffRole} code`);
      return;
    }

    // Create staff account in the system
    const staffData = {
      name: nurseName,
      email: nurseEmail,
      phone: nursePhone,
      role: staffRole,
    };

    // Add specialization for nurses
    if (staffRole === 'nurse') {
      staffData.specialization = nurseSpecialization;
      staffData.nurseCode = nurseCode;
    } else {
      staffData.code = nurseCode;
    }

    const result = await createNurseAccount(staffData);

    if (result.success) {
      const roleTitle = staffRole === 'admin' ? 'Admin' : 'Nurse';
      Alert.alert(
        `${roleTitle} Account Created`,
        `${nurseName} has been created with:\n\nCode: ${result.code || nurseCode}\nTemporary Password: temp123\n\nShare these credentials with the ${staffRole} for first login. They should change the password after logging in.`,
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
              setStaffRole('nurse');
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

  // Shift request handlers
  const handleShiftRequestDetails = (shiftRequest) => {
    setSelectedShiftRequest(shiftRequest);
    setShiftRequestModalVisible(true);
  };

  const handleApproveEditRequest = async (request) => {
    Alert.alert(
      'Approve Edit Request',
      `Allow ${request.nurseName} to edit their profile?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: async () => {
            try {
              // Approve the edit request
              await approveEditRequest(request.id, request.nurseId);
              
              // Send notification to nurse
              await sendNotificationToUser(
                request.nurseId,
                'nurse',
                'Profile Edit Approved',
                'Your profile edit request has been approved. You can now edit your profile for the next 30 minutes.',
                {
                  type: 'profile_edit_approved',
                  requestId: request.id
                }
              );
              
              Alert.alert('Success', 'Edit request approved. The nurse can now edit their profile.');
            } catch (error) {
              console.error('Failed to approve edit request:', error);
              Alert.alert('Error', 'Failed to approve edit request. Please try again.');
            }
          }
        }
      ]
    );
  };

  const handleDenyEditRequest = async (request) => {
    Alert.alert(
      'Deny Edit Request',
      `Deny edit request from ${request.nurseName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Deny',
          style: 'destructive',
          onPress: async () => {
            try {
              // Deny the edit request
              await denyEditRequest(request.id);
              
              // Send notification to nurse
              await sendNotificationToUser(
                request.nurseId,
                'nurse',
                'Profile Edit Request Denied',
                'Your profile edit request was not approved at this time. Please contact the administrator for more information.',
                {
                  type: 'profile_edit_denied',
                  requestId: request.id
                }
              );
              
              Alert.alert('Request Denied', 'The edit request has been denied.');
            } catch (error) {
              console.error('Failed to deny edit request:', error);
              Alert.alert('Error', 'Failed to deny edit request. Please try again.');
            }
          }
        }
      ]
    );
  };

  const handleApproveShift = (shiftRequest) => {
    Alert.alert(
      'Approve Shift Request',
      `Approve shift for ${shiftRequest.nurseName} on ${shiftRequest.date}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: async () => {
            console.log('Approving shift for nurse:', shiftRequest.nurseId);
            const adminId = user?.id === 'admin-001' ? 'ADMIN001' : (user?.id || 'ADMIN001'); // Convert admin-001 to ADMIN001
            approveShiftRequest(shiftRequest.id, adminId);
            setShiftRequestModalVisible(false);
            
            // Send notification to nurse about approval
            try {
              const clientInfo = shiftRequest.clientName ? ` for ${shiftRequest.clientName}` : '';
              const targetNurseId = shiftRequest.nurseId === 'nurse-001' ? 'NURSE001' : shiftRequest.nurseId; // Convert nurse-001 to NURSE001
              console.log('Sending approval notification to nurse:', targetNurseId);
              await sendNotificationToUser(
                targetNurseId,
                'nurse',
                'Shift Request Approved',
                `Your ${shiftRequest.service} shift on ${shiftRequest.date}${clientInfo} has been approved!`,
                {
                  shiftRequestId: shiftRequest.id,
                  type: 'shift_approved'
                }
              );
              console.log('Approval notification sent successfully');
              
              // Send notification to patient if there's a specific client
              if (shiftRequest.clientId && shiftRequest.clientName) {
                console.log('Sending appointment notification to patient:', shiftRequest.clientId);
                await sendNotificationToUser(
                  shiftRequest.clientId,
                  'patient',
                  'Appointment Confirmed',
                  `Your ${shiftRequest.service} appointment with ${shiftRequest.nurseName} on ${shiftRequest.date} has been confirmed!`,
                  {
                    shiftRequestId: shiftRequest.id,
                    appointmentId: shiftRequest.id,
                    nurseId: shiftRequest.nurseId,
                    nurseName: shiftRequest.nurseName,
                    type: 'appointment_approved'
                  }
                );
                console.log('Patient notification sent successfully');
              }
            } catch (error) {
              console.error('Failed to send approval notification:', error);
            }
            
            Alert.alert('Success', 'Shift request approved successfully!');
          }
        }
      ]
    );
  };

  const handleDenyShift = (shiftRequest) => {
    Alert.alert(
      'Deny Shift Request',
      `Deny shift for ${shiftRequest.nurseName} on ${shiftRequest.date}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Deny',
          style: 'destructive',
          onPress: async () => {
            const adminId = user?.id === 'admin-001' ? 'ADMIN001' : (user?.id || 'ADMIN001'); // Convert admin-001 to ADMIN001
            denyShiftRequest(shiftRequest.id, adminId);
            setShiftRequestModalVisible(false);
            
            // Send notification to nurse about denial
            try {
              const clientInfo = shiftRequest.clientName ? ` for ${shiftRequest.clientName}` : '';
              const targetNurseId = shiftRequest.nurseId === 'nurse-001' ? 'NURSE001' : shiftRequest.nurseId; // Convert nurse-001 to NURSE001
              await sendNotificationToUser(
                targetNurseId,
                'nurse',
                'Shift Request Denied',
                `Your ${shiftRequest.service} shift request on ${shiftRequest.date}${clientInfo} has been denied.`,
                {
                  shiftRequestId: shiftRequest.id,
                  type: 'shift_denied'
                }
              );
            } catch (error) {
              console.error('Failed to send denial notification:', error);
            }
            
            Alert.alert('Denied', 'Shift request has been denied.');
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
          
          <View style={styles.headerTitleContainer}>
            <Text style={styles.welcomeLabel}>Welcome</Text>
            <Text style={styles.userName}>{user?.username}!</Text>
          </View>
          
          <TouchableWeb 
            style={styles.iconButton}
            onPress={() => navigation.navigate('Profile')}
            activeOpacity={0.7}
          >
            {user?.profilePhoto ? (
              <Image 
                source={{ uri: user.profilePhoto }} 
                style={styles.headerProfileImage}
              />
            ) : (
              <MaterialCommunityIcons name="account-circle-outline" size={26} color={COLORS.white} />
            )}
          </TouchableWeb>
        </View>
      </LinearGradient>

      {/* Stats Cards */}
      <View style={styles.statsContainer}>
        <TouchableWeb 
          style={styles.statCard}
          onPress={() => setSelectedCard(selectedCard === 'pending' ? null : 'pending')}
          activeOpacity={0.8}
        >
          {selectedCard === 'pending' ? (
            <LinearGradient
              colors={GRADIENTS.header}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.statGradient}
            >
              <Text style={styles.statLabel}>Pending</Text>
            </LinearGradient>
          ) : (
            <View style={styles.inactiveStatCard}>
              <Text style={styles.inactiveStatLabel}>Pending</Text>
            </View>
          )}
        </TouchableWeb>
        
        <TouchableWeb 
          style={styles.statCard}
          onPress={() => setSelectedCard(selectedCard === 'nurses' ? null : 'nurses')}
          activeOpacity={0.8}
        >
          {selectedCard === 'nurses' ? (
            <LinearGradient
              colors={GRADIENTS.header}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.statGradient}
            >
              <Text style={styles.statLabel}>Active Nurses</Text>
            </LinearGradient>
          ) : (
            <View style={styles.inactiveStatCard}>
              <Text style={styles.inactiveStatLabel}>Active Nurses</Text>
            </View>
          )}
        </TouchableWeb>
        
        <TouchableWeb 
          style={styles.statCard}
          onPress={() => setSelectedCard(selectedCard === 'appointments' ? null : 'appointments')}
          activeOpacity={0.8}
        >
          {selectedCard === 'appointments' ? (
            <LinearGradient
              colors={GRADIENTS.header}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.statGradient}
            >
              <Text style={styles.statLabel}>Appointments</Text>
            </LinearGradient>
          ) : (
            <View style={styles.inactiveStatCard}>
              <Text style={styles.inactiveStatLabel}>Appointments</Text>
            </View>
          )}
        </TouchableWeb>

        <TouchableWeb 
          style={styles.statCard}
          onPress={() => setSelectedCard(selectedCard === 'completed' ? null : 'completed')}
          activeOpacity={0.8}
        >
          {selectedCard === 'completed' ? (
            <LinearGradient
              colors={GRADIENTS.header}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.statGradient}
            >
              <Text style={styles.statLabel}>Completed</Text>
            </LinearGradient>
          ) : (
            <View style={styles.inactiveStatCard}>
              <Text style={styles.inactiveStatLabel}>Completed</Text>
            </View>
          )}
        </TouchableWeb>
      </View>

      {/* Content Area */}
      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
          />
        }
      >
        {selectedCard === 'appointments' && (
          <View style={styles.contentSection}>
            <Text style={styles.sectionTitle}>Upcoming Appointments & Active Shifts</Text>
            {finalActiveAppointments.map((appointment) => (
              <View key={appointment.id} style={styles.compactCard}>
                <View style={styles.compactHeader}>
                  <MaterialCommunityIcons 
                    name="clock-outline" 
                    size={20} 
                    color={COLORS.accent} 
                  />
                  <View style={styles.compactInfo}>
                    <Text style={styles.compactClient}>
                      {appointment.patientName || appointment.clientName || 'Client'}
                    </Text>
                  </View>
                  <TouchableWeb
                    style={styles.detailsButton}
                    onPress={() => handleViewAppointmentDetails(appointment)}
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
              </View>
            ))}
          </View>
        )}

        {selectedCard === 'nurses' && (
          <View style={styles.contentSection}>
            <Text style={styles.sectionTitle}>Active Nurses</Text>
            {activeNurses.map((nurse) => (
              <View key={nurse.id} style={styles.compactCard}>
                <View style={styles.compactHeader}>
                  <MaterialCommunityIcons name="account-heart" size={20} color={COLORS.accent} />
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
              </View>
            ))}
          </View>
        )}

        {selectedCard === 'pending' && (
          <View style={styles.contentSection}>
            <Text style={styles.sectionTitle}>Pending Items</Text>
            
            {/* Pending Shift Requests */}
            {pendingShiftRequests.length > 0 && (
              <>
                <Text style={styles.subsectionTitle}>Shift Requests</Text>
                {pendingShiftRequests.map((shiftRequest) => (
                  <View key={shiftRequest.id} style={styles.compactCard}>
                    <View style={styles.compactHeader}>
                      <MaterialCommunityIcons 
                        name="alert" 
                        size={20} 
                        color={COLORS.warning} 
                      />
                      <View style={styles.compactInfo}>
                        <Text style={styles.compactClient}>{shiftRequest.nurseName}</Text>
                      </View>
                      <TouchableWeb
                        style={styles.detailsButton}
                        onPress={() => handleShiftRequestDetails(shiftRequest)}
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
                  </View>
                ))}
              </>
            )}
            
            {/* Pending Assignment Requests */}
            {allPendingForDisplay.length > 0 && (
              <>
                <Text style={styles.subsectionTitle}>Assignment Requests</Text>
                {allPendingForDisplay.map((assignment) => {
                  return (
                    <View key={assignment.id} style={styles.compactCard}>
                      <View style={styles.compactHeader}>
                        <MaterialCommunityIcons 
                          name="calendar-alert" 
                          size={20} 
                          color={COLORS.warning} 
                        />
                        <View style={styles.compactInfo}>
                          <Text style={styles.compactClient}>{assignment.patientName}</Text>
                        </View>
                        <TouchableWeb
                          style={styles.detailsButton}
                          onPress={() => handleViewAppointmentDetails(assignment)}
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
                    </View>
                  );
                })}
              </>
            )}

            {/* Profile Edit Requests */}
            {pendingProfileEditRequests.length > 0 && (
              <>
                <Text style={styles.subsectionTitle}>Profile Edit Requests</Text>
                {pendingProfileEditRequests.map((request) => (
                  <View key={request.id} style={styles.compactCard}>
                    <View style={styles.compactHeader}>
                      <MaterialCommunityIcons 
                        name="account-edit" 
                        size={20} 
                        color={COLORS.primary} 
                      />
                      <View style={styles.compactInfo}>
                        <Text style={styles.compactClient}>{request.nurseName}</Text>
                        <Text style={styles.compactService}>Code: {request.nurseCode}</Text>
                      </View>
                      <View style={styles.editRequestButtons}>
                        <TouchableWeb 
                          style={styles.denyBtn} 
                          onPress={() => handleDenyEditRequest(request)}
                        >
                          <Text style={styles.denyBtnText}>Deny</Text>
                        </TouchableWeb>
                        <TouchableWeb 
                          style={styles.approveBtn} 
                          onPress={() => handleApproveEditRequest(request)}
                        >
                          <Text style={styles.approveBtnText}>Approve</Text>
                        </TouchableWeb>
                      </View>
                    </View>
                  </View>
                ))}
              </>
            )}
            
            {pendingShiftRequests.length === 0 && allPendingForDisplay.length === 0 && pendingProfileEditRequests.length === 0 && (
              <Text style={styles.emptyText}>No pending items</Text>
            )}
          </View>
        )}

        {selectedCard === 'completed' && (
          <View key={`completed-${refreshKey}`} style={styles.contentSection}>
            <Text style={styles.sectionTitle}>Completed Appointments & Shifts</Text>
            {finalCompletedAppointments.map((appointment) => (
              <View key={appointment.id} style={styles.compactCard}>
                <View style={styles.compactHeader}>
                  <MaterialCommunityIcons 
                    name={appointment.isShift ? "check-circle-outline" : "check-circle"} 
                    size={20} 
                    color={COLORS.success} 
                  />
                  <View style={styles.compactInfo}>
                    <Text style={styles.compactClient}>
                      {appointment.patientName || appointment.clientName || 'Client'}
                    </Text>
                  </View>
                  <TouchableWeb
                    style={styles.detailsButton}
                    onPress={() => handleViewAppointmentDetails(appointment)}
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
              <Text style={styles.modalTitle}>Create New Staff</Text>
              <TouchableWeb onPress={() => setCreateNurseModalVisible(false)}>
                <MaterialCommunityIcons name="close" size={24} color={COLORS.text} />
              </TouchableWeb>
            </View>
            <ScrollView style={styles.createNurseForm}>
              {/* Role Selection */}
              <Text style={styles.formLabel}>Staff Type</Text>
              <View style={styles.roleSelector}>
                <TouchableWeb
                  style={[
                    styles.roleOption,
                    staffRole === 'nurse' && styles.roleOptionSelected
                  ]}
                  onPress={() => {
                    setStaffRole('nurse');
                    setNurseCode('');
                  }}
                  activeOpacity={0.7}
                >
                  <MaterialCommunityIcons 
                    name="hospital-box" 
                    size={24} 
                    color={staffRole === 'nurse' ? COLORS.primary : COLORS.textLight} 
                  />
                  <Text style={[
                    styles.roleOptionText,
                    staffRole === 'nurse' && styles.roleOptionTextSelected
                  ]}>Nurse</Text>
                </TouchableWeb>

                <TouchableWeb
                  style={[
                    styles.roleOption,
                    staffRole === 'admin' && styles.roleOptionSelected
                  ]}
                  onPress={() => {
                    setStaffRole('admin');
                    setNurseCode('');
                  }}
                  activeOpacity={0.7}
                >
                  <MaterialCommunityIcons 
                    name="shield-account" 
                    size={24} 
                    color={staffRole === 'admin' ? COLORS.primary : COLORS.textLight} 
                  />
                  <Text style={[
                    styles.roleOptionText,
                    staffRole === 'admin' && styles.roleOptionTextSelected
                  ]}>Admin</Text>
                </TouchableWeb>
              </View>

              <Text style={styles.formLabel}>Full Name</Text>
              <View style={styles.formInput}>
                <MaterialCommunityIcons name="account" size={20} color={COLORS.textLight} />
                <TextInput
                  style={styles.input}
                  placeholder={staffRole === 'nurse' ? "e.g., Sarah Johnson, RN" : "e.g., John Doe"}
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
                  placeholder={`${staffRole}@care.com`}
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

              {staffRole === 'nurse' && (
                <>
                  <Text style={styles.formLabel}>Specialization</Text>
                  <View style={styles.formInput}>
                    <MaterialCommunityIcons name="stethoscope" size={20} color={COLORS.textLight} />
                    <TextInput
                      style={styles.input}
                      placeholder="e.g., Pediatric Care, Elderly Care"
                      placeholderTextColor={COLORS.textLight}
                      value={nurseSpecialization}
                      onChangeText={setNurseSpecialization}
                    />
                  </View>
                </>
              )}

              <Text style={styles.formLabel}>Unique {staffRole === 'admin' ? 'Admin' : 'Nurse'} Code</Text>
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
                  <Text style={styles.createButtonText}>Create {staffRole === 'admin' ? 'Admin' : 'Nurse'}</Text>
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
                  Assign Nurse - {selectedAppointment?.patientName}
                </Text>
                <TouchableWeb onPress={() => setAssignModalVisible(false)}>
                  <MaterialCommunityIcons name="close" size={24} color={COLORS.text} />
                </TouchableWeb>
              </View>
              <ScrollView style={styles.nurseList} showsVerticalScrollIndicator={false}>
                <Text style={styles.sectionTitle}>Available Nurses</Text>
                {availableNurses.map((nurse) => (
                  <View key={nurse.id} style={styles.compactCard}>
                    <View style={styles.compactHeader}>
                      <MaterialCommunityIcons 
                        name="account-heart" 
                        size={20} 
                        color={COLORS.primary} 
                      />
                      <View style={styles.compactInfo}>
                        <Text style={styles.compactClient}>{nurse.name}</Text>
                      </View>
                      <TouchableWeb
                        style={styles.detailsButton}
                        onPress={() => confirmAssignment(nurse)}
                        activeOpacity={0.8}
                      >
                        <LinearGradient
                          colors={GRADIENTS.header}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={styles.detailsButtonGradient}
                        >
                          <Text style={styles.detailsButtonText}>Assign</Text>
                        </LinearGradient>
                      </TouchableWeb>
                    </View>
                  </View>
                ))}
              </ScrollView>
            </View>
          </TouchableWeb>
        </TouchableWeb>
      </Modal>

      {/* Appointment Details Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={appointmentDetailsModalVisible}
        onRequestClose={() => setAppointmentDetailsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Appointment Details
              </Text>
              <TouchableWeb onPress={() => setAppointmentDetailsModalVisible(false)}>
                <MaterialCommunityIcons name="close" size={24} color={COLORS.text} />
              </TouchableWeb>
            </View>
            
            {selectedAppointmentDetails && (
              <>
                <ScrollView style={styles.appointmentDetailsContent} showsVerticalScrollIndicator={false}>
                  {/* Service Information */}
                  <View style={styles.detailsSection}>
                    <Text style={styles.sectionTitle}>Service Information</Text>
                    <View style={styles.detailItem}>
                      <MaterialCommunityIcons name="medical-bag" size={20} color={COLORS.primary} />
                      <View style={styles.detailContent}>
                        <Text style={styles.detailLabel}>Service Type</Text>
                        <Text style={styles.detailValue}>{selectedAppointmentDetails.service || selectedAppointmentDetails.serviceName || 'N/A'}</Text>
                      </View>
                    </View>
                    <View style={styles.detailItem}>
                      <MaterialCommunityIcons name="calendar" size={20} color={COLORS.primary} />
                      <View style={styles.detailContent}>
                        <Text style={styles.detailLabel}>Date</Text>
                        <Text style={styles.detailValue}>
                          {(() => {
                            const dateStr = selectedAppointmentDetails.isShift 
                              ? selectedAppointmentDetails.date
                              : (selectedAppointmentDetails.preferredDate || selectedAppointmentDetails.date);
                            if (!dateStr) return 'N/A';
                            if (dateStr.match(/^[A-Z][a-z]{2}\s\d{1,2},\s\d{4}$/)) return dateStr;
                            if (!isNaN(new Date(dateStr))) {
                              return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                            }
                            return dateStr;
                          })()}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.detailItem}>
                      <MaterialCommunityIcons name="clock-outline" size={20} color={COLORS.primary} />
                      <View style={styles.detailContent}>
                        <Text style={styles.detailLabel}>Time</Text>
                        <Text style={styles.detailValue}>
                          {selectedAppointmentDetails.preferredTime || selectedAppointmentDetails.time || selectedAppointmentDetails.scheduledTime || 'N/A'}
                        </Text>
                      </View>
                    </View>
                    
                    {/* Show clock in/out times and total hours for completed shifts */}
                    {selectedAppointmentDetails.isShift && selectedAppointmentDetails.status === 'completed' && selectedAppointmentDetails.actualStartTime && selectedAppointmentDetails.actualEndTime && (
                      <>
                        {/* Horizontal Clock In and Clock Out Times */}
                        <View style={styles.timeRow}>
                          <View style={styles.timeItem}>
                            <MaterialCommunityIcons name="clock-in" size={20} color={COLORS.success} />
                            <View style={styles.timeContent}>
                              <Text style={styles.timeLabel}>Clock In</Text>
                              <Text style={styles.timeValue}>
                                {new Date(selectedAppointmentDetails.actualStartTime).toLocaleTimeString('en-US', { 
                                  hour: '2-digit', 
                                  minute: '2-digit',
                                  second: '2-digit'
                                })}
                              </Text>
                            </View>
                          </View>
                          <Text style={styles.timeDash}>—</Text>
                          <View style={styles.timeItem}>
                            <MaterialCommunityIcons name="clock-out" size={20} color={COLORS.error} />
                            <View style={styles.timeContent}>
                              <Text style={styles.timeLabel}>Clock Out</Text>
                              <Text style={styles.timeValue}>
                                {new Date(selectedAppointmentDetails.actualEndTime).toLocaleTimeString('en-US', { 
                                  hour: '2-digit', 
                                  minute: '2-digit',
                                  second: '2-digit'
                                })}
                              </Text>
                            </View>
                          </View>
                        </View>
                        
                        {/* Total Hours Calculated */}
                        {(() => {
                          const start = new Date(selectedAppointmentDetails.actualStartTime);
                          const end = new Date(selectedAppointmentDetails.actualEndTime);
                          const diffMs = end - start;
                          const hours = Math.floor(diffMs / (1000 * 60 * 60));
                          const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
                          const totalHours = (diffMs / (1000 * 60 * 60)).toFixed(2);
                          
                          return (
                            <View style={styles.detailItem}>
                              <MaterialCommunityIcons name="clock-check" size={20} color={COLORS.primary} />
                              <View style={styles.detailContent}>
                                <Text style={styles.detailLabel}>Total Hours</Text>
                                <Text style={styles.detailValue}>
                                  {hours}h {minutes}m ({totalHours} hours)
                                </Text>
                              </View>
                            </View>
                          );
                        })()}
                      </>
                    )}
                  </View>

                  {/* Patient Information */}
                  <View style={styles.detailsSection}>
                    <Text style={styles.sectionTitle}>Patient Information</Text>
                    <View style={styles.detailItem}>
                      <MaterialCommunityIcons name="account" size={20} color={COLORS.primary} />
                      <View style={styles.detailContent}>
                        <Text style={styles.detailLabel}>Name</Text>
                        <Text style={styles.detailValue}>
                          {selectedAppointmentDetails.patientName || selectedAppointmentDetails.clientName || 'Client Name'}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.detailItem}>
                      <MaterialCommunityIcons name="email" size={20} color={COLORS.primary} />
                      <View style={styles.detailContent}>
                        <Text style={styles.detailLabel}>Email</Text>
                        <Text style={styles.detailValue}>{selectedAppointmentDetails.email || 'N/A'}</Text>
                      </View>
                    </View>
                    <View style={styles.detailItem}>
                      <MaterialCommunityIcons name="phone" size={20} color={COLORS.primary} />
                      <View style={styles.detailContent}>
                        <Text style={styles.detailLabel}>Phone</Text>
                        <Text style={styles.detailValue}>{selectedAppointmentDetails.phone || 'N/A'}</Text>
                      </View>
                    </View>
                  </View>

                  {/* Nurse Information */}
                  <View style={styles.detailsSection}>
                    <Text style={styles.sectionTitle}>Nurse Information</Text>
                    <View style={styles.detailItem}>
                      <MaterialCommunityIcons name="account-heart" size={20} color={COLORS.primary} />
                      <View style={styles.detailContent}>
                        <Text style={styles.detailLabel}>Assigned Nurse</Text>
                        <Text style={styles.detailValue}>
                          {selectedAppointmentDetails.nurseName || 'Not assigned'}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Location */}
                  <View style={styles.detailsSection}>
                    <Text style={styles.sectionTitle}>Location</Text>
                    <View style={styles.detailItem}>
                      <MaterialCommunityIcons name="map-marker" size={20} color={COLORS.primary} />
                      <View style={styles.detailContent}>
                        <Text style={styles.detailLabel}>Address</Text>
                        <Text style={styles.detailValue}>
                          {typeof selectedAppointmentDetails.address === 'string' 
                            ? selectedAppointmentDetails.address 
                            : selectedAppointmentDetails.address?.street 
                              ? `${selectedAppointmentDetails.address.street}, ${selectedAppointmentDetails.address.city}, ${selectedAppointmentDetails.address.parish}`
                              : 'N/A'}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Nurse/Completion Notes */}
                  {(selectedAppointmentDetails.nurseNotes || selectedAppointmentDetails.completionNotes) && (
                    <View style={styles.detailsSection}>
                      <Text style={styles.sectionTitle}>
                        {selectedAppointmentDetails.status === 'completed' ? 'Completion Notes' : 'Nurse Notes'}
                      </Text>
                      <Text style={styles.detailsNotes}>
                        {selectedAppointmentDetails.completionNotes || selectedAppointmentDetails.nurseNotes}
                      </Text>
                    </View>
                  )}

                  {/* Patient Booking Notes */}
                  {(selectedAppointmentDetails.notes || selectedAppointmentDetails.patientNotes) && (
                    <View style={styles.detailsSection}>
                      <Text style={styles.sectionTitle}>Patient Notes (from booking)</Text>
                      <Text style={styles.detailsNotes}>
                        {selectedAppointmentDetails.notes || selectedAppointmentDetails.patientNotes}
                      </Text>
                    </View>
                  )}
                </ScrollView>

                {/* Action Buttons for Pending Appointments */}
                {selectedAppointmentDetails.status === 'pending' && (
                <View style={styles.modalFooter}>
                  <TouchableWeb
                    style={styles.modalDenyButton}
                    onPress={() => {
                      Alert.alert(
                        'Deny Appointment',
                        'Are you sure you want to deny this appointment request?',
                        [
                          { text: 'Cancel', style: 'cancel' },
                          {
                            text: 'Deny',
                            style: 'destructive',
                            onPress: async () => {
                              try {
                                await cancelAppointment(selectedAppointmentDetails.id);
                                setAppointmentDetailsModalVisible(false);
                                Alert.alert('Success', 'Appointment denied');
                              } catch (error) {
                                Alert.alert('Error', 'Failed to deny appointment');
                              }
                            }
                          }
                        ]
                      );
                    }}
                  >
                    <Text style={styles.modalDenyButtonText}>Deny</Text>
                  </TouchableWeb>

                  <TouchableWeb
                    style={styles.modalAssignButton}
                    onPress={() => {
                      setAppointmentDetailsModalVisible(false);
                      // Ensure the full appointment object is passed
                      handleAssignNurse(selectedAppointmentDetails);
                    }}
                  >
                    <LinearGradient
                      colors={['#10b981', '#059669']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.modalAssignButtonGradient}
                    >
                      <Text style={styles.modalAssignButtonText}>Assign Nurse</Text>
                    </LinearGradient>
                  </TouchableWeb>
                </View>
              )}
              </>
            )}
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
              <View style={styles.nurseDetailsSection}>
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

      {/* Shift Request Details Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={shiftRequestModalVisible}
        onRequestClose={() => setShiftRequestModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Shift Request Details</Text>
              <TouchableWeb onPress={() => setShiftRequestModalVisible(false)}>
                <MaterialCommunityIcons name="close" size={24} color={COLORS.text} />
              </TouchableWeb>
            </View>
            
            {selectedShiftRequest && (
              <>
                <ScrollView style={styles.appointmentDetailsContent} showsVerticalScrollIndicator={false}>
                  {/* Nurse Information */}
                  <View style={styles.detailsSection}>
                    <Text style={styles.sectionTitle}>Nurse Information</Text>
                    <View style={styles.detailItem}>
                      <MaterialCommunityIcons name="account-heart" size={20} color={COLORS.primary} />
                      <View style={styles.detailContent}>
                        <Text style={styles.detailLabel}>Name</Text>
                        <Text style={styles.detailValue}>{selectedShiftRequest.nurseName}</Text>
                      </View>
                    </View>
                    <View style={styles.detailItem}>
                      <MaterialCommunityIcons name="badge-account" size={20} color={COLORS.primary} />
                      <View style={styles.detailContent}>
                        <Text style={styles.detailLabel}>Code</Text>
                        <Text style={styles.detailValue}>{selectedShiftRequest.nurseCode}</Text>
                      </View>
                    </View>
                  </View>

                  {/* Shift Information */}
                  <View style={styles.detailsSection}>
                    <Text style={styles.sectionTitle}>Shift Information</Text>
                    <View style={styles.detailItem}>
                      <MaterialCommunityIcons name="medical-bag" size={20} color={COLORS.primary} />
                      <View style={styles.detailContent}>
                        <Text style={styles.detailLabel}>Service</Text>
                        <Text style={styles.detailValue}>{selectedShiftRequest.service}</Text>
                      </View>
                    </View>
                    <View style={styles.detailItem}>
                      <MaterialCommunityIcons name="calendar" size={20} color={COLORS.primary} />
                      <View style={styles.detailContent}>
                        <Text style={styles.detailLabel}>Date</Text>
                        <Text style={styles.detailValue}>
                          {(() => {
                            const dateStr = selectedShiftRequest.date;
                            if (!dateStr) return 'N/A';
                            if (dateStr.match(/^[A-Z][a-z]{2}\s\d{1,2},\s\d{4}$/)) return dateStr;
                            if (!isNaN(new Date(dateStr))) {
                              return new Date(dateStr).toLocaleDateString('en-US', { 
                                month: 'short', 
                                day: 'numeric', 
                                year: 'numeric' 
                              });
                            }
                            return dateStr;
                          })()}
                        </Text>
                      </View>
                    </View>
                    {/* Horizontal Start and End Times */}
                    <View style={styles.timeRow}>
                      <View style={styles.timeItem}>
                        <MaterialCommunityIcons name="clock-time-four" size={20} color={COLORS.success} />
                        <View style={styles.timeContent}>
                          <Text style={styles.timeLabel}>Start Time</Text>
                          <Text style={styles.timeValue}>
                            {selectedShiftRequest.startTime || 'N/A'}
                          </Text>
                        </View>
                      </View>
                      {selectedShiftRequest.endTime && (
                        <>
                          <Text style={styles.timeDash}>—</Text>
                          <View style={styles.timeItem}>
                            <MaterialCommunityIcons name="clock-time-four" size={20} color={COLORS.error} />
                            <View style={styles.timeContent}>
                              <Text style={styles.timeLabel}>End Time</Text>
                              <Text style={styles.timeValue}>
                                {selectedShiftRequest.endTime}
                              </Text>
                            </View>
                          </View>
                        </>
                      )}
                    </View>
                    {/* Horizontal Clock In and Clock Out Times */}
                    {selectedShiftRequest.actualStartTime && selectedShiftRequest.actualEndTime && (
                      <View style={styles.timeRow}>
                        <View style={styles.timeItem}>
                          <MaterialCommunityIcons name="clock-in" size={20} color={COLORS.success} />
                          <View style={styles.timeContent}>
                            <Text style={styles.timeLabel}>Clock In</Text>
                            <Text style={styles.timeValue}>
                              {new Date(selectedShiftRequest.actualStartTime).toLocaleTimeString('en-US', { 
                                hour: '2-digit', 
                                minute: '2-digit',
                                second: '2-digit'
                              })}
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.timeDash}>—</Text>
                        <View style={styles.timeItem}>
                          <MaterialCommunityIcons name="clock-out" size={20} color={COLORS.error} />
                          <View style={styles.timeContent}>
                            <Text style={styles.timeLabel}>Clock Out</Text>
                            <Text style={styles.timeValue}>
                              {new Date(selectedShiftRequest.actualEndTime).toLocaleTimeString('en-US', { 
                                hour: '2-digit', 
                                minute: '2-digit',
                                second: '2-digit'
                              })}
                            </Text>
                          </View>
                        </View>
                      </View>
                    )}
                    {selectedShiftRequest.actualStartTime && selectedShiftRequest.actualEndTime && (() => {
                      const start = new Date(selectedShiftRequest.actualStartTime);
                      const end = new Date(selectedShiftRequest.actualEndTime);
                      const diffMs = end - start;
                      const hours = Math.floor(diffMs / (1000 * 60 * 60));
                      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
                      const totalHours = (diffMs / (1000 * 60 * 60)).toFixed(2);
                      
                      return (
                        <View style={styles.detailItem}>
                          <MaterialCommunityIcons name="clock-check" size={20} color={COLORS.primary} />
                          <View style={styles.detailContent}>
                            <Text style={styles.detailLabel}>Total Hours</Text>
                            <Text style={styles.detailValue}>
                              {hours}h {minutes}m ({totalHours} hours)
                            </Text>
                          </View>
                        </View>
                      );
                    })()}
                  </View>

                  {/* Client Information (if available) */}
                  {selectedShiftRequest.clientName && (
                    <View style={styles.detailsSection}>
                      <Text style={styles.sectionTitle}>Client Information</Text>
                      <View style={styles.detailItem}>
                        <MaterialCommunityIcons name="account" size={20} color={COLORS.primary} />
                        <View style={styles.detailContent}>
                          <Text style={styles.detailLabel}>Client Name</Text>
                          <Text style={styles.detailValue}>{selectedShiftRequest.clientName}</Text>
                        </View>
                      </View>
                    </View>
                  )}

                  {/* Request Details */}
                  <View style={styles.detailsSection}>
                    <Text style={styles.sectionTitle}>Request Details</Text>
                    <View style={styles.detailItem}>
                      <MaterialCommunityIcons name="clock-alert-outline" size={20} color={COLORS.primary} />
                      <View style={styles.detailContent}>
                        <Text style={styles.detailLabel}>Requested</Text>
                        <Text style={styles.detailValue}>
                          {new Date(selectedShiftRequest.requestedAt).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric', 
                            year: 'numeric' 
                          })} at{' '}
                          {new Date(selectedShiftRequest.requestedAt).toLocaleTimeString()}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Notes */}
                  {selectedShiftRequest.notes && (
                    <View style={styles.detailsSection}>
                      <Text style={styles.sectionTitle}>Notes</Text>
                      <Text style={styles.detailsNotes}>{selectedShiftRequest.notes}</Text>
                    </View>
                  )}
                </ScrollView>
                
                <View style={styles.modalFooter}>
                  <TouchableWeb
                    style={styles.modalDenyButton}
                    onPress={() => handleDenyShift(selectedShiftRequest)}
                  >
                    <Text style={styles.modalDenyButtonText}>Deny</Text>
                  </TouchableWeb>
                  
                  <TouchableWeb
                    style={styles.modalAssignButton}
                    onPress={() => handleApproveShift(selectedShiftRequest)}
                  >
                    <LinearGradient
                      colors={['#10b981', '#059669']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.modalAssignButtonGradient}
                    >
                      <Text style={styles.modalAssignButtonText}>Approve</Text>
                    </LinearGradient>
                  </TouchableWeb>
                </View>
              </>
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
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 12,
  },
  welcomeLabel: {
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
    color: COLORS.white,
    opacity: 0.9,
  },
  userName: {
    fontSize: 18,
    fontFamily: 'Poppins_700Bold',
    color: COLORS.white,
    opacity: 0.98,
    textAlign: 'center',
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
  headerProfileImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
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
  statsContainer: {
    flexDirection: 'row',
    marginTop: 16,
    marginBottom: 20,
    paddingHorizontal: 1,
    backgroundColor: 'transparent',
  },
  statCard: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  statGradient: {
    paddingHorizontal: 2,
    paddingVertical: 6,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 32,
  },
  inactiveStatCard: {
    paddingHorizontal: 2,
    paddingVertical: 6,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 32,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  selectedCard: {
    transform: [{ scale: 1.02 }],
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'Poppins_700Bold',
    color: COLORS.white,
    textAlign: 'center',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  inactiveStatLabel: {
    fontSize: 12,
    fontFamily: 'Poppins_700Bold',
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  content: {
    flex: 1,
    marginTop: -8,
  },
  contentSection: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 20,
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
    borderWidth: 1,
    borderColor: COLORS.border,
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
  appointmentDateTime: {
    fontSize: 13,
    fontFamily: 'Poppins_500Medium',
    color: COLORS.textMuted,
    marginTop: 4,
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
  statusContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
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
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 36,
  },
  availableText: {
    fontSize: 12,
    fontFamily: 'Poppins_700Bold',
    color: COLORS.white,
    textAlign: 'center',
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
  editRequestButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  denyBtn: {
    backgroundColor: COLORS.error,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  denyBtnText: {
    fontSize: 11,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.white,
  },
  approveBtn: {
    backgroundColor: COLORS.success,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  approveBtnText: {
    fontSize: 11,
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
  },
  tab: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 140,
    marginRight: 0,
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
    borderWidth: 1,
    borderColor: COLORS.border,
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
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
    alignSelf: 'flex-start',
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#FFD70040',
  },
  subscriberBadgeText: {
    fontSize: 11,
    fontFamily: 'Poppins_600SemiBold',
    color: '#B8860B',
    textAlign: 'center',
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
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  badgeText: {
    fontSize: 11,
    fontFamily: 'Poppins_600SemiBold',
    textAlign: 'center',
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
  assignedBadgeText: {
    fontSize: 12,
    fontFamily: 'Poppins_700Bold',
    color: COLORS.white,
    textAlign: 'center',
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
    alignItems: 'center',
  },
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
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.lightGray,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBody: {
    padding: 20,
  },
  nurseList: {
    padding: 20,
    paddingBottom: 30,
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
  // Role selector styles
  roleSelector: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  roleOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
    gap: 8,
  },
  roleOptionSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.card,
  },
  roleOptionText: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.textLight,
  },
  roleOptionTextSelected: {
    color: COLORS.primary,
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
  
  // Compact Completed Appointments Styles
  compactCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
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
  compactNurse: {
    fontSize: 11,
    fontFamily: 'Poppins_500Medium',
    color: COLORS.primary,
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

  // Active Button Styles (for shift appointments)
  activeButton: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  activeButtonGradient: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeButtonText: {
    fontSize: 11,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.white,
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

  // Appointment Details Modal Styles
  appointmentDetailsContent: {
    padding: 20,
    paddingBottom: 30,
  },
  detailsSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Poppins_700Bold',
    color: COLORS.text,
    marginBottom: 20,
  },
  detailsSectionTitle: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.text,
    marginBottom: 12,
    paddingBottom: 6,
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  detailsLabel: {
    fontSize: 13,
    fontFamily: 'Poppins_500Medium',
    color: COLORS.textLight,
    minWidth: 60,
  },
  detailsValue: {
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.text,
    flex: 1,
  },
  notesContainer: {
    backgroundColor: COLORS.background,
    borderRadius: 8,
    padding: 12,
  },
  notesContent: {
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.text,
    lineHeight: 18,
  },

  // Client Management Styles
  compactCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  compactStatusBadge: {
    backgroundColor: COLORS.success + '15',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: 8,
  },
  compactStatusText: {
    fontSize: 10,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.success,
  },
  // Shift request styles
  subsectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textDark,
    marginTop: 16,
    marginBottom: 8,
  },
  reviewBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  reviewBtnText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '600',
  },
  emptyText: {
    textAlign: 'center',
    color: COLORS.textLight,
    fontStyle: 'italic',
    marginTop: 20,
  },
  modalDetailRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textLight,
    width: 80,
  },
  modalValue: {
    fontSize: 14,
    color: COLORS.textDark,
    flex: 1,
  },
  modalButtonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  denyButton: {
    backgroundColor: COLORS.border,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  denyButtonText: {
    color: COLORS.textLight,
    fontSize: 14,
    fontWeight: '600',
  },
  approveButton: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  approveButtonGradient: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  approveButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
  },
  autoInvoiceInfo: {
    flexDirection: 'row',
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    padding: 16,
    marginTop: SPACING.md,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.success,
    gap: 12,
  },
  recurringInvoiceInfo: {
    flexDirection: 'row',
    backgroundColor: COLORS.lightGray,
    borderRadius: 12,
    padding: 16,
    marginTop: SPACING.md,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
    gap: 12,
  },
  autoInvoiceTextContainer: {
    flex: 1,
  },
  autoInvoiceTitle: {
    fontSize: 15,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.text,
    marginBottom: 4,
  },
  autoInvoiceDescription: {
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.textLight,
    lineHeight: 20,
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
  invoiceButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: SPACING.md,
  },
  invoiceButtonGradient: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  invoiceButtonText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '600',
  },
  // Staff Details Modal Styles
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
  detailsModalBody: {
    padding: 20,
  },
  nurseDetailsSection: {
    gap: 16,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingBottom: 12,
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
  // Horizontal time row styles
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingBottom: 12,
  },
  timeItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timeContent: {
    flex: 1,
  },
  timeLabel: {
    fontSize: 12,
    fontFamily: 'Poppins_500Medium',
    color: COLORS.textLight,
    marginBottom: 4,
  },
  timeValue: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.text,
  },
  timeDash: {
    fontSize: 18,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.textLight,
    marginHorizontal: 8,
  },
  detailsNotes: {
    fontSize: 15,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.text,
    lineHeight: 22,
    marginTop: 8,
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
  modalDenyButton: {
    flex: 1,
    backgroundColor: COLORS.lightGray,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalDenyButtonText: {
    color: COLORS.error,
    fontSize: 15,
    fontFamily: 'Poppins_600SemiBold',
  },
  modalAssignButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  modalAssignButtonGradient: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalAssignButtonText: {
    color: COLORS.white,
    fontSize: 15,
    fontFamily: 'Poppins_600SemiBold',
  },
});
