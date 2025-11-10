import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDeviceStorageKey } from '../utils/deviceId';
import PushNotificationService from '../services/PushNotificationService';
import ApiService from '../services/ApiService';

const AuthContext = createContext();

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
    console.log('📱 Initializing push notifications...');
    const pushToken = await PushNotificationService.initialize();
    
    if (pushToken) {
      console.log('📱 Push token obtained:', pushToken);
      
      // Send token to backend
      try {
        await ApiService.updateFCMToken(pushToken);
        console.log('✅ FCM token registered with backend');
      } catch (error) {
        console.log('⚠️ Failed to register FCM token with backend:', error.message);
        // Don't fail login if backend registration fails
      }
    } else {
      console.log('⚠️ No push token obtained (Expo Go limitation - push notifications require development build)');
    }
  } catch (error) {
    console.error('❌ Push notification initialization failed:', error.message);
    if (error.message && error.message.includes('expo-notifications')) {
      console.log('ℹ️ Note: Push notifications are not supported in Expo Go (SDK 53+). Use development build for push notifications.');
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
    initializeDefaultUsers(); // Add default users if none exist
  }, []);

  const clearStorageForDebug = async () => {
    try {
      await AsyncStorage.clear();
      console.log('AsyncStorage cleared for debugging');
    } catch (error) {
      console.error('Error clearing AsyncStorage:', error);
    }
  };

  const initializeDefaultUsers = async () => {
    try {
      // Uncomment the line below to clear storage for debugging
      // await clearStorageForDebug();
      
      const usersData = await AsyncStorage.getItem('users');
      let users = usersData ? JSON.parse(usersData) : [];
      let usersUpdated = false;
      
      // Define multiple test accounts for different devices
      const defaultUsers = [
        // Admins
        {
          id: 'admin-002',
          username: 'Jessica Martinez',
          email: 'jessica.m@care.com',
          phone: '876-555-0002',
          code: 'ADMIN002',
          password: 'admin123',
          role: 'admin',
          createdAt: new Date().toISOString(),
          isActive: true,
          isSuperAdmin: false, // Regular admin, not super admin
        },
        {
          id: 'admin-003',
          username: 'ADMIN003',
          email: 'admin003@care.com',
          phone: '876-555-0003',
          code: 'ADMIN003',
          password: 'admin123',
          role: 'admin',
          createdAt: new Date().toISOString(),
          isActive: true,
          isSuperAdmin: false, // Regular admin, not super admin
        },
        // Nurses
        {
          id: 'nurse-001',
          username: 'Sarah Johnson, RN',
          email: 'sarah.j@care.com',
          phone: '876-555-0101',
          specialization: 'Home Care',
          nurseCode: 'NURSE001',
          password: 'nurse123',
          role: 'nurse',
          createdAt: new Date().toISOString(),
          isActive: true,
        },
        {
          id: 'nurse-002',
          username: 'Michael Chen, RN',
          email: 'michael.c@care.com',
          phone: '876-555-0102',
          specialization: 'Pediatric Care',
          nurseCode: 'NURSE002',
          password: 'nurse123',
          role: 'nurse',
          createdAt: new Date().toISOString(),
          isActive: true,
        },
        {
          id: 'nurse-003',
          username: 'Emily Rodriguez, RN',
          email: 'emily.r@care.com',
          phone: '876-555-0103',
          specialization: 'Elderly Care',
          nurseCode: 'NURSE003',
          password: 'nurse123',
          role: 'nurse',
          createdAt: new Date().toISOString(),
          isActive: true,
        },
        // Patients
        {
          id: 'patient-001',
          username: 'PATIENT001',
          email: 'testpatient@care.com',
          phone: '876-555-0201',
          password: 'test123',
          role: 'patient',
          createdAt: new Date().toISOString(),
          isActive: true,
        },
        {
          id: 'patient-002',
          username: 'Jane Smith',
          email: 'jane.smith@care.com',
          phone: '876-555-0202',
          password: 'patient123',
          role: 'patient',
          createdAt: new Date().toISOString(),
          isActive: true,
        },
        {
          id: 'patient-003',
          username: 'Robert Wilson',
          email: 'robert.w@care.com',
          phone: '876-555-0203',
          password: 'patient123',
          role: 'patient',
          createdAt: new Date().toISOString(),
          isActive: true,
        },
      ];

      // Add default users if they don't exist
      for (const defaultUser of defaultUsers) {
        const exists = users.some(u => u.id === defaultUser.id || u.email === defaultUser.email);
        if (!exists) {
          users.push(defaultUser);
          usersUpdated = true;
        }
      }

      if (usersUpdated) {
        await AsyncStorage.setItem('users', JSON.stringify(users));
        console.log('✅ Default test users initialized');
        console.log('📱 Available test accounts:');
        console.log('   Super Admin: ADMIN001 / admin123');
        console.log('   Admin: ADMIN002 / admin123 (Jessica Martinez)');
        console.log('   Admin: ADMIN003 / admin123');
        console.log('   Nurse 1: NURSE001 / nurse123 (Sarah Johnson)');
        console.log('   Nurse 2: NURSE002 / nurse123 (Michael Chen)');
        console.log('   Nurse 3: NURSE003 / nurse123 (Emily Rodriguez)');
        console.log('   Patient 1: PATIENT001 / test123');
        console.log('   Patient 2: jane.smith@care.com / patient123');
        console.log('   Patient 3: robert.w@care.com / patient123');
      }
    } catch (error) {
      console.error('Error initializing default users:', error);
    }
  };

  const loadUser = async () => {
    try {
      // Use device-specific key for user data
      const userKey = await getDeviceStorageKey('user');
      const userData = await AsyncStorage.getItem(userKey);
      if (userData) {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        console.log('📱 Loaded user for this device:', parsedUser.username, `(${parsedUser.role})`);
      }
    } catch (error) {
      console.error('Error loading user:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (username, password) => {
    try {
      console.log('🔐 Login attempt:', { username, password });
      
      // Ensure default users are initialized
      await initializeDefaultUsers();
      
      // Get stored users
      const usersData = await AsyncStorage.getItem('users');
      const users = usersData ? JSON.parse(usersData) : [];
      console.log('👥 Available users:', users.map(u => ({ username: u.username, role: u.role })));
      
      // Use device-specific key for storing user session
      const userKey = await getDeviceStorageKey('user');
      
      // Check for admin login (fixed admin code)
      if (username === 'ADMIN001' && password === 'admin123') {
        // Check if there's a saved admin profile for ADMIN001
        const savedAdminProfile = await AsyncStorage.getItem('adminProfile_ADMIN001');
        const adminProfileData = savedAdminProfile ? JSON.parse(savedAdminProfile) : {};
        
        const adminUser = {
          id: 'admin-001',
          username: 'Shertonia Walker',
          email: 'admin@care.com',
          role: 'admin',
          code: 'ADMIN001',
          isSuperAdmin: true, // Only ADMIN001 is super admin
          ...adminProfileData, // Load all saved profile data (profileImage, username, email, etc.)
        };
        
        // Create and save auth token
        const token = createMockToken(adminUser.id, adminUser.email, adminUser.role);
        await AsyncStorage.setItem('authToken', token);
        
        await AsyncStorage.setItem(userKey, JSON.stringify(adminUser));
        setUser(adminUser);
        console.log('✅ Super Admin (ADMIN001) logged in on this device with saved profile');
        
        // Register push notification token
        await registerPushToken();
        
        return { success: true };
      }
      
      // Check for regular admin login (created by ADMIN001)
      if (username.startsWith('ADMIN') && username !== 'ADMIN001') {
        const adminUser = users.find(u => u.code === username && u.password === password && u.role === 'admin');
        if (adminUser) {
          // Load saved profile data for this admin
          const savedAdminProfile = await AsyncStorage.getItem(`adminProfile_${username}`);
          const adminProfileData = savedAdminProfile ? JSON.parse(savedAdminProfile) : {};
          
          const { password, ...userWithoutPassword } = adminUser;
          const userWithProfile = {
            ...userWithoutPassword,
            isSuperAdmin: false, // Regular admins are NOT super admins
            ...adminProfileData, // Load all saved profile data
          };
          
          // Create and save auth token
          const token = createMockToken(userWithProfile.id, userWithProfile.email, userWithProfile.role);
          await AsyncStorage.setItem('authToken', token);
          
          await AsyncStorage.setItem(userKey, JSON.stringify(userWithProfile));
          setUser(userWithProfile);
          console.log('✅ Regular admin logged in on this device with saved profile:', adminUser.username);
          
          // Register push notification token
          await registerPushToken();
          
          return { success: true };
        }
      }
      
      // Check for nurse code login (starts with NURSE)
      if (username.startsWith('NURSE')) {
        const nurseUser = users.find(u => u.nurseCode === username && u.password === password);
        if (nurseUser) {
          const { password, ...userWithoutPassword } = nurseUser;
          
          // Create and save auth token
          const token = createMockToken(userWithoutPassword.id, userWithoutPassword.email, userWithoutPassword.role);
          await AsyncStorage.setItem('authToken', token);
          
          await AsyncStorage.setItem(userKey, JSON.stringify(userWithoutPassword));
          setUser(userWithoutPassword);
          console.log('✅ Nurse logged in on this device:', nurseUser.username);
          
          // Register push notification token
          await registerPushToken();
          
          return { success: true };
        }
      }
      
      // Regular username/email login for all users
      const foundUser = users.find(
        u => (u.username === username || u.email === username) && u.password === password
      );

      console.log('🔍 User found:', foundUser ? 'Yes' : 'No');
      
      if (foundUser) {
        // Remove password from user object before storing
        const { password, ...userWithoutPassword } = foundUser;
        
        // Create and save auth token
        const token = createMockToken(userWithoutPassword.id, userWithoutPassword.email, userWithoutPassword.role);
        await AsyncStorage.setItem('authToken', token);
        
        // Store the user data with device-specific key
        await AsyncStorage.setItem(userKey, JSON.stringify(userWithoutPassword));
        setUser(userWithoutPassword);
        console.log('✅ User logged in on this device:', foundUser.username, `(${foundUser.role})`);
        
        // Register push notification token
        await registerPushToken();
        
        return { success: true };
      } else {
        console.log('❌ Invalid credentials');
        return { success: false, error: 'Invalid credentials' };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'An error occurred during login' };
    }
  };

  const signup = async (username, email, password) => {
    try {
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

      // Create new patient user (default)
      const newUser = {
        id: Date.now().toString(),
        username,
        email,
        password,
        role: 'patient', // All signups are patients by default
        createdAt: new Date().toISOString(),
      };

      // Save to users list
      users.push(newUser);
      await AsyncStorage.setItem('users', JSON.stringify(users));

      // Log user in with device-specific key
      const { password: _, ...userWithoutPassword } = newUser;
      
      // Create and save auth token
      const token = createMockToken(userWithoutPassword.id, userWithoutPassword.email, userWithoutPassword.role);
      await AsyncStorage.setItem('authToken', token);
      
      const userKey = await getDeviceStorageKey('user');
      await AsyncStorage.setItem(userKey, JSON.stringify(userWithoutPassword));
      setUser(userWithoutPassword);
      
      console.log('✅ New user signed up on this device:', username);
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
      
      setUser(null);
      // Set a flag to trigger splash screen on logout
      await AsyncStorage.setItem('shouldShowSplash', 'true');
      console.log('✅ User logged out from this device');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const updateProfile = async (updates) => {
    try {
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
        console.log(`✅ Admin profile saved permanently for ${user.code}`);
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
      console.log('✅ Profile updated on this device');
      return { success: true };
    } catch (error) {
      console.error('Update profile error:', error);
      return { success: false, error: 'Failed to update profile' };
    }
  };

  const createNurseAccount = async (nurseData) => {
    try {
      // Get existing users
      const usersData = await AsyncStorage.getItem('users');
      const users = usersData ? JSON.parse(usersData) : [];

      const isAdmin = nurseData.role === 'admin';
      const codeField = isAdmin ? 'code' : 'nurseCode';
      const codeValue = nurseData[codeField];

      // Check if code already exists
      if (users.some(u => u[codeField] === codeValue || u.code === codeValue || u.nurseCode === codeValue)) {
        return { success: false, error: `${isAdmin ? 'Admin' : 'Nurse'} code already exists` };
      }

      // Create new staff user with temporary password
      const newStaff = {
        id: Date.now().toString(),
        username: nurseData.name,
        email: nurseData.email,
        phone: nurseData.phone,
        specialization: nurseData.specialization,
        [codeField]: codeValue,
        password: 'temp123', // Temporary password - staff should change it
        role: nurseData.role || 'nurse',
        createdAt: new Date().toISOString(),
        isActive: true,
        isSuperAdmin: false, // Regular admins are not super admin
      };

      // Save to users list
      users.push(newStaff);
      await AsyncStorage.setItem('users', JSON.stringify(users));

      return { success: true, code: codeValue };
    } catch (error) {
      console.error('Create staff account error:', error);
      return { success: false, error: 'Failed to create staff account' };
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
