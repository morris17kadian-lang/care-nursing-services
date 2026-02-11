import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../constants';
import { searchBanks, searchBranches } from '../constants/GlobalBanks';
import TouchableWeb from './TouchableWeb';

const BankAutocomplete = ({ 
  label, 
  icon, 
  value, 
  onSelect, 
  placeholder, 
  isBranch = false, 
  selectedBank = '' 
}) => {
  const [searchQuery, setSearchQuery] = useState(value || '');
  const [showDropdown, setShowDropdown] = useState(false);

  const getData = () => {
    try {
      if (isBranch && selectedBank) {
        // Find the bank by name to get its ID
        const banks = searchBanks(selectedBank);
        if (banks && banks.length > 0) {
          const bankId = banks[0].id;
          const branches = searchBranches(bankId, searchQuery);
          // Convert branch strings to objects for consistent handling
          return Array.isArray(branches) ? branches.map(branch => ({
            branchName: branch,
            name: branch,
            address: `${branch} Branch`
          })) : [];
        }
        return [];
      } else if (!isBranch) {
        const banks = searchBanks(searchQuery);
        // Ensure banks have consistent property names
        return Array.isArray(banks) ? banks.map(bank => ({
          ...bank,
          bankName: bank.name
        })) : [];
      }
      return [];
    } catch (error) {
      console.error('Error getting bank data:', error);
      return [];
    }
  };

  const handleSelect = (item) => {
    try {
      const selectedValue = isBranch ? (item.branchName || item.name || item) : (item.bankName || item.name || item);
      setSearchQuery(selectedValue);
      onSelect(selectedValue);
      setShowDropdown(false);
    } catch (error) {
      console.error('Error selecting item:', error);
    }
  };

  const filteredData = getData() || [];

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      
      <View style={styles.inputContainer}>
        <MaterialCommunityIcons name={icon} size={20} color={COLORS.textLight} />
        <TextInput
          style={styles.input}
          value={searchQuery}
          onChangeText={(text) => {
            setSearchQuery(text);
            if (text.length > 0) {
              setShowDropdown(true);
            } else {
              setShowDropdown(false);
              onSelect('');
            }
          }}
          placeholder={placeholder}
          placeholderTextColor={COLORS.textLight}
          onFocus={() => {
            if (searchQuery.length > 0) {
              setShowDropdown(true);
            }
          }}
        />
        {searchQuery.length > 0 && (
          <TouchableWeb
            onPress={() => {
              setSearchQuery('');
              onSelect('');
              setShowDropdown(false);
            }}
            style={styles.clearButton}
          >
            <MaterialCommunityIcons name="close" size={16} color={COLORS.textLight} />
          </TouchableWeb>
        )}
      </View>

      {showDropdown && filteredData.length > 0 && (
        <View style={styles.dropdown}>
          <ScrollView 
            style={styles.dropdownScroll}
            nestedScrollEnabled
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            {filteredData.slice(0, 8).map((item, index) => {
              const displayName = isBranch 
                ? (item.branchName || item.name || item) 
                : (item.bankName || item.name || item);
              const subtitle = isBranch 
                ? (item.address || item.location) 
                : (item.country || item.location);
              
              return (
                <TouchableOpacity
                  key={`${displayName}-${index}`}
                  style={styles.dropdownItem}
                  onPress={() => handleSelect(item)}
                  activeOpacity={0.7}
                >
                  <View style={styles.itemContent}>
                    <Text style={styles.itemTitle} numberOfLines={2}>
                      {displayName}
                    </Text>
                    {subtitle && (
                      <Text style={styles.itemSubtitle} numberOfLines={1}>
                        {subtitle}
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 15,
    position: 'relative',
    zIndex: 1,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
    minHeight: 50,
  },
  input: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    color: COLORS.text,
    paddingVertical: 8,
  },
  clearButton: {
    padding: 5,
    marginLeft: 5,
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    maxHeight: 200,
    marginTop: 5,
    zIndex: 1000,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 5,
  },
  dropdownScroll: {
    flex: 1,
  },
  dropdownItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    minHeight: 50,
  },
  itemContent: {
    flex: 1,
    justifyContent: 'center',
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.text,
    marginBottom: 2,
    flexWrap: 'wrap',
  },
  itemSubtitle: {
    fontSize: 13,
    color: COLORS.textLight,
  },
});

export default BankAutocomplete;