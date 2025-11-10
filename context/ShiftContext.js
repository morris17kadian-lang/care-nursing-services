import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';
import ApiService from '../services/ApiService';

const ShiftContext = createContext();

export function ShiftProvider({ children }) {
  const { user } = useAuth(); // Add auth context to track user changes
  // Mock shift requests data - cleared for testing
  const [shiftRequests, setShiftRequests] = useState([]);
  const [lastPendingCount, setLastPendingCount] = useState(0); // Track pending count changes
  const [isOnline, setIsOnline] = useState(true); // Track API availability
  const lastOfflineLogRef = useRef(0); // Track timestamp of last offline log
  const STORAGE_KEY = '@care_shift_requests_global'; // Global key for all users
  const OFFLINE_LOG_THROTTLE = 120000; // Only log offline message once every 2 minutes

  // Load shift requests from API with AsyncStorage fallback
  const loadShiftRequests = async () => {
    console.log('📂 ShiftContext: Loading shift requests...');
    // First, try to load from AsyncStorage to have data immediately
    let storedRequests = [];
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const requests = JSON.parse(stored);
        // Ensure all stored requests have isShift property
        storedRequests = requests.map(request => ({
          ...request,
          isShift: true
        }));
        setShiftRequests(storedRequests);
        console.log('✅ Loaded', storedRequests.length, 'shift requests from AsyncStorage');
      } else {
        console.log('📂 No shift requests found in AsyncStorage');
      }
    } catch (error) {
      console.error('Failed to load shift requests from storage:', error);
    }

    // Then try to sync with API
    try {
      const response = await ApiService.getShiftRequests();
      
      if (response.success && response.shiftRequests) {
        // Ensure all shift requests have isShift property
        const shiftRequestsWithFlag = response.shiftRequests.map(request => ({
          ...request,
          isShift: true
        }));
        
        // Only update if API has data OR if we had no local data
        if (shiftRequestsWithFlag.length > 0 || storedRequests.length === 0) {
          setShiftRequests(shiftRequestsWithFlag);
          setIsOnline(true);
          lastOfflineLogRef.current = 0;
          console.log('✅ Synced', shiftRequestsWithFlag.length, 'shift requests from API');
          
          // Save to AsyncStorage as backup
          await saveShiftRequests(shiftRequestsWithFlag);
        } else {
          // API returned empty but we have local data - keep local data
          console.log('ℹ️ API returned empty, keeping', storedRequests.length, 'local shift requests');
          setIsOnline(true);
        }
        return;
      }
    } catch (error) {
      // Silent fallback to offline mode
      const now = Date.now();
      if (now - lastOfflineLogRef.current > OFFLINE_LOG_THROTTLE) {
        lastOfflineLogRef.current = now;
        setIsOnline(false);
        console.log('📴 Using offline mode with', storedRequests.length, 'cached shift requests');
      }
    }
  };

  // Save shift requests to AsyncStorage
  const saveShiftRequests = async (requests) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(requests));
      console.log('💾 Saved', requests.length, 'shift requests to AsyncStorage');
    } catch (error) {
      console.error('Failed to save shift requests:', error);
    }
  };

  // Refresh shift requests from API with storage fallback
  const refreshShiftRequests = async () => {
    // If we're offline and recently tried, skip API call
    const now = Date.now();
    if (!isOnline && now - lastOfflineLogRef.current < OFFLINE_LOG_THROTTLE) {
      // Silently use cached data when offline
      return shiftRequests;
    }

    try {
      const response = await ApiService.getShiftRequests();
      
      if (response.success && response.shiftRequests) {
        const currentCount = shiftRequests.length;
        const newCount = response.shiftRequests.length;
        
        // Only log if there's a change
        if (newCount !== currentCount) {
          console.log('🔄 Refreshed shift requests from API:', newCount);
        }
        
        // If we were offline, mark as back online
        if (!isOnline) {
          console.log('✅ Backend connection restored');
          setIsOnline(true);
        }
        
        setShiftRequests(response.shiftRequests);
        await saveShiftRequests(response.shiftRequests); // Keep local backup
        return response.shiftRequests;
      }
    } catch (error) {
      // Silent fallback to offline mode
      if (now - lastOfflineLogRef.current > OFFLINE_LOG_THROTTLE) {
        lastOfflineLogRef.current = now;
        setIsOnline(false);
      }
    }
    
    // Fallback to local refresh - don't log every poll
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const requests = JSON.parse(stored);
        setShiftRequests(requests);
        return requests;
      }
    } catch (error) {
      console.error('Failed to refresh shift requests:', error);
    }
    return [];
  };

  // Load data on initialization and when user changes
  useEffect(() => {
    console.log('🔄 ShiftContext useEffect triggered');
    console.log('  User:', user ? `${user.id} (${user.role})` : 'null');
    console.log('  Current shiftRequests count:', shiftRequests.length);
    
    if (user) {
      console.log('✅ ShiftContext: User exists, loading shift requests for:', user.id, 'Role:', user.role);
      loadShiftRequests();
      
      // Set up polling - use longer interval to avoid flooding backend logs
      const pollInterval = setInterval(() => {
        refreshShiftRequests();
      }, isOnline ? 600000 : 1200000); // 10 minutes when online, 20 minutes when offline
      
      return () => {
        clearInterval(pollInterval);
      };
    } else {
      console.log('⚠️ ShiftContext: No user found, skipping load');
    }
    // Don't clear data when user is temporarily unavailable - keep cached data
  }, [user?.id, isOnline]); // Depend on both user ID and online status

  const submitShiftRequest = async (requestData) => {
    try {
      console.log('📡 Submitting shift request to backend API...');
      
      // Transform data to match API format
      const apiData = {
        clientId: requestData.clientId,
        clientName: requestData.clientName,
        service: requestData.service,
        date: requestData.date,
        time: requestData.time,
        location: requestData.location,
        notes: requestData.notes,
        priority: requestData.priority || 'medium'
      };
      
      const response = await ApiService.submitShiftRequest(apiData);
      
      if (response.success && response.shiftRequest) {
        console.log('✅ Shift request submitted successfully via API');
        setIsOnline(true);
        
        // Transform API response to match mobile app format
        const newRequest = {
          id: response.shiftRequest._id,
          nurseId: response.shiftRequest.assignedNurse?._id || user?.id,
          nurseName: response.shiftRequest.nurseName || `${user?.firstName} ${user?.lastName}`,
          clientId: response.shiftRequest.patient?._id || requestData.clientId,
          clientName: response.shiftRequest.clientName || requestData.clientName,
          service: response.shiftRequest.appointmentType,
          date: response.shiftRequest.scheduledDate.split('T')[0],
          time: response.shiftRequest.scheduledTime,
          location: response.shiftRequest.location,
          notes: response.shiftRequest.notes,
          status: response.shiftRequest.status,
          requestedAt: response.shiftRequest.createdAt,
          approvedBy: null,
          approvedAt: null,
          isShift: true
        };
        
        // Update local state and storage
        setShiftRequests(prev => {
          const updated = [newRequest, ...prev];
          saveShiftRequests(updated);
          return updated;
        });
        
        return newRequest;
      }
    } catch (error) {
      console.log('🔴 API submission failed, using local storage:', error.message);
      setIsOnline(false);
    }
    
    // Fallback to local storage
    const newRequest = {
      id: `shift_${Date.now()}`,
      ...requestData,
      status: 'pending',
      requestedAt: new Date().toISOString(),
      approvedBy: null,
      approvedAt: null,
      clientId: requestData.clientId || null,
      clientName: requestData.clientName || null,
      isShift: true
    };
    
    setShiftRequests(prev => {
      const updated = [newRequest, ...prev];
      console.log('✅ NURSE: Added shift request locally. Total requests:', updated.length);
      console.log('📝 NURSE: New request details:', {
        id: newRequest.id,
        nurseId: newRequest.nurseId,
        service: newRequest.service,
        date: newRequest.date,
        status: newRequest.status
      });
      // Save to AsyncStorage
      saveShiftRequests(updated);
      return updated;
    });
    return newRequest;
  };

  const approveShiftRequest = async (requestId, adminId) => {
    try {
      console.log('📡 Approving shift request via API:', requestId);
      
      const response = await ApiService.approveShiftRequest(requestId);
      
      if (response.success && response.shiftRequest) {
        console.log('✅ Shift request approved successfully via API');
        setIsOnline(true);
        
        // Update local state
        setShiftRequests(prev => {
          const updated = prev.map(request => 
            request.id === requestId 
              ? {
                  ...request,
                  status: 'approved',
                  approvedBy: adminId,
                  approvedAt: response.shiftRequest.approvedAt
                }
              : request
          );
          saveShiftRequests(updated);
          return updated;
        });
        
        // Refresh data to get latest from API
        await refreshShiftRequests();
        return;
      }
    } catch (error) {
      console.log('🔴 API approval failed, using local storage:', error.message);
      setIsOnline(false);
    }
    
    // Fallback to local storage
    setShiftRequests(prev => {
      const updated = prev.map(request => 
        request.id === requestId 
          ? {
              ...request,
              status: 'approved',
              approvedBy: adminId,
              approvedAt: new Date().toISOString()
            }
          : request
      );
      // Save to AsyncStorage
      saveShiftRequests(updated);
      return updated;
    });
  };

  const denyShiftRequest = async (requestId, adminId, reason = '') => {
    try {
      console.log('📡 Denying shift request via API:', requestId);
      
      const response = await ApiService.denyShiftRequest(requestId, reason);
      
      if (response.success) {
        console.log('✅ Shift request denied successfully via API');
        setIsOnline(true);
        
        // Update local state
        setShiftRequests(prev => {
          const updated = prev.map(request => 
            request.id === requestId 
              ? {
                  ...request,
                  status: 'denied',
                  approvedBy: adminId,
                  approvedAt: new Date().toISOString(),
                  denialReason: reason
                }
              : request
          );
          saveShiftRequests(updated);
          return updated;
        });
        
        // Refresh data to get latest from API
        await refreshShiftRequests();
        return;
      }
    } catch (error) {
      console.log('🔴 API denial failed, using local storage:', error.message);
      setIsOnline(false);
    }
    
    // Fallback to local storage
    setShiftRequests(prev => {
      const updated = prev.map(request => 
        request.id === requestId 
          ? {
              ...request,
              status: 'denied',
              approvedBy: adminId,
              approvedAt: new Date().toISOString(),
              denialReason: reason
            }
          : request
      );
      // Save to AsyncStorage
      saveShiftRequests(updated);
      return updated;
    });
  };

  const getPendingShiftRequests = () => {
    const pending = shiftRequests.filter(request => request.status === 'pending');
    return pending;
  };

  // Track pending count changes in useEffect instead of during render
  useEffect(() => {
    const pending = shiftRequests.filter(request => request.status === 'pending');
    
    // Only log when pending count changes
    if (pending.length !== lastPendingCount) {
      console.log('🔍 Getting pending shift requests:', pending.length, 'out of total:', shiftRequests.length);
      if (pending.length > 0) {
        console.log('📋 Pending requests:', pending.map(r => ({ id: r.id, nurseId: r.nurseId, service: r.service })));
      }
      setLastPendingCount(pending.length);
    }
  }, [shiftRequests, lastPendingCount]);

  const getShiftRequestsByNurse = (nurseId) => {
    return shiftRequests.filter(request => request.nurseId === nurseId);
  };

  const getApprovedShiftsByNurse = (nurseId) => {
    return shiftRequests.filter(request => 
      request.nurseId === nurseId && request.status === 'approved'
    );
  };

  // Function to start a shift (when nurse clocks in)
  const startShift = async (shiftId, startTime, nurseId) => {
    try {
      console.log('📡 Starting shift via API:', shiftId);
      
      const response = await ApiService.startShift(shiftId);
      
      if (response.success) {
        console.log('✅ Shift started successfully via API');
        setIsOnline(true);
        
        // Update local state
        setShiftRequests(prev => {
          const updated = prev.map(request => 
            request.id === shiftId 
              ? { 
                  ...request, 
                  status: 'active', 
                  startedAt: response.startTime,
                  actualStartTime: response.startTime
                }
              : request
          );
          saveShiftRequests(updated);
          return updated;
        });
        
        // Refresh data to get latest from API
        await refreshShiftRequests();
        return;
      }
    } catch (error) {
      console.log('🔴 API start shift failed, using local storage:', error.message);
      setIsOnline(false);
    }
    
    // Fallback to local storage
    setShiftRequests(prev => {
      const updated = prev.map(request => 
        request.id === shiftId 
          ? { 
              ...request, 
              status: 'active', 
              startedAt: startTime,
              actualStartTime: startTime
            }
          : request
      );
      console.log(`✅ SHIFT: Started shift ${shiftId} for nurse ${nurseId} (local)`);
      saveShiftRequests(updated);
      return updated;
    });
  };

  // Function to complete a shift (when nurse clocks out)
  const completeShift = async (shiftId, endTime, hoursWorked, notes, nurseId) => {
    try {
      console.log('📡 Completing shift via API:', shiftId);
      
      const response = await ApiService.completeShift(shiftId, hoursWorked, notes);
      
      if (response.success) {
        console.log('✅ Shift completed successfully via API');
        setIsOnline(true);
        
        // Update local state
        setShiftRequests(prev => {
          const updated = prev.map(request => 
            request.id === shiftId 
              ? { 
                  ...request, 
                  status: 'completed', 
                  completedAt: response.endTime,
                  actualEndTime: response.endTime,
                  hoursWorked: response.hoursWorked,
                  completionNotes: notes
                }
              : request
          );
          saveShiftRequests(updated);
          return updated;
        });
        
        // Refresh data to get latest from API
        await refreshShiftRequests();
        return;
      }
    } catch (error) {
      console.log('🔴 API complete shift failed, using local storage:', error.message);
      setIsOnline(false);
    }
    
    // Fallback to local storage
    setShiftRequests(prev => {
      const updated = prev.map(request => 
        request.id === shiftId 
          ? { 
              ...request, 
              status: 'completed', 
              completedAt: endTime,
              actualEndTime: endTime,
              hoursWorked: hoursWorked,
              completionNotes: notes
            }
          : request
      );
      console.log(`✅ SHIFT: Completed shift ${shiftId} for nurse ${nurseId} (local)`);
      saveShiftRequests(updated);
      return updated;
    });
  };

  // Clear all shift requests
  const clearAllShiftRequests = async () => {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
      setShiftRequests([]);
      console.log('🧹 Cleared all shift requests');
    } catch (error) {
      console.error('Failed to clear shift requests:', error);
    }
  };

  // Force refresh data from storage - useful for cross-device sync
  const forceRefresh = async () => {
    console.log('🔄 Force refreshing shift data...');
    await loadShiftRequests();
  };

  const value = {
    shiftRequests,
    submitShiftRequest,
    approveShiftRequest,
    denyShiftRequest,
    getPendingShiftRequests,
    getShiftRequestsByNurse,
    getApprovedShiftsByNurse,
    startShift,
    completeShift,
    clearAllShiftRequests,
    refreshShiftRequests,
    forceRefresh
  };

  return (
    <ShiftContext.Provider value={value}>
      {children}
    </ShiftContext.Provider>
  );
}

export function useShifts() {
  const context = useContext(ShiftContext);
  if (!context) {
    throw new Error('useShifts must be used within a ShiftProvider');
  }
  return context;
}