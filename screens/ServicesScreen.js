import TouchableWeb from "../components/TouchableWeb";
import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,

  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ServiceCard, SectionHeader } from '../components/Cards';
import { COLORS, GRADIENTS, SPACING, SERVICES } from '../constants';

export default function ServicesScreen() {
  const [selectedService, setSelectedService] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  const handleServicePress = (service) => {
    setSelectedService(service);
    setModalVisible(true);
  };

  const categories = [...new Set(SERVICES.map(s => s.category))];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient
        colors={GRADIENTS.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>We Specialize In</Text>
        <Text style={styles.headerSubtitle}>
          Professional nursing and healthcare services tailored to your needs
        </Text>
      </LinearGradient>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {categories.map((category) => (
          <View key={category} style={styles.categorySection}>
            <SectionHeader title={category} />
            <View style={styles.servicesGrid}>
              {SERVICES.filter(s => s.category === category).map((service) => (
                <ServiceCard
                  key={service.id}
                  service={service}
                  onPress={() => handleServicePress(service)}
                />
              ))}
            </View>
          </View>
        ))}

        {/* Call to Action */}
        <View style={styles.ctaContainer}>
          <LinearGradient
            colors={[COLORS.accent, COLORS.accentLight]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.ctaGradient}
          >
            <MaterialCommunityIcons name="calendar-heart" size={48} color={COLORS.white} />
            <Text style={styles.ctaTitle}>Ready to Get Started?</Text>
            <Text style={styles.ctaText}>
              Book an appointment and let our professional team take care of you
            </Text>
            <TouchableWeb style={styles.ctaButton} activeOpacity={0.8}>
              <Text style={styles.ctaButtonText}>Book Appointment</Text>
            </TouchableWeb>
          </LinearGradient>
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
                  colors={GRADIENTS.primary}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.modalHeader}
                >
                  <MaterialCommunityIcons
                    name={selectedService.icon}
                    size={48}
                    color={COLORS.white}
                  />
                  <Text style={styles.modalTitle}>{selectedService.title}</Text>
                  <TouchableWeb
                    style={styles.closeButton}
                    onPress={() => setModalVisible(false)}
                  >
                    <MaterialCommunityIcons name="close" size={24} color={COLORS.white} />
                  </TouchableWeb>
                </LinearGradient>

                <View style={styles.modalBody}>
                  <View style={styles.modalBadge}>
                    <Text style={styles.modalBadgeText}>{selectedService.category}</Text>
                  </View>

                  <Text style={styles.modalDescription}>{selectedService.description}</Text>

                  <View style={styles.detailsList}>
                    <View style={styles.detailItem}>
                      <MaterialCommunityIcons name="check-circle" size={20} color={COLORS.success} />
                      <Text style={styles.detailText}>Licensed professionals</Text>
                    </View>
                    <View style={styles.detailItem}>
                      <MaterialCommunityIcons name="check-circle" size={20} color={COLORS.success} />
                      <Text style={styles.detailText}>Safe and sterile procedures</Text>
                    </View>
                    <View style={styles.detailItem}>
                      <MaterialCommunityIcons name="check-circle" size={20} color={COLORS.success} />
                      <Text style={styles.detailText}>Home or hospital visits available</Text>
                    </View>
                    <View style={styles.detailItem}>
                      <MaterialCommunityIcons name="check-circle" size={20} color={COLORS.success} />
                      <Text style={styles.detailText}>Compassionate care</Text>
                    </View>
                  </View>

                  <TouchableWeb
                    style={styles.bookButton}
                    onPress={() => {
                      setModalVisible(false);
                      // Navigate to booking screen
                    }}
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={[COLORS.accent, COLORS.accentLight]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.bookButtonGradient}
                    >
                      <Text style={styles.bookButtonText}>Book This Service</Text>
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
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.xl,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTitle: {
    fontSize: 32,
    fontFamily: 'Poppins_700Bold',
    color: COLORS.white,
    marginBottom: SPACING.sm,
  },
  headerSubtitle: {
    fontSize: 16,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.white,
    opacity: 0.9,
    lineHeight: 24,
  },
  scrollContent: {
    padding: SPACING.lg,
  },
  categorySection: {
    marginBottom: SPACING.xl,
  },
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  ctaContainer: {
    marginTop: SPACING.lg,
    marginBottom: SPACING.xl,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  ctaGradient: {
    padding: SPACING.xl,
    alignItems: 'center',
  },
  ctaTitle: {
    fontSize: 24,
    fontFamily: 'Poppins_700Bold',
    color: COLORS.white,
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
  },
  ctaText: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.white,
    textAlign: 'center',
    opacity: 0.9,
    marginBottom: SPACING.lg,
  },
  ctaButton: {
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: 999,
  },
  ctaButtonText: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.accent,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    maxHeight: '80%',
    shadowColor: COLORS.text,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
  },
  modalHeader: {
    padding: SPACING.xl,
    alignItems: 'center',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
  },
  modalTitle: {
    fontSize: 24,
    fontFamily: 'Poppins_700Bold',
    color: COLORS.white,
    marginTop: SPACING.md,
    textAlign: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: SPACING.md,
    right: SPACING.md,
    padding: SPACING.sm,
  },
  modalBody: {
    padding: SPACING.xl,
  },
  modalBadge: {
    alignSelf: 'flex-start',
    backgroundColor: `${COLORS.accent}20`,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 16,
    marginBottom: SPACING.lg,
  },
  modalBadgeText: {
    fontSize: 12,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.accent,
  },
  modalDescription: {
    fontSize: 16,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.text,
    lineHeight: 24,
    marginBottom: SPACING.lg,
  },
  detailsList: {
    gap: SPACING.md,
    marginBottom: SPACING.xl,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  detailText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
    color: COLORS.textLight,
  },
  bookButton: {
    borderRadius: 999,
    overflow: 'hidden',
  },
  bookButtonGradient: {
    paddingVertical: SPACING.md,
    alignItems: 'center',
  },
  bookButtonText: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.white,
  },
});
