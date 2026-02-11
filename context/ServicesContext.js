import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SERVICES, SERVICES_CATALOG_VERSION } from '../constants';
import ApiService from '../services/ApiService';
import { useAuth } from './AuthContext';

const STORAGE_KEYS = {
  customServices: 'customServices',
  servicesCatalogVersion: 'servicesCatalogVersion',
};

const LEGACY_DEFAULT_SERVICE_TITLES = new Set([
  'Dressings',
  'Medication Administration',
  'NG Tubes',
  'Urinary Catheter',
  'IV Access',
  'Tracheostomy Care',
  'Physiotherapy',
  'Home Nursing',
  'Hospital Sitter',
  'Blood Draws',
  'Vital Signs',
  'Wound Care',
  'Injection Services',
  'Health Assessments',
  'Elderly Care',
  'Post-Surgery Care',
  'Diabetic Care',
  'Palliative Care',
  'Home Care Assistance',
  'Home Care',
  'Alternative Post-Op Care',
  'Alternative Post Op Care',
]);

const normalizeTitle = (title) => String(title || '').trim().toLowerCase();

const getServiceKey = (service) => {
  if (!service) return null;
  if (service.id !== undefined && service.id !== null && service.id !== '') {
    return `id:${String(service.id)}`;
  }
  if (service.title) {
    return `title:${normalizeTitle(service.title)}`;
  }
  return null;
};

const mergeWithDefaults = (remoteServices = []) => {
  const baseServices = Array.isArray(SERVICES) ? [...SERVICES] : [];
  const remoteMap = new Map();

  remoteServices.forEach((service) => {
    const key = getServiceKey(service);
    if (key) {
      remoteMap.set(key, service);
    }
  });

  const merged = baseServices.map((def) => {
    const key = getServiceKey(def);
    if (key && remoteMap.has(key)) {
      const remote = remoteMap.get(key);
      remoteMap.delete(key);
      return { ...def, ...remote };
    }
    return def;
  });

  for (const [, service] of remoteMap) {
    merged.push(service);
  }

  return merged;
};

const ENABLE_SERVICE_DEBUG_LOGS = false;
const logServiceInfo = (...args) => {
  if (ENABLE_SERVICE_DEBUG_LOGS) {
    console.log(...args);
  }
};
const logServiceWarn = (...args) => {
  if (ENABLE_SERVICE_DEBUG_LOGS) {
    console.warn(...args);
  }
};

const ServicesContext = createContext();

export const useServices = () => {
  const context = useContext(ServicesContext);
  if (!context) {
    throw new Error('useServices must be used within a ServicesProvider');
  }
  return context;
};

