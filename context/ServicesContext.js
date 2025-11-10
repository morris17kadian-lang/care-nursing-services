import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SERVICES } from '../constants';

const ServicesContext = createContext();

export const useServices = () => {
  const context = useContext(ServicesContext);
  if (!context) {
    throw new Error('useServices must be used within a ServicesProvider');
  }
  return context;
};

export const ServicesProvider = ({ children }) => {
  const [services, setServices] = useState(SERVICES);
  const [loading, setLoading] = useState(true);

  // Load services from AsyncStorage on app start
  useEffect(() => {
    loadServices();
  }, []);

  const loadServices = async () => {
    try {
      const storedServices = await AsyncStorage.getItem('customServices');
      if (storedServices) {
        const parsedServices = JSON.parse(storedServices);
        setServices(parsedServices);
      }
    } catch (error) {
      console.error('Error loading services:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveServices = async (newServices) => {
    try {
      await AsyncStorage.setItem('customServices', JSON.stringify(newServices));
      setServices(newServices);
    } catch (error) {
      console.error('Error saving services:', error);
    }
  };

  const addService = async (newService) => {
    const updatedServices = [...services, { ...newService, id: String(Date.now()) }];
    await saveServices(updatedServices);
  };

  const updateService = async (serviceId, updatedService) => {
    const updatedServices = services.map(service =>
      service.id === serviceId ? { ...updatedService } : service
    );
    await saveServices(updatedServices);
  };

  const deleteService = async (serviceId) => {
    const updatedServices = services.filter(service => service.id !== serviceId);
    await saveServices(updatedServices);
  };

  const resetToDefault = async () => {
    await AsyncStorage.removeItem('customServices');
    setServices(SERVICES);
  };

  const value = {
    services,
    loading,
    addService,
    updateService,
    deleteService,
    resetToDefault,
    saveServices,
  };

  return (
    <ServicesContext.Provider value={value}>
      {children}
    </ServicesContext.Provider>
  );
};