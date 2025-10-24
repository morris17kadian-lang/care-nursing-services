import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Image,
  Dimensions,
  Linking,
  Modal,
  Animated,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { InfoCard, SectionHeader } from '../components/Cards';
import { COLORS, GRADIENTS, SPACING, CONTACT_INFO, SERVICES } from '../constants';
import { useAuth } from '../context/AuthContext';
import TouchableWeb from '../components/TouchableWeb';

const { width } = Dimensions.get('window');

export default function HomeScreen({ navigation }) {
  const { user } = useAuth();
  const [selectedService, setSelectedService] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [currentFeatureIndex, setCurrentFeatureIndex] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const whyChooseFeatures = [
    {
      icon: 'shield-check',
      title: 'Licensed & Certified',
      description: 'All our healthcare professionals are fully licensed and certified',
    },
    {
      icon: 'clock-fast',
      title: '24/7 Availability',
      description: 'Round-the-clock care services whenever you need us',
    },
    {
      icon: 'heart-pulse',
      title: 'Personalized Care',
      description: 'Tailored healthcare solutions designed for your unique needs',
    },
    {
      icon: 'star',
      title: 'Trusted Excellence',
      description: 'Years of experience delivering compassionate, quality care',
    },
  ];

  const handleServicePress = (service) => {
    setSelectedService(service);
    setModalVisible(true);
  };

  const handleBookAppointment = () => {
    setModalVisible(false);
    navigation.navigate('Book');
  };

  useEffect(() => {
    // Features animation
    const featuresInterval = setInterval(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }).start(() => {
        setCurrentFeatureIndex((prevIndex) => 
          (prevIndex + 1) % whyChooseFeatures.length
        );
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }).start();
      });
    }, 4000);

    return () => {
      clearInterval(featuresInterval);
    };
  }, [fadeAnim]);

  const handleCall = () => {
    Linking.openURL(`tel:${CONTACT_INFO.phone}`);
  };

  const handleEmail = () => {
    Linking.openURL(`mailto:${CONTACT_INFO.email}`);
  };

  const handleInstagram = () => {
    Linking.openURL(`https://instagram.com/${CONTACT_INFO.instagram.replace('@', '')}`);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Hero Section */}
        <LinearGradient
          colors={GRADIENTS.header}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.hero}
        >
          {user && (
            <View style={styles.headerRow}>
              <TouchableWeb 
                style={styles.iconButton}
                onPress={() => navigation.navigate('Notifications')}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons name="bell-outline" size={26} color={COLORS.white} />
                <View style={styles.notificationBadge}>
                  <Text style={styles.badgeText}>3</Text>
                </View>
              </TouchableWeb>
              <Text style={styles.welcomeText}>Welcome, {user.username}!</Text>
              <TouchableWeb 
                style={styles.iconButton}
                onPress={() => navigation.navigate('Settings')}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons name="account-circle-outline" size={28} color={COLORS.white} />
              </TouchableWeb>
            </View>
          )}
        </LinearGradient>

        {/* Services */}
        <View style={styles.section}>
          <SectionHeader title="Our Services" subtitle="Tap to learn more" />
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.servicesScroll}
          >
            {SERVICES.map((service) => (
              <TouchableWeb
                key={service.id}
                style={styles.serviceCircle}
                onPress={() => handleServicePress(service)}
                activeOpacity={0.7}
              >
                <LinearGradient
                  colors={GRADIENTS.primary}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.serviceCircleGradient}
                >
                  <MaterialCommunityIcons name={service.icon} size={32} color={COLORS.white} />
                </LinearGradient>
                <Text style={styles.serviceCircleLabel} numberOfLines={2}>
                  {service.title}
                </Text>
              </TouchableWeb>
            ))}
          </ScrollView>
        </View>

        {/* Health Dashboard Widget */}
        <View style={styles.section}>
          <SectionHeader title="Health Dashboard" subtitle="Your daily overview" />
          <View style={styles.dashboardContainer}>
            <View style={styles.dashboardCard}>
              <View style={styles.dashboardHeader}>
                <MaterialCommunityIcons name="heart-pulse" size={24} color={COLORS.error} />
                <Text style={styles.dashboardTitle}>Vitals Today</Text>
              </View>
              <View style={styles.vitalsGrid}>
                <View style={styles.vitalItem}>
                  <Text style={styles.vitalValue}>120/80</Text>
                  <Text style={styles.vitalLabel}>BP</Text>
                </View>
                <View style={styles.vitalItem}>
                  <Text style={styles.vitalValue}>72</Text>
                  <Text style={styles.vitalLabel}>Heart Rate</Text>
                </View>
                <View style={styles.vitalItem}>
                  <Text style={styles.vitalValue}>98.6°F</Text>
                  <Text style={styles.vitalLabel}>Temp</Text>
                </View>
              </View>
            </View>

            <View style={styles.dashboardCard}>
              <View style={styles.dashboardHeader}>
                <MaterialCommunityIcons name="calendar-check" size={24} color={COLORS.primary} />
                <Text style={styles.dashboardTitle}>Next Appointment</Text>
              </View>
              <Text style={styles.appointmentText}>Oct 25, 10:00 AM</Text>
              <Text style={styles.appointmentService}>Home Nursing with Sarah J.</Text>
            </View>
          </View>
        </View>

        {/* Quick Access Cards */}
        <View style={styles.section}>
          <View style={styles.quickAccessContainer}>
            {/* Reminders Card */}
            <View style={styles.quickAccessCard}>
              <View style={styles.quickAccessHeader}>
                <MaterialCommunityIcons name="bell-ring" size={22} color={COLORS.primary} />
                <Text style={styles.quickAccessTitle}>Reminders</Text>
              </View>
              <Text style={styles.quickAccessSubtitle}>Medication & Appointments</Text>
              <TouchableWeb 
                style={styles.quickAccessButton}
                activeOpacity={0.7}
              >
                <LinearGradient
                  colors={GRADIENTS.primary}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.quickAccessButtonGradient}
                >
                  <MaterialCommunityIcons name="plus" size={18} color={COLORS.white} />
                  <Text style={styles.quickAccessButtonText}>Add Reminder</Text>
                </LinearGradient>
              </TouchableWeb>
            </View>

            {/* Emergency Contact Card */}
            <View style={styles.quickAccessCard}>
              <View style={styles.quickAccessHeader}>
                <MaterialCommunityIcons name="phone-alert" size={22} color={COLORS.error} />
                <Text style={styles.quickAccessTitle}>Emergency</Text>
              </View>
              <Text style={styles.quickAccessSubtitle}>Quick Contact Person</Text>
              <TouchableWeb 
                style={styles.quickAccessButton}
                activeOpacity={0.7}
              >
                <LinearGradient
                  colors={[COLORS.error, '#ff6b6b']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.quickAccessButtonGradient}
                >
                  <MaterialCommunityIcons name="plus" size={18} color={COLORS.white} />
                  <Text style={styles.quickAccessButtonText}>Add Contact</Text>
                </LinearGradient>
              </TouchableWeb>
            </View>
          </View>
        </View>

        {/* Why Choose CARE - Animated Advertisement */}
        <View style={styles.section}>
          <View style={styles.advertisementCard}>
            <LinearGradient
              colors={GRADIENTS.primary}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.advertisementGradient}
            >
              {/* Background Logo Watermark */}
              <Image
                source={require('../assets/Images/CARElogo.png')}
                style={styles.advertisementBackgroundLogo}
                resizeMode="contain"
              />

              <Animated.View style={[styles.advertisementContent, { opacity: fadeAnim }]}>
                <MaterialCommunityIcons 
                  name={whyChooseFeatures[currentFeatureIndex].icon} 
                  size={48} 
                  color={COLORS.white} 
                />
                <Text style={styles.advertisementTitle}>
                  {whyChooseFeatures[currentFeatureIndex].title}
                </Text>
                <Text style={styles.advertisementDescription}>
                  {whyChooseFeatures[currentFeatureIndex].description}
                </Text>
              </Animated.View>

              {/* Indicator Dots */}
              <View style={styles.indicatorContainer}>
                {whyChooseFeatures.map((_, index) => (
                  <View
                    key={index}
                    style={[
                      styles.indicator,
                      currentFeatureIndex === index && styles.indicatorActive,
                    ]}
                  />
                ))}
              </View>
            </LinearGradient>
          </View>
        </View>
      </ScrollView>

      {/* Service Detail Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedService && (
              <>
                <LinearGradient
                  colors={GRADIENTS.header}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.modalHeader}
                >
                  <MaterialCommunityIcons 
                    name={selectedService.icon} 
                    size={36} 
                    color={COLORS.white} 
                  />
                  <Text style={styles.modalTitle}>{selectedService.title}</Text>
                  <Text style={styles.modalCategory}>{selectedService.category}</Text>
                </LinearGradient>

                <View style={styles.modalBody}>
                  <Text style={styles.modalDescription}>{selectedService.description}</Text>

                  {/* Pricing Information */}
                  <View style={styles.pricingContainer}>
                    <View style={styles.pricingItem}>
                      <MaterialCommunityIcons name="currency-usd" size={20} color={COLORS.primary} />
                      <View style={styles.pricingTextContainer}>
                        <Text style={styles.pricingLabel}>Price</Text>
                        <Text style={styles.pricingValue}>{selectedService.price}</Text>
                      </View>
                    </View>
                    <View style={styles.pricingDivider} />
                    <View style={styles.pricingItem}>
                      <MaterialCommunityIcons name="clock-outline" size={20} color={COLORS.accent} />
                      <View style={styles.pricingTextContainer}>
                        <Text style={styles.pricingLabel}>Duration</Text>
                        <Text style={styles.pricingValue}>{selectedService.duration}</Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.modalButtons}>
                    <TouchableWeb
                      style={styles.modalCloseButton}
                      onPress={() => setModalVisible(false)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.modalCloseButtonText}>Close</Text>
                    </TouchableWeb>

                    <TouchableWeb
                      style={styles.modalBookButton}
                      onPress={handleBookAppointment}
                      activeOpacity={0.8}
                    >
                      <LinearGradient
                        colors={GRADIENTS.accent}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.modalBookGradient}
                      >
                        <MaterialCommunityIcons name="plus-circle" size={20} color={COLORS.white} />
                        <Text style={styles.modalBookButtonText}>Book Appointment</Text>
                      </LinearGradient>
                    </TouchableWeb>
                  </View>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Floating Chat Button */}
      <TouchableWeb
        style={styles.floatingChatButton}
        onPress={() => console.log('Chat with representative')}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={GRADIENTS.accent}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.floatingChatGradient}
        >
          <MaterialCommunityIcons name="chat" size={28} color={COLORS.white} />
        </LinearGradient>
      </TouchableWeb>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  hero: {
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
  badgeText: {
    fontSize: 10,
    fontFamily: 'Poppins_700Bold',
    color: COLORS.white,
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
  section: {
    paddingHorizontal: SPACING.lg,
    marginTop: SPACING.xl,
  },
  lastSection: {
    marginBottom: SPACING.xxl,
  },
  servicesScroll: {
    paddingVertical: SPACING.md,
    gap: SPACING.lg,
  },
  serviceCircle: {
    alignItems: 'center',
    marginRight: SPACING.lg,
    width: 90,
  },
  serviceCircleGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
    marginBottom: SPACING.sm,
  },
  serviceCircleLabel: {
    fontSize: 11,
    fontFamily: 'Poppins_500Medium',
    color: COLORS.text,
    textAlign: 'center',
    lineHeight: 14,
  },
  quickActions: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  actionCard: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  actionGradient: {
    padding: SPACING.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 100,
  },
  actionText: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.white,
    marginTop: SPACING.sm,
  },
  floatingChatButton: {
    position: 'absolute',
    bottom: 80,
    right: SPACING.lg,
    borderRadius: 30,
    overflow: 'hidden',
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  floatingChatGradient: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactTiles: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  contactTile: {
    flex: 1,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 12,
  },
  contactTileGradient: {
    paddingVertical: SPACING.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    borderRadius: 16,
  },
  contactTileLabel: {
    fontSize: 12,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.white,
  },
  hoursCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: SPACING.md,
    gap: SPACING.md,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 3,
  },
  hourRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  hourLabel: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
    color: COLORS.text,
  },
  hourValue: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.primary,
  },
  emergencyHour: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: 12,
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  emergencyHourText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.white,
  },
  featureList: {
    gap: SPACING.md,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    padding: SPACING.md,
    borderRadius: 12,
    gap: SPACING.md,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  featureText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
    color: COLORS.text,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    width: '90%',
    maxWidth: 500,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 15,
  },
  modalHeader: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 17,
    fontFamily: 'Poppins_700Bold',
    color: COLORS.white,
    marginTop: SPACING.xs,
    textAlign: 'center',
  },
  modalCategory: {
    fontSize: 11,
    fontFamily: 'Poppins_500Medium',
    color: COLORS.white,
    opacity: 0.9,
    marginTop: 2,
  },
  modalBody: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  modalDescription: {
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.text,
    lineHeight: 19,
    marginBottom: SPACING.md,
    textAlign: 'center',
  },
  pricingContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  pricingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    flex: 1,
  },
  pricingTextContainer: {
    flex: 1,
  },
  pricingLabel: {
    fontSize: 10,
    fontFamily: 'Poppins_500Medium',
    color: COLORS.textLight,
    marginBottom: 2,
  },
  pricingValue: {
    fontSize: 14,
    fontFamily: 'Poppins_700Bold',
    color: COLORS.text,
  },
  pricingDivider: {
    width: 1,
    height: 30,
    backgroundColor: COLORS.border,
    marginHorizontal: SPACING.sm,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  modalCloseButton: {
    flex: 1,
    padding: SPACING.sm,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  modalCloseButtonText: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.text,
  },
  modalBookButton: {
    flex: 1,
    borderRadius: 10,
    overflow: 'hidden',
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 5,
  },
  modalBookGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.sm,
    gap: SPACING.xs,
  },
  modalBookButtonText: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.white,
  },
  advertisementCard: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  advertisementGradient: {
    padding: SPACING.xl,
    minHeight: 220,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  advertisementBackgroundLogo: {
    position: 'absolute',
    width: '80%',
    height: '80%',
    opacity: 0.08,
    alignSelf: 'center',
  },
  advertisementContent: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    zIndex: 1,
  },
  advertisementTitle: {
    fontSize: 24,
    fontFamily: 'Poppins_700Bold',
    color: COLORS.white,
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  advertisementDescription: {
    fontSize: 15,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.white,
    textAlign: 'center',
    lineHeight: 22,
    opacity: 0.95,
    paddingHorizontal: SPACING.md,
  },
  indicatorContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: SPACING.md,
    gap: SPACING.xs,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  indicatorActive: {
    backgroundColor: COLORS.white,
    width: 24,
  },
  quickAccessContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  quickAccessCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  quickAccessHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  quickAccessTitle: {
    fontSize: 15,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.text,
  },
  quickAccessSubtitle: {
    fontSize: 11,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.textLight,
    marginBottom: 14,
    lineHeight: 16,
  },
  quickAccessButton: {
    borderRadius: 10,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  quickAccessButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 6,
  },
  quickAccessButtonText: {
    fontSize: 12,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.white,
  },
  
  // New Dashboard Styles
  dashboardContainer: {
    gap: SPACING.md,
  },
  dashboardCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: SPACING.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  dashboardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  dashboardTitle: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.text,
  },
  vitalsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  vitalItem: {
    alignItems: 'center',
  },
  vitalValue: {
    fontSize: 18,
    fontFamily: 'Poppins_700Bold',
    color: COLORS.primary,
  },
  vitalLabel: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.textLight,
    marginTop: 2,
  },
  appointmentText: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.text,
  },
  appointmentService: {
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.textLight,
    marginTop: 2,
  },
});
