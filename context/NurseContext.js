import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const NurseContext = createContext();

export const useNurses = () => {
  const context = useContext(NurseContext);
  if (!context) {
    throw new Error('useNurses must be used within a NurseProvider');
  }
  return context;
};

export const NurseProvider = ({ children }) => {
  const [nurses, setNurses] = useState([
    {
      id: '1',
      name: 'Sarah Johnson, RN',
      email: 'sarah.j@care.com',
      phone: '876-555-0101',
      specialization: 'Home Care',
      assignedClients: 0,
      status: 'available',
      isActive: true,
      code: 'NURSE001',
      dateAdded: 'Oct 15, 2025'
    }
  ]);

  // Load nurses data from AsyncStorage on mount
  useEffect(() => {
    loadNursesData();
  }, []);

  // Save initial data if no stored data exists
  useEffect(() => {
    const checkAndSaveInitialData = async () => {
      try {
        const storedNurses = await AsyncStorage.getItem('@care_nurse_context');
        if (!storedNurses) {
          saveNursesData(nurses);
        }
      } catch (error) {
        console.error('Error checking initial data:', error);
      }
    };
    checkAndSaveInitialData();
  }, []);

  const loadNursesData = async () => {
    try {
      const storedNurses = await AsyncStorage.getItem('@care_nurse_context');
      if (storedNurses) {
        const parsedNurses = JSON.parse(storedNurses);
        setNurses(parsedNurses);
      }
    } catch (error) {
      console.error('Error loading nurses data:', error);
    }
  };

  const saveNursesData = async (nursesData) => {
    try {
      await AsyncStorage.setItem('@care_nurse_context', JSON.stringify(nursesData));
    } catch (error) {
      console.error('Error saving nurses data:', error);
    }
  };

  const addNurse = (newNurse) => {
    const nurse = {
      id: (nurses.length + 1).toString(),
      name: newNurse.name,
      email: newNurse.email,
      phone: newNurse.phone,
      specialization: newNurse.specialization,
      code: newNurse.nurseCode || newNurse.code,
      emergencyContact: newNurse.emergencyContact,
      emergencyPhone: newNurse.emergencyPhone,
      status: 'available',
      assignedClients: 0,
      isActive: true,
      dateAdded: new Date().toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      })
    };
    const updatedNurses = [...nurses, nurse];
    setNurses(updatedNurses);
    saveNursesData(updatedNurses);
    return { success: true };
  };

  const updateNurseStatus = (nurseId, newStatus) => {
    const updatedNurses = nurses.map(nurse => 
      nurse.id === nurseId 
        ? { ...nurse, status: newStatus }
        : nurse
    );
    setNurses(updatedNurses);
    saveNursesData(updatedNurses);
  };

  const updateNurseActiveStatus = (nurseId, isActive) => {
    const updatedNurses = nurses.map(nurse => 
      nurse.id === nurseId 
        ? { ...nurse, isActive: isActive }
        : nurse
    );
    setNurses(updatedNurses);
    saveNursesData(updatedNurses);
  };

  const deleteNurse = (nurseId) => {
    const updatedNurses = nurses.filter(nurse => nurse.id !== nurseId);
    setNurses(updatedNurses);
    saveNursesData(updatedNurses);
  };

  const getAvailableNurses = () => {
    const available = nurses.filter(nurse => nurse.status === 'available' && nurse.isActive === true);
    return available;
  };

  const getNursesByStatus = (status) => {
    if (status === 'offline') {
      return nurses.filter(nurse => nurse.isActive === false);
    }
    return nurses.filter(nurse => nurse.status === status && nurse.isActive === true);
  };

  const incrementAssignedClients = (nurseId) => {
    const updatedNurses = nurses.map(nurse => 
      nurse.id === nurseId 
        ? { ...nurse, assignedClients: (nurse.assignedClients || 0) + 1 }
        : nurse
    );
    setNurses(updatedNurses);
    saveNursesData(updatedNurses);
  };

  const value = {
    nurses,
    addNurse,
    updateNurseStatus,
    updateNurseActiveStatus,
    deleteNurse,
    getAvailableNurses,
    getNursesByStatus,
    incrementAssignedClients
  };

  return (
    <NurseContext.Provider value={value}>
      {children}
    </NurseContext.Provider>
  );
};