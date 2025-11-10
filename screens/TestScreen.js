import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useAppointments } from '../context/AppointmentContext';

export default function TestScreen() {
  const { clearAllAppointments } = useAppointments();

  const handleClearAppointments = () => {
    Alert.alert(
      'Clear All Appointments',
      'Are you sure you want to delete ALL appointments? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Clear All', 
          style: 'destructive',
          onPress: async () => {
            await clearAllAppointments();
            Alert.alert('Success', 'All appointments have been cleared');
          }
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Test Screen - App is working!</Text>
      
      <TouchableOpacity style={styles.clearButton} onPress={handleClearAppointments}>
        <Text style={styles.clearButtonText}>🗑️ Clear All Appointments</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  text: {
    fontSize: 18,
    color: '#333',
    marginBottom: 30,
  },
  clearButton: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 10,
  },
  clearButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});