import './web.config';
import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View, Text } from 'react-native';
import {
  useFonts,
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from '@expo-google-fonts/poppins';

import { AuthProvider, useAuth } from './context/AuthContext';
import SplashScreen from './screens/SplashScreen';
import LoginScreen from './screens/LoginScreen';
import SignupScreen from './screens/SignupScreen';
import HomeScreen from './screens/HomeScreen';
import AppointmentsScreen from './screens/AppointmentsScreen';
import BookScreen from './screens/BookScreen';
import ContactScreen from './screens/ContactScreen';
import SettingsScreen from './screens/SettingsScreen';
import NotificationsScreen from './screens/NotificationsScreen';
import AdminDashboardScreen from './screens/AdminDashboardScreen';
import AdminClientsScreen from './screens/AdminClientsScreen';
import AdminAnalyticsScreen from './screens/AdminAnalyticsScreen';
import AdminPaymentsScreen from './screens/AdminPaymentsScreen';
import AdminChatScreen from './screens/AdminChatScreen';
import ProfileScreen from './screens/ProfileScreen';
import NurseProfileScreen from './screens/NurseProfileScreen';
import NurseAppointmentsScreen from './screens/NurseAppointmentsScreen';
import NurseChatScreen from './screens/NurseChatScreen';
import PatientChatScreen from './screens/PatientChatScreen';
import ChangePasswordScreen from './screens/ChangePasswordScreen';
import PrivacySecurityScreen from './screens/PrivacySecurityScreen';
import HelpScreen from './screens/HelpScreen';
import AboutScreen from './screens/AboutScreen';
import TermsScreen from './screens/TermsScreen';
import PrivacyPolicyScreen from './screens/PrivacyPolicyScreen';
import { COLORS } from './constants';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Custom Chat Tab Icon with Badge
function ChatTabIcon({ focused, color, size }) {
  // Sample unread count - in a real app, this would come from state management
  const unreadCount = 6; // Total unread messages from all patients
  
  return (
    <View style={{ position: 'relative' }}>
      <MaterialCommunityIcons 
        name={focused ? 'chat' : 'chat-outline'} 
        size={size} 
        color={color} 
      />
      {unreadCount > 0 && (
        <View style={{
          position: 'absolute',
          top: -6,
          right: -8,
          backgroundColor: '#FF4757',
          borderRadius: 10,
          minWidth: 20,
          height: 20,
          justifyContent: 'center',
          alignItems: 'center',
          borderWidth: 2,
          borderColor: COLORS.white,
        }}>
          <Text style={{
            color: COLORS.white,
            fontSize: 11,
            fontFamily: 'Poppins_600SemiBold',
            textAlign: 'center',
          }}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </Text>
        </View>
      )}
    </View>
  );
}

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Signup" component={SignupScreen} />
    </Stack.Navigator>
  );
}

function MainTabs() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainApp">
        {() => (
          <Tab.Navigator
            screenOptions={({ route }) => ({
              tabBarIcon: ({ focused, color, size }) => {
                let iconName;

                if (route.name === 'Home') {
                  iconName = focused ? 'home' : 'home-outline';
                } else if (route.name === 'Appointments') {
                  iconName = focused ? 'calendar-clock' : 'calendar-clock';
                } else if (route.name === 'Book') {
                  iconName = focused ? 'calendar-check' : 'calendar-check-outline';
                } else if (route.name === 'Chat') {
                  iconName = focused ? 'chat' : 'chat-outline';
                } else if (route.name === 'Settings') {
                  iconName = focused ? 'cog' : 'cog-outline';
                }

                return <MaterialCommunityIcons name={iconName} size={size} color={color} />;
              },
              tabBarActiveTintColor: COLORS.accent,
              tabBarInactiveTintColor: COLORS.textMuted,
              tabBarStyle: {
                backgroundColor: COLORS.white,
                borderTopWidth: 0,
                elevation: 20,
                shadowColor: COLORS.text,
                shadowOffset: { width: 0, height: -4 },
                shadowOpacity: 0.1,
                shadowRadius: 12,
                height: 90,
                paddingBottom: 34,
                paddingTop: 8,
                position: 'relative',
                zIndex: 10,
              },
              tabBarLabelStyle: {
                fontFamily: 'Poppins_600SemiBold',
                fontSize: 12,
              },
              headerShown: false,
            })}
          >
            <Tab.Screen name="Home" component={HomeScreen} />
            <Tab.Screen name="Appointments" component={AppointmentsScreen} />
            <Tab.Screen name="Book" component={BookScreen} />
            <Tab.Screen name="Chat" component={PatientChatScreen} />
            <Tab.Screen name="Settings" component={SettingsScreen} />
          </Tab.Navigator>
        )}
      </Stack.Screen>
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
      <Stack.Screen name="PrivacySecurity" component={PrivacySecurityScreen} />
      <Stack.Screen name="Help" component={HelpScreen} />
      <Stack.Screen name="About" component={AboutScreen} />
      <Stack.Screen name="Terms" component={TermsScreen} />
      <Stack.Screen name="Privacy" component={PrivacyPolicyScreen} />
    </Stack.Navigator>
  );
}

function NurseNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="NurseApp">
        {() => (
          <Tab.Navigator
            screenOptions={({ route }) => ({
              tabBarIcon: ({ focused, color, size }) => {
                let iconName;

                if (route.name === 'Appointments') {
                  iconName = focused ? 'calendar-clock' : 'calendar-clock';
                } else if (route.name === 'Chat') {
                  iconName = focused ? 'chat' : 'chat-outline';
                } else if (route.name === 'Profile') {
                  iconName = focused ? 'account-heart' : 'account-heart-outline';
                } else if (route.name === 'Settings') {
                  iconName = focused ? 'cog' : 'cog-outline';
                }

                return <MaterialCommunityIcons name={iconName} size={size} color={color} />;
              },
              tabBarActiveTintColor: COLORS.accent,
              tabBarInactiveTintColor: COLORS.textMuted,
              tabBarStyle: {
                backgroundColor: COLORS.white,
                borderTopWidth: 0,
                elevation: 20,
                shadowColor: COLORS.text,
                shadowOffset: { width: 0, height: -4 },
                shadowOpacity: 0.1,
                shadowRadius: 12,
                height: 90,
                paddingBottom: 34,
                paddingTop: 8,
                position: 'relative',
                zIndex: 10,
              },
              tabBarLabelStyle: {
                fontFamily: 'Poppins_600SemiBold',
                fontSize: 12,
              },
              headerShown: false,
            })}
          >
            <Tab.Screen name="Appointments" component={NurseAppointmentsScreen} />
            <Tab.Screen name="Chat" component={NurseChatScreen} />
            <Tab.Screen name="Profile" component={NurseProfileScreen} />
            <Tab.Screen name="Settings" component={SettingsScreen} />
          </Tab.Navigator>
        )}
      </Stack.Screen>
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
      <Stack.Screen name="PrivacySecurity" component={PrivacySecurityScreen} />
      <Stack.Screen name="Help" component={HelpScreen} />
      <Stack.Screen name="About" component={AboutScreen} />
      <Stack.Screen name="Terms" component={TermsScreen} />
      <Stack.Screen name="Privacy" component={PrivacyPolicyScreen} />
    </Stack.Navigator>
  );
}

function AdminDashboardNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="AdminApp">
        {() => (
          <Tab.Navigator
            screenOptions={({ route }) => ({
              tabBarIcon: ({ focused, color, size }) => {
                let iconName;

                if (route.name === 'Dashboard') {
                  iconName = focused ? 'view-dashboard' : 'view-dashboard-outline';
                } else if (route.name === 'Clients') {
                  iconName = focused ? 'account-group' : 'account-group-outline';
                } else if (route.name === 'Staff') {
                  iconName = focused ? 'account-heart' : 'account-heart-outline';
                } else if (route.name === 'Chat') {
                  return <ChatTabIcon focused={focused} color={color} size={24} />;
                } else if (route.name === 'Payments') {
                  iconName = focused ? 'cash-multiple' : 'cash-multiple';
                } else if (route.name === 'Settings') {
                  iconName = focused ? 'cog' : 'cog-outline';
                }

                return <MaterialCommunityIcons name={iconName} size={24} color={color} />;
              },
              tabBarActiveTintColor: COLORS.accent,
              tabBarInactiveTintColor: COLORS.textMuted,
              tabBarStyle: {
                backgroundColor: COLORS.white,
                borderTopWidth: 0,
                elevation: 20,
                shadowColor: COLORS.text,
                shadowOffset: { width: 0, height: -4 },
                shadowOpacity: 0.1,
                shadowRadius: 12,
                height: 90,
                paddingBottom: 34,
                paddingTop: 8,
                position: 'relative',
                zIndex: 10,
              },
              tabBarLabelStyle: {
                fontFamily: 'Poppins_600SemiBold',
                fontSize: 12,
              },
              headerShown: false,
            })}
          >
            <Tab.Screen name="Dashboard" component={AdminDashboardScreen} />
            <Tab.Screen name="Clients" component={AdminClientsScreen} />
            <Tab.Screen name="Staff" component={AdminAnalyticsScreen} />
            <Tab.Screen name="Chat" component={AdminChatScreen} />
            <Tab.Screen name="Payments" component={AdminPaymentsScreen} />
            <Tab.Screen name="Settings" component={SettingsScreen} />
          </Tab.Navigator>
        )}
      </Stack.Screen>
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
      <Stack.Screen name="PrivacySecurity" component={PrivacySecurityScreen} />
      <Stack.Screen name="Help" component={HelpScreen} />
      <Stack.Screen name="About" component={AboutScreen} />
      <Stack.Screen name="Terms" component={TermsScreen} />
      <Stack.Screen name="Privacy" component={PrivacyPolicyScreen} />
    </Stack.Navigator>
  );
}

function AppNavigator() {
  const { user, isLoading } = useAuth();
  const [showSplash, setShowSplash] = useState(true);

  if (showSplash) {
    return <SplashScreen onFinish={() => setShowSplash(false)} />;
  }

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  // Check user role for navigation
  const isAdmin = user?.role === 'admin';
  const isNurse = user?.role === 'nurse';

  return (
    <NavigationContainer>
      {user ? (
        isAdmin ? <AdminDashboardNavigator /> : 
        isNurse ? <NurseNavigator /> : 
        <MainTabs />
      ) : <AuthStack />}
    </NavigationContainer>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  if (!fontsLoaded) {
    return null;
  }

  return (
    <AuthProvider>
      <StatusBar style="light" />
      <AppNavigator />
    </AuthProvider>
  );
}
