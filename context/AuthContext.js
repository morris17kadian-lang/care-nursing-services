import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
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
      const users = usersData ? JSON.parse(usersData) : [];
      
      console.log('Current users in storage:', users.length);
      
      // Only add default nurses if no nurses exist
      const existingNurses = users.filter(u => u.role === 'nurse');
      console.log('Existing nurses:', existingNurses.length);
      
      if (existingNurses.length === 0) {
        console.log('Creating default nurse accounts...');
        const defaultNurses = [
          {
            id: 'nurse-001',
            username: 'Sarah Johnson, RN',
            email: 'sarah.j@care.com',
            phone: '876-555-0101',
            specialization: 'Home Care',
            nurseCode: 'NURSE001',
            password: 'temp123',
            role: 'nurse',
            createdAt: new Date().toISOString(),
            isActive: true,
          },
          {
            id: 'nurse-002',
            username: 'Michael Chen, PT',
            email: 'michael.c@care.com',
            phone: '876-555-0102',
            specialization: 'Physiotherapy',
            nurseCode: 'NURSE002',
            password: 'temp123',
            role: 'nurse',
            createdAt: new Date().toISOString(),
            isActive: true,
          },
          {
            id: 'nurse-003',
            username: 'Emily Davis, RN',
            email: 'emily.d@care.com',
            phone: '876-555-0103',
            specialization: 'Clinical',
            nurseCode: 'NURSE003',
            password: 'temp123',
            role: 'nurse',
            createdAt: new Date().toISOString(),
            isActive: true,
          },
        ];
        
        const updatedUsers = [...users, ...defaultNurses];
        await AsyncStorage.setItem('users', JSON.stringify(updatedUsers));
        console.log('Default nurse accounts created successfully:', defaultNurses.length);
      } else {
        console.log('Nurse accounts already exist, skipping creation');
      }
    } catch (error) {
      console.error('Error initializing default users:', error);
    }
  };

  const loadUser = async () => {
    try {
      const userData = await AsyncStorage.getItem('user');
      if (userData) {
        setUser(JSON.parse(userData));
      }
    } catch (error) {
      console.error('Error loading user:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (emailOrCode, password) => {
    try {
      console.log('Login attempt:', { emailOrCode, password });
      
      // Get stored users
      const usersData = await AsyncStorage.getItem('users');
      const users = usersData ? JSON.parse(usersData) : [];
      
      console.log('Total users in storage:', users.length);
      console.log('Users:', users.map(u => ({ id: u.id, role: u.role, nurseCode: u.nurseCode, email: u.email })));
      
      // Check for admin login (fixed admin code)
      if (emailOrCode === 'ADMIN001' && password === 'admin123') {
        console.log('Admin login successful');
        const adminUser = {
          id: 'admin-001',
          username: 'Admin',
          email: 'admin@care.com',
          role: 'admin',
          code: 'ADMIN001'
        };
        await AsyncStorage.setItem('user', JSON.stringify(adminUser));
        setUser(adminUser);
        return { success: true };
      }
      
      // Check for nurse code login (starts with NURSE)
      if (emailOrCode.startsWith('NURSE')) {
        console.log('Attempting nurse login with code:', emailOrCode);
        const nurseUser = users.find(u => u.nurseCode === emailOrCode && u.password === password);
        console.log('Found nurse user:', nurseUser ? 'Yes' : 'No');
        if (nurseUser) {
          console.log('Nurse login successful:', nurseUser.username);
          const { password, ...userWithoutPassword } = nurseUser;
          await AsyncStorage.setItem('user', JSON.stringify(userWithoutPassword));
          setUser(userWithoutPassword);
          return { success: true };
        } else {
          console.log('Nurse login failed - user not found');
        }
      }
      
      // Regular email login for patients
      const foundUser = users.find(
        u => u.email === emailOrCode && u.password === password && u.role === 'patient'
      );

      if (foundUser) {
        const { password, ...userWithoutPassword } = foundUser;
        await AsyncStorage.setItem('user', JSON.stringify(userWithoutPassword));
        setUser(userWithoutPassword);
        return { success: true };
      } else {
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

      // Log user in
      const { password: _, ...userWithoutPassword } = newUser;
      await AsyncStorage.setItem('user', JSON.stringify(userWithoutPassword));
      setUser(userWithoutPassword);

      return { success: true };
    } catch (error) {
      console.error('Signup error:', error);
      return { success: false, error: 'An error occurred during signup' };
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem('user');
      // Also clear saved credentials when user logs out
      await AsyncStorage.removeItem('savedCredentials');
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const updateProfile = async (updates) => {
    try {
      const updatedUser = { ...user, ...updates };
      
      // Update in storage
      await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
      
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
      console.error('Update profile error:', error);
      return { success: false, error: 'Failed to update profile' };
    }
  };

  const createNurseAccount = async (nurseData) => {
    try {
      // Get existing users
      const usersData = await AsyncStorage.getItem('users');
      const users = usersData ? JSON.parse(usersData) : [];

      // Check if nurse code already exists
      if (users.some(u => u.nurseCode === nurseData.nurseCode)) {
        return { success: false, error: 'Nurse code already exists' };
      }

      // Create new nurse user with temporary password
      const newNurse = {
        id: Date.now().toString(),
        username: nurseData.name,
        email: nurseData.email,
        phone: nurseData.phone,
        specialization: nurseData.specialization,
        nurseCode: nurseData.nurseCode,
        password: 'temp123', // Temporary password - nurse should change it
        role: 'nurse',
        createdAt: new Date().toISOString(),
        isActive: true,
      };

      // Save to users list
      users.push(newNurse);
      await AsyncStorage.setItem('users', JSON.stringify(users));

      return { success: true, nurseCode: nurseData.nurseCode };
    } catch (error) {
      console.error('Create nurse account error:', error);
      return { success: false, error: 'Failed to create nurse account' };
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
