import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  Image,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, GRADIENTS } from '../constants';
import { useServices } from '../context/ServicesContext';

const PriceListScreen = ({ navigation }) => {
  const handleClearPriceData = async () => {
    Alert.alert(
      'Clear Service Prices',
      'This will clear all prices but keep the service types. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear Prices',
          style: 'destructive',
          onPress: async () => {
            try {
              // Get current services
              const storedServices = await AsyncStorage.getItem('customServices');
              let currentServices = storedServices ? JSON.parse(storedServices) : [];
              
              // If no custom services, get from SERVICES constant
              if (currentServices.length === 0) {
                const { SERVICES } = require('../constants');
                currentServices = SERVICES;
              }
              
              // Clear prices but keep service structure
              const servicesWithoutPrices = currentServices.map(service => ({
                ...service,
                price: '',
              }));
              
              await AsyncStorage.setItem('customServices', JSON.stringify(servicesWithoutPrices));
              Alert.alert('Success', '✅ Service prices cleared!');
              // Refresh the screen
              navigation.reset({
                index: 0,
                routes: [{ name: 'PriceList' }],
              });
            } catch (error) {
              Alert.alert('Error', 'Failed to clear prices');
            }
          }
        }
      ]
    );
  };
  const { services, addService, updateService, deleteService: removeService } = useServices();
  const insets = useSafeAreaInsets();
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedService, setSelectedService] = useState(null);
  const [editedService, setEditedService] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Get unique categories from services
  const categories = ['all', ...new Set(services.map(s => s.category))];

  // Filter services based on search term and category
  const filteredServices = services.filter(service => {
    const matchesSearch = service.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      service.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || service.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Group services by category
  const groupedServices = filteredServices.reduce((groups, service) => {
    const category = service.category;
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(service);
    return groups;
  }, {});

  const openEditModal = (service) => {
    setSelectedService(service);
    setEditedService({ ...service });
    setIsAddingNew(false);
    setEditModalVisible(true);
  };

  const saveEditedService = async () => {
    if (!editedService.title || !editedService.price || !editedService.duration) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      console.log('💾 Saving service:', { 
        isAddingNew, 
        serviceId: selectedService.id,
        editedService 
      });
      
      if (isAddingNew) {
        // Add new service
        await addService(editedService);
        Alert.alert('Success', 'New service added successfully');
      } else {
        // Update existing service
        await updateService(selectedService.id, editedService);
        console.log('✅ Service updated successfully');
        Alert.alert('Success', 'Service updated successfully');
      }
      
      setEditModalVisible(false);
    } catch (error) {
      console.error('❌ Failed to save service:', error);
      Alert.alert('Error', 'Failed to save service. Please try again.');
    }
  };

  const deleteService = () => {
    Alert.alert(
      'Delete Service',
      'Are you sure you want to delete this service?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeService(selectedService.id);
              setEditModalVisible(false);
              Alert.alert('Success', 'Service deleted successfully');
            } catch (error) {
              Alert.alert('Error', 'Failed to delete service. Please try again.');
            }
          }
        }
      ]
    );
  };

  const addNewService = () => {
    const newService = {
      id: String(Date.now()),
      title: '',
      description: '',
      icon: 'medical-bag',
      category: 'Clinical',
      price: '',
      duration: ''
    };
    setSelectedService(newService);
    setEditedService({ ...newService });
    setIsAddingNew(true);
    setEditModalVisible(true);
  };

  const renderServiceCard = (service) => (
    <TouchableOpacity
      key={service.id}
      style={styles.serviceCard}
      onPress={() => openEditModal(service)}
    >
      <View style={styles.serviceHeader}>
        <View style={styles.serviceInfo}>
          <Text style={styles.serviceTitle}>{service.title}</Text>
          <Text style={styles.serviceDescription} numberOfLines={2}>
            {service.description}
          </Text>
        </View>
        <View style={styles.priceContainer}>
          {service.price ? (
            <>
              <View style={styles.priceRow}>
                <Text style={styles.price}>{service.price}</Text>
                <MaterialCommunityIcons
                  name="pencil"
                  size={16}
                  color={COLORS.textMuted}
                  style={styles.editIcon}
                />
              </View>
              {service.duration ? (
                <Text style={styles.duration}>{service.duration}</Text>
              ) : null}
            </>
          ) : (
            <View style={styles.priceRow}>
              <Text style={[styles.price, { color: COLORS.textMuted }]}>Set Price</Text>
              <MaterialCommunityIcons
                name="pencil"
                size={16}
                color={COLORS.textMuted}
                style={styles.editIcon}
              />
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderCategorySection = (category, categoryServices) => (
    <View key={category} style={styles.categorySection}>
      <Text style={styles.categoryTitle}>{category}</Text>
      {categoryServices.map(service => renderServiceCard(service))}
    </View>
  );

  return (
    <View style={styles.container}>
      <LinearGradient 
        colors={GRADIENTS.header} 
        style={[styles.header, { paddingTop: insets.top + 20 }]}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <MaterialCommunityIcons name="arrow-left" size={24} color={COLORS.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Service Price List</Text>
          <TouchableOpacity
            onPress={addNewService}
            style={styles.backButton}
          >
            <MaterialCommunityIcons name="plus" size={24} color={COLORS.white} />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <View style={styles.searchContainer}>
        <MaterialCommunityIcons name="magnify" size={20} color={COLORS.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search services..."
          value={searchTerm}
          onChangeText={setSearchTerm}
          placeholderTextColor={COLORS.textMuted}
        />
      </View>

      {/* Filter Pills */}
      <View style={styles.filterPillContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterPillContent}
        >
          {categories.map((category) => (
            <TouchableOpacity
              key={category}
              style={styles.filterPill}
              onPress={() => setSelectedCategory(category)}
            >
              {selectedCategory === category ? (
                <LinearGradient
                  colors={GRADIENTS.header}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                  style={styles.filterPillGradient}
                >
                  <Text style={styles.filterPillText}>
                    {category === 'all' ? 'All Services' : category}
                  </Text>
                </LinearGradient>
              ) : (
                <View style={styles.inactiveFilterPill}>
                  <Text style={styles.inactiveFilterPillText}>
                    {category === 'all' ? 'All Services' : category}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Watermark Logo */}
      <Image
        source={require('../assets/Images/Nurses-logo.png')}
        style={styles.watermarkLogo}
        resizeMode="contain"
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {Object.entries(groupedServices).map(([category, categoryServices]) =>
          renderCategorySection(category, categoryServices)
        )}
      </ScrollView>

      {/* Edit Service Modal */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {isAddingNew ? 'Add New Service' : 'Edit Service'}
              </Text>
              <TouchableOpacity
                onPress={() => setEditModalVisible(false)}
                style={styles.modalCloseButton}
              >
                <MaterialCommunityIcons name="close" size={24} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Service Name *</Text>
                <TextInput
                  style={styles.textInput}
                  value={editedService.title}
                  onChangeText={(text) => setEditedService({ ...editedService, title: text })}
                  placeholder="Enter service name"
                  placeholderTextColor={COLORS.textMuted}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Description</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  value={editedService.description}
                  onChangeText={(text) => setEditedService({ ...editedService, description: text })}
                  placeholder="Enter service description"
                  placeholderTextColor={COLORS.textMuted}
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Price *</Text>
                <TextInput
                  style={styles.textInput}
                  value={editedService.price}
                  onChangeText={(text) => setEditedService({ ...editedService, price: text })}
                  placeholder="e.g., J$7,500 or J$15,000/hr"
                  placeholderTextColor={COLORS.textMuted}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Duration *</Text>
                <TextInput
                  style={styles.textInput}
                  value={editedService.duration}
                  onChangeText={(text) => setEditedService({ ...editedService, duration: text })}
                  placeholder="e.g., 30 mins or Hourly"
                  placeholderTextColor={COLORS.textMuted}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Category</Text>
                <TextInput
                  style={styles.textInput}
                  value={editedService.category}
                  onChangeText={(text) => setEditedService({ ...editedService, category: text })}
                  placeholder="e.g., Clinical, Therapy, Home Care"
                  placeholderTextColor={COLORS.textMuted}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Icon Name</Text>
                <TextInput
                  style={styles.textInput}
                  value={editedService.icon}
                  onChangeText={(text) => setEditedService({ ...editedService, icon: text })}
                  placeholder="e.g., medical-bag, heart-pulse"
                  placeholderTextColor={COLORS.textMuted}
                />
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              {!isAddingNew && (
                <TouchableOpacity
                  style={[styles.modalButton, styles.deleteButton]}
                  onPress={deleteService}
                >
                  <MaterialCommunityIcons name="delete" size={20} color={COLORS.white} />
                  <Text style={styles.deleteButtonText}>Delete</Text>
                </TouchableOpacity>
              )}
              
              <TouchableOpacity
                style={[styles.modalButton, styles.modalPrimaryButton, isAddingNew && styles.fullWidthButton]}
                onPress={saveEditedService}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={GRADIENTS.header}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                  style={styles.modalPrimaryGradient}
                >
                  <MaterialCommunityIcons
                    name={isAddingNew ? 'plus' : 'check'}
                    size={20}
                    color={COLORS.white}
                  />
                  <Text style={styles.modalPrimaryText}>
                    {isAddingNew ? 'Add Service' : 'Save Changes'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

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
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.white,
    flex: 1,
    textAlign: 'center',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 20,
    paddingHorizontal: 15,
    paddingVertical: 12,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    color: COLORS.text,
  },
  filterPillContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  filterPillContent: {
    gap: 8,
    paddingRight: 20,
  },
  filterPill: {
    marginRight: 0,
    borderRadius: 20,
    overflow: 'hidden',
    minHeight: 36,
  },
  filterPillGradient: {
    flex: 1,
    width: '100%',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  inactiveFilterPill: {
    backgroundColor: COLORS.white,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 36,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  filterPillText: {
    fontSize: 11,
    fontFamily: 'Poppins_700Bold',
    color: COLORS.white,
    textAlign: 'center',
  },
  inactiveFilterPillText: {
    fontSize: 11,
    fontFamily: 'Poppins_700Bold',
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 5,
    borderTopWidth: 0,
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
  categorySection: {
    marginBottom: 30,
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 15,
    paddingBottom: 5,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primary,
  },
  serviceCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  serviceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },
  serviceInfo: {
    flex: 1,
    marginRight: 15,
  },
  serviceTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  serviceDescription: {
    fontSize: 14,
    color: COLORS.textMuted,
    lineHeight: 20,
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  price: {
    fontSize: 16,
    fontWeight: 'bold',
    color: GRADIENTS.header?.[0] || COLORS.primary,
    marginRight: 6,
  },
  duration: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  editIcon: {
    marginLeft: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: COLORS.white,
    borderRadius: 16,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    backgroundColor: COLORS.background,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.primary,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  modalCloseButton: {
    padding: 4,
  },
  modalBody: {
    padding: 20,
    maxHeight: 400,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: COLORS.text,
    backgroundColor: COLORS.white,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: COLORS.primary,
  },
  modalButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    marginHorizontal: 5,
  },
  deleteButton: {
    backgroundColor: COLORS.error,
  },
  modalPrimaryButton: {
    overflow: 'hidden',
    paddingVertical: 0,
  },
  modalPrimaryGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  fullWidthButton: {
    flex: 2,
  },
  deleteButtonText: {
    color: COLORS.white,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  modalPrimaryText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.white,
    marginLeft: 8,
  },
});

export default PriceListScreen;