import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  updateProfile,
  updateEmail,
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
} from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import FirebaseService from '../services/FirebaseService';
import EmailService from '../services/EmailService';
import PushNotificationService from '../services/PushNotificationService';
import { clearAllSequenceCache } from '../clear-sequence-cache';

export const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Helper function to register push notification token
const registerPushToken = async (userId) => {
  try {
    const pushToken = await PushNotificationService.initialize();
    
    if (pushToken) {
      // Update user profile with FCM token
      await FirebaseService.updateUser(userId, { fcmToken: pushToken });
    }
  } catch (error) {
    console.error('Push notification initialization failed:', error.message);
    // Don't fail login if push notifications fail
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const changePassword = async (currentPassword, newPassword) => {
    try {
      const firebaseUser = auth.currentUser;
      if (!firebaseUser) {
        return { success: false, error: 'No authenticated user' };
      }

      if (!firebaseUser.email) {
        return { success: false, error: 'No email found for this account' };
      }

      // Firebase requires recent authentication for sensitive actions.
      const credential = EmailAuthProvider.credential(firebaseUser.email, currentPassword);
      await reauthenticateWithCredential(firebaseUser, credential);
      await updatePassword(firebaseUser, newPassword);
      return { success: true };
    } catch (error) {
      console.error('Change password error:', error);
      let errorMessage = error?.message || 'Failed to change password';
      if (error?.code === 'auth/wrong-password') {
        errorMessage = 'Current password is incorrect';
      } else if (error?.code === 'auth/weak-password') {
        errorMessage = 'Password is too weak';
      } else if (error?.code === 'auth/requires-recent-login') {
        errorMessage = 'Please log out and log back in, then try again';
      }
      return { success: false, error: errorMessage };
    }
  };

  // Monitor Firebase auth state
  useEffect(() => {
    let unsubscribeSnapshot = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (unsubscribeSnapshot) {
          unsubscribeSnapshot();
          unsubscribeSnapshot = null;
        }

        if (firebaseUser) {
          // User is logged in
          const userResult = await FirebaseService.getUser(firebaseUser.uid);
          
          if (userResult.success) {
            const userData = {
              id: firebaseUser.uid,
              email: firebaseUser.email,
              ...userResult.user,
            };
            setUser(userData);
            // Save to AsyncStorage for offline access
            await AsyncStorage.setItem('user', JSON.stringify(userData));
            await AsyncStorage.setItem('authToken', firebaseUser.accessToken);

            // Setup Realtime Listener
            if (userResult.collection) {
              unsubscribeSnapshot = onSnapshot(doc(db, userResult.collection, firebaseUser.uid), async (docSnap) => {
                if (docSnap.exists()) {
                   const updatedData = { ...userData, ...docSnap.data() };
                   // console.log('🔄 AuthContext: Realtime profile update received', updatedData);
                   setUser(updatedData);
                   await AsyncStorage.setItem('user', JSON.stringify(updatedData));
                }
              });
            }
          }
        } else {
          // User is logged out
          setUser(null);
          await AsyncStorage.removeItem('user');
          await AsyncStorage.removeItem('authToken');
        }
      } catch (error) {
        console.error('Error in auth state change:', error);
      } finally {
        setIsLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
      }
    };
  }, []);

  const login = async (usernameOrEmail, password) => {
    try {
      const DEBUG_AUTH = false;
      setIsLoading(true);
      if (__DEV__ && DEBUG_AUTH) {
        console.log('Attempting login for:', usernameOrEmail);
      }

      // Check if input is email or username
      let emailToUse = usernameOrEmail;
      let lookedUpProfile = null;
      
      // If input doesn't contain @, treat it as username and look it up
      if (!usernameOrEmail.includes('@')) {
        if (__DEV__ && DEBUG_AUTH) {
          console.log('Detected username, looking up email...');
        }
        // Query Firestore for user with this username
        const usersCollection = await FirebaseService.getUserByUsername(usernameOrEmail);
        const resolvedLookupUser = usersCollection?.user;
        const resolvedEmail = (resolvedLookupUser?.email || resolvedLookupUser?.contactEmail || '').toString().trim();
        if (!usersCollection.success || !resolvedEmail) {
          console.error('Username lookup failed:', usersCollection.error);
          return { success: false, error: usersCollection?.error || 'Username not found' };
        }
        emailToUse = resolvedEmail;
        lookedUpProfile = usersCollection.user;
        if (__DEV__ && DEBUG_AUTH) {
          console.log('Username resolved to email:', emailToUse);
        }
      }

      // Sign in with Firebase using email
      if (__DEV__ && DEBUG_AUTH) {
        console.log('Signing in with Firebase Auth...');
      }
      const userCredential = await signInWithEmailAndPassword(auth, emailToUse, password);
      const firebaseUser = userCredential.user;
      if (__DEV__ && DEBUG_AUTH) {
        console.log('Firebase Auth success, UID:', firebaseUser.uid);
      }

      // Get user profile from Firestore.
      // IMPORTANT: if we logged in via username (ADMIN001/NURSE###), prefer the looked-up profile.
      let resolvedProfile = null;
      if (lookedUpProfile?.id && lookedUpProfile.id === firebaseUser.uid) {
        resolvedProfile = lookedUpProfile;
      } else {
        const userResult = await FirebaseService.getUser(firebaseUser.uid);
        if (userResult.success) {
          resolvedProfile = userResult.user;
        }
      }

      if (!resolvedProfile) {
        // User exists in Auth but not in Firestore, create profile (patient default).
        // Staff accounts should never land here if Firestore contains their admin/nurse profile.
        const newUserData = {
          id: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName || 'User',
          role: 'patient',
          createdAt: new Date().toISOString(),
        };

        await FirebaseService.createUser(firebaseUser.uid, newUserData);
        resolvedProfile = newUserData;
      }

      // Normalize the built-in super admin display details (ADMIN001).
      // This protects against old cached/profile values (e.g., "Shertonia Walker") lingering in Firestore/AsyncStorage.
      const normalizedLoginInput = (usernameOrEmail || '').toString().trim().toUpperCase();
      const normalizedUsername = (resolvedProfile?.username || '').toString().trim().toUpperCase();
      const normalizedCode = (resolvedProfile?.code || resolvedProfile?.adminCode || '').toString().trim().toUpperCase();
      const isAdmin001 = normalizedLoginInput === 'ADMIN001' || normalizedUsername === 'ADMIN001' || normalizedCode === 'ADMIN001';

      if (isAdmin001) {
        const desiredFullName = 'Nurse Bernard';
        const desiredEmail = 'nurse@876.com';

        const shouldUpdateFullName =
          !resolvedProfile?.fullName ||
          resolvedProfile.fullName === 'Shertonia Walker' ||
          resolvedProfile.fullName !== desiredFullName;

        const shouldUpdateDisplayName =
          resolvedProfile?.displayName === 'Shertonia Walker' ||
          (resolvedProfile?.displayName && resolvedProfile.displayName !== desiredFullName);

        const profileUpdates = {
          ...(shouldUpdateFullName ? { fullName: desiredFullName } : {}),
          ...(shouldUpdateDisplayName ? { displayName: desiredFullName } : {}),
          // Best-effort normalization if these fields exist.
          ...(resolvedProfile?.firstName === 'Shertonia' || !resolvedProfile?.firstName ? { firstName: 'Nurse' } : {}),
          ...(resolvedProfile?.lastName === 'Walker' || !resolvedProfile?.lastName ? { lastName: 'Bernard' } : {}),
        };

        // Best-effort: migrate ADMIN001 email to the new address.
        // IMPORTANT: Only update Firestore email after Auth email update succeeds,
        // otherwise username->email login would break on next login.
        let adminEmailUpdatedInAuth = false;
        try {
          if (firebaseUser?.email && firebaseUser.email.toLowerCase() !== desiredEmail.toLowerCase()) {
            await updateEmail(firebaseUser, desiredEmail);
            adminEmailUpdatedInAuth = true;
          }
        } catch (e) {
          // Don't block login if email update fails (can fail if requires recent login).
          adminEmailUpdatedInAuth = false;
        }

        const updatesToPersist = {
          ...profileUpdates,
          // Used for display throughout the app even if the Auth sign-in email cannot be migrated.
          contactEmail: desiredEmail,
          ...(adminEmailUpdatedInAuth ? { email: desiredEmail } : {}),
        };

        if (Object.keys(updatesToPersist).length > 0) {
          try {
            await FirebaseService.updateUser(firebaseUser.uid, updatesToPersist);
            resolvedProfile = { ...resolvedProfile, ...updatesToPersist };
          } catch (e) {
            // Don't block login if profile normalization fails.
          }
        }

        // Update local cached admin profile used by chat avatar/name.
        try {
          const existingAdminProfile = await AsyncStorage.getItem('adminProfile_ADMIN001');
          const parsed = existingAdminProfile ? JSON.parse(existingAdminProfile) : {};
          const updatedAdminProfile = {
            ...parsed,
            code: 'ADMIN001',
            email: adminEmailUpdatedInAuth ? desiredEmail : (parsed?.email || firebaseUser.email),
            contactEmail: desiredEmail,
            // NOTE: chat screens treat adminData.username as display label.
            username: desiredFullName,
          };
          await AsyncStorage.setItem('adminProfile_ADMIN001', JSON.stringify(updatedAdminProfile));
        } catch (e) {
          // Ignore local cache issues.
        }

        // Update any locally cached users list entry for ADMIN001.
        try {
          const usersData = await AsyncStorage.getItem('users');
          if (usersData) {
            const users = JSON.parse(usersData);
            if (Array.isArray(users)) {
              const updatedUsers = users.map(u => {
                const uUsername = (u?.username || '').toString().trim().toUpperCase();
                const uCode = (u?.code || '').toString().trim().toUpperCase();
                const uEmail = (u?.email || '').toString().trim().toLowerCase();
                const matchesAdmin001 = uUsername === 'ADMIN001' || uCode === 'ADMIN001' || uEmail === 'nurse@876.com' || uEmail === 'shertonia@care.com';
                if (!matchesAdmin001) return u;
                return {
                  ...u,
                  fullName: desiredFullName,
                  contactEmail: desiredEmail,
                  ...(adminEmailUpdatedInAuth ? { email: desiredEmail } : {}),
                };
              });
              await AsyncStorage.setItem('users', JSON.stringify(updatedUsers));
            }
          }
        } catch (e) {
          // Ignore local cache issues.
        }
      }

      setUser({
        id: firebaseUser.uid,
        email: firebaseUser.email,
        ...resolvedProfile,
      });

      // Register push notification token
      await registerPushToken(firebaseUser.uid);

      // Clear sequence cache for admin users
      if (resolvedProfile?.role === 'admin' || resolvedProfile?.role === 'superAdmin') {
        await clearAllSequenceCache();
      }

      return { success: true, user: resolvedProfile };
    } catch (error) {
      console.error('Login error:', error);
      let errorMessage = 'An error occurred during login';
      
      if (error.code === 'auth/user-not-found') {
        errorMessage = 'Email not found';
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = 'Incorrect password';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address';
      } else if (error.code === 'auth/user-disabled') {
        errorMessage = 'User account is disabled';
      }

      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (username, email, password, phone, address, country) => {
    try {
      setIsLoading(true);

      // Check if email already exists
      const existingUser = await FirebaseService.getUserByEmail(email);
      if (existingUser.success) {
        return { success: false, error: 'Email already registered' };
      }

      // Check if username already exists
      const existingUsername = await FirebaseService.getUserByUsername(username);
      if (existingUsername.success) {
        return { success: false, error: 'Username already taken' };
      }

      // Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;

      // Update Firebase Auth profile
      await updateProfile(firebaseUser, {
        displayName: username,
      });

      // Determine user role based on username pattern
      let userRole = 'patient'; // Default to patient
      
      if (username.match(/^ADMIN\d{3}$/i)) {
        userRole = username.toUpperCase() === 'ADMIN001' ? 'superAdmin' : 'admin';
      } else if (username.match(/^NURSE\d{3}$/i)) {
        userRole = 'nurse';
      }

      // Create user profile in Firestore
      const userData = {
        id: firebaseUser.uid,
        username,
        email,
        phone,
        address,
        country,
        role: userRole,
        displayName: username,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const createResult = await FirebaseService.createUser(firebaseUser.uid, userData);

      if (createResult.success) {
        // Send welcome email
        try {
          await EmailService.sendWelcomeEmail({ 
            email, 
            name: username 
          });
        } catch (emailError) {
          console.warn('Failed to send welcome email:', emailError);
          // Don't fail signup if email fails
        }

        // Sign out the newly created user (require them to sign in)
        await signOut(auth);
        return { success: true, requiresSignin: true };
      } else {
        // Delete the Firebase Auth user if Firestore creation failed
        await firebaseUser.delete();
        return { success: false, error: 'Failed to create user profile' };
      }
    } catch (error) {
      console.error('Signup error:', error);
      let errorMessage = 'An error occurred during signup';
      
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'Email already registered';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Password is too weak (minimum 6 characters)';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address';
      }

      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      setIsLoading(true);
      await signOut(auth);
      setUser(null);
      await AsyncStorage.removeItem('user');
      await AsyncStorage.removeItem('authToken');
      // Set flag to show splash screen after logout
      await AsyncStorage.setItem('shouldShowSplash', 'true');
      return { success: true };
    } catch (error) {
      console.error('Logout error:', error);
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  };

  const resetPassword = async (email) => {
    try {
      // Send Firebase password reset email
      await sendPasswordResetEmail(auth, email);
      
      // Also send our custom email notification
      try {
        // Get user info for personalized email
        const userInfo = await FirebaseService.getUserByEmail(email);
        
        await EmailService.sendPasswordReset({
          to: email,
          resetLink: `Reset via Firebase Authentication`, // Firebase handles the actual link
          userName: userInfo?.fullName || userInfo?.name || userInfo?.username
        });
      } catch (emailError) {
        console.warn('Custom reset email failed, but Firebase email sent:', emailError);
      }
      
      return { success: true };
    } catch (error) {
      console.error('Password reset error:', error);
      let errorMessage = 'An error occurred';
      
      if (error.code === 'auth/user-not-found') {
        errorMessage = 'Email not found';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address';
      }

      return { success: false, error: errorMessage };
    }
  };

  const persistUserUpdates = async (targetUserId, updates = {}) => {
    try {
      const result = await FirebaseService.updateUser(targetUserId, updates);
      if (result.success && targetUserId === user?.id) {
        const updatedUser = { ...(user || {}), ...updates };
        setUser(updatedUser);
        await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
      }
      return result;
    } catch (error) {
      console.error('Update profile error:', error);
      return { success: false, error: error.message };
    }
  };

  const updateUser = async (updates = {}) => {
    if (!user?.id) {
      return { success: false, error: 'No authenticated user' };
    }
    return persistUserUpdates(user.id, updates);
  };

  const updateUserProfile = async (userId, updates = {}) => {
    if (!userId) {
      return { success: false, error: 'Missing userId' };
    }
    return persistUserUpdates(userId, updates);
  };

  const value = {
    user,
    isLoading,
    login,
    signup,
    logout,
    resetPassword,
    changePassword,
    updateUser,
    updateUserProfile,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
