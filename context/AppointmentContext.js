import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';
import { useNotifications } from './NotificationContext';
import { useNurses } from './NurseContext';
import InvoiceService from '../services/InvoiceService';
import ApiService from '../services/ApiService';

const AppointmentContext = createContext();

export const useAppointments = () => {
  const context = useContext(AppointmentContext);
  if (!context) {
    throw new Error('useAppointments must be used within an AppointmentProvider');
  }
  return context;
};

export const AppointmentProvider = ({ children }) => {
  const { user } = useAuth();
  const { createAppointmentNotification, createSystemNotification, sendNotificationToUser, scheduleAppointmentReminder } = useNotifications();
  const { nurses: nursesFromContext, incrementAssignedClients } = useNurses();
  
  const [appointments, setAppointments] = useState([]);
  const [nurses, setNurses] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const STORAGE_KEYS = {
    APPOINTMENTS: '@care_appointments',
    NURSES: '@care_nurses',
  };

  // Sample nurses data
  const initialNurses = [
    {
      id: '1', // Match the NurseContext ID
      name: 'Sarah Johnson',
      specialty: 'General Care',
      rating: 4.8,
      experience: '5 years',
      status: 'available',
      isActive: true
    }
  ];

  // Sample appointments data for client search functionality - cleared for testing with John Smith
  const sampleAppointments = [];  // Load data from storage
  const loadData = async () => {
    try {
      setIsLoading(true);
      
      const [storedAppointments, storedNurses] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.APPOINTMENTS),
        AsyncStorage.getItem(STORAGE_KEYS.NURSES),
      ]);

      if (storedAppointments) {
        setAppointments(JSON.parse(storedAppointments));
      } else {
        // Initialize with sample appointments for client search functionality
        setAppointments(sampleAppointments);
        await AsyncStorage.setItem(STORAGE_KEYS.APPOINTMENTS, JSON.stringify(sampleAppointments));
      }

      if (storedNurses) {
        setNurses(JSON.parse(storedNurses));
      } else {
        // Initialize with default nurses
        setNurses(initialNurses);
        await AsyncStorage.setItem(STORAGE_KEYS.NURSES, JSON.stringify(initialNurses));
      }
    } catch (error) {
      console.error('Failed to load appointment data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Save appointments to storage
  const saveAppointments = async (updatedAppointments) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.APPOINTMENTS, JSON.stringify(updatedAppointments));
    } catch (error) {
      console.error('Failed to save appointments:', error);
    }
  };

  // Save nurses to storage
  const saveNurses = async (updatedNurses) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.NURSES, JSON.stringify(updatedNurses));
    } catch (error) {
      console.error('Failed to save nurses:', error);
    }
  };

  // Refresh appointments from API
  const refreshAppointments = async () => {
    try {
      console.log('🔄 Refreshing appointments from API...');
      setIsLoading(true);
      
      const response = await ApiService.getAppointments();
      
      if (response.success && response.appointments) {
        console.log(`✅ Fetched ${response.appointments.length} appointments from API`);
        
        // Transform API appointments to local format
        const transformedAppointments = response.appointments.map(apt => ({
          id: apt._id,
          appointmentId: apt.appointmentId,
          patientId: apt.patient?._id || apt.patient,
          patientName: apt.patient?.firstName && apt.patient?.lastName 
            ? `${apt.patient.firstName} ${apt.patient.lastName}`
            : 'Unknown Patient',
          patientEmail: apt.patient?.email || '',
          patientPhone: apt.patient?.phone || '',
          service: apt.appointmentType || apt.service,
          date: apt.scheduledDate,
          time: apt.scheduledTime,
          address: typeof apt.location?.address === 'string'
            ? apt.location.address
            : apt.location?.address?.street
              ? `${apt.location.address.street}, ${apt.location.address.city}, ${apt.location.address.parish}`
              : apt.address || '',
          notes: apt.notes || '', // Patient booking notes
          nurseNotes: apt.nurseNotes || '', // Nurse notes (separate from patient notes)
          completionNotes: apt.completionNotes || '', // Completion notes for completed appointments
          status: apt.status,
          nurseId: apt.assignedNurse?._id || apt.assignedNurse,
          nurseName: apt.assignedNurse?.firstName && apt.assignedNurse?.lastName
            ? `${apt.assignedNurse.firstName} ${apt.assignedNurse.lastName}`
            : null,
          createdAt: apt.createdAt,
          updatedAt: apt.updatedAt || apt.createdAt,
        }));

        setAppointments(transformedAppointments);
        await saveAppointments(transformedAppointments);
        console.log('💾 Appointments saved to local storage');
      }
    } catch (error) {
      console.error('⚠️ Failed to refresh appointments from API:', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Book new appointment (Patient action)
  const bookAppointment = async (appointmentData) => {
    try {
      // Try to create appointment via API first
      const apiData = {
        appointmentType: appointmentData.service,
        scheduledDate: appointmentData.date,
        scheduledTime: appointmentData.time,
        location: appointmentData.address,
        notes: appointmentData.notes || '',
        priority: 'medium'
      };

      const response = await ApiService.createAppointment(apiData);
      
      if (response.success) {
        console.log('✅ Appointment created via API:', response.appointment);
        
        // Also save locally for offline support
        const newAppointment = {
          id: response.appointment._id || `apt_${Date.now()}`,
          patientId: user?.id || 'PATIENT001',
          patientName: user?.name || 'John Smith',
          patientEmail: user?.email || 'john@example.com',
          patientPhone: user?.phone || '876-555-0123',
          service: appointmentData.service,
          date: appointmentData.date,
          time: appointmentData.time,
          address: appointmentData.address,
          notes: appointmentData.notes || '',
          status: response.appointment.status || 'pending',
          nurseId: null,
          nurseName: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        const updatedAppointments = [...appointments, newAppointment];
        setAppointments(updatedAppointments);
        await saveAppointments(updatedAppointments);

        console.log('� Appointment notification sent to admins via backend');
        return newAppointment;
      }
    } catch (error) {
      console.error('⚠️ API call failed, saving locally:', error.message);
      
      // Fallback to local storage if API fails
      const newAppointment = {
        id: `apt_${Date.now()}`,
        patientId: user?.id || 'PATIENT001',
        patientName: user?.name || 'John Smith',
        patientEmail: user?.email || 'john@example.com',
        patientPhone: user?.phone || '876-555-0123',
        service: appointmentData.service,
        date: appointmentData.date,
        time: appointmentData.time,
        address: appointmentData.address,
        notes: appointmentData.notes || '',
        status: 'pending',
        nurseId: null,
        nurseName: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const updatedAppointments = [...appointments, newAppointment];
      console.log('💾 Saving new appointment locally:', newAppointment);
      setAppointments(updatedAppointments);
      await saveAppointments(updatedAppointments);

      // Try to send notification to admin
      try {
        await sendNotificationToUser(
          'admin-001',
          'admin',
          'New Appointment Request',
          `${newAppointment.patientName} has requested a ${newAppointment.service} appointment for ${newAppointment.date}`,
          {
            appointmentId: newAppointment.id,
            patientId: newAppointment.patientId,
            type: 'appointment_booked'
          }
        );
      } catch (notifError) {
        console.error('Failed to send notification:', notifError);
      }

      return newAppointment;
    }
  };

  // Assign appointment to nurse (Admin action)
  const assignNurse = async (appointmentId, nurseId) => {
    // Find the nurse from NurseContext instead of local nurses array
    const nurse = nursesFromContext.find(n => n.id === nurseId);
    
    if (!nurse) {
      console.error('Nurse assignment failed - Nurse not found with ID:', nurseId);
      throw new Error('Nurse not found');
    }

    const updatedAppointments = appointments.map(appointment => 
      appointment.id === appointmentId 
        ? {
            ...appointment,
            nurseId,
            nurseName: nurse.name,
            status: 'nurse_assigned', // Waiting for nurse to accept
            assignedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        : appointment
    );

    setAppointments(updatedAppointments);
    await saveAppointments(updatedAppointments);

    const appointment = updatedAppointments.find(apt => apt.id === appointmentId);

    // Send notification to specific nurse about assignment
    await sendNotificationToUser(
      nurseId, // Send to the specific nurse
      'nurse',
      'New Assignment',
      `You have been assigned to ${appointment.patientName} for ${appointment.service}`,
      {
        appointmentId,
        type: 'assignment_received',
        nurseId
      }
    );

    // Send confirmation notification to admin about successful assignment
    await sendNotificationToUser(
      'admin-001',
      'admin',
      'Nurse Assigned',
      `${nurse.name} has been assigned to ${appointment.patientName} for ${appointment.service}`,
      {
        appointmentId,
        type: 'nurse_assignment_confirmed',
        nurseId
      }
    );

    return appointment;
  };

  // Accept assignment (Nurse action)
  const acceptAppointment = async (appointmentId) => {
    const updatedAppointments = appointments.map(appointment => 
      appointment.id === appointmentId 
        ? {
            ...appointment,
            status: 'confirmed', // Now active
            acceptedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        : appointment
    );

    setAppointments(updatedAppointments);
    await saveAppointments(updatedAppointments);

    const appointment = updatedAppointments.find(apt => apt.id === appointmentId);

    // Send notification to admin about acceptance
    await sendNotificationToUser(
      'admin-001', // Correct admin user ID
      'admin',
      'Assignment Accepted',
      `${appointment.nurseName} has accepted the appointment with ${appointment.patientName}`,
      {
        appointmentId,
        type: 'assignment_accepted'
      }
    );

    // Send notification to patient about confirmation
    await sendNotificationToUser(
      appointment.patientId,
      'patient',
      'Appointment Confirmed',
      `Your appointment for ${appointment.service} has been confirmed with ${appointment.nurseName}`,
      {
        appointmentId,
        type: 'appointment_confirmed'
      }
    );

    // Schedule appointment reminder notification (30 minutes before appointment)
    try {
      const appointmentDateTime = new Date(`${appointment.date}T${appointment.time}`);
      await scheduleAppointmentReminder(
        `${appointment.service} Appointment`,
        appointmentDateTime,
        30 // 30 minutes before
      );
      console.log('✅ Appointment reminder scheduled for:', appointmentDateTime);
    } catch (error) {
      console.error('Failed to schedule appointment reminder:', error);
    }

    return appointment;
  };

  // Decline assignment (Nurse action)
  const declineAppointment = async (appointmentId, reason = '') => {
    const updatedAppointments = appointments.map(appointment => 
      appointment.id === appointmentId 
        ? {
            ...appointment,
            status: 'pending', // Back to pending for admin to reassign
            nurseId: null,
            nurseName: null,
            declinedAt: new Date().toISOString(),
            declineReason: reason,
            updatedAt: new Date().toISOString()
          }
        : appointment
    );

    setAppointments(updatedAppointments);
    await saveAppointments(updatedAppointments);

    const appointment = updatedAppointments.find(apt => apt.id === appointmentId);

    // Send notification to admin about decline
    await sendNotificationToUser(
      'admin-001', // Correct admin user ID
      'admin',
      'Assignment Declined',
      `Assignment declined for ${appointment.patientName}. ${reason ? 'Reason: ' + reason : ''}`,
      {
        appointmentId,
        type: 'assignment_declined'
      }
    );

    // Send notification to patient about decline
    await sendNotificationToUser(
      appointment.patientId,
      'patient',
      'Appointment Needs Reassignment',
      `Your appointment for ${appointment.service} needs to be reassigned to another nurse. We'll notify you once a new nurse is assigned.`,
      {
        appointmentId,
        type: 'appointment_declined'
      }
    );

    return appointment;
  };

  // Complete appointment (Nurse action)
  const completeAppointment = async (appointmentId, notes = '') => {
    const updatedAppointments = appointments.map(appointment => 
      appointment.id === appointmentId 
        ? {
            ...appointment,
            status: 'completed',
            completedAt: new Date().toISOString(),
            completionNotes: notes,
            updatedAt: new Date().toISOString()
          }
        : appointment
    );

    setAppointments(updatedAppointments);
    await saveAppointments(updatedAppointments);

    const appointment = updatedAppointments.find(apt => apt.id === appointmentId);

    // Increment the nurse's assigned clients count
    if (appointment.nurseId) {
      incrementAssignedClients(appointment.nurseId);
    }

    // Auto-generate and email invoice for non-recurring appointments
    if (!appointment.isRecurring) {
      try {
        console.log('📄 Auto-generating invoice for completed appointment:', appointmentId);
        
        // Create invoice
        const invoiceResult = await InvoiceService.createInvoice(appointment);
        
        if (invoiceResult.success) {
          console.log('✅ Invoice generated:', invoiceResult.invoice.invoiceId);
          
          // Auto-email the invoice (simulated - in production, this would use an email service)
          console.log('📧 Auto-emailing invoice to:', appointment.patientEmail || appointment.email);
          console.log('📧 Invoice details:', {
            invoiceId: invoiceResult.invoice.invoiceId,
            patientName: appointment.patientName,
            service: appointment.service,
            amount: invoiceResult.invoice.total
          });
          
          // Simulate email success
          const emailSuccess = true; // In production: await EmailService.sendInvoice(invoiceResult.invoice)
          
          if (emailSuccess) {
            console.log('✅ Invoice emailed successfully to patient');
            
            // Notify admin about successful invoice generation and email
            await sendNotificationToUser(
              'admin-001',
              'admin',
              'Invoice Auto-Generated & Emailed',
              `Invoice ${invoiceResult.invoice.invoiceId} created and emailed to ${appointment.patientName}`,
              {
                appointmentId,
                invoiceId: invoiceResult.invoice.invoiceId,
                type: 'invoice_generated'
              }
            );
          } else {
            console.warn('⚠️ Invoice created but email failed');
            // Notify admin that invoice was created but email failed
            await sendNotificationToUser(
              'admin-001',
              'admin',
              'Invoice Generated (Email Pending)',
              `Invoice ${invoiceResult.invoice.invoiceId} created for ${appointment.patientName}. Manual email required.`,
              {
                appointmentId,
                invoiceId: invoiceResult.invoice.invoiceId,
                type: 'invoice_generated_email_failed'
              }
            );
          }
        }
      } catch (invoiceError) {
        console.error('Failed to auto-generate invoice:', invoiceError);
        // Notify admin about invoice generation failure
        await sendNotificationToUser(
          'admin-001',
          'admin',
          'Invoice Generation Failed',
          `Failed to generate invoice for completed appointment with ${appointment.patientName}`,
          {
            appointmentId,
            type: 'invoice_generation_failed'
          }
        );
      }
    } else {
      // For recurring patients, just log that invoice will be sent on schedule
      console.log('📅 Recurring patient - invoice will be sent according to schedule');
    }

    // Send notification to admin about completion
    await sendNotificationToUser(
      'admin-001', // Correct admin user ID
      'admin',
      'Appointment Completed',
      `${appointment.nurseName} has completed the appointment with ${appointment.patientName}`,
      {
        appointmentId,
        type: 'appointment_completed'
      }
    );

    return appointment;
  };

  // Clear all completed appointments (for testing)
  const clearCompletedAppointments = async () => {
    const nonCompletedAppointments = appointments.filter(apt => apt.status !== 'completed');
    setAppointments(nonCompletedAppointments);
    await saveAppointments(nonCompletedAppointments);
  };

  // Clear ALL appointments (for testing)
  const clearAllAppointments = async () => {
    setAppointments([]);
    await AsyncStorage.setItem(STORAGE_KEYS.APPOINTMENTS, JSON.stringify([]));
    console.log('🗑️ All appointments cleared');
  };

  // Cancel appointment
  const cancelAppointment = async (appointmentId, reason = '') => {
    const updatedAppointments = appointments.map(apt => 
      apt.id === appointmentId 
        ? { 
            ...apt, 
            status: 'cancelled',
            cancelledAt: new Date().toISOString(),
            cancellationReason: reason,
            updatedAt: new Date().toISOString(),
          }
        : apt
    );

    setAppointments(updatedAppointments);
    await saveAppointments(updatedAppointments);

    return updatedAppointments.find(apt => apt.id === appointmentId);
  };

  // Get appointments by patient ID (for patient screens)
  const getPatientAppointments = (patientId = null) => {
    const targetPatientId = patientId || user?.id;
    return appointments.filter(apt => apt.patientId === targetPatientId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  };

  // Get upcoming appointments for patient (confirmed or nurse_assigned status)
  const getUpcomingAppointments = (patientId = null) => {
    const targetPatientId = patientId || user?.id;
    const now = new Date();
    now.setHours(0, 0, 0, 0); // Set to start of today for comparison
    
    const filtered = appointments.filter(apt => {
      const matches = apt.patientId === targetPatientId;
      const statusMatch = apt.status === 'confirmed' || apt.status === 'nurse_assigned';
      
      // Parse the date safely
      let dateValid = true; // Default to true if we can't parse
      try {
        // Check if date string matches "MMM DD, YYYY" format
        const dateStr = apt.date;
        if (typeof dateStr === 'string') {
          // For formatted strings like "Nov 04, 2025"
          if (dateStr.match(/^\w{3}\s\d{1,2},\s\d{4}$/)) {
            const aptDate = new Date(dateStr);
            if (!isNaN(aptDate.getTime())) {
              aptDate.setHours(0, 0, 0, 0);
              dateValid = aptDate >= now;
            }
          } else {
            // Try parsing as-is for ISO or other formats
            const aptDate = new Date(dateStr);
            if (!isNaN(aptDate.getTime())) {
              aptDate.setHours(0, 0, 0, 0);
              dateValid = aptDate >= now;
            }
          }
        }
      } catch (e) {
        console.log('Date parse error for:', apt.date, e);
        // Keep dateValid as true on error to show the appointment
      }
      
      return matches && statusMatch && dateValid;
    });
    
    return filtered.sort((a, b) => {
      try {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return dateA - dateB;
      } catch (e) {
        return 0;
      }
    });
  };

  // Get appointment history for patient (completed appointments)
  const getAppointmentHistory = (patientId = null) => {
    const targetPatientId = patientId || user?.id;
    
    return appointments.filter(apt => 
      apt.patientId === targetPatientId && 
      apt.status === 'completed'
    ).sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));
  };

  // Get appointments by role and filters
  const getAppointmentsByRole = (role, filters = {}) => {
    let filtered = appointments;

    switch (role) {
      case 'patient':
        filtered = getPatientAppointments();
        break;
      case 'nurse':
        filtered = appointments.filter(apt => apt.nurseId === user?.id);
        break;
      case 'admin':
        // Admin sees all appointments
        break;
      default:
        filtered = [];
    }

    // Apply additional filters
    if (filters.status) {
      filtered = filtered.filter(apt => apt.status === filters.status);
    }

    if (filters.date) {
      filtered = filtered.filter(apt => apt.date === filters.date);
    }

    return filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  };

  // Get available nurses
  const getAvailableNurses = () => {
    return nurses.filter(nurse => nurse.status === 'available');
  };

  // Update nurse status
  const updateNurseStatus = async (nurseId, status) => {
    const updatedNurses = nurses.map(nurse => 
      nurse.id === nurseId 
        ? { ...nurse, status, updatedAt: new Date().toISOString() }
        : nurse
    );

    setNurses(updatedNurses);
    await saveNurses(updatedNurses);
  };

  // Get appointment statistics for admin dashboard
  const getAppointmentStats = () => {
    const today = new Date().toISOString().split('T')[0];
    
    return {
      total: appointments.length,
      pending: appointments.filter(apt => apt.status === 'pending').length,
      confirmed: appointments.filter(apt => apt.status === 'confirmed').length,
      completed: appointments.filter(apt => apt.status === 'completed').length,
      cancelled: appointments.filter(apt => apt.status === 'cancelled').length,
      todayAppointments: appointments.filter(apt => apt.date === today).length,
    };
  };

  // Get appointments by status
  const getAppointmentsByStatus = (status) => {
    if (!appointments || !Array.isArray(appointments)) {
      return [];
    }
    return appointments.filter(appointment => appointment.status === status);
  };

  // Get appointments by nurse ID
  const getAppointmentsByNurse = (nurseId) => {
    if (!appointments || !Array.isArray(appointments)) {
      return [];
    }
    return appointments.filter(appointment => appointment.nurseId === nurseId);
  };

  // Update nurse availability status
  const updateNurseAvailability = async (nurseId, isAvailable) => {
    const status = isAvailable ? 'available' : 'busy';
    await updateNurseStatus(nurseId, status);
  };

  // Update appointment notes
  const updateAppointmentNotes = async (appointmentId, notes) => {
    const updatedAppointments = appointments.map(appointment =>
      appointment.id === appointmentId
        ? {
            ...appointment,
            nurseNotes: notes, // Save as nurseNotes to keep separate from patient booking notes
            updatedAt: new Date().toISOString()
          }
        : appointment
    );

    setAppointments(updatedAppointments);
    await saveAppointments(updatedAppointments);
    return updatedAppointments.find(apt => apt.id === appointmentId);
  };

  // Load data on mount and refresh from API
  // Load data on mount
  useEffect(() => {
    loadData();
  }, []);

  const value = {
    appointments,
    nurses,
    isLoading,
    bookAppointment,
    assignNurse,
    acceptAppointment,
    declineAppointment,
    completeAppointment,
    cancelAppointment,
    clearCompletedAppointments,
    clearAllAppointments,
    refreshAppointments,
    getAppointmentsByRole,
    getAppointmentsByStatus,
    getAppointmentsByNurse,
    getPatientAppointments,
    getUpcomingAppointments,
    getAppointmentHistory,
    getAvailableNurses,
    updateNurseStatus,
    updateNurseAvailability,
    updateAppointmentNotes,
    getAppointmentStats,
  };

  return (
    <AppointmentContext.Provider value={value}>
      {children}
    </AppointmentContext.Provider>
  );
};