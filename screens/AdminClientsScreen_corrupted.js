import TouchableWeb from "../components/TouchableWeb";
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Modal, Alert, Image, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, GRADIENTS, SPACING } from '../constants';
import { useAuth } from '../context/AuthContext';
import InvoiceService from '../services/InvoiceService';

export default function AdminClientsScreen({ navigation }) {
  const { logout } = useAuth();
  const insets = useSafeAreaInsets();
  const [isAddClientModalVisible, setIsAddClientModalVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [clientDetailsModalVisible, setClientDetailsModalVisible] = useState(false);
  const [fullInvoiceModalVisible, setFullInvoiceModalVisible] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [clientToDelete, setClientToDelete] = useState(null);
  const [expandedNotes, setExpandedNotes] = useState({});
  const [currentInvoiceData, setCurrentInvoiceData] = useState(null);
  const [clientForm, setClientForm] = useState({
    name: '',
    email: '',
    phone: '',
    serviceType: '',
    paymentMethod: ''
  });

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

  const handleShowClientDetails = (client) => {
    setSelectedClient(client);
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
        email: 'nursingservicesandmorecare@gmail.com'
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
    
    try {
      // Test data for invoice generation
      const testAppointmentData = {
        id: 'test-appointment-001',
        clientId: client.id,
        clientName: client.name,
        clientEmail: client.email,
        clientPhone: client.phone,
        clientAddress: client.address,
        serviceName: client.lastService || 'Dressings',
        appointmentDate: '2024-11-01',
        appointmentTime: '10:00 AM',
        status: 'completed',
        notes: 'Service completed successfully',
        duration: '30 mins',
        nurseId: 'NURSE001',
        nurseName: 'Sarah Johnson',
      };

      console.log('🔥 GENERATING INVOICE WITH TEST DATA');
      const result = await InvoiceService.createInvoiceFromAppointment(testAppointmentData);
      
      if (result.success) {
        console.log('✅ INVOICE GENERATED SUCCESSFULLY');
        console.log('� Invoice Data:', JSON.stringify(result.invoice, null, 2));
        
        // Navigate to dedicated invoice screen instead of modal
        console.log('🔄 NAVIGATING TO INVOICE SCREEN');
        navigation.navigate('InvoiceDisplay', { 
          invoiceData: result.invoice,
          clientName: client.name 
        });
      } else {
        console.log('❌ INVOICE GENERATION FAILED:', result.error);
        Alert.alert('Error', result.error || 'Failed to generate invoice');
      }
    } catch (error) {
      console.error('💥 ERROR IN handleViewInvoice:', error);
      Alert.alert('Error', 'Failed to generate invoice');
    }
  };

  const handleSendInvoice = (client) => {
    const invoiceData = generateInvoiceData(client);
    
    const message = client.hasRecurringAppointments 
      ? `Auto-generated invoice for recurring ${client.serviceType} services`
      : `Invoice for completed ${client.serviceType} services`;

    Alert.alert(
      'Send Invoice',
      `${message}\n\nTo: ${client.email}\nAmount: J$${invoiceData.billing.total.toLocaleString()}\n${invoiceData.isRecurring ? '🔄 Recurring billing active' : ''}`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Send', 
          onPress: () => {
            // In a real app, this would call an email service API
            Alert.alert(
              'Success', 
              `Invoice #${invoiceData.invoiceNumber} sent to ${client.email}\n` +
              `${invoiceData.isRecurring ? 'Next invoice will be auto-generated for recurring services.' : ''}`
            );
          }
        }
      ]
    );
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

  // Sample client data (in a real app, this would come from an API)
  const clients = [
    {
      id: 1,
      name: 'Sarah Johnson',
      email: 'sarah.johnson@email.com',
      phone: '(876) 555-0123',
      serviceType: 'Physical Therapy',
      paymentMethod: 'Insurance',
      isSubscriber: true,
      hasRecurringAppointments: true,
      profilePhoto: null, // Will be updated when client adds photo
      appointments: {
        upcoming: 2,
        completed: 8
      },
      totalPaid: 'J$45,000',
      address: '123 Kingston Road, Kingston 10',
      emergencyContact: 'John Johnson - (876) 555-0124',
      medicalNotes: [
        {
          id: 1,
          date: '2024-10-15',
          nurseId: 'nurse_001',
          nurseName: 'Jennifer Clarke',
          appointmentType: 'Physical Therapy Session',
          notes: 'Patient showed good progress with mobility exercises. Range of motion improved significantly. Continue with current treatment plan.'
        },
        {
          id: 2,
          date: '2024-10-22',
          nurseId: 'nurse_001',
          nurseName: 'Jennifer Clarke',
          appointmentType: 'Physical Therapy Session',
          notes: 'Patient able to walk short distances without assistance. Recommended daily exercises and follow-up in one week.'
        },
        {
          id: 3,
          date: '2024-10-29',
          nurseId: 'nurse_002',
          nurseName: 'Michael Thompson',
          appointmentType: 'Progress Assessment',
          notes: 'Excellent recovery progress. Patient now fully mobile with minimal discomfort. Treatment goals achieved.'
        }
      ]
    },
    {
      id: 2,
      name: 'Michael Brown',
      email: 'michael.brown@email.com',
      phone: '(876) 555-0234',
      serviceType: 'Wound Care',
      paymentMethod: 'Private Pay',
      isSubscriber: false,
      hasRecurringAppointments: false,
      profilePhoto: null, // Will be updated when client adds photo
      appointments: {
        upcoming: 1,
        completed: 12
      },
      totalPaid: 'J$72,000',
      address: '456 Spanish Town Road, Spanish Town',
      emergencyContact: 'Maria Brown - (876) 555-0235',
      medicalNotes: [
        {
          id: 1,
          date: '2024-10-10',
          nurseId: 'nurse_003',
          nurseName: 'Sarah Williams',
          appointmentType: 'Wound Care Treatment',
          notes: 'Cleaned and dressed diabetic ulcer on left foot. Wound showing signs of healing. Patient educated on proper foot care.'
        },
        {
          id: 2,
          date: '2024-10-17',
          nurseId: 'nurse_003',
          nurseName: 'Sarah Williams',
          appointmentType: 'Wound Care Follow-up',
          notes: 'Wound size reduced by 40%. No signs of infection. Continue current treatment protocol.'
        }
      ]
    },
    {
      id: 3,
      name: 'Emily Davis',
      email: 'emily.davis@email.com',
      phone: '(876) 555-0345',
      serviceType: 'Home Care',
      paymentMethod: 'Medicare',
      isSubscriber: true,
      hasRecurringAppointments: true,
      profilePhoto: null, // Will be updated when client adds photo
      appointments: {
        upcoming: 3,
        completed: 15
      },
      totalPaid: 'J$128,000',
      address: '789 Hope Road, St. Andrew',
      emergencyContact: 'Robert Davis - (876) 555-0346',
      medicalNotes: [
        {
          id: 1,
          date: '2024-10-05',
          nurseId: 'nurse_004',
          nurseName: 'Patricia Johnson',
          appointmentType: 'Daily Care Assessment',
          notes: 'Patient requires assistance with bathing and medication management. Vital signs stable. Family caregiver training provided.'
        },
        {
          id: 2,
          date: '2024-10-12',
          nurseId: 'nurse_004',
          nurseName: 'Patricia Johnson',
          appointmentType: 'Weekly Check-up',
          notes: 'Patient responding well to care routine. Blood pressure within normal range. Continue current care plan.'
        },
        {
          id: 3,
          date: '2024-10-19',
          nurseId: 'nurse_005',
          nurseName: 'Robert Garcia',
          appointmentType: 'Health Monitoring',
          notes: 'Patient showing improved appetite and energy levels. Medication compliance excellent. Family satisfied with care.'
        },
        {
          id: 4,
          date: '2024-10-26',
          nurseId: 'nurse_004',
          nurseName: 'Patricia Johnson',
          appointmentType: 'Monthly Review',
          notes: 'Overall health stable. Patient able to perform more daily activities independently. Adjust care schedule as needed.'
        }
      ]
    },
    {
      id: 4,
      name: 'James Wilson',
      email: 'james.wilson@email.com',
      phone: '(876) 555-0456',
      serviceType: 'Medication Administration',
      paymentMethod: 'Insurance',
      isSubscriber: false,
      hasRecurringAppointments: false,
      profilePhoto: null, // Will be updated when client adds photo
      appointments: {
        upcoming: 1,
        completed: 6
      },
      totalPaid: 'J$36,000',
      address: '321 Mandela Highway, Spanish Town',
      emergencyContact: 'Lisa Wilson - (876) 555-0457',
      medicalNotes: [
        {
          id: 1,
          date: '2024-10-08',
          nurseId: 'nurse_006',
          nurseName: 'Angela Davis',
          appointmentType: 'Medication Administration',
          notes: 'Administered daily medications as prescribed. Patient tolerating medications well. Blood pressure monitored.'
        },
        {
          id: 2,
          date: '2024-10-15',
          nurseId: 'nurse_006',
          nurseName: 'Angela Davis',
          appointmentType: 'Weekly Medication Review',
          notes: 'Medication schedule adjusted per physician orders. Patient educated on new timing. Side effects discussed.'
        }
      ]
    },
    {
      id: 5,
      name: 'Lisa Garcia',
      email: 'lisa.garcia@email.com',
      phone: '(876) 555-0567',
      serviceType: 'Blood Pressure Monitoring',
      paymentMethod: 'Private Pay',
      isSubscriber: true,
      hasRecurringAppointments: true,
      profilePhoto: null, // Will be updated when client adds photo
      appointments: {
        upcoming: 0,
        completed: 20
      },
      totalPaid: 'J$95,000',
      address: '654 Old Harbour Road, Portmore',
      emergencyContact: 'Carlos Garcia - (876) 555-0568',
      medicalNotes: [
        {
          id: 1,
          date: '2024-09-15',
          nurseId: 'nurse_007',
          nurseName: 'Christine Brown',
          appointmentType: 'Blood Pressure Monitoring',
          notes: 'BP reading 145/92. Slightly elevated. Medication compliance reviewed. Patient advised on dietary changes.'
        },
        {
          id: 2,
          date: '2024-09-22',
          nurseId: 'nurse_007',
          nurseName: 'Christine Brown',
          appointmentType: 'Weekly BP Check',
          notes: 'BP improved to 138/85. Patient following dietary recommendations. Continue current medication regimen.'
        },
        {
          id: 3,
          date: '2024-09-29',
          nurseId: 'nurse_008',
          nurseName: 'David Martinez',
          appointmentType: 'Health Assessment',
          notes: 'BP stable at 135/82. Patient weight reduced by 3 lbs. Exercise routine discussed and approved.'
        },
        {
          id: 4,
          date: '2024-10-06',
          nurseId: 'nurse_007',
          nurseName: 'Christine Brown',
          appointmentType: 'Monthly Review',
          notes: 'Excellent progress. BP consistently within target range. Patient very compliant with treatment plan.'
        },
        {
          id: 5,
          date: '2024-10-13',
          nurseId: 'nurse_007',
          nurseName: 'Christine Brown',
          appointmentType: 'Routine Monitoring',
          notes: 'BP 130/80 - excellent control. Patient reports feeling much better. Continue current care plan.'
        }
      ]
    }
  ];

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
          
          <TouchableWeb
            style={styles.recurringInvoiceButton}
            onPress={processRecurringInvoices}
          >
            <MaterialCommunityIcons name="autorenew" size={20} color="#fff" />
            <Text style={styles.recurringInvoiceText}>Auto Bill</Text>
          </TouchableWeb>
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
                        colors={['#2196F3', '#1976D2']}
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
                  colors={GRADIENTS.primary}
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
                    
                    {/* Billing Status Section */}
                    <View style={styles.billingSection}>
                      <View style={styles.billingHeader}>
                        <MaterialCommunityIcons 
                          name={selectedClient.hasRecurringAppointments ? "autorenew" : "cash"} 
                          size={20} 
                          color={selectedClient.hasRecurringAppointments ? COLORS.success : COLORS.primary} 
                        />
                        <Text style={styles.billingTitle}>
                          {selectedClient.hasRecurringAppointments ? 'Auto-Billing Active' : 'Manual Billing'}
                        </Text>
                      </View>
                      
                      {selectedClient.hasRecurringAppointments && (
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
                      )}
                      
                      <View style={styles.billingStats}>
                        <View style={styles.billingStat}>
                          <Text style={styles.billingStatLabel}>Total Sessions</Text>
                          <Text style={styles.billingStatValue}>{selectedClient.appointments.completed}</Text>
                        </View>
                        <View style={styles.billingStat}>
                          <Text style={styles.billingStatLabel}>Payment Method</Text>
                          <Text style={styles.billingStatValue}>{selectedClient.paymentMethod}</Text>
                        </View>
                      </View>
                    </View>
                    
                    <View style={styles.invoiceSection}>
                      <Text style={styles.invoiceLabel}>Invoice Options</Text>
                      <View style={styles.invoiceActions}>
                        <TouchableWeb
                          style={styles.invoiceButton}
                          onPress={() => handleViewInvoice(selectedClient)}
                          activeOpacity={0.7}
                        >
                          <LinearGradient
                            colors={['#2196F3', '#1976D2']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.invoiceButtonGradient}
                          >
                            <MaterialCommunityIcons name="eye" size={16} color={COLORS.white} />
                            <Text style={styles.invoiceButtonText}>View</Text>
                          </LinearGradient>
                        </TouchableWeb>
                        
                        <TouchableWeb
                          style={styles.invoiceButton}
                          onPress={() => handleSendInvoice(selectedClient)}
                          activeOpacity={0.7}
                        >
                          <LinearGradient
                            colors={['#4CAF50', '#2E7D32']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.invoiceButtonGradient}
                          >
                            <MaterialCommunityIcons name="email-outline" size={16} color={COLORS.white} />
                            <Text style={styles.invoiceButtonText}>Send via Email</Text>
                          </LinearGradient>
                        </TouchableWeb>
                      </View>
                    </View>
                  </View>

                  <View style={styles.detailsSection}>
                    <Text style={styles.sectionTitle}>Appointments</Text>
                    <View style={styles.appointmentStats}>
                      <TouchableWeb style={styles.statPill} activeOpacity={0.7}>
                        <LinearGradient
                          colors={['#4CAF50', '#2E7D32']}
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
                          colors={['#2196F3', '#1976D2']}
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

      {/* Full Invoice Modal - Temporarily disabled for debugging
      <Modal
        visible={fullInvoiceModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setFullInvoiceModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.detailsModalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Invoice #{currentInvoiceData?.invoiceNumber || '000'}
              </Text>
              <TouchableWeb
                style={styles.modalCloseButton}
                onPress={() => setFullInvoiceModalVisible(false)}
              >
                <MaterialCommunityIcons name="close" size={24} color={COLORS.textLight} />
              </TouchableWeb>
            </View>

            <ScrollView style={styles.modalContent}>
              <View style={{ padding: 20 }}>
                <Text style={styles.sectionTitle}>Invoice Details</Text>
                
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Client:</Text>
                  <Text style={styles.detailValue}>{currentInvoiceData?.client?.name}</Text>
                </View>
                
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Service:</Text>
                  <Text style={styles.detailValue}>{currentInvoiceData?.services?.description}</Text>
                </View>
                
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Quantity:</Text>
                  <Text style={styles.detailValue}>{currentInvoiceData?.services?.quantity} sessions</Text>
                </View>
                
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Unit Price:</Text>
                  <Text style={styles.detailValue}>J${currentInvoiceData?.services?.unitPrice?.toLocaleString()}</Text>
                </View>
                
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Total Amount:</Text>
                  <Text style={[styles.detailValue, { fontFamily: 'Poppins_700Bold', fontSize: 18 }]}>
                    J${currentInvoiceData?.billing?.total?.toLocaleString()}
                  </Text>
                </View>
                
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Status:</Text>
                  <Text style={[styles.detailValue, { 
                    color: currentInvoiceData?.billing?.balanceDue === 0 ? COLORS.success : COLORS.error 
                  }]}>
                    {currentInvoiceData?.billing?.balanceDue === 0 ? 'PAID' : 'PENDING'}
                  </Text>
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
      */}

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({






'� CLOSE BUTTON PRESSED');
                setInvoiceModalVisible(false);
                setGeneratedInvoice(null);
              }}
            >
              <Text style={{
                color: 'black',
                fontSize: 18,
                fontWeight: 'bold'
              }}>
                CLOSE MODAL
              </Text>
            </TouchableOpacity>
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
    maxWidth: 450,
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
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
  // Full Invoice Modal Styles
  fullInvoiceContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
  },
  fullInvoiceModalContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    margin: 20,
    marginTop: 60,
    flex: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  invoiceModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  invoiceTestContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  testTitle: {
    fontSize: 24,
    fontFamily: 'Poppins_700Bold',
    color: COLORS.text,
    marginBottom: 20,
  },
  testText: {
    fontSize: 16,
    fontFamily: 'Poppins_500Medium',
    color: COLORS.textLight,
    marginBottom: 10,
    textAlign: 'center',
  },
  testCloseButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 30,
  },
  testCloseButtonText: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.white,
  },
  invoiceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  closeInvoiceButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  invoiceHeaderTitle: {
    fontSize: 18,
    fontFamily: 'Poppins_700Bold',
    color: COLORS.white,
  },
  doneButton: {
    width: 40,
  },
  doneButtonText: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.white,
  },
  invoiceContent: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  companyBanner: {
    backgroundColor: '#2d2d2d',
    position: 'relative',
    height: 160,
    overflow: 'hidden',
  },
  companyInfo: {
    position: 'absolute',
    top: 20,
    left: 20,
    zIndex: 1,
  },
  companyPhone: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.white,
    marginBottom: 4,
  },
  companyEmail: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.white,
  },
  logoSection: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: '60%',
    backgroundColor: '#20B2AA',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ skewX: '-15deg' }],
    marginRight: -30,
  },
  logoContainer: {
    width: 60,
    height: 60,
    backgroundColor: COLORS.white,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 20,
    transform: [{ skewX: '15deg' }],
  },
  logoText: {
    fontSize: 18,
    fontFamily: 'Poppins_700Bold',
    color: '#20B2AA',
  },
  invoiceTitleSection: {
    transform: [{ skewX: '15deg' }],
  },
  invoiceTitle: {
    fontSize: 32,
    fontFamily: 'Poppins_900Black',
    color: COLORS.white,
    letterSpacing: 2,
  },
  companyName: {
    fontSize: 12,
    fontFamily: 'Poppins_500Medium',
    color: COLORS.white,
    marginTop: -5,
  },
  billToSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: 30,
  },
  billToLeft: {
    flex: 1,
  },
  billToLabel: {
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
    color: '#20B2AA',
    marginBottom: 8,
  },
  clientName: {
    fontSize: 18,
    fontFamily: 'Poppins_700Bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  clientAddress: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.textLight,
    lineHeight: 20,
  },
  billToRight: {
    alignItems: 'flex-end',
  },
  invoiceDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    minWidth: 180,
  },
  detailLabel: {
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
    color: COLORS.textLight,
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.text,
    textAlign: 'right',
  },
  servicesTable: {
    margin: 20,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: COLORS.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#20B2AA',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  tableHeaderText: {
    fontSize: 12,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.white,
    textAlign: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tableCell: {
    fontSize: 12,
    fontFamily: 'Poppins_500Medium',
    color: COLORS.text,
    textAlign: 'center',
  },
  serviceName: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.text,
    textAlign: 'left',
  },
  serviceDates: {
    fontSize: 11,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.textLight,
    textAlign: 'left',
    marginTop: 2,
  },
  bottomSection: {
    flexDirection: 'row',
    padding: 20,
    gap: 20,
  },
  paymentInstructions: {
    flex: 1,
  },
  paymentTitle: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: '#20B2AA',
    marginBottom: 12,
  },
  paymentDetail: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.textLight,
    marginBottom: 4,
  },
  totalsSection: {
    minWidth: 200,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  totalLabel: {
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
    color: COLORS.textLight,
  },
  totalValue: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.text,
  },
  balanceRow: {
    backgroundColor: '#20B2AA',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 4,
    marginTop: 8,
    borderBottomWidth: 0,
  },
  balanceLabel: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.white,
  },
  balanceValue: {
    fontSize: 16,
    fontFamily: 'Poppins_700Bold',
    color: COLORS.white,
  },
  paidStamp: {
    position: 'absolute',
    right: 40,
    top: 420,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(220, 53, 69, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 6,
    borderColor: '#dc3545',
    transform: [{ rotate: '25deg' }],
    zIndex: 10,
  },
  paidText: {
    fontSize: 24,
    fontFamily: 'Poppins_900Black',
    color: COLORS.white,
    letterSpacing: 2,
  },
  commentsSection: {
    padding: 20,
    paddingTop: 40,
  },
  commentsTitle: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: '#20B2AA',
    marginBottom: 8,
  },
  commentsText: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.textLight,
    marginBottom: 4,
  },
  signatureSection: {
    alignItems: 'flex-end',
    padding: 20,
    paddingTop: 40,
    paddingBottom: 40,
  },
  signature: {
    fontSize: 24,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.text,
    fontStyle: 'italic',
  },
  signatureDate: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.textLight,
    marginTop: 4,
  },
});
