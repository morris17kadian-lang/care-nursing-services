import TouchableWeb from "../components/TouchableWeb";
import React, { useEffect, useRef, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Animated, 
  Dimensions, 
  Image, 
  TextInput, 
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Keyboard
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GRADIENTS, COLORS, SPACING } from '../constants';
import { useAuth } from '../context/AuthContext';

const { width, height } = Dimensions.get('window');

export default function SplashScreen({ onFinish }) {
  // Authentication state
  const [showAuthForms, setShowAuthForms] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [emailOrCode, setEmailOrCode] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const { login, signup } = useAuth();
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.2)).current;
  const translateYAnim = useRef(new Animated.Value(0)).current;
  const authFormsOpacity = useRef(new Animated.Value(0)).current;
  const authFormsTranslateY = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    // Load saved credentials if remember me was checked
    loadSavedCredentials();
    
    // Keyboard event listeners
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      () => setIsKeyboardVisible(true)
    );
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => setIsKeyboardVisible(false)
    );
    
    // Step 1: Animate logo entrance (fade in and scale up) - Smooth, no pulsing
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 100, // Reduced from 800ms
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 400, // Use timing instead of spring to eliminate pulsing
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Step 2: After logo appears, wait briefly then slide up
      setTimeout(() => {
        Animated.parallel([
          Animated.timing(scaleAnim, {
            toValue: 0.6, // Scale down slightly for login page size
            duration: 600, // Reduced from 800ms
            useNativeDriver: true,
          }),
          Animated.timing(translateYAnim, {
            toValue: -height * 0.45, // Move logo even higher
            duration: 600, // Reduced from 800ms
            useNativeDriver: true,
          }),
        ]).start(() => {
          // Step 4: After slide animation, show auth forms immediately
          setShowAuthForms(true);
          // Fade in the auth forms
          Animated.parallel([
            Animated.timing(authFormsOpacity, {
              toValue: 1,
              duration: 100, // Reduced from 600ms
              useNativeDriver: true,
            }),
            Animated.timing(authFormsTranslateY, {
              toValue: 0,
              duration: 100, // Reduced from 600ms
              useNativeDriver: true,
            }),
          ]).start();
        });
      }, 800); // Reduced from 2000ms to 800ms
    });

    // Cleanup keyboard listeners
    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  const loadSavedCredentials = async () => {
    try {
      const savedCredentials = await AsyncStorage.getItem('savedCredentials');
      if (savedCredentials) {
        const { emailOrCode, password, rememberMe } = JSON.parse(savedCredentials);
        setEmailOrCode(emailOrCode);
        setPassword(password);
        setRememberMe(rememberMe);
      }
    } catch (error) {
      console.error('Error loading saved credentials:', error);
    }
  };

  const saveCredentials = async (emailOrCode, password) => {
    try {
      const credentials = {
        emailOrCode,
        password,
        rememberMe: true
      };
      await AsyncStorage.setItem('savedCredentials', JSON.stringify(credentials));
    } catch (error) {
      console.error('Error saving credentials:', error);
    }
  };

  const clearSavedCredentials = async () => {
    try {
      await AsyncStorage.removeItem('savedCredentials');
    } catch (error) {
      console.error('Error clearing saved credentials:', error);
    }
  };

  const handleRememberMeToggle = async () => {
    const newRememberMe = !rememberMe;
    setRememberMe(newRememberMe);
    
    // If unchecking remember me, clear saved credentials
    if (!newRememberMe) {
      await clearSavedCredentials();
    }
  };

  const handleToggleAuth = (isLoginMode) => {
    setIsLogin(isLoginMode);
    // Clear form fields when switching modes
    if (isLoginMode) {
      // Switching to login - clear signup fields
      setUsername('');
      setEmail('');
      setConfirmPassword('');
      // Load saved credentials if available for login
      loadSavedCredentials();
    } else {
      // Switching to signup - clear login fields and remember me
      setEmailOrCode('');
      setPassword('');
      setRememberMe(false);
    }
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  const handleLogin = async () => {
    if (!emailOrCode.trim() || !password.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setIsLoading(true);
    console.log('Attempting login with:', { emailOrCode: emailOrCode.trim(), password: '***' });
    
    const result = await login(emailOrCode.trim(), password);
    console.log('Login result:', result);
    
    setIsLoading(false);

    if (!result.success) {
      Alert.alert('Login Failed', result.error);
    } else {
      // Handle remember me functionality
      if (rememberMe) {
        await saveCredentials(emailOrCode.trim(), password);
      } else {
        await clearSavedCredentials();
      }
      
      console.log('Login successful, calling onFinish');
      // Call onFinish to hide splash screen and navigate to main app
      if (onFinish) {
        onFinish();
      }
    }
  };

  const handleSignup = async () => {
    if (!username.trim() || !email.trim() || !password.trim() || !confirmPassword.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (!email.includes('@')) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    setIsLoading(true);
    const result = await signup(username.trim(), email.trim(), password);
    setIsLoading(false);

    if (!result.success) {
      Alert.alert('Signup Failed', result.error);
    } else {
      console.log('Signup successful, calling onFinish');
      // Call onFinish to hide splash screen and navigate to main app
      if (onFinish) {
        onFinish();
      }
    }
  };

  return (
    <LinearGradient
      colors={GRADIENTS.splash}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={styles.container}
    >
      {/* Fixed Logo */}
      <Animated.View
        style={[
          styles.logoContainer,
          {
            opacity: fadeAnim,
            transform: [
              { scale: scaleAnim },
              { translateY: translateYAnim },
            ],
          },
        ]}
      >
        <Image
          source={require('../assets/Images/CARElogo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </Animated.View>

      {/* Fixed Authentication Forms Container */}
      {showAuthForms && (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardAvoidingView}
        >
          <Animated.View
            style={[
              styles.authContainer,
              {
                opacity: authFormsOpacity,
                transform: [{ translateY: authFormsTranslateY }]
              }
            ]}
          >
            <View style={styles.fixedAuthBox}>
              <ScrollView 
                contentContainerStyle={[
                  styles.scrollContainer,
                  isKeyboardVisible && styles.scrollContainerKeyboard
                ]}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                bounces={false}
                scrollEnabled={isKeyboardVisible}
              >
                <View style={[
                  styles.authContent,
                  !isLogin && styles.authContentExpanded,
                  isKeyboardVisible && styles.authContentKeyboard
                ]}>
          {/* Toggle Buttons */}
          <View style={styles.toggleContainer}>
            <TouchableWeb
              style={[styles.toggleButton, isLogin && styles.activeToggle]}
              onPress={() => handleToggleAuth(true)}
            >
              <Text style={[styles.toggleText, isLogin && styles.activeToggleText]}>
                Sign In
              </Text>
            </TouchableWeb>
            <TouchableWeb
              style={[styles.toggleButton, !isLogin && styles.activeToggle]}
              onPress={() => handleToggleAuth(false)}
            >
              <Text style={[styles.toggleText, !isLogin && styles.activeToggleText]}>
                Sign Up
              </Text>
            </TouchableWeb>
          </View>

          {/* Form Fields */}
          <View style={styles.formContainer}>
            {!isLogin && (
              <View style={styles.inputContainer}>
                <MaterialCommunityIcons name="account" size={24} color="#4A90E2" />
                <TextInput
                  style={styles.input}
                  placeholder="Username"
                  value={username}
                  onChangeText={setUsername}
                  placeholderTextColor="#666"
                />
              </View>
            )}

            <View style={styles.inputContainer}>
              <MaterialCommunityIcons 
                name={!isLogin ? "email" : "card-account-details"} 
                size={24} 
                color="#4A90E2" 
              />
              <TextInput
                style={styles.input}
                placeholder={!isLogin ? "Email" : "Email or Staff Code"}
                value={!isLogin ? email : emailOrCode}
                onChangeText={!isLogin ? setEmail : setEmailOrCode}
                placeholderTextColor="#666"
                autoCapitalize="none"
                keyboardType={!isLogin ? "email-address" : "default"}
              />
            </View>

            <View style={styles.inputContainer}>
              <MaterialCommunityIcons name="lock" size={24} color="#4A90E2" />
              <TextInput
                style={styles.input}
                placeholder="Password"
                value={password}
                onChangeText={setPassword}
                placeholderTextColor="#666"
                secureTextEntry={!showPassword}
              />
              <TouchableWeb
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeIcon}
              >
                <MaterialCommunityIcons
                  name={showPassword ? 'eye-off' : 'eye'}
                  size={20}
                  color="#4A90E2"
                />
              </TouchableWeb>
            </View>

            {!isLogin && (
              <View style={styles.inputContainer}>
                <MaterialCommunityIcons name="lock-check" size={24} color="#4A90E2" />
                <TextInput
                  style={styles.input}
                  placeholder="Confirm Password"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholderTextColor="#666"
                  secureTextEntry={!showConfirmPassword}
                />
                <TouchableWeb
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={styles.eyeIcon}
                >
                  <MaterialCommunityIcons
                    name={showConfirmPassword ? 'eye-off' : 'eye'}
                    size={20}
                    color="#4A90E2"
                  />
                </TouchableWeb>
              </View>
            )}
          </View>

          {/* Forgot Password - Only show for login */}
          {isLogin && (
            <View style={styles.rememberMeContainer}>
              <TouchableWeb
                style={styles.rememberMeButton}
                onPress={handleRememberMeToggle}
              >
                <MaterialCommunityIcons
                  name={rememberMe ? "checkbox-marked" : "checkbox-blank-outline"}
                  size={20}
                  color="rgba(255, 255, 255, 0.9)"
                />
                <Text style={styles.rememberMeText}>Remember Me</Text>
              </TouchableWeb>
              <TouchableWeb style={styles.forgotPassword}>
                <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
              </TouchableWeb>
            </View>
          )}

          {/* Terms - Only show for signup */}
          {!isLogin && (
            <Text style={styles.termsText}>
              By signing up, you agree to our{' '}
              <Text style={styles.termsLink}>Terms of Service</Text> and{' '}
              <Text style={styles.termsLink}>Privacy Policy</Text>
            </Text>
          )}

          {/* Submit Button */}
          <TouchableWeb
            style={[styles.submitButton, isLoading && styles.disabledButton]}
            onPress={!isLogin ? handleSignup : handleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#4A90E2" size="small" />
            ) : (
              <Text style={styles.submitButtonText}>
                {!isLogin ? 'Sign Up' : 'Sign In'}
              </Text>
            )}
          </TouchableWeb>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Register/Login Link */}
          <View style={styles.linkContainer}>
            <Text style={styles.linkText}>
              {isLogin ? "Don't have an account? " : "Already have an account? "}
            </Text>
            <TouchableWeb onPress={() => handleToggleAuth(!isLogin)}>
              <Text style={styles.linkButton}>
                {isLogin ? "Register" : "Sign In"}
              </Text>
            </TouchableWeb>
          </View>
                </View>
              </ScrollView>
            </View>
          </Animated.View>
        </KeyboardAvoidingView>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  logoContainer: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    marginTop: -height * 0.175,
    zIndex: 1000,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  logo: {
    width: width * 0.7,
    height: height * 0.3,
  },
  authKeyboardView: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  authContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: height * 0.100, // Start below the logo
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 80,
  },
  staticContainer: {
    padding: 30,
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
  },
  fixedAuthBox: {
    width: '100%',
    maxWidth: 400,
    height: '80%', // Use more of available space below logo
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 24,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
    overflow: 'hidden',
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 30,
    justifyContent: 'center',
  },
  scrollContainerKeyboard: {
    justifyContent: 'flex-start', // When keyboard is visible, start from top instead of center
    paddingVertical: 20, // Reduce vertical padding to fit more content
    minHeight: 700, // Ensure content is tall enough to scroll
  },
  authContent: {
    alignItems: 'center',
    minHeight: 400, // Content height
  },
  authContentExpanded: {
    minHeight: 520, // Expanded content height for signup
  },
  authContentKeyboard: {
    minHeight: 550, // Taller content when keyboard is visible to ensure scrolling
    paddingBottom: 50, // Extra bottom padding to ensure last elements are reachable
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 25,
    marginBottom: 20,
    overflow: 'hidden',
    width: '100%',
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  activeToggle: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  toggleText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  activeToggleText: {
    color: '#4A90E2',
  },
  formContainer: {
    marginBottom: 20,
    width: '100%',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    paddingHorizontal: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    marginLeft: 10,
    fontSize: 16,
    color: '#333',
  },
  eyeIcon: {
    padding: 4,
  },
  rememberMeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 20,
    color: '#000',
  },
  rememberMeButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rememberMeText: {
    fontSize: 14,
    color: 'rgba(8, 8, 8, 1))',
    marginLeft: 8,
  },
  forgotPassword: {
    padding: 5,
  },
  forgotPasswordText: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(8, 8, 8, 1))',
  },
  termsText: {
    fontSize: 11,
    color: 'rgba(8, 8, 8, 1)',
    textAlign: 'center',
    marginBottom: 15,
    lineHeight: 16,
  },
  termsLink: {
    color: '#1005efff',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
    width: '100%',
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  dividerText: {
    marginHorizontal: 15,
    fontSize: 14,
    color: '#1005efff',
  },
  linkContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -5, // Reduced from 10 to 5
  },
  linkText: {
    fontSize: 14,
    color: '#000', // Changed to black
  },
  linkButton: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1005efff',
    textDecorationLine: 'underline',
  },
  submitButton: {
    borderRadius: 50,
    overflow: 'hidden',
    backgroundColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
    width: '100%',
    paddingVertical: 15,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#CCCCCC',
    shadowOpacity: 0,
    elevation: 0,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4A90E2',
  },
});
