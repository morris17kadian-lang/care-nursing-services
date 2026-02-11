import React, { useMemo, useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { useNavigation } from '@react-navigation/native';
import AdminRecurringShiftModal from '../components/AdminRecurringShiftModal';
import { useAppointments } from '../context/AppointmentContext';
import { useNurses } from '../context/NurseContext';
import { COLORS } from '../constants';
import ApiService from '../services/ApiService';

export default function AdminRecurringShiftScreen() {
  const navigation = useNavigation();
  const { appointments } = useAppointments();
  const { nurses } = useNurses();
  const [remoteClients, setRemoteClients] = useState([]);

  useEffect(() => {
    let isMounted = true;
    const fetchClients = async () => {
      try {
        const [patients, patientUsers] = await Promise.all([
          ApiService.getPatients().catch(() => []),
          ApiService.getUsersByRole('patient').catch(() => []),
        ]);

        if (!isMounted) return;

        const combined = [...(patients || []), ...(patientUsers || [])];
        const normalized = combined
          .map((patient, index) => ({
            id:
              patient.id ||
              patient.patientId ||
              patient.clientId ||
              patient.email ||
              patient.phone ||
              `patient-${index}`,
            name:
              patient.name ||
              patient.fullName ||
              patient.displayName ||
              `${patient.firstName || ''} ${patient.lastName || ''}`.trim() ||
              'Client',
            address: patient.address || patient.location || '',
            email: patient.email || '',
            phone: patient.phone || patient.contactNumber || '',
            profilePhoto:
              patient.profilePhoto ||
              patient.profileImage ||
              patient.photoUrl ||
              patient.photoURL ||
              patient.image ||
              patient.avatar ||
              patient.profileImageUrl ||
              patient.clientPhoto ||
              patient.patientPhoto ||
              patient.clientProfilePhoto ||
              patient.patientProfilePhoto ||
              '',
          }))
          .filter((client) => client.name && client.name !== 'Client');

        setRemoteClients(normalized);
      } catch (error) {
        console.warn('⚠️ Unable to load patients for recurring shift modal:', error?.message || error);
      }
    };

    fetchClients();
    return () => {
      isMounted = false;
    };
  }, []);

  const clients = useMemo(() => {
    const uniqueClients = new Map();

    const addClient = (client) => {
      if (!client?.id) return;
      if (!uniqueClients.has(client.id)) {
        uniqueClients.set(client.id, client);
      }
    };

    if (appointments && Array.isArray(appointments)) {
      appointments.forEach((app) => {
        if (app.clientId) {
          addClient({
            id: app.clientId,
            name: app.clientName || 'Unknown Client',
            address: app.clientAddress || '',
            email: app.clientEmail || '',
            phone: app.clientPhone || '',
            profilePhoto:
              app.clientProfilePhoto ||
              app.clientPhoto ||
              app.patientProfilePhoto ||
              app.patientPhoto ||
              app.profilePhoto ||
              app.profileImage ||
              app.photoUrl ||
              app.photoURL ||
              app.image ||
              app.avatar ||
              '',
          });
        }
      });
    }

    remoteClients.forEach(addClient);

    return Array.from(uniqueClients.values());
  }, [appointments, remoteClients]);

  return (
    <View style={styles.container}>
      {/* Watermark Logo */}
      <Image
        source={require('../assets/Images/Nurses-logo.png')}
        style={styles.watermarkLogo}
        contentFit="contain"
      />

      <AdminRecurringShiftModal
        visible={true}
        onClose={() => navigation.navigate('Dashboard')}
        onSuccess={() => navigation.navigate('Dashboard')}
        nurses={nurses}
        clients={clients}
      />
    </View>
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
});
