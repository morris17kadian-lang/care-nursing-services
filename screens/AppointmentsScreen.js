import TouchableWeb from "../components/TouchableWeb";
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,

} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, GRADIENTS, SPACING } from '../constants';
import { useAuth } from '../context/AuthContext';

export default function AppointmentsScreen({ navigation }) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('upcoming');

  // Sample appointments data
  const upcomingAppointments = [
    {
      id: '1',
      service: 'Home Nursing',
      date: 'Oct 25, 2025',
      time: '10:00 AM',
      duration: '2 hours',
      price: '$240',
      nurse: 'Sarah Johnson, RN',
      status: 'confirmed',
      location: 'Home Visit',
    },
    {
      id: '2',
      service: 'Physiotherapy',
      date: 'Oct 28, 2025',
      time: '2:00 PM',
      duration: '60 mins',
      price: '$80',
      nurse: 'Michael Chen, PT',
      status: 'confirmed',
      location: 'Home Visit',
    },
    {
      id: '3',
      service: 'Blood Draws',
      date: 'Nov 2, 2025',
      time: '9:00 AM',
      duration: '15 mins',
      price: '$40',
      nurse: 'Emily Davis, RN',
      status: 'pending',
      location: 'Home Visit',
    },
  ];

  const pastAppointments = [
    {
      id: '4',
      service: 'Medication Administration',
      date: 'Oct 18, 2025',
      time: '11:00 AM',
      duration: '20 mins',
      price: '$35',
      nurse: 'Robert Williams, RN',
      status: 'completed',
      location: 'Home Visit',
    },
    {
      id: '5',
      service: 'Vital Signs Monitoring',
      date: 'Oct 15, 2025',
      time: '3:00 PM',
      duration: '15 mins',
      price: '$30',
      nurse: 'Lisa Anderson, RN',
      status: 'completed',
      location: 'Home Visit',
    },
  ];

  const appointments = activeTab === 'upcoming' ? upcomingAppointments : pastAppointments;

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

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <LinearGradient
        colors={GRADIENTS.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>My Appointments</Text>
        </View>
      </LinearGradient>

      {/* Tab Selector */}
      <View style={styles.tabContainer}>
        <TouchableWeb
          style={[styles.tab, activeTab === 'upcoming' && styles.activeTab]}
          onPress={() => setActiveTab('upcoming')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, activeTab === 'upcoming' && styles.activeTabText]}>
            Upcoming ({upcomingAppointments.length})
          </Text>
        </TouchableWeb>
        <TouchableWeb
          style={[styles.tab, activeTab === 'past' && styles.activeTab]}
          onPress={() => setActiveTab('past')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, activeTab === 'past' && styles.activeTabText]}>
            Past ({pastAppointments.length})
          </Text>
        </TouchableWeb>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {appointments.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="calendar-blank" size={80} color={COLORS.border} />
            <Text style={styles.emptyTitle}>No {activeTab} appointments</Text>
            <Text style={styles.emptyText}>
              {activeTab === 'upcoming'
                ? 'Book a service to get started'
                : 'Your completed appointments will appear here'}
            </Text>
            {activeTab === 'upcoming' && (
              <TouchableWeb
                style={styles.bookButton}
                onPress={() => navigation.navigate('Book')}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={GRADIENTS.primary}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
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
            {appointments.map((appointment) => (
              <View key={appointment.id} style={styles.appointmentCard}>
                <View style={styles.appointmentHeader}>
                  <View style={styles.appointmentTitleRow}>
                    <MaterialCommunityIcons name="medical-bag" size={24} color={COLORS.primary} />
                    <Text style={styles.appointmentService}>{appointment.service}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(appointment.status) + '20' }]}>
                    <MaterialCommunityIcons
                      name={getStatusIcon(appointment.status)}
                      size={14}
                      color={getStatusColor(appointment.status)}
                    />
                    <Text style={[styles.statusText, { color: getStatusColor(appointment.status) }]}>
                      {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                    </Text>
                  </View>
                </View>

                <View style={styles.appointmentDetails}>
                  <View style={styles.detailRow}>
                    <MaterialCommunityIcons name="calendar" size={18} color={COLORS.textLight} />
                    <Text style={styles.detailText}>{appointment.date}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <MaterialCommunityIcons name="clock-outline" size={18} color={COLORS.textLight} />
                    <Text style={styles.detailText}>{appointment.time} ({appointment.duration})</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <MaterialCommunityIcons name="account-circle" size={18} color={COLORS.textLight} />
                    <Text style={styles.detailText}>{appointment.nurse}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <MaterialCommunityIcons name="map-marker" size={18} color={COLORS.textLight} />
                    <Text style={styles.detailText}>{appointment.location}</Text>
                  </View>
                </View>

                <View style={styles.appointmentFooter}>
                  <View style={styles.priceContainer}>
                    <Text style={styles.priceLabel}>Total:</Text>
                    <Text style={styles.priceValue}>{appointment.price}</Text>
                  </View>
                  {activeTab === 'upcoming' && (
                    <View style={styles.actionButtons}>
                      <TouchableWeb style={styles.actionButton} activeOpacity={0.7}>
                        <MaterialCommunityIcons name="pencil" size={18} color={COLORS.primary} />
                      </TouchableWeb>
                      <TouchableWeb style={[styles.actionButton, styles.cancelButton]} activeOpacity={0.7}>
                        <MaterialCommunityIcons name="close" size={18} color={COLORS.error} />
                      </TouchableWeb>
                    </View>
                  )}
                  {activeTab === 'past' && (
                    <TouchableWeb
                      style={styles.rebookButton}
                      onPress={() => navigation.navigate('Book')}
                      activeOpacity={0.7}
                    >
                      <MaterialCommunityIcons name="refresh" size={16} color={COLORS.accent} />
                      <Text style={styles.rebookText}>Rebook</Text>
                    </TouchableWeb>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}

        {appointments.length > 0 && activeTab === 'upcoming' && (
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
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontFamily: 'Poppins_700Bold',
    color: COLORS.white,
  },
  headerSubtitle: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.white,
    opacity: 0.9,
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginTop: 16,
    marginBottom: 8,
    gap: 12,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: COLORS.white,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: COLORS.primary,
  },
  tabText: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.text,
  },
  activeTabText: {
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
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
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
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 11,
    fontFamily: 'Poppins_600SemiBold',
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
    color: COLORS.primary,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
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
});
