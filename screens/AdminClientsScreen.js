import TouchableWeb from "../components/TouchableWeb";
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Modal, Alert, Image, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, GRADIENTS, SPACING } from '../constants';
import { useAuth } from '../context/AuthContext';
import { useAppointments } from '../context/AppointmentContext';
import InvoiceService from '../services/InvoiceService';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function AdminClientsScreen({ navigation, route }) {
  const { logout } = useAuth();
  const { appointments: allAppointments } = useAppointments();
  const insets = useSafeAreaInsets();
  const [isAddClientModalVisible, setIsAddClientModalVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [clientDetailsModalVisible, setClientDetailsModalVisible] = useState(false);
  const [fullInvoiceModalVisible, setFullInvoiceModalVisible] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [clientToDelete, setClientToDelete] = useState(null);
  const [expandedNotes, setExpandedNotes] = useState({});
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
    companyName: 'CARE Nursing Services and More',
    fullName: 'NURSING SERVICES AND MORE',
    address: 'Kingston, Jamaica',
    phone: '876-288-7304',
    email: 'care@nursingcareja.com',
    taxId: '',
    website: '',
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

  // Build clients list from completed appointments - load on focus
  useFocusEffect(
    React.useCallback(() => {
      buildClientsFromAppointments();
    }, [allAppointments])
  );

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
      console.error('Error loading company details:', error);
    }
  };

  const loadPaymentInfo = async () => {
    try {
      const stored = await AsyncStorage.getItem('paymentInfo');
      if (stored) {
        setPaymentInfo(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading payment info:', error);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      const options = { year: 'numeric', month: 'short', day: 'numeric' };
      return date.toLocaleDateString('en-US', options);
    } catch (error) {
      return dateString;
    }
  };

  const buildClientsFromAppointments = async () => {
    console.log('🔍 Building clients from appointments...');
    console.log('📊 Total appointments:', allAppointments.length);
    
    // Get only completed appointments
    const completedAppointments = allAppointments.filter(apt => apt.status === 'completed');
    console.log('✅ Completed appointments:', completedAppointments.length);
    console.log('✅ Completed appointment IDs:', completedAppointments.map(apt => apt.id));
    
    // Get all invoices
    const allInvoices = await InvoiceService.getAllInvoices();
    console.log('📄 Total invoices:', allInvoices.length);
    console.log('📄 Invoice appointment IDs:', allInvoices.map(inv => inv.appointmentId));
      
      // Group by patientId
      const clientsMap = new Map();
      
      completedAppointments.forEach(apt => {
        if (!clientsMap.has(apt.patientId)) {
          clientsMap.set(apt.patientId, {
            id: apt.patientId,
            name: apt.patientName,
            email: apt.patientEmail || apt.email || 'No email provided',
            phone: apt.patientPhone || apt.phone || 'No phone provided',
            address: apt.address || '6 Reece Road, Kingston 10',
            emergencyContact: apt.emergencyContact || 'Not provided',
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
        
        const client = clientsMap.get(apt.patientId);
        client.appointments.completed += 1;
        
        // Store the completed appointment
        client.completedAppointments.push(apt);
        
        // Add medical notes from completed appointment
        client.medicalNotes.push({
          id: apt.id,
          date: apt.date,
          appointmentType: apt.service || 'General Care',
          notes: apt.completionNotes || apt.notes || 'Service provided successfully',
          nurseName: apt.nurseName || 'Care Professional',
          nurseId: apt.nurseId
        });
        
        // Find and link invoice for this appointment
        const appointmentInvoice = allInvoices.find(inv => inv.appointmentId === apt.id);
        if (appointmentInvoice) {
          console.log(`✅ Found invoice ${appointmentInvoice.invoiceId} for appointment ${apt.id}`);
          client.invoiceHistory.push({
            id: appointmentInvoice.invoiceId,
            date: appointmentInvoice.createdAt,
            amount: appointmentInvoice.total,
            status: appointmentInvoice.status || 'Pending',
            paidDate: appointmentInvoice.paidDate || null,
            paymentMethod: appointmentInvoice.paymentMethod || null
          });
        } else {
          console.log(`❌ No invoice found for appointment ${apt.id}`);
          console.log('Available invoice appointmentIds:', allInvoices.map(inv => inv.appointmentId));
        }
      });
      
      const clientsList = Array.from(clientsMap.values());
      console.log('👥 Clients found:', clientsList.length);
      
      // Log invoice history for each client
      clientsList.forEach(client => {
        console.log(`📋 Client: ${client.name}, Invoices: ${client.invoiceHistory.length}`);
      });
      
      setClients(clientsList);
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.log('Error logging out:', error);
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

  const handleShowClientDetails = async (client) => {
    // Reload latest invoice data for this client
    const allInvoices = await InvoiceService.getAllInvoices();
    
    // Find all invoices for this client and update the invoice history
    const updatedInvoiceHistory = [];
    client.completedAppointments?.forEach(apt => {
      const appointmentInvoice = allInvoices.find(inv => inv.appointmentId === apt.id);
      if (appointmentInvoice) {
        updatedInvoiceHistory.push({
          id: appointmentInvoice.invoiceId,
          date: appointmentInvoice.createdAt,
          amount: appointmentInvoice.total,
          status: appointmentInvoice.status || 'Pending',
          paidDate: appointmentInvoice.paidDate || null
        });
      }
    });
    
    // Update the client with fresh invoice data
    const updatedClient = {
      ...client,
      invoiceHistory: updatedInvoiceHistory
    };
    
    setSelectedClient(updatedClient);
    setExpandedNotes({});
    setClientDetailsModalVisible(true);
  };

  const toggleNoteExpansion = (noteId) => {
    setExpandedNotes(prev => ({
      ...prev,
      [noteId]: !prev[noteId]
    }));
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
        name: 'CARE Nursing Services & More',
        phone: '8762887304',
        email: 'care@nursingcareja.com'
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
        payee: 'CARE.CARE',
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
    console.log('🚀🚀🚀 VIEW INVOICE CLICKED! 🚀🚀🚀');
    console.log('🚀 Client:', client.name);
    
    // Close the client details modal before navigating
    setClientDetailsModalVisible(false);
    
    try {
      // First, try to fetch existing invoice for this client from InvoiceService
      const allInvoices = await InvoiceService.getAllInvoices();
      console.log('📋 Total invoices in system:', allInvoices.length);
      
      // Find most recent invoice for this client
      const clientInvoices = allInvoices.filter(inv => 
        inv.clientName === client.name || 
        inv.clientEmail === client.email ||
        inv.clientId === client.id
      );
      console.log('📋 Invoices found for client:', clientInvoices.length);
      
      if (clientInvoices.length > 0) {
        // Sort by creation date and get most recent
        const sortedInvoices = clientInvoices.sort((a, b) => {
          const dateA = new Date(a.createdAt || a.issueDate);
          const dateB = new Date(b.createdAt || b.issueDate);
          return dateB - dateA; // Most recent first
        });
        const mostRecentInvoice = sortedInvoices[0];
        
        console.log('✅ USING EXISTING INVOICE:', mostRecentInvoice.invoiceId);
        console.log('📄 Invoice Status:', mostRecentInvoice.status);
        console.log('📄 Payment Method:', mostRecentInvoice.paymentMethod);
        
        // Navigate to invoice display - modal already closed
        navigation.navigate('InvoiceDisplay', {
          invoiceData: mostRecentInvoice,
          clientName: client.name
        });
        return;
      }
      
      // If no existing invoice, generate new one
      console.log('⚠️ No existing invoice found, generating new one');
      const completedAppointments = client.medicalNotes || [];
      console.log('📋 Client medical notes found:', completedAppointments.length);

      if (completedAppointments.length === 0) {
        // If no completed appointments, create a sample invoice
        console.log('🔥 CREATING SAMPLE INVOICE');
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
        id: `appointment-${client.id}-${Date.now()}`,
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

      console.log('🔥 GENERATING INVOICE WITH REAL APPOINTMENT DATA');
      console.log('📊 Appointment data:', JSON.stringify(appointmentData, null, 2));
      const result = await InvoiceService.createInvoice(appointmentData);
      
      if (result.success) {
        console.log('✅ INVOICE GENERATED SUCCESSFULLY');
        console.log('📄 Invoice Data:', JSON.stringify(result.invoice, null, 2));
        
        // Modal already closed - just navigate
        navigation.navigate('InvoiceDisplay', {
          invoiceData: result.invoice,
          clientName: client.name
        });
      } else {
        console.log('❌ INVOICE GENERATION FAILED:', result.error);
        Alert.alert('Error', result.error || 'Failed to generate invoice');
      }
    } catch (error) {
      console.log('❌ VIEW INVOICE ERROR:', error);
      Alert.alert('Error', 'Failed to generate invoice');
    }
  };

  const handleSendInvoice = async (client) => {
    console.log('📧 SEND INVOICE CLICKED!');
    console.log('📧 Client:', client.name);
    
    try {
      // Generate real appointment data from client's completed sessions (same as view invoice)
      const completedAppointments = client.medicalNotes || [];
      console.log('📋 Client medical notes found:', completedAppointments.length);

      if (completedAppointments.length === 0) {
        Alert.alert('No Completed Services', 'This client has no completed appointments to generate an invoice for.');
        return;
      }

      // Get the most recent completed appointment or create invoice for recent period
      const recentAppointments = completedAppointments.slice(-3); // Last 3 appointments for billing period
      
      // Create comprehensive appointment data for invoice (same structure as view)
      const appointmentData = {
        id: `appointment-${client.id}-${Date.now()}`,
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
                  console.log('❌ EMAIL SEND ERROR:', emailError);
                  Alert.alert('Error', 'Failed to send invoice email');
                }
              }
            }
          ]
        );
      } else {
        console.log('❌ INVOICE GENERATION FAILED:', result.error);
        Alert.alert('Error', result.error || 'Failed to generate invoice');
      }
    } catch (error) {
      console.log('❌ SEND INVOICE ERROR:', error);
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
              console.log(`Auto-generated invoice #${invoiceData.invoiceNumber} for ${client.name}`);
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
    console.log('Deleting client:', clientToDelete);
    setDeleteModalVisible(false);
    setClientToDelete(null);
    Alert.alert('Success', `${clientToDelete?.name} has been removed from your clients.`);
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
          <TouchableWeb
            style={styles.iconButton}
            onPress={() => {}}
          >
            <MaterialCommunityIcons name="magnify" size={24} color="#fff" />
          </TouchableWeb>
          
          <Text style={styles.welcomeText}>Client Management</Text>
        </View>
      </LinearGradient>

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
              {clients.map((client) => (
                <View key={client.id} style={styles.compactCard}>
                  <View style={styles.compactHeader}>
                    {client.profilePhoto ? (
                      <Image 
                        source={{ uri: client.profilePhoto }} 
                        style={styles.profilePhoto}
                      />
                    ) : (
                      <MaterialCommunityIcons name="account" size={20} color={COLORS.primary} />
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
                  end={{ x: 1, y: 0 }}
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
                  <View style={styles.clientHeader}>
                    <View style={styles.clientAvatar}>
                      <MaterialCommunityIcons name="account" size={40} color={COLORS.primary} />
                    </View>
                    <View style={styles.clientInfo}>
                      <Text style={styles.clientName}>{selectedClient.name}</Text>
                      <Text style={styles.clientEmail}>{selectedClient.email}</Text>
                      {selectedClient.isSubscriber && (
                        <View style={styles.subscriberBadge}>
                          <MaterialCommunityIcons name="crown" size={12} color="#fff" />
                          <Text style={styles.subscriberText}>Subscriber</Text>
                        </View>
                      )}
                    </View>
                  </View>

                  <View style={styles.detailsSection}>
                    <Text style={styles.sectionTitle}>Contact Information</Text>
                    <View style={styles.detailItem}>
                      <MaterialCommunityIcons name="phone" size={20} color={COLORS.primary} />
                      <View style={styles.detailContent}>
                        <Text style={styles.detailLabel}>Phone</Text>
                        <Text style={styles.detailValue}>{selectedClient.phone}</Text>
                      </View>
                    </View>
                    <View style={styles.detailItem}>
                      <MaterialCommunityIcons name="map-marker" size={20} color={COLORS.primary} />
                      <View style={styles.detailContent}>
                        <Text style={styles.detailLabel}>Address</Text>
                        <Text style={styles.detailValue}>{selectedClient.address}</Text>
                      </View>
                    </View>
                    <View style={styles.detailItem}>
                      <MaterialCommunityIcons name="account-heart" size={20} color={COLORS.primary} />
                      <View style={styles.detailContent}>
                        <Text style={styles.detailLabel}>Emergency Contact</Text>
                        <Text style={styles.detailValue}>{selectedClient.emergencyContact}</Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.detailsSection}>
                    <Text style={styles.sectionTitle}>Service Information</Text>
                    <View style={styles.detailItem}>
                      <MaterialCommunityIcons name="medical-bag" size={20} color={COLORS.primary} />
                      <View style={styles.detailContent}>
                        <Text style={styles.detailLabel}>Service Type</Text>
                        <Text style={styles.detailValue}>{selectedClient.serviceType}</Text>
                      </View>
                    </View>
                    
                    {/* Billing Status Section - Only show for recurring clients */}
                    {selectedClient.hasRecurringAppointments && (
                      <View style={styles.billingSection}>
                        <View style={styles.billingHeader}>
                          <MaterialCommunityIcons 
                            name="autorenew" 
                            size={20} 
                            color={COLORS.success} 
                          />
                          <Text style={styles.billingTitle}>
                            Auto-Billing Active
                          </Text>
                        </View>
                        
                        <View style={styles.autoBillingInfo}>
                          <Text style={styles.autoBillingText}>
                            🔄 Invoices generated automatically based on completed sessions
                          </Text>
                          <Text style={styles.autoBillingSubText}>
                            Next billing: {(() => {
                              const nextBilling = new Date();
                              nextBilling.setDate(nextBilling.getDate() + 7);
                              return nextBilling.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                            })()}
                          </Text>
                        </View>
                        
                        <View style={styles.billingStats}>
                          <View style={styles.billingStat}>
                            <Text style={styles.billingStatLabel}>Total Sessions</Text>
                            <Text style={styles.billingStatValue}>{selectedClient.appointments.completed}</Text>
                          </View>
                          <View style={styles.billingStat}>
                            <Text style={styles.billingStatLabel}>Payment Method</Text>
                            <Text style={styles.billingStatValue}>
                              {(() => {
                                // Get payment method from the latest paid invoice
                                const paidInvoices = selectedClient.invoiceHistory?.filter(inv => inv.status === 'Paid' && inv.paymentMethod) || [];
                                if (paidInvoices.length > 0) {
                                  // Sort by date and get the most recent one
                                  const latestPaidInvoice = paidInvoices.sort((a, b) => new Date(b.date) - new Date(a.date))[0];
                                  return latestPaidInvoice.paymentMethod;
                                }
                                return 'Not set';
                              })()}
                            </Text>
                          </View>
                        </View>
                      </View>
                    )}
                    
                    <View style={styles.invoiceSection}>
                      <Text style={styles.invoiceLabel}>Invoice Management</Text>
                      
                      {/* Invoice History */}
                      <View style={styles.invoiceHistorySection}>
                        <Text style={styles.invoiceHistoryTitle}>Recent Invoices</Text>
                        {selectedClient.invoiceHistory && selectedClient.invoiceHistory.length > 0 ? (
                          selectedClient.invoiceHistory.slice(0, 3).map((invoice, index) => (
                            <TouchableWeb
                              key={index}
                              style={styles.invoiceHistoryItem}
                              onPress={() => handleViewInvoice(selectedClient)}
                              activeOpacity={0.7}
                            >
                              <View style={styles.invoiceHistoryInfo}>
                                <Text style={styles.invoiceHistoryId}>#{invoice.id}</Text>
                                {invoice.status === 'Paid' && invoice.paidDate && (
                                  <Text style={styles.invoicePaidDate}>Paid: {invoice.paidDate}</Text>
                                )}
                              </View>
                              <View style={styles.invoiceHistoryRight}>
                                <View style={[styles.invoiceHistoryStatus, { backgroundColor: invoice.status === 'Paid' ? '#4CAF50' : '#FF9800' }]}>
                                  <Text style={styles.invoiceHistoryStatusText}>{invoice.status}</Text>
                                </View>
                              </View>
                            </TouchableWeb>
                          ))
                        ) : (
                          <TouchableWeb
                            style={styles.noInvoicesContainer}
                            onPress={() => handleViewInvoice(selectedClient)}
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
                    <Text style={styles.sectionTitle}>Appointments</Text>
                    <View style={styles.appointmentStats}>
                      <TouchableWeb style={styles.statPill} activeOpacity={0.7}>
                        <LinearGradient
                          colors={GRADIENTS.header}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
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
                          end={{ x: 1, y: 1 }}
                          style={styles.statPillGradient}
                        >
                          <Text style={styles.statPillNumber}>{selectedClient.appointments.completed}</Text>
                          <Text style={styles.statPillLabel}>Completed</Text>
                        </LinearGradient>
                      </TouchableWeb>
                    </View>
                  </View>

                  <View style={styles.detailsSection}>
                    <Text style={styles.sectionTitle}>Medical Notes ({selectedClient.medicalNotes.length})</Text>
                    {selectedClient.medicalNotes.map((note) => (
                      <View key={note.id} style={styles.compactNoteItem}>
                        <TouchableWeb
                          style={styles.noteToggleHeader}
                          onPress={() => toggleNoteExpansion(note.id)}
                          activeOpacity={0.7}
                        >
                          <View style={styles.noteMainInfo}>
                            <MaterialCommunityIcons name="note-text" size={16} color={COLORS.primary} />
                            <Text style={styles.compactNoteDate}>{note.date}</Text>
                            <Text style={styles.compactNurseName}>By: {note.nurseName}</Text>
                          </View>
                          <MaterialCommunityIcons 
                            name={expandedNotes[note.id] ? "chevron-up" : "chevron-down"} 
                            size={20} 
                            color={COLORS.textLight} 
                          />
                        </TouchableWeb>
                        {expandedNotes[note.id] && (
                          <View style={styles.expandedNoteContent}>
                            <Text style={styles.noteTypeLabel}>{note.appointmentType}</Text>
                            <Text style={styles.expandedNoteText}>{note.notes}</Text>
                          </View>
                        )}
                      </View>
                    ))}
                    {selectedClient.medicalNotes.length === 0 && (
                      <View style={styles.noNotesContainer}>
                        <MaterialCommunityIcons name="note-outline" size={24} color={COLORS.textLight} />
                        <Text style={styles.noNotesText}>No medical notes available yet</Text>
                      </View>
                    )}
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
                        source={require('../assets/Images/CARElogo.png')} 
                        style={styles.careLogoHeader}
                        resizeMode="cover"
                      />
                    </View>
                    <View style={styles.pdfInvoiceInfo}>
                      <Text style={styles.pdfInvoiceTitle}>INVOICE</Text>
                      <Text style={styles.pdfInvoiceNumber}>{currentInvoiceData.invoiceId}</Text>
                      <Text style={styles.pdfInvoiceDate}>Issue Date: {formatDate(currentInvoiceData.issueDate)}</Text>
                      <Text style={styles.pdfInvoiceDate}>Due Date: {formatDate(currentInvoiceData.dueDate)}</Text>
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
                      <Text style={styles.pdfClientInfo}>{currentInvoiceData.clientPhone}</Text>
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
                      <Text style={styles.pdfTableCell}>{formatDate(currentInvoiceData.date)}</Text>
                      <Text style={styles.pdfTableCell}>{currentInvoiceData.hours}</Text>
                      <Text style={styles.pdfTableCell}>${currentInvoiceData.rate}</Text>
                      <Text style={styles.pdfTableCellAmount}>${currentInvoiceData.total}</Text>
                    </View>
                  </View>

                  {/* Bottom Section: Payment Info and Totals */}
                  <View style={styles.pdfBottomSection}>
                    <View style={styles.pdfPaymentSection}>
                      <Text style={styles.pdfPaymentTitle}>Payment Information</Text>
                      {paymentInfo.bankAccounts.map((account) => (
                        <View key={account.id} style={styles.bankAccountGroup}>
                          <Text style={styles.pdfPaymentInfo}>{account.bankName}</Text>
                          {account.payee && (
                            <Text style={styles.pdfPaymentInfo}>Payee: {account.payee}</Text>
                          )}
                          {account.branch && (
                            <Text style={styles.pdfPaymentInfo}>Branch: {account.branch}</Text>
                          )}
                          {account.accountNumbers.map((accNum) => (
                            <Text key={accNum.id} style={styles.pdfPaymentInfo}>
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
                        <Text style={styles.pdfTotalLabel}>Subtotal:</Text>
                        <Text style={styles.pdfTotalValue}>${currentInvoiceData.total}</Text>
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
    backgroundColor: COLORS.lightGray,
    borderRadius: 12,
  },
  clientAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
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
  clientEmail: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.textLight,
    marginBottom: 8,
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
  // Invoice History Styles
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
  // Invoice Modal Styles
  invoiceModalContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  invoiceModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  invoiceModalTitle: {
    fontSize: 18,
    fontFamily: 'Poppins_700Bold',
    color: COLORS.text,
    flex: 1,
    textAlign: 'center',
  },
  invoiceCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.lightGray,
    justifyContent: 'center',
    alignItems: 'center',
  },
  invoiceScrollView: {
    flex: 1,
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
  pdfHeader: {
    backgroundColor: COLORS.white,
    paddingTop: SPACING.md,
  },
  pdfHeaderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  pdfCompanyInfo: {
    flex: 1,
    marginRight: SPACING.sm,
  },
  careLogoHeader: {
    width: 200,
    height: 80,
    marginLeft: -40,
  },
  pdfInvoiceInfo: {
    alignItems: 'flex-end',
  },
  pdfInvoiceTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  pdfInvoiceNumber: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },
  pdfInvoiceDate: {
    fontSize: 10,
    color: COLORS.textLight,
    marginBottom: 1,
  },
  pdfBlueLine: {
    height: 2,
    backgroundColor: '#00B8D4',
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
});