export const ServicesProvider = ({ children }) => {
  const { user, loading: authLoading } = useAuth();
  const [services, setServices] = useState(SERVICES);
  const [loading, setLoading] = useState(true);

  const saveToLocal = useCallback(async (newServices, { skipLog } = {}) => {
    try {
      if (!skipLog) {
        console.log('💾 Saving services to AsyncStorage cache:', newServices.length, 'services');
      }
      await AsyncStorage.setItem(STORAGE_KEYS.customServices, JSON.stringify(newServices));
      await AsyncStorage.setItem(STORAGE_KEYS.servicesCatalogVersion, SERVICES_CATALOG_VERSION);
      setServices(newServices);
      if (!skipLog) {
        console.log('✅ Services cached locally');
      }
    } catch (error) {
      console.error('❌ Error saving services locally:', error);
    }
  }, []);

  const migrateServicesIfNeeded = useCallback(async (storedServicesRaw) => {
    const storedVersion = await AsyncStorage.getItem(STORAGE_KEYS.servicesCatalogVersion);
    if (storedVersion === SERVICES_CATALOG_VERSION) {
      return null;
    }

    let storedServices = [];
    try {
      storedServices = storedServicesRaw ? JSON.parse(storedServicesRaw) : [];
      if (!Array.isArray(storedServices)) storedServices = [];
    } catch {
      storedServices = [];
    }

    const newDefaults = Array.isArray(SERVICES) ? SERVICES : [];
    const newDefaultTitles = new Set(newDefaults.map((s) => normalizeTitle(s.title)));

    // Keep any user-added services (not from the legacy default list).
    const customServices = storedServices.filter((s) => {
      const title = String(s?.title || '');
      return title && !LEGACY_DEFAULT_SERVICE_TITLES.has(title);
    });

    // Build the migrated list:
    // 1) Start with new defaults
    // 2) Preserve price/duration from stored services when titles match
    // 3) Append any user-added custom services
    const migrated = newDefaults.map((def) => {
      const match = storedServices.find(
        (s) => normalizeTitle(s?.title) === normalizeTitle(def.title)
      );
      const preservedPrice = match?.price;
      const preservedDuration = match?.duration;
      const preservedId = match?.id;

      return {
        ...def,
        id: preservedId ?? def.id,
        price: preservedPrice ?? def.price,
        duration: preservedDuration ?? def.duration,
      };
    });

    // Avoid duplicating: only append custom services whose title is not already
    // present in the migrated defaults.
    for (const s of customServices) {
      const titleKey = normalizeTitle(s?.title);
      if (!titleKey || newDefaultTitles.has(titleKey)) continue;
      migrated.push(s);
    }

    await AsyncStorage.setItem(STORAGE_KEYS.customServices, JSON.stringify(migrated));
    await AsyncStorage.setItem(STORAGE_KEYS.servicesCatalogVersion, SERVICES_CATALOG_VERSION);
    return migrated;
  }, []);

  const loadServicesFromStorage = useCallback(async () => {
    try {
      const storedServices = await AsyncStorage.getItem(STORAGE_KEYS.customServices);
      const migrated = await migrateServicesIfNeeded(storedServices);

      let localData = [];
      if (migrated) {
        localData = migrated;
      } else if (storedServices) {
        localData = JSON.parse(storedServices);
      } else {
        localData = SERVICES;
        await AsyncStorage.setItem(
          STORAGE_KEYS.servicesCatalogVersion,
          SERVICES_CATALOG_VERSION
        );
      }
      setServices(localData);
    } catch (error) {
      console.error('Error loading services from storage:', error);
    }
  }, [migrateServicesIfNeeded]);

  const refreshServices = useCallback(
    async ({ skipCacheLog = false } = {}) => {
      try {
        const remoteServices = await ApiService.getServices();
        if (remoteServices && remoteServices.length > 0) {
          const merged = mergeWithDefaults(remoteServices);
          await saveToLocal(merged, { skipLog: skipCacheLog });
          logServiceInfo('✅ Services synced from Firestore:', merged.length);
          return merged;
        }
      } catch (error) {
        logServiceWarn('⚠️ Failed to fetch services from Firestore:', error?.message || error);
      }
      return null;
    },
    [saveToLocal]
  );

  // Warm-load cached services for instant UI
  useEffect(() => {
    const bootstrap = async () => {
      await loadServicesFromStorage();
      setLoading(false);
    };

    bootstrap();
  }, [loadServicesFromStorage]);

  // Sync with Firestore once the user is authenticated
  useEffect(() => {
    if (authLoading) {
      return;
    }
    if (!user) {
      logServiceInfo('ℹ️ Services sync paused until user authenticates');
      return;
    }

    let unsubscribe = null;
    let pollTimer = null;

    const attachSubscription = () => {
      try {
        unsubscribe = ApiService.subscribeToServices(async (remoteServices) => {
          if (!remoteServices || remoteServices.length === 0) return;
          const merged = mergeWithDefaults(remoteServices);
          await saveToLocal(merged, { skipLog: true });
          logServiceInfo('🔄 Services updated from Firestore snapshot:', merged.length);
        });

        if (!unsubscribe) {
          throw new Error('Firestore subscription unavailable');
        }
      } catch (error) {
        logServiceWarn('⚠️ Firestore live subscription unavailable, switching to periodic sync:', error?.message || error);
        pollTimer = setInterval(() => {
          refreshServices({ skipCacheLog: true });
        }, 60000);
      }
    };

    refreshServices({ skipCacheLog: true });
    attachSubscription();

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
      if (pollTimer) {
        clearInterval(pollTimer);
      }
    };
  }, [authLoading, user, refreshServices, saveToLocal]);

  const addService = async (newService) => {
    // Generate ID locally if needed, but ApiService.createService defaults to auto-id
    // But we prefer Date.now() string for consistency if not provided
    const serviceToAdd = { ...newService, id: newService.id || String(Date.now()) };
    
    // Optimistic Update
    const updatedServices = [...services, serviceToAdd];
    await saveToLocal(updatedServices);

    // Persist to Remote
    try {
        await ApiService.createService(serviceToAdd);
        console.log('✅ Service created remotely');
    } catch (e) {
        console.error('❌ Create service failed remotely', e);
        // We could revert change here, but for now we keep local optimist result
    }
  };

  const updateService = async (serviceId, updatedService) => {
    const updatedServices = services.map(service =>
      String(service.id) === String(serviceId) ? { ...updatedService, id: serviceId } : service
    );
    // Optimistic Save
    await saveToLocal(updatedServices);

    // Persist to Remote
    try {
        await ApiService.updateService(serviceId, updatedService);
        console.log('✅ Service updated remotely');
    } catch (e) {
        console.error('❌ Update service failed remotely', e);
    }
  };

  const deleteService = async (serviceId) => {
    const updatedServices = services.filter(service => String(service.id) !== String(serviceId));
    await saveToLocal(updatedServices);

    // Remote Delete
    try {
        await ApiService.deleteService(serviceId);
        console.log('✅ Service deleted remotely');
    } catch (e) {
        console.error('❌ Delete service failed remotely', e);
    }
  };

  const resetToDefault = async () => {
    await AsyncStorage.removeItem(STORAGE_KEYS.customServices);
    await AsyncStorage.setItem(STORAGE_KEYS.servicesCatalogVersion, SERVICES_CATALOG_VERSION);
    setServices(SERVICES);
    // Note: This does NOT delete from Firestore. 
    // To fully reset remote, one would need to delete all remote docs.
    // For safety, we only reset local view for now.
    await loadServicesFromStorage();
    if (user) {
      await refreshServices({ skipCacheLog: true });
    }
    // Ideally, an Admin "Reset" should probably wipe remote too, but that's dangerous.
  };

  const value = {
    services,
    loading,
    addService,
    updateService,
    deleteService,
    resetToDefault,
    saveServices: saveToLocal, // expose as 'saveServices' for compatibility, mainly internal
    refreshServices,
  };

  return (
    <ServicesContext.Provider value={value}>
      {children}
    </ServicesContext.Provider>
  );
};