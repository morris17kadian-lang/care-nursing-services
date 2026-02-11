import TouchableWeb from "../components/TouchableWeb";
import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Modal, Alert, Image, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, GRADIENTS, SPACING } from '../constants';
import { useAuth } from '../context/AuthContext';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAppointments } from '../context/AppointmentContext';
import { useNurses } from '../context/NurseContext';
import { useShifts } from '../context/ShiftContext';
import InvoiceService from '../services/InvoiceService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getNurseName } from '../utils/formatters';
import offlineUsers from '../876Nursesdatabase/care_database.users.json';
import NotesAccordionList from '../components/NotesAccordionList';

export default function AdminClientsScreen({ navigation, route, isEmbedded = false }) {
  const { logout } = useAuth();
  const { appointments: allAppointments, getAppointmentsByStatus } = useAppointments();
  const { nurses: nursesFromContext } = useNurses();
  const { shiftRequests } = useShifts();
  const insets = useSafeAreaInsets();
  const [isAddClientModalVisible, setIsAddClientModalVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [clientDetailsModalVisible, setClientDetailsModalVisible] = useState(false);
  const [fullInvoiceModalVisible, setFullInvoiceModalVisible] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [clientToDelete, setClientToDelete] = useState(null);
  const [currentInvoiceData, setCurrentInvoiceData] = useState(null);
  const [clients, setClients] = useState([]);
  const [clientForm, setClientForm] = useState({
    name: '',
    email: '',
    phone: '',
    serviceType: '',
    paymentMethod: ''
  });
  
  // Company details and payment info for invoice display
  const [companyDetails, setCompanyDetails] = useState({
    companyName: '876 Nurses Home Care Services Limited',
    fullName: '876 NURSES HOME CARE SERVICES LIMITED',
    address: '60 Knutsford Blvd, Panjam Building, 9th Floor - Regus, Kingston 5, Jamaica, West Indies',
    phone: '(876) 618-9876',
    email: '876nurses@gmail.com',
    taxId: '',
    website: 'www.876nurses.com',
  });

  const [paymentInfo, setPaymentInfo] = useState({
    bankAccounts: [
      { 
        id: '1', 
        bankName: 'NCB', 
        recipientType: 'Individual',
        accountNumbers: [
          { id: '1', number: '123456789', currency: 'JMD' }
        ],
        payee: '',
        branch: '',
        swiftCode: '',
        sortCode: ''
      }
    ],
    cashAccepted: true,
    posAvailable: false
  });

  const sanitizeContactValue = (value) => {
    if (!value && value !== 0) return '';
    const trimmed = String(value).trim();
    if (!trimmed) return '';
    const lower = trimmed.toLowerCase();
    if (['no email provided', 'no phone provided', 'not provided', 'n/a', 'na'].includes(lower)) {
      return '';
    }
    return trimmed;
  };

  const sanitizeMediaValue = (value) => {
    if (!value) return '';
    const trimmed = String(value).trim();
    if (!trimmed) return '';
    const lower = trimmed.toLowerCase();
    if (['n/a', 'na', 'none', 'null', 'undefined', 'no photo', 'no image'].includes(lower)) {
      return '';
    }
    return trimmed;
  };

  const resolvePatientPhoto = (appointment) => {
    if (!appointment) return '';
    
    const candidates = [
      appointment.patientPhoto,
      appointment.patientProfilePhoto,
      appointment.patient?.photoUrl,
      appointment.patient?.profilePhoto,
      appointment.patient?.profileImage,
      appointment.patient?.profilePicture,
      appointment.patient?.photo,
      appointment.patient?.avatar,
      appointment.patient?.imageUrl,
      appointment.patient?.photoURL,
      appointment.profilePhoto,
      appointment.clientPhoto,
      appointment.clientAvatar,
      appointment.client?.photoUrl,
      appointment.client?.profilePhoto,
      appointment.client?.profileImage,
      appointment.client?.profilePicture,
      appointment.client?.photo,
      appointment.client?.avatar,
      appointment.client?.imageUrl,
      appointment.client?.photoURL,
      appointment.avatarUrl,
      appointment.photoUrl
    ].map(sanitizeMediaValue);

    return candidates.find(Boolean) || '';
  };

  const buildUserLookups = (usersList = []) => {
    const byId = new Map();
    const byEmail = new Map();
    const byName = new Map();

    usersList.forEach(profile => {
      if (!profile) return;
      const possibleIds = [profile.id, profile._id, profile.uid, profile.userId];
      possibleIds.filter(Boolean).forEach(id => byId.set(String(id), profile));

      if (profile.email) {
        byEmail.set(profile.email.toLowerCase(), profile);
      }
      if (profile.contactEmail) {
        byEmail.set(profile.contactEmail.toLowerCase(), profile);
      }

      const usernames = [profile.username, profile.code, profile.adminCode];
      const fullName = `${profile.firstName || ''} ${profile.lastName || ''}`.trim();
      usernames.filter(Boolean).forEach(name => byName.set(name.toLowerCase(), profile));
      if (fullName) {
        byName.set(fullName.toLowerCase(), profile);
      }
      if (profile.fullName) {
        byName.set(profile.fullName.toLowerCase(), profile);
      }
    });

    return { byId, byEmail, byName };
  };

  const resolveProfileForAppointment = (apt, lookup) => {
    if (!apt || !lookup) return null;
    const candidates = [];
    const potentialIds = [
      apt.patientId,
      apt.patient?.id,
      apt.patient?._id,
      apt.patient,
      apt.clientId,
      apt.client?.id,
      apt.client?._id
    ];
    potentialIds.filter(Boolean).forEach(id => candidates.push(lookup.byId.get(String(id))));

    if (apt.patientEmail) {
      candidates.push(lookup.byEmail.get(apt.patientEmail.toLowerCase()));
    }
    if (apt.email) {
      candidates.push(lookup.byEmail.get(String(apt.email).toLowerCase()));
    }

    const possibleNames = [apt.patientName, apt.clientName];
    possibleNames.filter(Boolean).forEach(name => {
      candidates.push(lookup.byName.get(name.toLowerCase()));
    });

    return candidates.find(Boolean) || null;
  };

  const offlineUserProfiles = useMemo(() => {
    if (Array.isArray(offlineUsers)) return offlineUsers;
    if (offlineUsers && Array.isArray(offlineUsers.users)) return offlineUsers.users;
    return [];
  }, []);

  const [firebaseUsers, setFirebaseUsers] = useState([]);
  
  // Fetch users from Firebase to get updated profile photos
  useEffect(() => {
    const fetchFirebaseUsers = async () => {
      try {
        const usersCollection = collection(db, 'users');
        const usersSnapshot = await getDocs(usersCollection);
        const usersData = usersSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setFirebaseUsers(usersData);
      } catch (error) {
        console.error('Error fetching Firebase users:', error);
      }
    };
    
    fetchFirebaseUsers();
  }, []);

  const offlineUserLookups = useMemo(() => {
    // Merge offline and Firebase users, prioritizing Firebase data
    const mergedUsers = [...offlineUserProfiles];
    
    firebaseUsers.forEach(fbUser => {
      const existingIndex = mergedUsers.findIndex(u => 
        String(u._id?.$oid || u.id || u._id) === String(fbUser.id)
      );
      
      if (existingIndex >= 0) {
        // Update existing user with Firebase data
        mergedUsers[existingIndex] = {
          ...mergedUsers[existingIndex],
          ...fbUser,
          profilePhoto: fbUser.profilePhoto || fbUser.photoUrl || mergedUsers[existingIndex].profilePhoto,
        };
      } else {
        // Add new Firebase user
        mergedUsers.push(fbUser);
      }
    });
    
    return buildUserLookups(mergedUsers);
  }, [offlineUserProfiles, firebaseUsers]);

  // Build clients list from completed appointments - load on focus
  useFocusEffect(
    React.useCallback(() => {
      buildClientsFromAppointments();
    }, [allAppointments])
  );

  // Handle reopening client details modal when returning from invoice
  useEffect(() => {
    if (route?.params?.openClientDetails && route?.params?.clientId) {
      const clientToOpen = clients.find(c => c.id === route.params.clientId);
      if (clientToOpen) {
        handleShowClientDetails(clientToOpen);
        // Clear the params after handling
        navigation.setParams({ openClientDetails: undefined, clientId: undefined });
      }
    }
  }, [route?.params?.openClientDetails, route?.params?.clientId, clients]);

  // Load company details and payment info
  useEffect(() => {
    loadCompanyDetails();
    loadPaymentInfo();
  }, []);

  // Handle navigation params to reopen client details modal after invoice view
  useEffect(() => {
    if (route?.params?.openClientDetails && route?.params?.clientId) {
      const clientToOpen = clients.find(c => c.id === route.params.clientId);
      if (clientToOpen) {
        setSelectedClient(clientToOpen);
        setClientDetailsModalVisible(true);
      }
      // Clear the params to prevent reopening on subsequent renders
      navigation.setParams({ openClientDetails: false, clientId: null });
    }
  }, [route?.params, clients]);

  const loadCompanyDetails = async () => {
    try {
      const stored = await AsyncStorage.getItem('companyDetails');
      if (stored) {
        setCompanyDetails(JSON.parse(stored));
      }
    } catch (error) {
      // Error loading company details
    }
  };

  const loadPaymentInfo = async () => {
    try {
      const stored = await AsyncStorage.getItem('paymentInfo');
      if (stored) {
        setPaymentInfo(JSON.parse(stored));
      }
    } catch (error) {
      // Error loading payment info
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
      // Handle Firestore Timestamp
      if (typeof dateString === 'object' && dateString.seconds) {
        return new Date(dateString.seconds * 1000).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
      }
      
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return String(dateString); // Convert to string to avoid object render error
      const options = { year: 'numeric', month: 'short', day: 'numeric' };
      return date.toLocaleDateString('en-US', options);
    } catch (error) {
      return String(dateString); // Ensure we return a string
    }
  };

  const buildClientsFromAppointments = async () => {
    // Build clients from the same completed set used on the Admin Dashboard
    // (both completed appointments AND completed shift requests)
    const completedAppointments = (getAppointmentsByStatus('completed') || []).filter(
      (apt) => !apt.isShiftRequest
    );

    // Include completed shift requests (recurring and non-recurring)
    const hasClockedOut = (shift) => {
      const clockByNurse = shift?.clockByNurse;
      if (!clockByNurse || typeof clockByNurse !== 'object') return false;
      const entries = Object.values(clockByNurse);
      return entries.some(entry => {
        if (!entry || typeof entry !== 'object') return false;
        const inTime = entry.lastClockInTime || entry.clockInTime || entry.startedAt;
        const outTime = entry.lastClockOutTime || entry.clockOutTime || entry.completedAt;
        if (!inTime || !outTime) return false;
        const inMs = Date.parse(inTime);
        const outMs = Date.parse(outTime);
        return outMs > inMs;
      });
    };
    
    const completedShifts = (shiftRequests || []).filter(request => 
      request.status === 'completed' || (request.isRecurring && hasClockedOut(request))
    );

    // Combine both sources like the admin dashboard does
    const allCompletedItems = [...completedAppointments, ...completedShifts];

    // Debug logs removed
    
    // Get all invoices
    const allInvoices = await InvoiceService.getAllInvoices();
    // Debug logs removed
      
      // Group by patientId (or clientId for shifts)
      const clientsMap = new Map();
      
      allCompletedItems.forEach(apt => {
        // Normalize patient/client fields for shifts
        const patientId = apt.patientId || apt.clientId;
        const patientName = apt.patientName || apt.clientName;
        const patientEmail = apt.patientEmail || apt.clientEmail || apt.email || '';
        const patientPhone = apt.patientPhone || apt.clientPhone || apt.phone || '';
        const appointmentEmail = sanitizeContactValue(patientEmail);
        const appointmentPhone = sanitizeContactValue(patientPhone);

        const photoFromAppointment = resolvePatientPhoto(apt);

        if (!clientsMap.has(patientId)) {
          clientsMap.set(patientId, {
            id: patientId,
            name: patientName,
            email: appointmentEmail,
            phone: appointmentPhone,
            photoUrl: photoFromAppointment,
            address: apt.address || '6 Reece Road, Kingston 10',
            serviceType: apt.service || 'General Care',
            paymentMethod: 'Insurance',
            isSubscriber: false,
            hasRecurringAppointments: apt.isRecurring || false,
            appointments: {
              upcoming: 0,
              completed: 0
            },
            totalPaid: 'J$0',
            medicalNotes: [],
            invoiceHistory: [],
            completedAppointments: [] // Add this for invoice linking
          });
        }
        
        const client = clientsMap.get(patientId);
        client.appointments.completed += 1;

        // Keep contact info synced - prefer latest appointment data if available
        // Sort appointments by date to ensure we get the latest info
        const aptDate = new Date(apt.date);
        if (!client.latestAptDate || aptDate > client.latestAptDate) {
          client.latestAptDate = aptDate;
          const email = sanitizeContactValue(patientEmail);
          if (email) {
            client.email = email;
          }
          const phone = sanitizeContactValue(patientPhone);
          if (phone) {
            client.phone = phone;
          }
          const latestPhoto = resolvePatientPhoto(apt);
          if (latestPhoto) {
            client.photoUrl = latestPhoto;
          }
          const address = apt.address || apt.clientAddress;
          if (address && address !== 'No address provided' && address !== 'N/A') {
            client.address = address;
          }
        }

        const offlineProfile = resolveProfileForAppointment(apt, offlineUserLookups);
        if (offlineProfile) {
          const sanitizedClientEmail = sanitizeContactValue(client.email);
          const offlineEmail = sanitizeContactValue(
            offlineProfile.email || offlineProfile.contactEmail || offlineProfile.primaryEmail || ''
          );
          if (!sanitizedClientEmail && offlineEmail) {
            client.email = offlineEmail;
            client.contactSource = 'offline';
          }

          const sanitizedClientPhone = sanitizeContactValue(client.phone);
          const offlinePhone = [
            offlineProfile.phone,
            offlineProfile.contactPhone,
            offlineProfile.primaryPhone,
            offlineProfile.phoneNumber,
            offlineProfile.mobile
          ].map(value => sanitizeContactValue(value)).find(Boolean);
          if (!sanitizedClientPhone && offlinePhone) {
            client.phone = offlinePhone;
            client.contactSource = client.contactSource || 'offline';
          }

          if (!client.photoUrl) {
            const offlinePhoto = sanitizeMediaValue(
              offlineProfile.profilePhoto ||
              offlineProfile.profileImage ||
              offlineProfile.photoUrl ||
              offlineProfile.imageUrl ||
              offlineProfile.photo ||
              offlineProfile.photoURL ||
              offlineProfile.avatar ||
              offlineProfile.profilePicture
            );
            if (offlinePhoto) {
              client.photoUrl = offlinePhoto;
            }
          }
        }
        
        // Store the completed appointment
        client.completedAppointments.push(apt);
        
        // Add medical notes from completed appointment
        // Extract nurse name from multiple possible sources
        let nurseName = apt.nurseName 
          || apt.assignedNurseName 
          || apt.nurse?.name
          || apt.nurse?.fullName
          || apt.assignedNurse?.name 
          || apt.assignedNurse?.fullName
          || getNurseName(apt.assignedNurse)
          || getNurseName(apt.nurse);

        // If nurseName is still missing but we have a nurseId, try NurseContext
        const nurseIdCandidate = apt.nurseId || apt.assignedNurse?._id || apt.assignedNurse?.id;
        if ((!nurseName || nurseName === 'Unassigned' || nurseName === 'Assigned Nurse' || nurseName === 'Staff Member') && nurseIdCandidate && Array.isArray(nursesFromContext)) {
          const matchedNurse = nursesFromContext.find(n =>
            String(n.id ?? n._id) === String(nurseIdCandidate)
          );
          if (matchedNurse?.name) {
            nurseName = matchedNurse.name;
          }
        }
        
        // Only use fallback if we truly have no name
        if (!nurseName || nurseName === 'Unassigned' || nurseName === 'Assigned Nurse' || nurseName === 'Staff Member') {
          // Avoid showing "Staff Member"; prefer a nurse-specific fallback
          if (nurseIdCandidate) {
            nurseName = 'Assigned Nurse';
          } else {
            nurseName = 'Care Professional';
          }
        }
        
        // Only add medical notes if there are actual nurse notes (not patient booking notes).
        // For shift requests, nurse notes often live in `notes`.
        const isShiftLike = Boolean(apt.isShiftRequest || apt.isShift || apt.adminRecurring || apt.recurringPattern || apt.isRecurring);
        const actualNurseNotes =
          apt.completionNotes ||
          apt.nurseNotes ||
          (isShiftLike ? apt.notes : null);
        if (actualNurseNotes && actualNurseNotes.trim()) {
          client.medicalNotes.push({
            id: apt.id,
            date: apt.completionDate || apt.completedAt || apt.date,
            appointmentType: apt.service || 'General Care',
            notes: actualNurseNotes,
            nurseName: nurseName,
            nurseId: apt.nurseId || apt.assignedNurse?._id || apt.assignedNurse?.id
          });
        }
        
        // Find and link invoice for this appointment
        const appointmentInvoice = allInvoices.find(inv => {
          const relatedId = inv.relatedAppointmentId ?? inv.appointmentId;
          if (relatedId === undefined || relatedId === null) return false;
          return String(relatedId) === String(apt.id);
        });
        if (appointmentInvoice) {
          // Found invoice for appointment
          client.invoiceHistory.push({
            id: appointmentInvoice.invoiceId,
            date: appointmentInvoice.createdAt,
            amount: appointmentInvoice.total,
            status: appointmentInvoice.status || 'Pending',
            paidDate: appointmentInvoice.paidDate || null,
            paymentMethod: appointmentInvoice.paymentMethod || null,
            invoiceRecord: appointmentInvoice
          });
        } else {
          // No invoice found for appointment
        }
      });
      
      // Second pass: Add any remaining invoices that match by client name but weren't linked to specific appointments
      clientsMap.forEach((client) => {
        const clientInvoices = allInvoices.filter(inv => {
          // Check if invoice belongs to this client by name
          const invoiceClientName = (inv.clientName || inv.patientName || '').toLowerCase();
          const clientName = (client.name || '').toLowerCase();
          if (invoiceClientName !== clientName) return false;
          
          // Check if this invoice is already in the client's history
          const alreadyAdded = client.invoiceHistory.some(existing => 
            String(existing.id) === String(inv.invoiceId || inv.id)
          );
          return !alreadyAdded;
        });
        
        clientInvoices.forEach(inv => {
          client.invoiceHistory.push({
            id: inv.invoiceId || inv.id,
            date: inv.createdAt || inv.issueDate,
            amount: inv.total,
            status: inv.status || 'Pending',
            paidDate: inv.paidDate || null,
            paymentMethod: inv.paymentMethod || null,
            invoiceRecord: inv
          });
        });
      });
      
      const clientsList = Array.from(clientsMap.values())
        .filter(client => {
          const name = client.name ? client.name.toLowerCase() : '';
          const isFiltered = name.includes('unknown patient') || name.includes('unknown client');
          if (isFiltered) {
            // Filtered noisy client names
          }
          return !isFiltered;
        });
      
      clientsList.forEach(client => {
        client.email = sanitizeContactValue(client.email);
        client.phone = sanitizeContactValue(client.phone);
        client.photoUrl = sanitizeMediaValue(client.photoUrl);
        if (client.photoUrl) {
          client.profilePhoto = client.profilePhoto || client.photoUrl;
          client.profileImage = client.profileImage || client.photoUrl;
        }
      });

      // Debug invoice history logs removed
      
      setClients(clientsList);
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      // Error logging out
    }
  };

  const handleAddClient = () => {
    if (!clientForm.name || !clientForm.email || !clientForm.phone) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    // Add client to data (in a real app, this would be an API call)
    const newClient = {
      id: Date.now(),
      name: clientForm.name,
      email: clientForm.email,
      phone: clientForm.phone,
      serviceType: clientForm.serviceType || 'General Care',
      paymentMethod: clientForm.paymentMethod || 'Insurance',
      isSubscriber: false,
      appointments: {
        upcoming: 0,
        completed: 0
      },
      totalPaid: 'J$0'
    };

    Alert.alert('Success', 'Client added successfully!');
    
    // Reset form
    setClientForm({
      name: '',
      email: '',
      phone: '',
      serviceType: '',
      paymentMethod: ''
    });
    setIsAddClientModalVisible(false);
  };

  const handleDeleteClient = (client) => {
    setClientToDelete(client);
    setDeleteModalVisible(true);
  };

  const handleShowClientDetails = (client) => {
    // Use the client object as built by buildClientsFromAppointments,
    // which already includes completed appointments and invoiceHistory.
    setSelectedClient(client);
    setClientDetailsModalVisible(true);
  };

  // Enhanced invoice generation system
  const generateInvoiceData = (client) => {
    const currentDate = new Date();
    const formatDate = (date) => {
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
    };

    // Calculate service pricing based on service type
    const getServicePricing = (serviceType) => {
      const servicePrices = {
        'Physical Therapy': { unitPrice: 7500, sessions: 6 },
        'Wound Care': { unitPrice: 5000, sessions: 4 },
        'Home Care': { unitPrice: 8000, sessions: 8 },
        'Medication Administration': { unitPrice: 3000, sessions: 5 },
        'Blood Pressure Monitoring': { unitPrice: 2500, sessions: 3 },
        'Post-Surgery Care': { unitPrice: 9000, sessions: 5 },
        'Diabetic Care': { unitPrice: 6000, sessions: 4 },
        'General Care': { unitPrice: 4000, sessions: 3 }
      };
      return servicePrices[serviceType] || { unitPrice: 4000, sessions: 3 };
    };

    // Get completed appointments from the last billing period
    const getCompletedAppointments = (client) => {
      // For recurring patients, calculate based on their recent completed sessions
      if (client.hasRecurringAppointments) {
        const pricing = getServicePricing(client.serviceType);
        return {
          sessions: pricing.sessions,
          unitPrice: pricing.unitPrice,
          dates: client.medicalNotes.slice(-pricing.sessions).map(note => note.date)
        };
      } else {
        // For non-recurring, use actual completed appointments
        const pricing = getServicePricing(client.serviceType);
        return {
          sessions: Math.min(client.appointments.completed, pricing.sessions),
          unitPrice: pricing.unitPrice,
          dates: client.medicalNotes.slice(-Math.min(client.appointments.completed, pricing.sessions)).map(note => note.date)
        };
      }
    };

    const appointmentData = getCompletedAppointments(client);
    const subtotal = appointmentData.sessions * appointmentData.unitPrice;
    const tax = 0; // No tax for healthcare services
    const total = subtotal + tax;

    // Generate invoice number
    const invoiceNumber = Math.floor(Math.random() * 900) + 100;

    return {
      invoiceNumber,
      client: {
        name: client.name,
        address: client.address || '6 Reece Road, Kingston 10',
        email: client.email,
        phone: client.phone
      },
      company: {
        name: '876 Nurses Home Care Services Limited',
        phone: '8766189876',
        email: '876nurses@gmail.com'
      },
      dates: {
        invoiceDate: formatDate(currentDate),
        dueDate: formatDate(new Date(currentDate.getTime() + 24 * 60 * 60 * 1000)), // Next day
        serviceDates: appointmentData.dates.join(', ')
      },
      services: {
        description: client.serviceType,
        unitPrice: appointmentData.unitPrice,
        quantity: appointmentData.sessions,
        amount: subtotal,
        serviceDates: appointmentData.dates
      },
      billing: {
        subtotal,
        tax,
        total,
        paid: client.hasRecurringAppointments ? total : 0, // Auto-pay for recurring
        balanceDue: client.hasRecurringAppointments ? 0 : total
      },
      paymentInstructions: {
        method: 'Bank Transfer',
        payee: '876NURSES',
        bank: 'NCB Saving',
        accountNumber: 'JMD354756226 / USD354756234',
        branch: 'Knutsford Branch',
        swiftCode: 'JNCBXX'
      },
      isRecurring: client.hasRecurringAppointments,
      paymentMethod: client.paymentMethod
    };
  };

  const handleViewInvoice = async (client) => {
    
    // Close the client details modal before navigating
    setClientDetailsModalVisible(false);
    
    try {
      // First, try to fetch existing invoice for this client from InvoiceService
      const allInvoices = await InvoiceService.getAllInvoices();
      
      // Find most recent invoice for this client
      const clientInvoices = allInvoices.filter(inv => 
        inv.clientName === client.name || 
        inv.clientEmail === client.email ||
        inv.clientId === client.id
      );
      
      if (clientInvoices.length > 0) {
        // Sort by creation date and get most recent
        const sortedInvoices = clientInvoices.sort((a, b) => {
          const dateA = new Date(a.createdAt || a.issueDate);
          const dateB = new Date(b.createdAt || b.issueDate);
          return dateB - dateA; // Most recent first
        });
        const mostRecentInvoice = sortedInvoices[0];
        
        // Navigate to invoice display - modal already closed
        navigation.navigate('InvoiceDisplay', {
          invoiceData: mostRecentInvoice,
          clientName: client.name
        });
        return;
      }
      
      // If no existing invoice, generate new one
      const completedAppointments = client.medicalNotes || [];

      if (completedAppointments.length === 0) {
        // If no completed appointments, create a sample invoice
        const result = await InvoiceService.createSampleInvoice();
        
        if (result.success) {
          // Modal already closed - just navigate
          navigation.navigate('InvoiceDisplay', {
            invoiceData: result.invoice,
            clientName: client.name
          });
        } else {
          Alert.alert('Error', result.error || 'Failed to generate sample invoice');
        }
        return;
      }

      // Get the most recent completed appointment or create invoice for recent period
      const recentAppointments = completedAppointments.slice(-3); // Last 3 appointments for billing period
      
      // Create comprehensive appointment data for invoice
      const appointmentData = {
        id: recentAppointments[recentAppointments.length - 1]?.id || `appointment-${client.id}-${Date.now()}`,
        clientId: client.id,
        clientName: client.name,
        clientEmail: client.email,
        clientPhone: client.phone,
        clientAddress: client.address || '6 Reece Road, Kingston 10',
        serviceName: client.serviceType,
        serviceType: client.serviceType,
        // Use most recent appointment details
        appointmentDate: recentAppointments[recentAppointments.length - 1]?.date || new Date().toISOString().split('T')[0],
        appointmentTime: '10:00 AM',
        status: 'completed',
        notes: recentAppointments[recentAppointments.length - 1]?.notes || 'Professional nursing services provided',
        duration: '45 mins',
        nurseId: recentAppointments[recentAppointments.length - 1]?.nurseId || 'NURSE001',
        nurseName: recentAppointments[recentAppointments.length - 1]?.nurseName || 'Care Professional',
        // Include all recent appointments for billing
        billingPeriodAppointments: recentAppointments.map(note => ({
          date: note.date,
          serviceType: note.appointmentType,
          nurseId: note.nurseId,
          nurseName: note.nurseName,
          notes: note.notes,
          duration: '45 mins'
        })),
        paymentMethod: client.paymentMethod,
        isRecurring: client.hasRecurringAppointments,
        totalSessions: recentAppointments.length
      };

      const result = await InvoiceService.createInvoice(appointmentData);
      
      if (result.success) {
        
        // Modal already closed - just navigate
        navigation.navigate('InvoiceDisplay', {
          invoiceData: result.invoice,
          clientName: client.name
        });
      } else {
        Alert.alert('Error', result.error || 'Failed to generate invoice');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to generate invoice');
    }
  };

  const handleSendInvoice = async (client) => {
    
    try {
      // Generate real appointment data from client's completed sessions (same as view invoice)
      const completedAppointments = client.medicalNotes || [];

      if (completedAppointments.length === 0) {
        Alert.alert('No Completed Services', 'This client has no completed appointments to generate an invoice for.');
        return;
      }

      // Get the most recent completed appointment or create invoice for recent period
      const recentAppointments = completedAppointments.slice(-3); // Last 3 appointments for billing period
      
      // Create comprehensive appointment data for invoice (same structure as view)
      const appointmentData = {
        id: recentAppointments[recentAppointments.length - 1]?.id || `appointment-${client.id}-${Date.now()}`,
        clientId: client.id,
        clientName: client.name,
        clientEmail: client.email,
        clientPhone: client.phone,
        clientAddress: client.address || '6 Reece Road, Kingston 10',
        serviceName: client.serviceType,
        serviceType: client.serviceType,
        appointmentDate: recentAppointments[recentAppointments.length - 1]?.date || new Date().toISOString().split('T')[0],
        appointmentTime: '10:00 AM',
        status: 'completed',
        notes: recentAppointments[recentAppointments.length - 1]?.notes || 'Professional nursing services provided',
        duration: '45 mins',
        nurseId: recentAppointments[recentAppointments.length - 1]?.nurseId || 'NURSE001',
        nurseName: recentAppointments[recentAppointments.length - 1]?.nurseName || 'Care Professional',
        billingPeriodAppointments: recentAppointments.map(note => ({
          date: note.date,
          serviceType: note.appointmentType,
          nurseId: note.nurseId,
          nurseName: note.nurseName,
          notes: note.notes,
          duration: '45 mins'
        })),
        paymentMethod: client.paymentMethod,
        isRecurring: client.hasRecurringAppointments,
        totalSessions: recentAppointments.length
      };

      // Generate invoice using same service as invoice management screen
      const result = await InvoiceService.generateInvoiceFromCompletedAppointment(appointmentData);
      
      if (result.success) {
        const invoice = result.invoice;
        
        const message = client.hasRecurringAppointments 
          ? `Auto-generated invoice for recurring ${client.serviceType} services`
          : `Invoice for completed ${client.serviceType} services`;

        Alert.alert(
          'Send Invoice',
          `${message}\n\nTo: ${client.email}\nInvoice #: ${invoice.invoiceId}\nAmount: $${invoice.total}\n${client.hasRecurringAppointments ? '🔄 Recurring billing active' : ''}`,
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Send Email', 
              onPress: async () => {
                try {
                  // Use the same email functionality as invoice management
                  await InvoiceService.shareInvoice(invoice);
                  Alert.alert(
                    'Success', 
                    `Invoice #${invoice.invoiceId} sent to ${client.email}\n` +
                    `${client.hasRecurringAppointments ? 'Next invoice will be auto-generated for recurring services.' : ''}`
                  );
                } catch (emailError) {
                  Alert.alert('Error', 'Failed to send invoice email');
                }
              }
            }
          ]
        );
      } else {
        Alert.alert('Error', result.error || 'Failed to generate invoice');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to generate invoice for emailing');
    }
  };

  // Auto-generate invoices for recurring patients (would run on a schedule in real app)
  const processRecurringInvoices = () => {
    const recurringClients = clients.filter(client => client.hasRecurringAppointments);
    
    Alert.alert(
      'Process Recurring Invoices',
      `Found ${recurringClients.length} recurring patients. Generate invoices for all?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Generate All',
          onPress: () => {
            recurringClients.forEach(client => {
              const invoiceData = generateInvoiceData(client);
            });
            
            Alert.alert(
              'Batch Processing Complete',
              `Generated ${recurringClients.length} invoices for recurring patients.\nAll invoices have been automatically sent.`
            );
          }
        }
      ]
    );
  };

  const confirmDelete = () => {
    // In real app, this would delete from database
    setDeleteModalVisible(false);
    setClientToDelete(null);
    Alert.alert('Success', `${clientToDelete?.name} has been removed from your clients.`);
  };

  // Helper to get status styles for invoices
  const getInvoiceStatusStyles = (status) => {
    const s = status?.toLowerCase() || 'pending';
    switch (s) {
      case 'paid':
        return { backgroundColor: COLORS.success + '15', textColor: COLORS.success, icon: 'check-circle' };
      case 'overdue':
        return { backgroundColor: COLORS.error + '15', textColor: COLORS.error, icon: 'alert-circle' };
      case 'sent':
      case 'pending':
        return { backgroundColor: COLORS.warning + '15', textColor: COLORS.warning, icon: null };
      default:
        return { backgroundColor: COLORS.border + '30', textColor: COLORS.textLight, icon: 'file-document-outline' };
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      {!isEmbedded && (
        <LinearGradient
          colors={GRADIENTS.header}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={[styles.header, { paddingTop: insets.top + 20 }]}
        >
          <View style={styles.headerRow}>
            <TouchableWeb
              style={styles.iconButton}
              onPress={() => {}}
            >
              <MaterialCommunityIcons name="magnify" size={24} color="#fff" />
            </TouchableWeb>
            
            <Text style={styles.welcomeText}>Client Management</Text>
          </View>
        </LinearGradient>
      )}

      {/* Watermark Logo */}
      <Image
        source={require('../assets/Images/Nurses-logo.png')}
        style={styles.watermarkLogo}
        resizeMode="contain"
      />

      <View style={styles.content}>
        <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {clients.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="account-group" size={80} color={COLORS.border} />
              <Text style={styles.emptyTitle}>No Subscribed Clients</Text>
              <Text style={styles.emptyText}>
                Subscribed clients will appear here
              </Text>
            </View>
          ) : (
            <View style={styles.listContainer}>
              {clients.map((client, index) => {
                const photoUri = client.profilePhoto || client.profileImage || client.photoUrl || client.avatar || client.photo || client.imageUrl || client.photoURL;
                
                return (
                  <View key={client.id || `client-${index}`} style={styles.compactCard}>
                    <View style={styles.compactHeader}>
                      {photoUri ? (
                        <Image 
                          source={{ uri: photoUri }} 
                          style={styles.clientProfilePhoto}
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={styles.clientProfilePhotoPlaceholder}>
                          <MaterialCommunityIcons name="account" size={20} color={COLORS.white} />
                        </View>
                      )}
                    <View style={styles.compactInfo}>
                      <View style={styles.clientNameRow}>
                        <Text style={styles.compactClient}>{client.name}</Text>
                        {client.hasRecurringAppointments && (
                          <MaterialCommunityIcons 
                            name="recycle" 
                            size={14} 
                            color="#4CAF50" 
                            style={{ marginLeft: 6 }}
                          />
                        )}
                      </View>
                    </View>
                    <TouchableWeb
                      style={styles.detailsButton}
                      onPress={() => handleShowClientDetails(client)}
                      activeOpacity={0.7}
                    >
                      <LinearGradient
                        colors={GRADIENTS.header}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 0, y: 1 }}
                        style={styles.detailsButtonGradient}
                      >
                        <Text style={styles.detailsButtonText}>View</Text>
                      </LinearGradient>
                    </TouchableWeb>
                  </View>
                </View>
              );
            })}
            </View>
          )}
          <View style={styles.bottomPadding} />
        </ScrollView>
      </View>

      {/* Add Client Modal */}
      <Modal
        visible={isAddClientModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsAddClientModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add New Client</Text>
              <TouchableWeb
                style={styles.closeButton}
                onPress={() => setIsAddClientModalVisible(false)}
              >
                <MaterialCommunityIcons name="close" size={24} color={COLORS.text} />
              </TouchableWeb>
            </View>

            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Full Name *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter client's full name"
                  value={clientForm.name}
                  onChangeText={(text) => setClientForm({ ...clientForm, name: text })}
                  placeholderTextColor={COLORS.textLight}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Email Address *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter email address"
                  value={clientForm.email}
                  onChangeText={(text) => setClientForm({ ...clientForm, email: text })}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  placeholderTextColor={COLORS.textLight}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Phone Number *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter phone number"
                  value={clientForm.phone}
                  onChangeText={(text) => setClientForm({ ...clientForm, phone: text })}
                  keyboardType="phone-pad"
                  placeholderTextColor={COLORS.textLight}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Service Type</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., Physical Therapy, Home Care"
                  value={clientForm.serviceType}
                  onChangeText={(text) => setClientForm({ ...clientForm, serviceType: text })}
                  placeholderTextColor={COLORS.textLight}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Payment Method</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., Insurance, Private Pay, Medicare"
                  value={clientForm.paymentMethod}
                  onChangeText={(text) => setClientForm({ ...clientForm, paymentMethod: text })}
                  placeholderTextColor={COLORS.textLight}
                />
              </View>

              <TouchableWeb
                style={styles.submitButton}
                onPress={handleAddClient}
              >
                <LinearGradient
                  colors={GRADIENTS.header}
                  style={styles.submitButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                >
                  <MaterialCommunityIcons name="account-plus" size={20} color="#fff" />
                  <Text style={styles.submitButtonText}>Add Client</Text>
                </LinearGradient>
              </TouchableWeb>
            </ScrollView>
          </View>
        </View>
      </Modal>

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
            <Text style={styles.deleteTitle}>Remove Client</Text>
            <Text style={styles.deleteMessage}>
              Are you sure you want to remove {clientToDelete?.name} from your clients? This action cannot be undone.
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

      {/* Client Details Modal */}
      <Modal
        visible={clientDetailsModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setClientDetailsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.detailsModalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Client Details</Text>
              <TouchableWeb
                style={styles.closeButton}
                onPress={() => setClientDetailsModalVisible(false)}
              >
                <MaterialCommunityIcons name="close" size={24} color={COLORS.text} />
              </TouchableWeb>
            </View>

            <ScrollView style={styles.detailsModalContent} showsVerticalScrollIndicator={false}>
              {selectedClient && (
                <>
                  <View style={styles.detailsSection}>
                    <Text style={styles.sectionTitle}>Client Information</Text>
                    <View style={styles.detailItem}>
                      <MaterialCommunityIcons name="account" size={20} color={COLORS.primary} />
                      <View style={styles.detailContent}>
                        <Text style={styles.detailLabel}>Name</Text>
                        <Text style={styles.detailValue}>{selectedClient.name}</Text>
                      </View>
                    </View>
                    <View style={styles.detailItem}>
                      <MaterialCommunityIcons name="email" size={20} color={COLORS.primary} />
                      <View style={styles.detailContent}>
                        <Text style={styles.detailLabel}>Email</Text>
                        <Text style={styles.detailValue}>
                          {selectedClient.email && selectedClient.email !== 'No email provided' && selectedClient.email !== 'N/A' 
                            ? selectedClient.email 
                            : 'Not provided'}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.detailItem}>
                      <MaterialCommunityIcons name="phone" size={20} color={COLORS.primary} />
                      <View style={styles.detailContent}>
                        <Text style={styles.detailLabel}>Phone</Text>
                        <Text style={styles.detailValue}>
                          {selectedClient.phone && selectedClient.phone !== 'No phone provided' && selectedClient.phone !== 'N/A' 
                            ? selectedClient.phone 
                            : 'Not provided'}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.detailItem}>
                      <MaterialCommunityIcons name="map-marker" size={20} color={COLORS.primary} />
                      <View style={styles.detailContent}>
                        <Text style={styles.detailLabel}>Address</Text>
                        <Text style={styles.detailValue}>{selectedClient.address || 'Not provided'}</Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.detailsSection}>
                    <View style={styles.invoiceSection}>
                      <View style={styles.invoiceHeaderRow}>
                        <Text style={styles.invoiceLabel}>Recent Invoices</Text>
                        <TouchableWeb 
                          onPress={() => navigation.navigate('InvoiceManagement', { searchQuery: selectedClient.name })}
                        >
                          <Text style={styles.viewAllText}>View All</Text>
                        </TouchableWeb>
                      </View>
                      
                      {/* Invoice History */}
                      <View style={styles.invoiceHistorySection}>
                        {selectedClient.invoiceHistory && selectedClient.invoiceHistory.length > 0 ? (
                          selectedClient.invoiceHistory.slice(0, 3).map((invoice, index) => {
                            const statusStyles = getInvoiceStatusStyles(invoice.status);
                            return (
                              <View key={invoice.id || `invoice-${index}`} style={styles.invoiceItemContainer}>
                                <TouchableWeb
                                  style={styles.invoiceCard}
                                  onPress={() => {
                                    setClientDetailsModalVisible(false);
                                    setTimeout(() => {
                                      navigation.navigate('InvoiceDisplay', {
                                        invoiceData: invoice.invoiceRecord,
                                        clientName: selectedClient.name,
                                        clientPhone: selectedClient.phone,
                                        returnToClientModal: true,
                                        clientId: selectedClient.id
                                      });
                                    }, 300);
                                  }}
                                  activeOpacity={0.7}
                                >
                                  <View style={styles.invoiceCardHeader}>
                                    <View style={styles.invoiceCardLeft}>
                                      <View style={styles.invoiceCardInfo}>
                                        <Text style={styles.invoiceCardNumber}>
                                          {String(invoice.id || '').replace('CARE-INV', 'NUR-INV')}
                                        </Text>
                                      </View>
                                    </View>
                                    <View style={styles.invoiceCardRight}>
                                      {invoice.status?.toLowerCase() === 'pending' ? (
                                        <View style={styles.invoiceStatusChip}>
                                          <LinearGradient
                                            colors={GRADIENTS.warning}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 0, y: 1 }}
                                            style={styles.invoiceStatusChipGradient}
                                          >
                                            <Text style={styles.invoiceStatusChipText}>Pending</Text>
                                          </LinearGradient>
                                        </View>
                                      ) : invoice.status?.toLowerCase() === 'paid' ? (
                                        <View style={styles.invoiceStatusChip}>
                                          <LinearGradient
                                            colors={['#10b981', '#059669']}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 0, y: 1 }}
                                            style={styles.invoiceStatusChipGradient}
                                          >
                                            <Text style={styles.invoiceStatusChipText}>Paid</Text>
                                          </LinearGradient>
                                        </View>
                                      ) : invoice.status?.toLowerCase() === 'overdue' ? (
                                        <View style={styles.invoiceStatusChip}>
                                          <LinearGradient
                                            colors={['#ef4444', '#dc2626']}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 0, y: 1 }}
                                            style={styles.invoiceStatusChipGradient}
                                          >
                                            <Text style={styles.invoiceStatusChipText}>Overdue</Text>
                                          </LinearGradient>
                                        </View>
                                      ) : (
                                        <View style={[
                                          styles.invoiceCardStatus,
                                          { backgroundColor: statusStyles.backgroundColor }
                                        ]}>
                                          <Text style={[
                                            styles.invoiceCardStatusText,
                                            { color: statusStyles.textColor }
                                          ]}>
                                            {invoice.status}
                                          </Text>
                                        </View>
                                      )}
                                    </View>
                                  </View>
                                </TouchableWeb>
                              </View>
                            );
                          })
                        ) : (
                          <View style={styles.noInvoicesContainer}>
                            <MaterialCommunityIcons name="file-document-outline" size={40} color={COLORS.border} />
                            <Text style={styles.noInvoicesText}>No invoices generated yet</Text>
                            <Text style={styles.noInvoicesSubText}>Tap to generate and view invoice</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </View>

                  <View style={styles.detailsSection}>
                    <Text style={styles.sectionTitle}>Appointments</Text>
                    <View style={styles.appointmentStats}>
                      <TouchableWeb style={styles.statPill} activeOpacity={0.7}>
                        <LinearGradient
                          colors={GRADIENTS.header}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 0, y: 1 }}
                          style={styles.statPillGradient}
                        >
                          <Text style={styles.statPillNumber}>{selectedClient.appointments.upcoming}</Text>
                          <Text style={styles.statPillLabel}>Upcoming</Text>
                        </LinearGradient>
                      </TouchableWeb>
                      <TouchableWeb style={styles.statPill} activeOpacity={0.7}>
                        <LinearGradient
                          colors={GRADIENTS.header}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 0, y: 1 }}
                          style={styles.statPillGradient}
                        >
                          <Text style={styles.statPillNumber}>{selectedClient.appointments.completed}</Text>
                          <Text style={styles.statPillLabel}>Completed</Text>
                        </LinearGradient>
                      </TouchableWeb>
                    </View>
                  </View>

                  <View style={styles.detailsSection}>
                    {(() => {
                      const nurseNoteItems = (selectedClient.medicalNotes || []).map((note, index) => ({
                        id: note?.id || `nurse-note-${index}`,
                        date: note?.date || null,
                        title: note?.nurseName || 'Assigned Nurse',
                        subtitle: note?.appointmentType || '',
                        body: note?.notes || '',
                      }));

                      const patientNoteItems = (selectedClient.completedAppointments || []).map((apt, index) => {
                        const candidates = [
                          apt?.patientNotes,
                          apt?.bookingNotes,
                          apt?.clientNotes,
                          apt?.specialInstructions,
                        ];
                        const raw = candidates.find((value) => {
                          if (value === null || value === undefined) return false;
                          const text = String(value).trim();
                          return Boolean(text);
                        });
                        const legacyNotes = (apt?.notes && String(apt.notes).trim()) || '';
                        const hasNurseNotes = Boolean(
                          apt?.nurseNotes && String(apt.nurseNotes).trim().length
                        );
                        const text = raw === null || raw === undefined
                          ? (!hasNurseNotes ? legacyNotes : '')
                          : String(raw).trim();

                        if (!text) return null;

                        return {
                          id: `patient-note-${apt?.id || apt?._id || apt?.appointmentId || index}`,
                          date: apt?.createdAt || apt?.updatedAt || apt?.date || apt?.scheduledDate || null,
                          title: apt?.patientName || apt?.clientName || selectedClient.name || 'Patient',
                          subtitle: apt?.service || apt?.appointmentType || 'From booking',
                          body: text,
                        };
                      }).filter(Boolean);

                      const allNoteItems = [...nurseNoteItems, ...patientNoteItems].sort((a, b) => {
                        const aTime = a?.date ? Date.parse(a.date) : 0;
                        const bTime = b?.date ? Date.parse(b.date) : 0;
                        if (!Number.isFinite(aTime) && !Number.isFinite(bTime)) return 0;
                        if (!Number.isFinite(aTime)) return 1;
                        if (!Number.isFinite(bTime)) return -1;
                        return bTime - aTime;
                      });

                      return (
                        <>
                          <Text style={styles.sectionTitle}>Medical Notes ({allNoteItems.length})</Text>
                          <NotesAccordionList
                            items={allNoteItems}
                            emptyText="No medical notes available yet"
                          />
                          {allNoteItems.length === 0 && (
                      <View style={styles.noNotesContainer}>
                        <MaterialCommunityIcons name="note-outline" size={24} color={COLORS.textLight} />
                        <Text style={styles.noNotesText}>No medical notes available yet</Text>
                      </View>
                          )}
                        </>
                      );
                    })()}
                  </View>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Full Invoice Modal */}
      <Modal
        visible={fullInvoiceModalVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setFullInvoiceModalVisible(false)}
      >
        <SafeAreaView style={styles.invoiceModalContainer} edges={['top', 'bottom']}>
          <View style={styles.invoiceModalHeader}>
            <Text style={styles.invoiceModalTitle}>Invoice Preview</Text>
            <TouchableWeb
              onPress={() => setFullInvoiceModalVisible(false)}
              style={styles.invoiceCloseButton}
            >
              <MaterialCommunityIcons name="close" size={24} color={COLORS.white} />
            </TouchableWeb>
          </View>

          <ScrollView style={styles.invoiceScrollView} showsVerticalScrollIndicator={false}>
            {currentInvoiceData && (
              <View style={styles.invoicePreviewCard}>
                {/* Invoice Header */}
                <View style={styles.pdfHeader}>
                  <View style={styles.pdfHeaderTop}>
                    <View style={styles.pdfCompanyInfo}>
                      <Image 
                        source={require('../assets/Images/Nurses-logo.png')} 
                        style={styles.nursesLogoHeader}
                        resizeMode="cover"
                      />
                    </View>
                    <View style={styles.pdfInvoiceInfo}>
                      <Text style={styles.pdfInvoiceTitle}>INVOICE</Text>
                      <Text style={styles.pdfInvoiceNumber}>{currentInvoiceData.invoiceId?.replace('CARE-INV', 'NUR-INV')}</Text>
                      <Text style={styles.pdfInvoiceDate}>Issue Date: {InvoiceService.formatDateForInvoice(currentInvoiceData.issueDate)}</Text>
                      <Text style={styles.pdfInvoiceDate}>Due Date: {InvoiceService.formatDateForInvoice(currentInvoiceData.dueDate)}</Text>
                    </View>
                  </View>
                  <View style={styles.pdfBlueLine} />
                </View>

                {/* Bill To and Service Provider */}
                <View style={styles.pdfClientSection}>
                  <View style={styles.pdfClientRow}>
                    <View style={styles.pdfBillTo}>
                      <Text style={styles.pdfSectionTitle}>BILL TO:</Text>
                      <Text style={styles.pdfClientName}>{currentInvoiceData.clientName}</Text>
                      <Text style={styles.pdfClientInfo}>{currentInvoiceData.clientEmail}</Text>
                      <Text style={styles.pdfClientInfo}>{selectedClient?.phone || currentInvoiceData.clientPhone || 'N/A'}</Text>
                      <Text style={styles.pdfClientInfo}>{currentInvoiceData.clientAddress || '123 Main Street, Anytown, State 12345'}</Text>
                    </View>
                    <View style={styles.pdfServiceProvider}>
                      <Text style={styles.pdfSectionTitle}>SERVICE PROVIDED BY:</Text>
                      <Text style={styles.pdfProviderName}>{companyDetails.companyName}</Text>
                      <Text style={styles.pdfProviderInfo}>{companyDetails.address}</Text>
                      <Text style={styles.pdfProviderInfo}>Phone: {companyDetails.phone}</Text>
                      <Text style={styles.pdfProviderInfo}>Email: {companyDetails.email}</Text>
                      {companyDetails.website && <Text style={styles.pdfProviderInfo}>Web: {companyDetails.website}</Text>}
                    </View>
                  </View>
                </View>

                {/* Service Table */}
                <View style={styles.pdfServiceSection}>
                  <View style={styles.pdfTable}>
                    <View style={styles.pdfTableHeader}>
                      <Text style={[styles.pdfTableHeaderText, { flex: 2 }]}>Service Description</Text>
                      <Text style={styles.pdfTableHeaderText}>Date</Text>
                      <Text style={styles.pdfTableHeaderText}>Hours</Text>
                      <Text style={styles.pdfTableHeaderText}>Rate</Text>
                      <Text style={styles.pdfTableHeaderText}>Amount</Text>
                    </View>
                    <View style={styles.pdfTableRow}>
                      <Text style={[styles.pdfTableCell, { flex: 2 }]}>{currentInvoiceData.service}</Text>
                      <Text style={styles.pdfTableCell}>{InvoiceService.formatDateForInvoice(currentInvoiceData.date)}</Text>
                      <Text style={styles.pdfTableCell}>{currentInvoiceData.hours}</Text>
                      <Text style={styles.pdfTableCell}>{InvoiceService.formatCurrency(currentInvoiceData.rate)}</Text>
                      <Text style={styles.pdfTableCellAmount}>{InvoiceService.formatCurrency(currentInvoiceData.total)}</Text>
                    </View>
                  </View>

                  {/* Bottom Section: Payment Info and Totals */}
                  <View style={styles.pdfBottomSection}>
                    <View style={styles.pdfPaymentSection}>
                      <Text style={styles.pdfPaymentTitle}>Payment Information</Text>
                      {paymentInfo.bankAccounts.map((account, index) => (
                        <View key={account.id || `account-${index}`} style={styles.bankAccountGroup}>
                          <Text style={styles.pdfPaymentInfo}>{account.bankName}</Text>
                          {account.payee && (
                            <Text style={styles.pdfPaymentInfo}>Payee: {account.payee}</Text>
                          )}
                          {account.branch && (
                            <Text style={styles.pdfPaymentInfo}>Branch: {account.branch}</Text>
                          )}
                          {account.accountNumbers.map((accNum, idx) => (
                            <Text key={accNum.id || `accNum-${idx}`} style={styles.pdfPaymentInfo}>
                              {accNum.currency}: {accNum.number}
                            </Text>
                          ))}
                          {account.swiftCode && (
                            <Text style={styles.pdfPaymentInfo}>Swift: {account.swiftCode}</Text>
                          )}
                        </View>
                      ))}
                      {paymentInfo.cashAccepted && (
                        <Text style={styles.pdfPaymentInfo}>Cash accepted for home visits</Text>
                      )}
                      {paymentInfo.posAvailable && (
                        <Text style={styles.pdfPaymentInfo}>POS Machine Available</Text>
                      )}
                    </View>

                    <View style={styles.pdfTotalsSection}>
                      <View style={styles.pdfTotalRow}>
                        <Text style={styles.pdfTotalLabel}>Deposit:</Text>
                        <Text style={styles.pdfTotalValue}>{InvoiceService.formatCurrency(currentInvoiceData.total)}</Text>
                      </View>
                      <View style={styles.pdfBlueLine} />
                      <View style={styles.pdfFinalTotalRow}>
                        <Text style={styles.pdfFinalTotalLabel}>Total Amount:</Text>
                        <Text style={styles.pdfFinalTotalAmount}>${currentInvoiceData.total}</Text>
                      </View>
                    </View>
                  </View>
                </View>
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
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
  recurringInvoiceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  recurringInvoiceText: {
    fontSize: 12,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.white,
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
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
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
  },
  listContainer: {
    padding: 20,
    gap: 8,
  },
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
  profilePhoto: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.lightGray,
  },
  clientProfilePhoto: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.lightGray,
    marginRight: 10,
  },
  clientProfilePhotoPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  compactInfo: {
    flex: 1,
    marginLeft: 8,
  },
  clientNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  detailsButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    gap: 4,
  },
  detailsButtonText: {
    color: COLORS.white,
    fontSize: 12,
    fontFamily: 'Poppins_600SemiBold',
  },
  subscriberBadge: {
    backgroundColor: COLORS.accent,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  bottomPadding: {
    height: 20,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
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
  modalContent: {
    padding: 20,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.text,
    marginBottom: 6,
  },
  input: {
    backgroundColor: COLORS.lightGray,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.text,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  submitButton: {
    marginTop: 8,
    marginBottom: 20,
    borderRadius: 12,
    overflow: 'hidden',
  },
  submitButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 8,
  },
  submitButtonText: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.white,
  },
  // Delete modal styles
  deleteModal: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
    minWidth: 300,
  },
  deleteTitle: {
    fontSize: 20,
    fontFamily: 'Poppins_700Bold',
    color: COLORS.text,
    marginTop: 16,
    marginBottom: 8,
  },
  deleteMessage: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.textLight,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  deleteActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: COLORS.lightGray,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.text,
  },
  confirmButton: {
    flex: 1,
    backgroundColor: COLORS.error,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.white,
  },
  cardFooter: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  detailButton: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  detailButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    gap: 6,
  },
  detailButtonText: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.white,
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
  },
  detailsModalContent: {
    padding: 20,
  },
  clientHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    padding: 16,
    backgroundColor: '#FFE7CC',
    borderRadius: 12,
  },
  clientAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFD7B0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  clientAvatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 30,
    resizeMode: 'cover',
  },
  clientInfo: {
    flex: 1,
  },
  clientName: {
    fontSize: 18,
    fontFamily: 'Poppins_700Bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  subscriberText: {
    fontSize: 10,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.white,
    marginLeft: 4,
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
  appointmentStats: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statPill: {
    flex: 1,
    marginHorizontal: 1,
  },
  statPillGradient: {
    paddingHorizontal: 10,
    paddingVertical: 2,
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
  statPillNumber: {
    fontSize: 12,
    fontFamily: 'Poppins_700Bold',
    color: COLORS.white,
    marginBottom: 1,
  },
  statPillLabel: {
    fontSize: 10,
    fontFamily: 'Poppins_700Bold',
    color: COLORS.white,
    textAlign: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontFamily: 'Poppins_700Bold',
    color: COLORS.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'Poppins_500Medium',
    color: COLORS.textLight,
  },
  notesText: {
    marginLeft: 16,
    fontSize: 15,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.text,
    lineHeight: 22,
    flex: 1,
  },
  noteItem: {
    backgroundColor: COLORS.lightGray,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  compactNoteItem: {
    backgroundColor: COLORS.white,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  noteToggleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: COLORS.lightGray,
  },
  noteMainInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  compactNoteDate: {
    fontSize: 12,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.primary,
  },
  compactNurseName: {
    fontSize: 11,
    fontFamily: 'Poppins_500Medium',
    color: COLORS.accent,
    marginLeft: 'auto',
  },
  expandedNoteContent: {
    padding: 12,
    paddingTop: 8,
    backgroundColor: COLORS.white,
  },
  noteTypeLabel: {
    fontSize: 11,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.textLight,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  expandedNoteText: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.text,
    lineHeight: 20,
  },
  // Billing section styles
  billingSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  billingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  billingTitle: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.text,
  },
  autoBillingInfo: {
    backgroundColor: '#E8F5E8',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 12,
  },
  autoBillingText: {
    fontSize: 12,
    fontFamily: 'Poppins_500Medium',
    color: COLORS.success,
    marginBottom: 4,
  },
  autoBillingSubText: {
    fontSize: 11,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.textLight,
  },
  billingStats: {
    flexDirection: 'row',
    gap: 16,
  },
  billingStat: {
    flex: 1,
  },
  billingStatLabel: {
    fontSize: 11,
    fontFamily: 'Poppins_500Medium',
    color: COLORS.textLight,
    marginBottom: 2,
  },
  billingStatValue: {
    fontSize: 13,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.text,
  },
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
  invoiceActions: {
    gap: 8,
  },
  invoiceButton: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  invoiceButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    gap: 8,
  },
  invoiceButtonText: {
    fontSize: 13,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.white,
  },
  // Invoice History Styles
  invoiceHistorySection: {
    marginTop: 15,
  },
  invoiceHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  viewAllText: {
    fontSize: 12,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.primary,
  },
  invoiceHistoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  invoiceHistoryActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewButtonSmall: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  viewButtonGradientSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    gap: 4,
  },
  viewButtonTextSmall: {
    color: COLORS.white,
    fontSize: 12,
    fontFamily: 'Poppins_600SemiBold',
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
  },
  invoiceHistorySubInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  statusBadgeSmall: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusTextSmall: {
    fontSize: 10,
    fontFamily: 'Poppins_600SemiBold',
    textTransform: 'uppercase',
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
  invoicePaidDate: {
    fontSize: 11,
    fontFamily: 'Poppins_500Medium',
    color: '#4CAF50',
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
  noInvoicesContainer: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 15,
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
  noteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  noteDate: {
    fontSize: 12,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.primary,
  },
  noteType: {
    fontSize: 11,
    fontFamily: 'Poppins_500Medium',
    color: COLORS.textLight,
    backgroundColor: COLORS.white,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 'auto',
  },
  nurseName: {
    fontSize: 12,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.accent,
    marginBottom: 8,
  },
  noteContent: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.text,
    lineHeight: 20,
  },
  noNotesContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: COLORS.lightGray,
    borderRadius: 12,
  },
  noNotesText: {
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
    color: COLORS.textLight,
    marginTop: 8,
  },
  invoicePreviewCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    margin: 16,
  },
  pdfInvoiceDate: {
    fontSize: 10,
    color: COLORS.textLight,
    marginBottom: 1,
  },
  pdfBlueLine: {
    height: 2,
    backgroundColor: COLORS.primary,
    marginHorizontal: SPACING.md,
    marginVertical: SPACING.xs,
  },
  pdfClientSection: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  pdfClientRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  pdfBillTo: {
    flex: 1,
    marginRight: SPACING.md,
  },
  pdfServiceProvider: {
    flex: 1,
  },
  pdfSectionTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  pdfClientName: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 2,
  },
  pdfClientInfo: {
    fontSize: 10,
    color: COLORS.textLight,
    marginBottom: 2,
  },
  pdfProviderName: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 2,
  },
  pdfProviderInfo: {
    fontSize: 10,
    color: COLORS.textLight,
    marginBottom: 2,
  },
  pdfServiceSection: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  pdfTable: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 4,
    marginBottom: SPACING.md,
  },
  pdfTableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F5F5F5',
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.xs,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  pdfTableHeaderText: {
    flex: 1,
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
  },
  pdfTableRow: {
    flexDirection: 'row',
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.xs,
  },
  pdfTableCell: {
    flex: 1,
    fontSize: 10,
    color: COLORS.text,
    textAlign: 'center',
  },
  pdfTableCellAmount: {
    flex: 1,
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
  },
  pdfBottomSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: 20,
    gap: 20,
  },
  pdfPaymentSection: {
    flex: 1,
    paddingRight: 10,
  },
  pdfPaymentTitle: {
    fontSize: 12,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.text,
    marginBottom: 8,
  },
  bankAccountGroup: {
    marginBottom: 10,
  },
  pdfPaymentInfo: {
    fontSize: 9,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.textLight,
    lineHeight: 14,
  },
  pdfTotalsSection: {
    alignItems: 'flex-end',
    minWidth: 160,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#F9F9F9',
  },
  pdfTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: 160,
    paddingVertical: 2,
  },
  pdfTotalLabel: {
    fontSize: 11,
    color: COLORS.text,
  },
  pdfTotalValue: {
    fontSize: 11,
    fontWeight: '500',
    color: COLORS.text,
  },
  pdfFinalTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: 160,
    paddingVertical: 4,
    marginTop: 4,
  },
  pdfFinalTotalLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  pdfFinalTotalAmount: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  // Invoice Card Styles (Synced with Patient Modal)
  invoiceItemContainer: {
    marginBottom: 16,
  },
  invoiceCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  invoiceCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  invoiceCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  invoiceCardInfo: {
    gap: 2,
  },
  invoiceCardNumber: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.text,
  },
  invoiceCardRight: {
    alignItems: 'flex-end',
  },
  invoiceCardStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  invoiceCardStatusText: {
    fontSize: 11,
    fontFamily: 'Poppins_600SemiBold',
  },
  invoiceStatusChip: {
    borderRadius: 999,
    overflow: 'hidden',
  },
  invoiceStatusChipGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
  },
  invoiceStatusChipText: {
    marginLeft: 0,
    color: COLORS.white,
    fontWeight: '600',
    fontSize: 12,
  },
  noNotesContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: COLORS.lightGray,
    borderRadius: 12,
  },
  noNotesText: {
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
    color: COLORS.textLight,
    marginTop: 8,
  },
});