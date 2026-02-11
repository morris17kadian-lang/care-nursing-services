import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDeviceStorageKey } from '../utils/deviceId';
import PushNotificationService from '../services/PushNotificationService';
import ApiService from '../services/ApiService';
import { clearAllSequenceCache } from '../clear-sequence-cache';

export const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Helper function to create a mock JWT token
const createMockToken = (userId, email, role) => {
  // Create a simple base64 encoded token with user info
  // Format: header.payload.signature (simplified)
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = btoa(JSON.stringify({
    id: userId,
    email: email,
    role: role,
    iat: Date.now(),
    exp: Date.now() + (7 * 24 * 60 * 60 * 1000) // 7 days
  }));
  // Simple signature (in production, this would be properly signed)
  const signature = btoa(`${userId}-${email}-care-app-secret`);
  
  return `${header}.${payload}.${signature}`;
};

// Helper function to register push notification token
const registerPushToken = async () => {
  try {
    // Initializing push notifications
    const pushToken = await PushNotificationService.initialize();
    
    if (pushToken) {
      // Push token obtained
      
      // Send token to backend
      try {
        await ApiService.updateFCMToken(pushToken);
        // FCM token registered with backend
      } catch (error) {
        // FCM token registration skipped (endpoint not implemented)
        // Don't fail login if backend registration fails - this is expected
      }
    } else {
      // No push token obtained (Expo Go limitation)
    }
  } catch (error) {
    console.error('❌ Push notification initialization failed:', error.message);
    if (error.message && error.message.includes('expo-notifications')) {
      // Push notifications are not supported in Expo Go (SDK 53+)
    }
    // Don't fail login if push notifications fail
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load user from storage on app start
  useEffect(() => {
    loadUser();
  }, []);

  const clearStorageForDebug = async () => {
    try {
      await AsyncStorage.clear();
      // AsyncStorage cleared for debugging
    } catch (error) {
      console.error('Error clearing AsyncStorage:', error);
    }
  };

  const initializeDefaultUsers = async () => {
    // This function is now disabled to ensure all data comes from the backend.
    return;
  };

  const loadUser = async () => {
    try {
      // Use device-specific key for user data
      const userKey = await getDeviceStorageKey('user');
      const userData = await AsyncStorage.getItem(userKey);
      if (userData) {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        // Loaded user for this device
      }
    } catch (error) {
      console.error('Error loading user:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (username, password) => {
    try {
      // Login attempt
      
      // Clear any existing user data first to ensure fresh login
      // Clearing existing auth data
      const userKey = await getDeviceStorageKey('user');
      await AsyncStorage.removeItem(userKey);
      await AsyncStorage.removeItem('authToken');
      setUser(null);
      
      // Try backend authentication first
      try {
        // Attempting backend login
        const response = await ApiService.login(username, password);
        
        if (response.success && response.user && response.token) {
          // Backend login successful
          
          // Save the auth token from the backend
          await AsyncStorage.setItem('authToken', response.token);
          
          // Add 'name' alias for backward compatibility with screens using user?.name
          const userWithNameAlias = {
            ...response.user,
            name: response.user.fullName || `${response.user.firstName || ''} ${response.user.lastName || ''}`.trim() || response.user.username
          };
          
          await AsyncStorage.setItem(userKey, JSON.stringify(userWithNameAlias));
          setUser(userWithNameAlias);
          // Clear local sequence counters when a staff/admin logs in to ensure
          // we compute the next codes from the backend rather than cached values
          try {
            if (response.user.role === 'admin' || response.user.role === 'superAdmin') {
              await clearAllSequenceCache();
              // Cleared local sequence counters after admin login
            }
          } catch (e) {
            // Failed to clear sequence counters
          }
          
          // Register push notification token after successful login
          await registerPushToken();
          
          return { success: true, user: response.user };
        } else {
          // Backend login failed
        }
      } catch (backendError) {
        // Backend unavailable, falling back to local auth
      }
      
      // Fallback to local authentication is now disabled.
      // Local authentication fallback is disabled
      return { success: false, error: 'Invalid credentials' };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'An error occurred during login' };
    }
  };

  const signup = async (username, email, password, phone, address) => {
    try {
      // Signup attempt
      
      // Try backend registration first
      try {
        // console.log('🌐 Attempting backend signup...');
        const response = await ApiService.register({
          firstName: username.split(' ')[0] || username,
          lastName: username.split(' ').slice(1).join(' ') || 'User',
          email,
          password,
          phone,
          address,
        });
        
        if (response.success && response.user && response.token) {
          // console.log('✅ Backend signup successful:', JSON.stringify(response.user, null, 2));
          
          // Don't auto-login after signup - user should sign in
          // Just return success so they can navigate to login
          return { success: true, requiresSignin: true };
        } else {
          // console.log('❌ Backend signup failed:', response.error || 'Unknown error');
        }
      } catch (backendError) {
        // console.log('⚠️ Backend unavailable, falling back to local signup:', backendError.message);
      }
      
      // Fallback to local registration
      // console.log('📱 Using local signup fallback...');
      
      // Get existing users
      const usersData = await AsyncStorage.getItem('users');
      const users = usersData ? JSON.parse(usersData) : [];

      // Check if email already exists
      if (users.some(u => u.email === email)) {
        return { success: false, error: 'Email already registered' };
      }

      // Check if username already exists
      if (users.some(u => u.username === username)) {
        return { success: false, error: 'Username already taken' };
      }

      // Determine role based on username pattern
      let userRole = 'patient'; // Default to patient
      let isSuperAdmin = false;
      
      // Check if username is an admin code pattern
      if (username.match(/^ADMIN\d{3}$/i)) {
        userRole = 'admin';
        // ADMIN001 is the superAdmin (Nurse Bernard)
        if (username.toUpperCase() === 'ADMIN001') {
          userRole = 'superAdmin';
          isSuperAdmin = true;
        }
        // console.log('🔧 Detected admin signup:', username, 'Role:', userRole);
      } else if (username.match(/^NURSE\d{3}$/i)) {
        userRole = 'nurse';
        // console.log('🔧 Detected nurse signup:', username);
      }

      // Create new user with appropriate role
      const newUser = {
        id: Date.now().toString(),
        username,
        email,
        password,
        phone,
        address,
        role: userRole,
        isSuperAdmin,
        code: username.match(/^(ADMIN|NURSE)\d{3}$/i) ? username.toUpperCase() : undefined,
        createdAt: new Date().toISOString(),
      };

      // Save to users list
      users.push(newUser);
      await AsyncStorage.setItem('users', JSON.stringify(users));

      // Don't auto-login after signup - user should sign in
      // Just return success so they can navigate to login
      // console.log('✅ New user registered on this device:', username, '(local fallback)');
      return { success: true, requiresSignin: true };
      
      // console.log('✅ New user signed up on this device:', username);
      return { success: true };
    } catch (error) {
      console.error('Signup error:', error);
      return { success: false, error: 'An error occurred during signup' };
    }
  };

  const logout = async () => {
    try {
      // Use device-specific key for user data
      const userKey = await getDeviceStorageKey('user');
      await AsyncStorage.removeItem(userKey);
      
      // Also clear saved credentials for this device
      const credKey = await getDeviceStorageKey('savedCredentials');
      await AsyncStorage.removeItem(credKey);
      
      // Clear auth token
      await AsyncStorage.removeItem('authToken');
      
      // Clear appointments data to prevent data leakage between accounts
      if (user?.id) {
        await AsyncStorage.removeItem(`@care_appointments_${user.id}`);
        await AsyncStorage.removeItem(`@care_nurses_${user.id}`);
      }
      // Also clear any leftover guest cache in case logout happened mid-flow
      await AsyncStorage.removeItem('@care_appointments_guest');
      await AsyncStorage.removeItem('@care_nurses_guest');
      
      setUser(null);
      // Set a flag to trigger splash screen on logout
      await AsyncStorage.setItem('shouldShowSplash', 'true');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const updateProfile = async (updates) => {
    try {
      // console.log('📝 updateProfile called with:', updates);
      
      // First, save to backend if authenticated
      if (user?.id) {
        // console.log('🔄 Syncing profile to backend...');
        try {
          // Prepare backend update data based on user role
          let backendUpdateData;
          let endpoint;
          
          if (user.role === 'nurse') {
            backendUpdateData = {
              fullName: updates.username || undefined,
              email: updates.email || undefined,
              phone: updates.phone || undefined,
              specialization: updates.specialization || undefined,
              bankingDetails: {
                bankName: updates.bankName,
                accountNumber: updates.accountNumber,
                accountHolderName: updates.accountHolderName,
                bankBranch: updates.bankBranch,
                currency: 'JMD'
              }
            };
            endpoint = `/staff/nurse/${user.id}`;
          } else {
            // For all other users (admin, patient), use general profile update
            backendUpdateData = {
              firstName: updates.firstName || undefined,
              lastName: updates.lastName || undefined,
              phone: updates.phone || undefined,
              profileImage: updates.profilePhoto || undefined, // Map profilePhoto to profileImage for backend
            };
            endpoint = '/auth/profile';
          }
          
          const response = await ApiService.makeRequest(endpoint, {
            method: 'PUT',
            body: JSON.stringify(backendUpdateData)
          });
          
          if (response.success) {
            // console.log('✅ Profile synced to backend successfully:', response);
          } else {
            console.warn('⚠️ Backend sync returned non-success:', response);
          }
        } catch (backendError) {
          console.warn('⚠️ Failed to sync to backend, continuing with local save:', backendError);
          // Continue with local save even if backend fails
        }
      }
      
      const updatedUser = { ...user, ...updates };
      
      // Update in storage with device-specific key
      const userKey = await getDeviceStorageKey('user');
      await AsyncStorage.setItem(userKey, JSON.stringify(updatedUser));
      
      // If admin is updating profile, save it separately for persistence by admin code
      if (user.role === 'admin') {
        const adminProfileKey = `adminProfile_${user.code}`;
        
        // Get existing admin profile data
        const existingProfileData = await AsyncStorage.getItem(adminProfileKey);
        const existingProfile = existingProfileData ? JSON.parse(existingProfileData) : {};
        
        // Merge updates with existing profile data
        const adminProfile = {
          ...existingProfile,
          ...updates,
          updatedAt: new Date().toISOString(),
        };
        
        await AsyncStorage.setItem(adminProfileKey, JSON.stringify(adminProfile));
        // console.log(`✅ Admin profile saved permanently for ${user.code}`);
      }
      
      // Update in users list
      const usersData = await AsyncStorage.getItem('users');
      const users = usersData ? JSON.parse(usersData) : [];
      const userIndex = users.findIndex(u => u.id === user.id);
      
      if (userIndex !== -1) {
        users[userIndex] = { ...users[userIndex], ...updates };
        await AsyncStorage.setItem('users', JSON.stringify(users));
      }
      
      setUser(updatedUser);
      return { success: true };
    } catch (error) {
      console.error('❌ Update profile error:', error);
      return { success: false, error: 'Failed to update profile' };
    }
  };

  const createNurseAccount = async (nurseData) => {
    try {
      const isAdmin = nurseData.role === 'admin';
      const codeValue = nurseData.code || nurseData.nurseCode;

      // Prepare request data for backend
      const requestData = {
        fullName: nurseData.name,
        email: nurseData.email,
        phone: nurseData.phone,
        password: 'temp123', // Temporary password - staff should change it
        emergencyContact: nurseData.emergencyContact || null,
        emergencyPhone: nurseData.emergencyPhone || null,
        bankingDetails: nurseData.bankingDetails || {
          bankName: 'Not provided',
          accountNumber: 'Not provided',
          accountHolderName: nurseData.name,
          bankBranch: 'Main Branch',
          currency: 'JMD'
        }
      };

      // Add role-specific fields
      if (isAdmin) {
        requestData.adminCode = codeValue;
      } else {
        requestData.nurseCode = codeValue;
        requestData.specialization = nurseData.specialization || 'General Nursing';
      }

      // Call backend API to create staff
      const endpoint = isAdmin ? '/staff/register/admin' : '/staff/register/nurse';
      const response = await ApiService.makeRequest(endpoint, {
        method: 'POST',
        body: JSON.stringify(requestData)
      });

      if (response.success && response.user) {
        // console.log(`✅ ${isAdmin ? 'Admin' : 'Nurse'} created on backend:`, response.user);
        
        // Also save to local storage for compatibility
        try {
          const usersData = await AsyncStorage.getItem('users');
          const users = usersData ? JSON.parse(usersData) : [];

          const newStaff = {
            id: response.user.id || Date.now().toString(),
            username: nurseData.name,
            email: nurseData.email,
            phone: nurseData.phone,
            specialization: nurseData.specialization,
            code: codeValue,
            nurseCode: codeValue,
            password: 'temp123',
            role: nurseData.role || 'nurse',
            createdAt: new Date().toISOString(),
            isActive: true,
            isSuperAdmin: isAdmin && (nurseData.isSuperAdmin || false),
          };

          users.push(newStaff);
          await AsyncStorage.setItem('users', JSON.stringify(users));
        } catch (localStorageError) {
          console.log('⚠️ Failed to save to local storage:', localStorageError.message);
          // Don't fail the entire operation if local storage fails
        }

        return { success: true, code: codeValue };
      } else {
        return { success: false, error: response.error || 'Failed to create staff account on backend' };
      }
    } catch (error) {
      console.error('Create staff account error:', error);
      return { success: false, error: error.message || 'Failed to create staff account' };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        signup,
        logout,
        updateProfile,
        updateUser: updateProfile, // Alias for consistency
        createNurseAccount,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
