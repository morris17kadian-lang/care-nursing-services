import TouchableWeb from "../components/TouchableWeb";
import React, { useEffect, useRef, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Animated, 
  useWindowDimensions,
  Image, 
  TextInput, 
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Keyboard,
  Modal,
  FlatList
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GRADIENTS, COLORS, SPACING } from '../constants';
import { useAuth } from '../context/AuthContext';

// Country list with currency - All countries worldwide
const COUNTRIES = [
  { name: 'Afghanistan', code: 'AF', currency: 'AFN', symbol: '؋' },
  { name: 'Albania', code: 'AL', currency: 'ALL', symbol: 'L' },
  { name: 'Algeria', code: 'DZ', currency: 'DZD', symbol: 'د.ج' },
  { name: 'Argentina', code: 'AR', currency: 'ARS', symbol: '$' },
  { name: 'Armenia', code: 'AM', currency: 'AMD', symbol: '֏' },
  { name: 'Australia', code: 'AU', currency: 'AUD', symbol: 'A$' },
  { name: 'Austria', code: 'AT', currency: 'EUR', symbol: '€' },
  { name: 'Azerbaijan', code: 'AZ', currency: 'AZN', symbol: '₼' },
  { name: 'Bahrain', code: 'BH', currency: 'BHD', symbol: '.د.ب' },
  { name: 'Bangladesh', code: 'BD', currency: 'BDT', symbol: '৳' },
  { name: 'Belarus', code: 'BY', currency: 'BYN', symbol: 'Br' },
  { name: 'Belgium', code: 'BE', currency: 'EUR', symbol: '€' },
  { name: 'Bolivia', code: 'BO', currency: 'BOB', symbol: 'Bs.' },
  { name: 'Brazil', code: 'BR', currency: 'BRL', symbol: 'R$' },
  { name: 'Bulgaria', code: 'BG', currency: 'BGN', symbol: 'лв' },
  { name: 'Cambodia', code: 'KH', currency: 'KHR', symbol: '៛' },
  { name: 'Canada', code: 'CA', currency: 'CAD', symbol: 'C$' },
  { name: 'Chile', code: 'CL', currency: 'CLP', symbol: '$' },
  { name: 'China', code: 'CN', currency: 'CNY', symbol: '¥' },
  { name: 'Colombia', code: 'CO', currency: 'COP', symbol: '$' },
  { name: 'Croatia', code: 'HR', currency: 'EUR', symbol: '€' },
  { name: 'Czech Republic', code: 'CZ', currency: 'CZK', symbol: 'Kč' },
  { name: 'Denmark', code: 'DK', currency: 'DKK', symbol: 'kr' },
  { name: 'Dominican Republic', code: 'DO', currency: 'DOP', symbol: '$' },
  { name: 'Ecuador', code: 'EC', currency: 'USD', symbol: '$' },
  { name: 'Egypt', code: 'EG', currency: 'EGP', symbol: '£' },
  { name: 'Estonia', code: 'EE', currency: 'EUR', symbol: '€' },
  { name: 'Ethiopia', code: 'ET', currency: 'ETB', symbol: 'Br' },
  { name: 'Finland', code: 'FI', currency: 'EUR', symbol: '€' },
  { name: 'France', code: 'FR', currency: 'EUR', symbol: '€' },
  { name: 'Georgia', code: 'GE', currency: 'GEL', symbol: '₾' },
  { name: 'Germany', code: 'DE', currency: 'EUR', symbol: '€' },
  { name: 'Ghana', code: 'GH', currency: 'GHS', symbol: '₵' },
  { name: 'Greece', code: 'GR', currency: 'EUR', symbol: '€' },
  { name: 'Guatemala', code: 'GT', currency: 'GTQ', symbol: 'Q' },
  { name: 'Hong Kong', code: 'HK', currency: 'HKD', symbol: 'HK$' },
  { name: 'Hungary', code: 'HU', currency: 'HUF', symbol: 'Ft' },
  { name: 'Iceland', code: 'IS', currency: 'ISK', symbol: 'kr' },
  { name: 'India', code: 'IN', currency: 'INR', symbol: '₹' },
  { name: 'Indonesia', code: 'ID', currency: 'IDR', symbol: 'Rp' },
  { name: 'Iran', code: 'IR', currency: 'IRR', symbol: '﷼' },
  { name: 'Iraq', code: 'IQ', currency: 'IQD', symbol: 'ع.د' },
  { name: 'Ireland', code: 'IE', currency: 'EUR', symbol: '€' },
  { name: 'Israel', code: 'IL', currency: 'ILS', symbol: '₪' },
  { name: 'Italy', code: 'IT', currency: 'EUR', symbol: '€' },
  { name: 'Jamaica', code: 'JM', currency: 'JMD', symbol: 'J$' },
  { name: 'Japan', code: 'JP', currency: 'JPY', symbol: '¥' },
  { name: 'Jordan', code: 'JO', currency: 'JOD', symbol: 'د.ا' },
  { name: 'Kazakhstan', code: 'KZ', currency: 'KZT', symbol: '₸' },
  { name: 'Kenya', code: 'KE', currency: 'KES', symbol: 'KSh' },
  { name: 'Kuwait', code: 'KW', currency: 'KWD', symbol: 'د.ك' },
  { name: 'Latvia', code: 'LV', currency: 'EUR', symbol: '€' },
  { name: 'Lebanon', code: 'LB', currency: 'LBP', symbol: 'ل.ل' },
  { name: 'Lithuania', code: 'LT', currency: 'EUR', symbol: '€' },
  { name: 'Luxembourg', code: 'LU', currency: 'EUR', symbol: '€' },
  { name: 'Malaysia', code: 'MY', currency: 'MYR', symbol: 'RM' },
  { name: 'Mexico', code: 'MX', currency: 'MXN', symbol: '$' },
  { name: 'Morocco', code: 'MA', currency: 'MAD', symbol: 'د.م.' },
  { name: 'Netherlands', code: 'NL', currency: 'EUR', symbol: '€' },
  { name: 'New Zealand', code: 'NZ', currency: 'NZD', symbol: 'NZ$' },
  { name: 'Nigeria', code: 'NG', currency: 'NGN', symbol: '₦' },
  { name: 'Norway', code: 'NO', currency: 'NOK', symbol: 'kr' },
  { name: 'Oman', code: 'OM', currency: 'OMR', symbol: 'ر.ع.' },
  { name: 'Pakistan', code: 'PK', currency: 'PKR', symbol: '₨' },
  { name: 'Panama', code: 'PA', currency: 'PAB', symbol: 'B/.' },
  { name: 'Peru', code: 'PE', currency: 'PEN', symbol: 'S/' },
  { name: 'Philippines', code: 'PH', currency: 'PHP', symbol: '₱' },
  { name: 'Poland', code: 'PL', currency: 'PLN', symbol: 'zł' },
  { name: 'Portugal', code: 'PT', currency: 'EUR', symbol: '€' },
  { name: 'Qatar', code: 'QA', currency: 'QAR', symbol: 'ر.ق' },
  { name: 'Romania', code: 'RO', currency: 'RON', symbol: 'lei' },
  { name: 'Russia', code: 'RU', currency: 'RUB', symbol: '₽' },
  { name: 'Saudi Arabia', code: 'SA', currency: 'SAR', symbol: '﷼' },
  { name: 'Serbia', code: 'RS', currency: 'RSD', symbol: 'дин.' },
  { name: 'Singapore', code: 'SG', currency: 'SGD', symbol: 'S$' },
  { name: 'Slovakia', code: 'SK', currency: 'EUR', symbol: '€' },
  { name: 'Slovenia', code: 'SI', currency: 'EUR', symbol: '€' },
  { name: 'South Africa', code: 'ZA', currency: 'ZAR', symbol: 'R' },
  { name: 'South Korea', code: 'KR', currency: 'KRW', symbol: '₩' },
  { name: 'Spain', code: 'ES', currency: 'EUR', symbol: '€' },
  { name: 'Sri Lanka', code: 'LK', currency: 'LKR', symbol: '₨' },
  { name: 'Sweden', code: 'SE', currency: 'SEK', symbol: 'kr' },
  { name: 'Switzerland', code: 'CH', currency: 'CHF', symbol: 'CHF' },
  { name: 'Taiwan', code: 'TW', currency: 'TWD', symbol: 'NT$' },
  { name: 'Thailand', code: 'TH', currency: 'THB', symbol: '฿' },
  { name: 'Tunisia', code: 'TN', currency: 'TND', symbol: 'د.ت' },
  { name: 'Turkey', code: 'TR', currency: 'TRY', symbol: '₺' },
  { name: 'Ukraine', code: 'UA', currency: 'UAH', symbol: '₴' },
  { name: 'United Arab Emirates', code: 'AE', currency: 'AED', symbol: 'د.إ' },
  { name: 'United Kingdom', code: 'GB', currency: 'GBP', symbol: '£' },
  { name: 'United States', code: 'US', currency: 'USD', symbol: '$' },
  { name: 'Uruguay', code: 'UY', currency: 'UYU', symbol: '$U' },
  { name: 'Venezuela', code: 'VE', currency: 'VES', symbol: 'Bs.S' },
  { name: 'Vietnam', code: 'VN', currency: 'VND', symbol: '₫' },
  { name: 'Yemen', code: 'YE', currency: 'YER', symbol: '﷼' },
  { name: 'Zambia', code: 'ZM', currency: 'ZMW', symbol: 'ZK' },
  { name: 'Zimbabwe', code: 'ZW', currency: 'ZWL', symbol: 'Z$' },
].sort((a, b) => a.name.localeCompare(b.name));

