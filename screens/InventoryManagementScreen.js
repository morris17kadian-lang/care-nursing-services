import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import TouchableWeb from '../components/TouchableWeb';
import { COLORS, GRADIENTS, SPACING } from '../constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PRODUCTS_STORAGE_KEY = '@care_store_products';

const ICON_OPTIONS = [
  'thermometer',
  'heart-pulse',
  'medical-bag',
  'wheelchair-accessibility',
  'human-cane',
  'hand-wash',
  'pill',
  'bandage',
  'hospital-box',
  'stethoscope',
  'syringe',
  'test-tube',
];

const CATEGORY_OPTIONS = [
  'Medical Supplies',
  'Personal Care',
  'Mobility Aids',
  'Monitoring Devices',
  'First Aid',
  'Medications',
];

export default function InventoryManagementScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [products, setProducts] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [formData, setFormData] = useState({
    name: '',
    category: 'Medical Supplies',
    price: '',
    stock: '',
    description: '',
    image: 'medical-bag',
    imageUri: null,
    imageUris: [], // Multiple images support
    productNumber: '',
  });

  useEffect(() => {
    loadProducts();
    // Clear old sample data on first load (one-time migration)
    clearOldSampleData();
  }, []);

  const clearOldSampleData = async () => {
    try {
      const stored = await AsyncStorage.getItem(PRODUCTS_STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        // Check if it's old sample data (has products with IDs '1', '2', etc.)
        const hasOldSampleData = data.some(p => ['1', '2', '3', '4', '5', '6'].includes(p.id));
        if (hasOldSampleData) {
          // Clear old sample products
          await AsyncStorage.removeItem(PRODUCTS_STORAGE_KEY);
          setProducts([]);
          console.log('Cleared old sample data');
        }
      }
    } catch (error) {
      console.error('Error clearing old data:', error);
    }
  };

  const loadProducts = async () => {
    try {
      const stored = await AsyncStorage.getItem(PRODUCTS_STORAGE_KEY);
      if (stored) {
        setProducts(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading products:', error);
      Alert.alert('Error', 'Failed to load products');
    }
  };

  const saveProducts = async (newProducts) => {
    try {
      await AsyncStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(newProducts));
      setProducts(newProducts);
    } catch (error) {
      console.error('Error saving products:', error);
      Alert.alert('Error', 'Failed to save products');
    }
  };

  const handleAddProduct = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      category: 'Medical Supplies',
      price: '',
      stock: '',
      description: '',
      image: 'medical-bag',
      imageUri: null,
      imageUris: [],
      productNumber: '',
    });
    setModalVisible(true);
  };

  const handleEditProduct = (product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      category: product.category,
      price: product.price.toString(),
      stock: product.stock.toString(),
      description: product.description,
      image: product.image,
      imageUri: product.imageUri || null,
      imageUris: product.imageUris || [],
      productNumber: product.productNumber || '',
    });
    setModalVisible(true);
  };

  const pickImage = async () => {
    // Request permission
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please allow access to your photos to upload a product image.');
      return;
    }

    // Launch image picker with multiple selection enabled
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true, // Enable multiple selection
      selectionLimit: 5, // Limit to 5 images
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      // Get all selected image URIs
      const newImageUris = result.assets.map(asset => asset.uri);
      
      // Combine with existing images (up to 5 total)
      const combinedUris = [...(formData.imageUris || []), ...newImageUris].slice(0, 5);
      
      setFormData({ 
        ...formData, 
        imageUri: combinedUris[0] || null, // Set first image as primary
        imageUris: combinedUris 
      });
    }
  };

  const removeImage = (index) => {
    const newImageUris = formData.imageUris.filter((_, i) => i !== index);
    setFormData({
      ...formData,
      imageUri: newImageUris[0] || null,
      imageUris: newImageUris
    });
  };

  const handleDeleteProduct = (productId) => {
    Alert.alert(
      'Delete Product',
      'Are you sure you want to delete this product? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            const newProducts = products.filter(p => p.id !== productId);
            saveProducts(newProducts);
          }
        }
      ]
    );
  };

  const handleSaveProduct = () => {
    // Validation
    if (!formData.name.trim()) {
      Alert.alert('Validation Error', 'Please enter a product name');
      return;
    }
    if (!formData.price || isNaN(parseFloat(formData.price))) {
      Alert.alert('Validation Error', 'Please enter a valid price');
      return;
    }
    if (!formData.stock || isNaN(parseInt(formData.stock))) {
      Alert.alert('Validation Error', 'Please enter a valid stock quantity');
      return;
    }

    const productData = {
      name: formData.name.trim(),
      category: formData.category,
      price: parseFloat(formData.price),
      stock: parseInt(formData.stock),
      description: formData.description.trim(),
      image: formData.image,
      imageUri: formData.imageUri,
      imageUris: formData.imageUris || [],
      productNumber: formData.productNumber.trim(),
    };

    if (editingProduct) {
      // Update existing product
      const newProducts = products.map(p =>
        p.id === editingProduct.id ? { ...productData, id: p.id } : p
      );
      saveProducts(newProducts);
      Alert.alert('Success', 'Product updated successfully');
    } else {
      // Add new product
      const newProduct = {
        ...productData,
        id: Date.now().toString(),
      };
      saveProducts([...products, newProduct]);
      Alert.alert('Success', 'Product added successfully');
    }

    setModalVisible(false);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={GRADIENTS.header}
        style={[styles.header, { paddingTop: insets.top + 20 }]}
      >
        <View style={styles.headerContent}>
          <TouchableWeb
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="arrow-left" size={24} color={COLORS.white} />
          </TouchableWeb>
          <Text style={styles.headerTitle}>Inventory Management</Text>
          <TouchableWeb
            style={styles.addButton}
            onPress={handleAddProduct}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="plus" size={24} color={COLORS.white} />
          </TouchableWeb>
        </View>
      </LinearGradient>

      {/* Filter Pills */}
      <View style={styles.filterPillContainer}>
        {['all', 'Medical', 'Personal', 'Mobility', 'Low Stock'].map((filter, index) => {
          const fullFilter = index === 0 ? 'all' : 
                           index === 1 ? 'Medical Supplies' :
                           index === 2 ? 'Personal Care' :
                           index === 3 ? 'Mobility Aids' : 'Low Stock';
          return (
            <TouchableWeb
              key={fullFilter}
              style={styles.filterPill}
              onPress={() => setSelectedFilter(fullFilter)}
              activeOpacity={0.7}
            >
              {selectedFilter === fullFilter ? (
                <LinearGradient
                  colors={GRADIENTS.header}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.filterPillGradient}
                >
                  <Text style={styles.filterPillText}>{filter}</Text>
                </LinearGradient>
              ) : (
                <View style={styles.inactiveFilterPill}>
                  <Text style={styles.inactiveFilterPillText}>{filter}</Text>
                </View>
              )}
            </TouchableWeb>
          );
        })}
      </View>

      {/* Products List */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {products.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="package-variant-closed" size={80} color={COLORS.border} />
            <Text style={styles.emptyTitle}>No Products Yet</Text>
            <Text style={styles.emptyText}>Add your first product to get started</Text>
          </View>
        ) : (
          products
            .filter(product => {
              if (selectedFilter === 'all') return true;
              if (selectedFilter === 'Low Stock') return product.stock < 10;
              return product.category === selectedFilter;
            })
            .map((product) => (
            <View key={product.id} style={styles.productCard}>
              <View style={styles.productHeader}>
                <View style={styles.productIconContainer}>
                  <MaterialCommunityIcons
                    name={product.image}
                    size={32}
                    color={COLORS.primary}
                  />
                </View>
                <View style={styles.productInfo}>
                  <Text style={styles.productName}>{product.name}</Text>
                  <Text style={styles.productCategory}>{product.category}</Text>
                </View>
                <View style={styles.productActions}>
                  <TouchableWeb
                    style={styles.actionButton}
                    onPress={() => handleEditProduct(product)}
                    activeOpacity={0.7}
                  >
                    <MaterialCommunityIcons name="pencil" size={20} color={COLORS.primary} />
                  </TouchableWeb>
                  <TouchableWeb
                    style={styles.actionButton}
                    onPress={() => handleDeleteProduct(product.id)}
                    activeOpacity={0.7}
                  >
                    <MaterialCommunityIcons name="delete" size={20} color={COLORS.error} />
                  </TouchableWeb>
                </View>
              </View>
              <View style={styles.productDetails}>
                <View style={styles.detailRow}>
                  <MaterialCommunityIcons name="currency-usd" size={16} color={COLORS.textLight} />
                  <Text style={styles.detailText}>Price: ${product.price.toFixed(2)}</Text>
                </View>
                <View style={styles.detailRow}>
                  <MaterialCommunityIcons name="package-variant" size={16} color={COLORS.textLight} />
                  <Text style={[
                    styles.detailText,
                    product.stock < 10 && { color: COLORS.error }
                  ]}>
                    Stock: {product.stock} {product.stock < 10 && '⚠️'}
                  </Text>
                </View>
              </View>
              {product.description && (
                <Text style={styles.productDescription}>{product.description}</Text>
              )}
            </View>
          ))
        )}
      </ScrollView>

      {/* Product Form Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingProduct ? 'Edit Product' : 'Add Product'}
              </Text>
              <TouchableWeb onPress={() => setModalVisible(false)}>
                <MaterialCommunityIcons name="close" size={24} color={COLORS.text} />
              </TouchableWeb>
            </View>

            <ScrollView style={styles.formContent} showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Product Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter product name"
                value={formData.name}
                onChangeText={(text) => setFormData({ ...formData, name: text })}
              />

              <Text style={styles.inputLabel}>Product Number</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter product number (e.g., PRD-001)"
                value={formData.productNumber}
                onChangeText={(text) => setFormData({ ...formData, productNumber: text })}
              />

              <Text style={styles.inputLabel}>Category *</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.categoryScroll}
              >
                {CATEGORY_OPTIONS.map((cat) => (
                  <TouchableWeb
                    key={cat}
                    style={[
                      styles.categoryChip,
                      formData.category === cat && styles.categoryChipActive
                    ]}
                    onPress={() => setFormData({ ...formData, category: cat })}
                  >
                    <Text
                      style={[
                        styles.categoryChipText,
                        formData.category === cat && styles.categoryChipTextActive
                      ]}
                    >
                      {cat}
                    </Text>
                  </TouchableWeb>
                ))}
              </ScrollView>

              <View style={styles.row}>
                <View style={styles.halfInput}>
                  <Text style={styles.inputLabel}>Price ($) *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="0.00"
                    keyboardType="decimal-pad"
                    value={formData.price}
                    onChangeText={(text) => setFormData({ ...formData, price: text })}
                  />
                </View>
                <View style={styles.halfInput}>
                  <Text style={styles.inputLabel}>Stock *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="0"
                    keyboardType="number-pad"
                    value={formData.stock}
                    onChangeText={(text) => setFormData({ ...formData, stock: text })}
                  />
                </View>
              </View>

              <Text style={styles.inputLabel}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Enter product description"
                multiline
                numberOfLines={3}
                value={formData.description}
                onChangeText={(text) => setFormData({ ...formData, description: text })}
              />

              <Text style={styles.inputLabel}>Product Photos (Up to 5)</Text>
              
              {/* Display selected images */}
              {formData.imageUris && formData.imageUris.length > 0 && (
                <ScrollView horizontal style={styles.imagesContainer} showsHorizontalScrollIndicator={false}>
                  {formData.imageUris.map((uri, index) => (
                    <View key={index} style={styles.imageWrapper}>
                      <Image source={{ uri }} style={styles.uploadedImageThumbnail} />
                      <TouchableWeb
                        style={styles.removeImageButton}
                        onPress={() => removeImage(index)}
                      >
                        <MaterialCommunityIcons name="close-circle" size={24} color={COLORS.error} />
                      </TouchableWeb>
                      {index === 0 && (
                        <View style={styles.primaryBadge}>
                          <Text style={styles.primaryBadgeText}>Primary</Text>
                        </View>
                      )}
                    </View>
                  ))}
                </ScrollView>
              )}

              {/* Upload button */}
              {(!formData.imageUris || formData.imageUris.length < 5) && (
                <TouchableWeb
                  style={styles.photoUploadButton}
                  onPress={pickImage}
                >
                  <MaterialCommunityIcons name="camera-plus" size={32} color={COLORS.primary} />
                  <Text style={styles.photoUploadText}>
                    {formData.imageUris && formData.imageUris.length > 0 
                      ? `Add More Photos (${formData.imageUris.length}/5)` 
                      : 'Upload Photos'}
                  </Text>
                </TouchableWeb>
              )}
              
              <View style={{ height: 20 }} />
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableWeb
                style={styles.cancelButton}
                onPress={() => setModalVisible(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableWeb>
              <TouchableWeb
                style={styles.saveButton}
                onPress={handleSaveProduct}
                activeOpacity={0.7}
              >
                <LinearGradient
                  colors={GRADIENTS.header}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.saveGradient}
                >
                  <Text style={styles.saveButtonText}>
                    {editingProduct ? 'Update Product' : 'Add Product'}
                  </Text>
                </LinearGradient>
              </TouchableWeb>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
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
  filterPillContainer: {
    flexDirection: 'row',
    paddingHorizontal: -1,
    marginTop: 16,
    marginBottom: 20,
  },
  filterPill: {
    flex: 1,
  },
  filterPillGradient: {
    paddingHorizontal: 6,
    paddingVertical: 6,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 32,
  },
  inactiveFilterPill: {
    backgroundColor: COLORS.white,
    paddingHorizontal: 6,
    paddingVertical: 6,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 32,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterPillText: {
    fontSize: 10,
    fontFamily: 'Poppins_700Bold',
    color: COLORS.white,
    textAlign: 'center',
  },
  inactiveFilterPillText: {
    fontSize: 10,
    fontFamily: 'Poppins_700Bold',
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.text,
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.textLight,
    marginTop: 8,
  },
  productCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  productHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  productIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.text,
  },
  productCategory: {
    fontSize: 12,
    fontFamily: 'Poppins_500Medium',
    color: COLORS.textLight,
  },
  productActions: {
    flexDirection: 'row',
    gap: SPACING.xs,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  productDetails: {
    flexDirection: 'row',
    gap: SPACING.lg,
    marginBottom: SPACING.xs,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    fontSize: 13,
    fontFamily: 'Poppins_500Medium',
    color: COLORS.textLight,
  },
  productDescription: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.textLight,
    lineHeight: 16,
    marginTop: SPACING.xs,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    width: '100%',
    maxWidth: 380,
    maxHeight: '85%',
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
    fontWeight: 'bold',
    color: COLORS.text,
  },
  formContent: {
    padding: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.text,
    marginBottom: 8,
    marginTop: SPACING.md,
  },
  input: {
    backgroundColor: COLORS.background,
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  textArea: {
    minHeight: 70,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    marginHorizontal: -4,
  },
  categoryScroll: {
    maxHeight: 50,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: SPACING.sm,
  },
  categoryChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  categoryChipText: {
    fontSize: 12,
    fontFamily: 'Poppins_500Medium',
    color: COLORS.text,
  },
  categoryChipTextActive: {
    color: COLORS.white,
  },
  halfInput: {
    flex: 1,
    marginHorizontal: 4,
  },
  photoUploadButton: {
    backgroundColor: COLORS.background,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  uploadedImage: {
    width: 120,
    height: 120,
    borderRadius: 12,
    marginBottom: 8,
  },
  photoUploadText: {
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
    color: COLORS.textLight,
    marginTop: 8,
  },
  imagesContainer: {
    marginBottom: 12,
  },
  imageWrapper: {
    position: 'relative',
    marginRight: 12,
  },
  uploadedImageThumbnail: {
    width: 100,
    height: 100,
    borderRadius: 12,
    backgroundColor: COLORS.background,
  },
  removeImageButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: COLORS.white,
    borderRadius: 12,
  },
  primaryBadge: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  primaryBadgeText: {
    fontSize: 10,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.white,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 12,
    backgroundColor: COLORS.white,
  },
  cancelButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cancelButtonText: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.textLight,
  },
  saveButton: {
    flex: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  saveGradient: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.white,
  },
});