export default function SplashScreen({ onFinish }) {
  // Get screen dimensions
  const { width, height } = useWindowDimensions();
  
  // Authentication state
  const [showAuthForms, setShowAuthForms] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [signupUsername, setSignupUsername] = useState('');
  const [email, setEmail] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState(COUNTRIES.find(country => country.code === 'JM') || COUNTRIES[0]);
  const [showCountryModal, setShowCountryModal] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');
  const { login, signup } = useAuth();
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current; // Start invisible for entrance animation
  const scaleAnim = useRef(new Animated.Value(0.2)).current; // Start small for entrance animation
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
    
    // Step 1: Logo entrance animation (fade in and scale up)
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Step 2: Wait to show the logo, then move to login position
      setTimeout(() => {
        Animated.parallel([
          Animated.timing(scaleAnim, {
            toValue: 0.6, // Scale down for login page
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(translateYAnim, {
            toValue: -height * 0.45, // Move logo up
            duration: 600,
            useNativeDriver: true,
          }),
        ]).start(() => {
          // Step 3: Show auth forms
          setShowAuthForms(true);
          Animated.parallel([
            Animated.timing(authFormsOpacity, {
              toValue: 1,
              duration: 600,
              useNativeDriver: true,
            }),
            Animated.timing(authFormsTranslateY, {
              toValue: 0,
              duration: 600,
              useNativeDriver: true,
            }),
          ]).start();
        });
      }, 1300); // Show full logo for 1.3 seconds
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
        const { username, password, rememberMe } = JSON.parse(savedCredentials);
        setUsername(username);
        setPassword(password);
        setRememberMe(rememberMe);
      }
    } catch (error) {
      console.error('Error loading saved credentials:', error);
    }
  };

  const saveCredentials = async (username, password) => {
    try {
      const credentials = {
        username,
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
      setSignupUsername('');
      setEmail('');
      setConfirmPassword('');
      // Load saved credentials if available for login
      loadSavedCredentials();
    } else {
      // Switching to signup - clear login fields and remember me
      setUsername('');
      setPassword('');
      setRememberMe(false);
    }
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setIsLoading(true);
    console.log('Attempting login with:', { username: username.trim(), password: '***' });
    
    const result = await login(username.trim(), password);
    console.log('Login result:', result);
    
    setIsLoading(false);

    if (!result.success) {
      Alert.alert('Login Failed', result.error);
    } else {
      // Handle remember me functionality
      if (rememberMe) {
        await saveCredentials(username.trim(), password);
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

  const filteredCountries = COUNTRIES.filter(country =>
    country.name.toLowerCase().includes(countrySearch.toLowerCase()) ||
    country.code.toLowerCase().includes(countrySearch.toLowerCase())
  );

  const handleSignup = async () => {
    if (!signupUsername.trim() || !email.trim() || !password.trim() || !confirmPassword.trim() || !selectedCountry) {
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
    const result = await signup(signupUsername.trim(), email.trim(), password);
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
            <LinearGradient
              colors={GRADIENTS.header}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={styles.fixedAuthBox}
            >
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
                <MaterialCommunityIcons name="account" size={20} color="rgba(255, 255, 255, 0.8)" />
                <TextInput
                  style={styles.input}
                  placeholder="Username"
                  value={signupUsername}
                  onChangeText={setSignupUsername}
                  placeholderTextColor="rgba(255, 255, 255, 0.7)"
                />
              </View>
            )}

            <View style={styles.inputContainer}>
              <MaterialCommunityIcons 
                name={isLogin ? "account" : "email"} 
                size={20} 
                color="rgba(255, 255, 255, 0.8)" 
              />
              <TextInput
                style={styles.input}
                placeholder={isLogin ? "Username" : "Email"}
                value={isLogin ? username : email}
                onChangeText={isLogin ? setUsername : setEmail}
                placeholderTextColor="rgba(255, 255, 255, 0.7)"
                autoCapitalize="none"
                keyboardType={!isLogin ? "email-address" : "default"}
              />
            </View>

            {!isLogin && (
              <TouchableWeb
                onPress={() => setShowCountryModal(true)}
                style={styles.countryContainer}
              >
                <MaterialCommunityIcons name="map-marker" size={20} color="rgba(255, 255, 255, 0.8)" />
                <Text style={styles.countryDisplay}>
                  {selectedCountry.name} ({selectedCountry.symbol})
                </Text>
                <MaterialCommunityIcons
                  name="chevron-down"
                  size={18}
                  color="rgba(255, 255, 255, 0.8)"
                />
              </TouchableWeb>
            )}

            <View style={styles.inputContainer}>
              <MaterialCommunityIcons name="lock" size={20} color="rgba(255, 255, 255, 0.8)" />
              <TextInput
                style={styles.input}
                placeholder="Password"
                value={password}
                onChangeText={setPassword}
                placeholderTextColor="rgba(255, 255, 255, 0.7)"
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
            </LinearGradient>
          </Animated.View>
        </KeyboardAvoidingView>
      )}

      {/* Country Modal */}
      <Modal
        visible={showCountryModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowCountryModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Country</Text>
              <TouchableWeb
                onPress={() => setShowCountryModal(false)}
                style={styles.modalCloseButton}
              >
                <MaterialCommunityIcons
                  name="close"
                  size={24}
                  color={COLORS.text}
                />
              </TouchableWeb>
            </View>

            <View style={styles.searchContainer}>
              <MaterialCommunityIcons
                name="magnify"
                size={20}
                color={COLORS.textMuted}
                style={styles.searchIcon}
              />
              <TextInput
                style={styles.searchInput}
                placeholder="Search countries..."
                placeholderTextColor={COLORS.textMuted}
                value={countrySearch}
                onChangeText={setCountrySearch}
              />
            </View>

            <FlatList
              data={filteredCountries}
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => (
                <TouchableWeb
                  onPress={() => {
                    setSelectedCountry(item);
                    setShowCountryModal(false);
                    setCountrySearch('');
                  }}
                  style={[
                    styles.countryOption,
                    selectedCountry.code === item.code && styles.countryOptionSelected,
                  ]}
                >
                  <Text style={styles.countryOptionText}>
                    {item.name}
                  </Text>
                  <Text style={styles.currencyOptionText}>
                    {item.currency} ({item.symbol})
                  </Text>
                </TouchableWeb>
              )}
            />
          </View>
        </View>
      </Modal>
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
  textLogo: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontSize: 48,
    fontWeight: '800',
    color: '#0066cc',
    letterSpacing: 3,
    fontFamily: 'Poppins_700Bold',
  },
  logoSubtext: {
    fontSize: 16,
    color: '#22d0cd',
    fontWeight: '600',
    marginTop: -5,
    letterSpacing: 1,
    fontFamily: 'Poppins_600SemiBold',
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
    paddingVertical: 70,
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
    paddingHorizontal: 5,
    paddingVertical: 8,
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.6)',
  },
  countryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 5,
    paddingVertical: 8,
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.6)',
  },
  input: {
    flex: 1,
    paddingVertical: 8,
    marginLeft: 12,
    fontSize: 16,
    color: '#fff',
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
    color: '#fff',
    marginLeft: 8,
  },
  forgotPassword: {
    padding: 5,
  },
  forgotPasswordText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#fff',
  },
  termsText: {
    fontSize: 11,
    color: '#fff',
    textAlign: 'center',
    marginBottom: 15,
    marginTop: -30,
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
  countryDisplay: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: '#fff',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    paddingTop: 0,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  modalCloseButton: {
    padding: SPACING.sm,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: SPACING.lg,
    marginVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    backgroundColor: COLORS.background,
    borderRadius: 12,
  },
  searchIcon: {
    marginRight: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    paddingVertical: SPACING.sm,
    fontSize: 15,
    color: COLORS.text,
  },
  countryOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  countryOptionSelected: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
  },
  countryOptionText: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.text,
    flex: 1,
  },
  currencyOptionText: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginLeft: SPACING.md,
  },
});
