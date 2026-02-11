import TouchableWeb from "../components/TouchableWeb";
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, FlatList, Modal, KeyboardAvoidingView, Platform, Keyboard, Alert, Linking, Image, Animated, PanResponder, Dimensions } from 'react-native';
import { WebView } from 'react-native-webview';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, GRADIENTS } from '../constants';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Audio } from 'expo-av';
import * as Contacts from 'expo-contacts';
import * as Location from 'expo-location';
import * as Sharing from 'expo-sharing';

const { width: screenWidth } = Dimensions.get('window');

// SwipeableChatItem component for swipe-to-delete functionality
const SwipeableChatItem = ({ 
  children, 
  onDelete, 
  contactName,
  style 
}) => {
  const translateX = useRef(new Animated.Value(0)).current;
  const [isDeleting, setIsDeleting] = useState(false);

  const panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: (evt, gestureState) => {
      return Math.abs(gestureState.dx) > Math.abs(gestureState.dy) && Math.abs(gestureState.dx) > 15;
    },
    onPanResponderGrant: () => {
      // Prevent other touches while panning
    },
    onPanResponderMove: (evt, gestureState) => {
      // Only allow left swipe (negative dx) and limit to max reveal of 100px
      const newValue = Math.max(gestureState.dx, -100);
      if (gestureState.dx < 0) {
        translateX.setValue(newValue);
      }
    },
    onPanResponderRelease: (evt, gestureState) => {
      const deleteThreshold = -60; // Swipe at least 60px to show delete option
      
      if (gestureState.dx < deleteThreshold) {
        // Keep delete button visible
        Animated.spring(translateX, {
          toValue: -80,
          useNativeDriver: true,
          tension: 100,
          friction: 8,
        }).start();
      } else {
        // Animate back to original position
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
          tension: 100,
          friction: 8,
        }).start();
      }
    },
  });

  const handleDeletePress = () => {
    Alert.alert(
      'Delete Chat',
      `Are you sure you want to delete your conversation with ${contactName}? This action cannot be undone.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => {
            // Animate back to original position
            Animated.spring(translateX, {
              toValue: 0,
              useNativeDriver: true,
            }).start();
          }
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setIsDeleting(true);
            // Animate out then delete
            Animated.timing(translateX, {
              toValue: -screenWidth,
              duration: 300,
              useNativeDriver: true,
            }).start(() => {
              onDelete && onDelete();
              setIsDeleting(false);
            });
          }
        }
      ]
    );
  };

  return (
    <View style={[styles.swipeContainer, style]}>
      {/* Delete button background */}
      <View style={styles.deleteBackground}>
        <TouchableWeb
          style={styles.deleteButton}
          onPress={handleDeletePress}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons name="delete" size={20} color="#FFFFFF" />
          <Text style={styles.deleteText}>Delete</Text>
        </TouchableWeb>
      </View>
      
      <Animated.View
        {...panResponder.panHandlers}
        style={[
          styles.swipeableRow,
          {
            transform: [{ translateX }]
          }
        ]}
      >
        {children}
      </Animated.View>
    </View>
  );
};

export default function PatientChatScreen({ navigation }) {
  const { user } = useAuth();
  const { sendMessage, getConversationMessages, markAsRead, getUnreadCount, getLastReadTimestamp, getTotalUnreadCount, getConversationId, lastMessages, unreadCounts } = useChat();
  const insets = useSafeAreaInsets();
  const [selectedContact, setSelectedContact] = useState(null);
  const [messageText, setMessageText] = useState('');
  const [chatModalVisible, setChatModalVisible] = useState(false);
  const [searchVisible, setSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [messages, setMessages] = useState({});
  const [currentMessages, setCurrentMessages] = useState([]);
  const [chatOptionsVisible, setChatOptionsVisible] = useState(false);
  const [pinnedChats, setPinnedChats] = useState([]);
  const [mutedChats, setMutedChats] = useState([]);
  const [attachmentMenuVisible, setAttachmentMenuVisible] = useState(false);
  const [recording, setRecording] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [userProfiles, setUserProfiles] = useState({});
  const [selectedAttachment, setSelectedAttachment] = useState(null);
  const [imageViewerVisible, setImageViewerVisible] = useState(false);
  const [viewerImageUri, setViewerImageUri] = useState(null);
  const [documentViewerVisible, setDocumentViewerVisible] = useState(false);
  const [viewerDocumentUri, setViewerDocumentUri] = useState(null);
  const [viewerDocumentName, setViewerDocumentName] = useState('');
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [sound, setSound] = useState(null);
  const [playingAudioId, setPlayingAudioId] = useState(null);
  const recordingInterval = useRef(null);
  
  // Ref for auto-scrolling to bottom
  const flatListRef = useRef(null);

  // Helper function to get initials from name
  const getInitials = (name) => {
    if (!name) return '?';
    const nameParts = name.trim().split(' ');
    if (nameParts.length >= 2) {
      return (nameParts[0][0] + nameParts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  // Helper function to get avatar color based on role
  const getAvatarColor = (role) => {
    if (role === 'admin') return COLORS.primary;
    if (role === 'nurse') return '#4CAF50';
    return '#9C27B0';
  };

  // Load user profiles with photos
  useEffect(() => {
    const loadUserProfiles = async () => {
      try {
        const usersData = await AsyncStorage.getItem('users');
        const profileMap = {};
        
        if (usersData) {
          const users = JSON.parse(usersData);
          users.forEach(user => {
            const photo = user.profilePhoto || user.profileImage;
            profileMap[user.id] = {
              profilePhoto: photo,
              username: user.username,
              role: user.role
            };
          });
        }
        
        // Load admin profile separately (for Nurse Bernard/ADMIN001)
        try {
          const admin001Profile = await AsyncStorage.getItem('adminProfile_ADMIN001');
          if (admin001Profile) {
            const adminData = JSON.parse(admin001Profile);
            const photo = adminData.profilePhoto || adminData.profileImage;
            if (photo) {
              profileMap['admin-001'] = {
                profilePhoto: photo,
                username: adminData.username || 'Nurse Bernard',
                role: 'admin'
              };
            }
          }
        } catch (e) {
          // Admin profile not found
        }
        
        setUserProfiles(profileMap);
      } catch (error) {
        console.error('Error loading user profiles:', error);
      }
    };
    loadUserProfiles();
  }, []);

  // Function to scroll to bottom of messages
  const scrollToBottom = () => {
    if (flatListRef.current && currentMessages.length > 0) {
      setTimeout(() => {
        flatListRef.current.scrollToEnd({ animated: true });
      }, 100);
    }
  };

  // Auto-scroll when messages change
  useEffect(() => {
    scrollToBottom();
  }, [currentMessages]);

  // Keyboard listeners for auto-scroll
  useEffect(() => {
    const keyboardWillShow = Keyboard.addListener('keyboardDidShow', () => {
      setTimeout(() => scrollToBottom(), 100);
    });
    
    return () => {
      keyboardWillShow.remove();
    };
  }, []);

  // Load healthcare team dynamically from conversations
  const [healthcareTeam, setHealthcareTeam] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  
  useEffect(() => {
    const loadHealthcareTeam = async () => {
      try {
        const usersData = await AsyncStorage.getItem('users');
        const allUsersFromStorage = usersData ? JSON.parse(usersData) : [];
        
        if (allUsersFromStorage.length === 0) {
          return;
        }
        
        // Load all users for search functionality
        const formattedAllUsers = allUsersFromStorage.map(u => ({
          id: u.id,
          name: u.username || `${u.firstName || ''} ${u.lastName || ''}`.trim(),
          email: u.email,
          role: u.role,
          type: u.role,
          isAdmin: u.role === 'admin',
          profilePhoto: u.profilePhoto || u.profileImage
        }));
        
        // Add super admin to all users list if not already there
        if (!formattedAllUsers.find(u => u.id === 'admin-001')) {
          try {
            const admin001Profile = await AsyncStorage.getItem('adminProfile_ADMIN001');
            if (admin001Profile) {
              const adminData = JSON.parse(admin001Profile);
              formattedAllUsers.push({
                id: 'admin-001',
                name: adminData.username || 'Nurse Bernard',
                email: adminData.email || 'admin@care.com',
                role: 'admin',
                type: 'admin',
                isAdmin: true,
                profilePhoto: adminData.profilePhoto || adminData.profileImage
              });
            }
          } catch (e) {
            // Admin profile not found
          }
        }
        
        setAllUsers(formattedAllUsers);
        
        const patientId = user?.id || 'PATIENT001';
        
        // Get all conversations from lastMessages
        const conversationIds = Object.keys(lastMessages);
        const activeContacts = [];
        const seenUserIds = new Set(); // Track users we've already added
        
        // All possible patient ID variations
        const patientIdVariations = ['PATIENT001', 'patient-001', 'patient'];
        
        for (const conversationId of conversationIds) {
          // Check if this conversation involves the current patient
          const parts = conversationId.split('_');
          if (parts.length !== 2) {
            continue;
          }
          
          const [userId1, userId2] = parts;
          
          // Skip if this conversation doesn't involve current patient (check all ID variations)
          const isPatientConversation = patientIdVariations.includes(userId1) || patientIdVariations.includes(userId2);
          if (!isPatientConversation) {
            continue;
          }
          
          // Get the other user's ID
          const otherUserId = patientIdVariations.includes(userId1) ? userId2 : userId1;
          
          // Skip if we've already added this user, BUT check if this conversation has a newer message
          if (seenUserIds.has(otherUserId)) {
            const existingContactIndex = activeContacts.findIndex(c => c.id === otherUserId);
            if (existingContactIndex >= 0) {
              const currentMsg = lastMessages[conversationId];
              const existingMsg = activeContacts[existingContactIndex].lastMessage;
              
              // Compare timestamps - use the newer message
              const currentTimestamp = currentMsg?.timestamp ? new Date(currentMsg.timestamp).getTime() : 0;
              const existingTimestamp = typeof existingMsg === 'object' && existingMsg?.timestamp 
                ? new Date(existingMsg.timestamp).getTime() 
                : 0;
              
              if (currentTimestamp > existingTimestamp) {
                // Update with the newer message
                const lastMsg = currentMsg;
                
                // Recalculate unread count with ALL possible conversation ID formats
                let patientUnreadCount = unreadCounts[`${conversationId}_${patientId}`] || 0;
                
                // Check alternative conversation ID formats (patient-001 vs PATIENT001)
                const altPatientId = patientId === 'PATIENT001' ? 'patient-001' : 'PATIENT001';
                const altConversationId = getConversationId(altPatientId, otherUserId);
                if (altConversationId !== conversationId) {
                  const altUnread = unreadCounts[`${altConversationId}_${altPatientId}`] || 0;
                  patientUnreadCount = Math.max(patientUnreadCount, altUnread);
                }
                
                // Update the existing contact
                activeContacts[existingContactIndex].lastMessage = lastMsg?.text || 'Start a conversation';
                activeContacts[existingContactIndex].lastMessageTime = lastMsg?.time || '';
                activeContacts[existingContactIndex].lastMessageSender = lastMsg?.sender || '';
                activeContacts[existingContactIndex].timestamp = lastMsg?.timestamp || 0;
                activeContacts[existingContactIndex].unreadCount = patientUnreadCount;
              }
            }
            continue;
          }
          seenUserIds.add(otherUserId);
          
          // Find the other user from storage - check multiple ID formats
          let userFromStorage = allUsersFromStorage.find(u => u.id === otherUserId);
          
          // If not found, try alternative ID formats
          if (!userFromStorage) {
            // Try admin-001 → admin, nurse-001 → nurse, patient-001 → PATIENT001
            const alternativeIds = [];
            if (otherUserId === 'admin-001') alternativeIds.push('admin');
            if (otherUserId === 'nurse-001') alternativeIds.push('nurse');
            if (otherUserId === 'patient-001') alternativeIds.push('PATIENT001', 'patient');
            if (otherUserId === 'admin') alternativeIds.push('admin-001');
            if (otherUserId === 'nurse') alternativeIds.push('nurse-001');
            if (otherUserId === 'PATIENT001') alternativeIds.push('patient-001', 'patient');
            
            for (const altId of alternativeIds) {
              userFromStorage = allUsersFromStorage.find(u => u.id === altId);
              if (userFromStorage) {
                break;
              }
            }
          }
          
          // If still not found and it's admin-001, create a placeholder for the super admin
          if (!userFromStorage && otherUserId === 'admin-001') {
            userFromStorage = {
              id: 'admin-001',
              username: 'Nurse Bernard',
              email: 'admin@care.com',
              role: 'admin',
              code: 'ADMIN001',
              isSuperAdmin: true
            };
          }
          
          if (!userFromStorage) {
            continue;
          }
          
          const lastMsg = lastMessages[conversationId];
          
          // Get unread count, checking multiple conversation ID formats
          let patientUnreadCount = unreadCounts[`${conversationId}_${patientId}`] || 0;
          
          // Check alternative patient ID format
          const altPatientId = patientId === 'PATIENT001' ? 'patient-001' : 'PATIENT001';
          const altConversationId = getConversationId(altPatientId, otherUserId);
          if (altConversationId !== conversationId) {
            const altUnread = unreadCounts[`${altConversationId}_${altPatientId}`] || 0;
            patientUnreadCount = Math.max(patientUnreadCount, altUnread);
          }
          
          activeContacts.push({
            id: userFromStorage.id,
            name: userFromStorage.username || `${userFromStorage.firstName || ''} ${userFromStorage.lastName || ''}`.trim(),
            role: userFromStorage.role === 'admin' ? 'Administrator' : userFromStorage.role === 'nurse' ? 'Nurse' : 'Staff',
            avatar: userFromStorage.profilePhoto || userFromStorage.profileImage,
            status: 'offline',
            isAdmin: userFromStorage.role === 'admin',
            unreadCount: patientUnreadCount,
            lastMessage: lastMsg?.text || 'Start a conversation',
            lastMessageTime: lastMsg?.time || '',
            lastMessageSender: lastMsg?.sender || '',
            timestamp: lastMsg?.timestamp || 0
          });
        }
        
        // Sort by timestamp, most recent first
        activeContacts.sort((a, b) => {
          const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
          const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
          return timeB - timeA;
        });
        
        setHealthcareTeam(activeContacts);
        
        // Badge is displayed by ChatTabIcon in App.js, no need to set here
        const totalUnread = getTotalUnreadCount('PATIENT001');
      } catch (error) {
        console.error('Error loading healthcare team:', error);
      }
    };
    
    if (user) {
      loadHealthcareTeam();
    }
  }, [user, lastMessages, unreadCounts]);

  const openChat = async (contact) => {
    setSelectedContact(contact);
    const currentPatientId = user?.id || 'PATIENT001';
    const conversationId = getConversationId(currentPatientId, contact.id);
    
    // Load messages for this conversation
    const messages = await getConversationMessages(conversationId);
    setCurrentMessages(messages);
    
    // Mark messages as read when opening chat - check all patient ID variations
    markAsRead(conversationId, currentPatientId);
    
    // Also mark alternative conversation ID formats as read
    const altConversationId1 = getConversationId('patient-001', contact.id);
    if (altConversationId1 !== conversationId) {
      markAsRead(altConversationId1, 'patient-001');
    }
    
    const altConversationId2 = getConversationId('PATIENT001', contact.id);
    if (altConversationId2 !== conversationId && altConversationId2 !== altConversationId1) {
      markAsRead(altConversationId2, 'PATIENT001');
    }
    
    setChatModalVisible(true);
    
    // Scroll to bottom after messages load
    setTimeout(() => {
      scrollToBottom();
    }, 200);
  };

  const deleteChat = async (contact) => {
    try {
      const currentPatientId = user?.id || 'PATIENT001';
      const conversationId = getConversationId(currentPatientId, contact.id);
      
      // Remove from AsyncStorage
      await AsyncStorage.removeItem(`messages_${conversationId}`);
      await AsyncStorage.removeItem(`lastRead_${conversationId}`);
      
      // Also clear alternative conversation ID formats
      const altConversationId1 = getConversationId('patient-001', contact.id);
      if (altConversationId1 !== conversationId) {
        await AsyncStorage.removeItem(`messages_${altConversationId1}`);
        await AsyncStorage.removeItem(`lastRead_${altConversationId1}`);
      }
      
      const altConversationId2 = getConversationId('PATIENT001', contact.id);
      if (altConversationId2 !== conversationId && altConversationId2 !== altConversationId1) {
        await AsyncStorage.removeItem(`messages_${altConversationId2}`);
        await AsyncStorage.removeItem(`lastRead_${altConversationId2}`);
      }
      
      // Update local state to remove the chat from the list
      setHealthcareTeam(prevTeam => prevTeam.filter(member => member.id !== contact.id));
      
      Alert.alert('Success', `Conversation with ${contact.name} has been deleted.`);
    } catch (error) {
      console.error('Error deleting chat:', error);
      Alert.alert('Error', 'Failed to delete conversation. Please try again.');
    }
  };

  // Filter search results from all users (only when searching)
  const searchResults = searchQuery.trim() 
    ? allUsers.filter(user =>
        user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (user.email && user.email.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : [];

  // Update dropdown visibility when search results change
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setShowSearchDropdown(false);
    } else {
      setShowSearchDropdown(searchResults.length > 0);
    }
  }, [searchQuery, searchResults.length]);

  // Handle selecting a user from search dropdown
  const handleUserSelect = (selectedUser) => {
    setSearchQuery('');
    setShowSearchDropdown(false);
    
    // Convert selectedUser to contact format if needed
    const contact = {
      id: selectedUser.id,
      name: selectedUser.name,
      role: selectedUser.role === 'admin' ? 'Administrator' : selectedUser.role === 'nurse' ? 'Nurse' : 'Staff',
      avatar: selectedUser.profilePhoto,
      status: 'offline',
      isAdmin: selectedUser.role === 'admin',
      unreadCount: 0,
      lastMessage: '',
      lastMessageTime: '',
      lastMessageSender: '',
      timestamp: 0
    };
    
    openChat(contact);
  };

  const handleAttachFile = () => {
    setAttachmentMenuVisible(true);
  };

  const handleCamera = async () => {
    try {
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      
      if (permissionResult.granted === false) {
        Alert.alert('Permission Required', 'Camera permission is required to take photos.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setAttachmentMenuVisible(false);
        setSelectedAttachment({
          type: 'image',
          uri: result.assets[0].uri,
          fileName: result.assets[0].fileName || 'photo.jpg'
        });
      }
    } catch (error) {
      console.error('Camera error:', error);
      Alert.alert('Error', 'Failed to open camera');
    }
  };

  const handleGallery = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (permissionResult.granted === false) {
        Alert.alert('Permission Required', 'Gallery permission is required to select photos.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8,
        allowsMultipleSelection: false,
      });

      if (!result.canceled && result.assets[0]) {
        setAttachmentMenuVisible(false);
        setSelectedAttachment({
          type: 'image',
          uri: result.assets[0].uri,
          fileName: result.assets[0].fileName || 'image.jpg'
        });
      }
    } catch (error) {
      console.error('Gallery error:', error);
      Alert.alert('Error', 'Failed to open gallery');
    }
  };

  const handleDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (result.type !== 'cancel' && result.assets && result.assets[0]) {
        setAttachmentMenuVisible(false);
        setSelectedAttachment({
          type: 'document',
          uri: result.assets[0].uri,
          fileName: result.assets[0].name,
          mimeType: result.assets[0].mimeType
        });
      }
    } catch (error) {
      console.error('Document picker error:', error);
      Alert.alert('Error', 'Failed to select document');
    }
  };

  const handleAudio = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'audio/*',
        copyToCacheDirectory: true,
      });

      if (result.type !== 'cancel' && result.assets && result.assets[0]) {
        setAttachmentMenuVisible(false);
        setSelectedAttachment({
          type: 'audio',
          uri: result.assets[0].uri,
          fileName: result.assets[0].name
        });
      }
    } catch (error) {
      console.error('Audio picker error:', error);
      Alert.alert('Error', 'Failed to select audio file');
    }
  };

  const handleContact = async () => {
    try {
      const { status } = await Contacts.requestPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Contacts permission is required to share contacts.');
        setAttachmentMenuVisible(false);
        return;
      }

      const { data } = await Contacts.getContactsAsync({
        fields: [Contacts.Fields.Name, Contacts.Fields.PhoneNumbers, Contacts.Fields.Emails],
      });

      if (data.length > 0) {
        setAttachmentMenuVisible(false);
        
        // For simplicity, showing the first contact as an example
        // In a real app, you'd show a contact picker UI
        Alert.alert(
          'Select Contact',
          `Found ${data.length} contacts. Pick a contact to share.`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Share First Contact',
              onPress: () => {
                const contact = data[0];
                const name = contact.name || 'Unknown';
                const phone = contact.phoneNumbers?.[0]?.number || 'No phone';
                const email = contact.emails?.[0]?.email || 'No email';
                
                const contactInfo = `Contact: ${name}\nPhone: ${phone}\nEmail: ${email}`;
                Alert.alert('Contact Shared', contactInfo);
                // Here you would send this as a message
              }
            }
          ]
        );
      } else {
        setAttachmentMenuVisible(false);
        Alert.alert('No Contacts', 'No contacts found on your device');
      }
    } catch (error) {
      console.error('Contact picker error:', error);
      setAttachmentMenuVisible(false);
      Alert.alert('Error', 'Failed to access contacts');
    }
  };

  const handleLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Location permission is required to share your location.');
        setAttachmentMenuVisible(false);
        return;
      }

      setAttachmentMenuVisible(false);

      // Show loading while getting location
      Alert.alert('Getting Location', 'Please wait...');

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude, longitude } = location.coords;

      Alert.alert(
        'Share Location',
        'Choose how to share your location',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Send Location',
            onPress: () => {
              const locationMessage = `📍 Location: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
              Alert.alert('Location Shared', locationMessage);
              // Here you would send this location as a message with coordinates
            }
          },
          {
            text: 'Open in Maps',
            onPress: () => {
              const scheme = Platform.select({
                ios: 'maps:0,0?q=',
                android: 'geo:0,0?q='
              });
              const latLng = `${latitude},${longitude}`;
              const label = 'My Location';
              const url = Platform.select({
                ios: `${scheme}${label}@${latLng}`,
                android: `${scheme}${latLng}(${label})`
              });

              Linking.openURL(url).catch(() => {
                // Fallback to Google Maps web
                const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
                Linking.openURL(googleMapsUrl);
              });
            }
          }
        ]
      );
    } catch (error) {
      console.error('Location error:', error);
      setAttachmentMenuVisible(false);
      Alert.alert('Error', 'Failed to get your location. Please try again.');
    }
  };

  const startRecording = async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      
      if (permission.status !== 'granted') {
        Alert.alert('Permission Required', 'Microphone permission is required to record audio.');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      
      setRecording(recording);
      setIsRecording(true);
      setRecordingDuration(0);
      
      // Start duration counter
      recordingInterval.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('Failed to start recording:', error);
      Alert.alert('Error', 'Failed to start recording');
    }
  };

  const stopRecording = async () => {
    if (!recording) return;

    try {
      setIsRecording(false);
      
      // Clear duration interval
      if (recordingInterval.current) {
        clearInterval(recordingInterval.current);
        recordingInterval.current = null;
      }
      
      await recording.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });
      
      const uri = recording.getURI();
      setRecording(null);
      
      // Set as attachment to send
      if (uri) {
        const duration = recordingDuration;
        setSelectedAttachment({
          type: 'voice',
          uri: uri,
          fileName: `Voice ${duration}s.m4a`,
          duration: duration
        });
      }
      
      setRecordingDuration(0);
    } catch (error) {
      console.error('Failed to stop recording:', error);
      Alert.alert('Error', 'Failed to stop recording');
      setRecordingDuration(0);
    }
  };

  const cancelRecording = async () => {
    if (!recording) return;

    try {
      setIsRecording(false);
      
      // Clear duration interval
      if (recordingInterval.current) {
        clearInterval(recordingInterval.current);
        recordingInterval.current = null;
      }
      
      await recording.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });
      
      setRecording(null);
      setRecordingDuration(0);
    } catch (error) {
      console.error('Failed to cancel recording:', error);
    }
  };

  const playVoiceNote = async (voiceNote) => {
    try {
      // Stop any currently playing sound
      if (sound) {
        await sound.unloadAsync();
        setSound(null);
        setPlayingAudioId(null);
      }

      // If clicking the same audio that's playing, just stop it
      if (playingAudioId === voiceNote.id) {
        return;
      }

      // Play the new audio
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: voiceNote.uri },
        { shouldPlay: true }
      );
      
      setSound(newSound);
      setPlayingAudioId(voiceNote.id);
      
      // When playback finishes, reset
      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.didJustFinish) {
          setPlayingAudioId(null);
          newSound.unloadAsync();
          setSound(null);
        }
      });
    } catch (error) {
      console.error('Error playing voice note:', error);
      Alert.alert('Error', 'Failed to play voice note');
    }
  };

  const handleVoiceRecording = async () => {
    if (isRecording) {
      await stopRecording();
    } else {
      await startRecording();
    }
  };

  const handleAttachmentClick = async (attachment) => {
    if (!attachment || !attachment.uri) return;
    
    // Check if it's an image by type or file extension
    const fileName = attachment.fileName?.toLowerCase() || '';
    const isImage = attachment.type === 'image' || 
                    fileName.endsWith('.jpg') || 
                    fileName.endsWith('.jpeg') || 
                    fileName.endsWith('.png') || 
                    fileName.endsWith('.gif') || 
                    fileName.endsWith('.webp') ||
                    fileName.endsWith('.bmp');
    
    // For images, show in fullscreen viewer
    if (isImage) {
      setViewerImageUri(attachment.uri);
      setImageViewerVisible(true);
      return;
    }
    
    // For PDFs and documents, use system sharing (WebView doesn't work well with local files on iOS)
    const isPdf = fileName.endsWith('.pdf');
    const isDoc = attachment.type === 'document' || 
                  fileName.endsWith('.doc') || 
                  fileName.endsWith('.docx') || 
                  fileName.endsWith('.txt') ||
                  fileName.endsWith('.xlsx') ||
                  fileName.endsWith('.xls');
    
    if (isPdf || isDoc) {
      try {
        await Sharing.shareAsync(attachment.uri, {
          mimeType: attachment.mimeType || 'application/octet-stream',
          dialogTitle: `Open ${attachment.fileName || 'document'}`,
        });
      } catch (error) {
        console.error('Error opening document:', error);
        Alert.alert('Error', 'Failed to open document');
      }
      return;
    }
    
    // For audio and voice notes, try to play them or share
    if (attachment.type === 'audio' || attachment.type === 'voice') {
      try {
        await Sharing.shareAsync(attachment.uri, {
          mimeType: attachment.mimeType || 'audio/mpeg',
          dialogTitle: `Open ${attachment.fileName || 'audio file'}`,
        });
      } catch (error) {
        console.error('Error opening audio:', error);
        Alert.alert('Error', 'Failed to open audio file');
      }
      return;
    }
    
    // For other files, use Sharing to open them
    try {
      await Sharing.shareAsync(attachment.uri, {
        mimeType: attachment.mimeType || 'application/octet-stream',
        dialogTitle: `Open ${attachment.fileName || 'file'}`,
        UTI: attachment.type
      });
    } catch (error) {
      console.error('Error opening attachment:', error);
      Alert.alert('Error', 'Failed to open attachment');
    }
  };

  const sendMessageToContact = async () => {
    if ((!messageText.trim() && !selectedAttachment) || !selectedContact) return;

    const conversationId = getConversationId(user?.id || 'PATIENT001', selectedContact.id);
    let messageContent = messageText.trim();
    
    // If there's an attachment, append it to the message
    if (selectedAttachment) {
      const attachmentText = selectedAttachment.type === 'image' 
        ? `📷 Image: ${selectedAttachment.fileName}`
        : selectedAttachment.type === 'document'
        ? `📄 Document: ${selectedAttachment.fileName}`
        : selectedAttachment.type === 'audio'
        ? `🎵 Audio: ${selectedAttachment.fileName}`
        : selectedAttachment.type === 'voice'
        ? `🎤 Voice message (${selectedAttachment.duration}s)`
        : `📎 Attachment: ${selectedAttachment.fileName}`;
      
      messageContent = messageContent ? `${messageContent}\n${attachmentText}` : attachmentText;
    }
    
    // Create the new message object immediately
    const newMessage = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      text: messageContent,
      sender: 'PATIENT001',
      recipient: selectedContact.id,
      timestamp: new Date().toISOString(),
      conversationId: conversationId,
      attachment: selectedAttachment
    };
    
    // Add message to current conversation immediately (optimistic update)
    setCurrentMessages(prevMessages => [...prevMessages, newMessage]);
    setMessageText(''); // Clear input immediately
    setSelectedAttachment(null); // Clear attachment
    
    try {
      // Determine sender/receiver roles for backend
      const senderRole = 'patient';
      const receiverRole = selectedContact.type === 'admin'
        ? 'admin'
        : 'nurse';

      // Send message using shared context and get updated messages - pass attachment
      const updatedMessages = await sendMessage(conversationId, messageContent, senderRole, receiverRole, selectedAttachment);
      
      // Use the updated messages returned from sendMessage
      setCurrentMessages(updatedMessages);
    } catch (error) {
      console.error('Failed to send message:', error);
      // If sending fails, remove the optimistic message
      setCurrentMessages(prevMessages => 
        prevMessages.filter(msg => msg.id !== newMessage.id)
      );
      setMessageText(messageText.trim()); // Restore the message text
      setSelectedAttachment(selectedAttachment); // Restore attachment
    }
  };

  // Filter contacts based on search query
  const filteredContacts = healthcareTeam.filter(contact =>
    contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderMessage = ({ item }) => {
    const messageText = typeof item.text === 'string' ? item.text : 
                       (item.message && typeof item.message === 'string' ? item.message : 
                       'Message');
    const messageTime = item.time || 
                       (item.timestamp ? new Date(item.timestamp).toLocaleTimeString('en-US', { 
                         hour: 'numeric', 
                         minute: '2-digit',
                         hour12: true 
                       }) : '');
    
    const currentPatientId = user?.id || 'PATIENT001';
    const isPatient = item.sender === currentPatientId || item.sender === 'PATIENT001' || item.sender === 'patient-001';
    
    // Check if message has an attachment
    const hasAttachment = item.attachment && item.attachment.uri;
    
    // Check if message has been read by recipient using lastReadTimestamp
    let isRead = false;
    if (isPatient && selectedContact && item.timestamp) {
      const conversationId = item.conversationId || getConversationId(currentPatientId, selectedContact.id);
      const recipientLastRead = getLastReadTimestamp(conversationId, selectedContact.id);
      
      // Check alternative conversation ID formats
      const altConversationId1 = getConversationId('patient-001', selectedContact.id);
      const altConversationId2 = getConversationId('PATIENT001', selectedContact.id);
      const altRecipientLastRead1 = getLastReadTimestamp(altConversationId1, selectedContact.id);
      const altRecipientLastRead2 = getLastReadTimestamp(altConversationId2, selectedContact.id);
      
      // Message is read if recipient's last read time is after message timestamp
      const messageTimestamp = new Date(item.timestamp).getTime();
      const lastReadTime = recipientLastRead ? new Date(recipientLastRead).getTime() : 0;
      const altLastReadTime1 = altRecipientLastRead1 ? new Date(altRecipientLastRead1).getTime() : 0;
      const altLastReadTime2 = altRecipientLastRead2 ? new Date(altRecipientLastRead2).getTime() : 0;
      
      isRead = (lastReadTime > 0 && lastReadTime >= messageTimestamp) || 
               (altLastReadTime1 > 0 && altLastReadTime1 >= messageTimestamp) ||
               (altLastReadTime2 > 0 && altLastReadTime2 >= messageTimestamp);
    }
    
    return (
      <View style={[styles.messageContainer, isPatient ? styles.adminMessage : styles.patientMessage]}>
        <View style={[styles.messageBubble, isPatient ? styles.adminBubble : styles.patientBubble]}>
          {hasAttachment && item.attachment.type === 'image' && (
            <TouchableWeb 
              onPress={() => handleAttachmentClick(item.attachment)}
              activeOpacity={0.8}
              style={styles.attachmentImageContainer}
            >
              <Image 
                source={{ uri: item.attachment.uri }} 
                style={styles.attachmentImage}
                resizeMode="cover"
              />
            </TouchableWeb>
          )}
          {hasAttachment && item.attachment.type === 'voice' && (
            <TouchableWeb 
              onPress={() => playVoiceNote({ ...item.attachment, id: item.id })}
              activeOpacity={0.8}
              style={styles.voiceNoteContainer}
            >
              <MaterialCommunityIcons 
                name={playingAudioId === item.id ? "pause-circle" : "play-circle"} 
                size={32} 
                color={isPatient ? COLORS.white : COLORS.primary} 
              />
              <View style={styles.voiceNoteWaveform}>
                <View style={[styles.voiceNoteBar, isPatient && styles.voiceNoteBarAdmin]} />
                <View style={[styles.voiceNoteBar, isPatient && styles.voiceNoteBarAdmin]} />
                <View style={[styles.voiceNoteBar, isPatient && styles.voiceNoteBarAdmin]} />
                <View style={[styles.voiceNoteBar, isPatient && styles.voiceNoteBarAdmin]} />
                <View style={[styles.voiceNoteBar, isPatient && styles.voiceNoteBarAdmin]} />
              </View>
              <Text style={[styles.voiceNoteDuration, isPatient && styles.voiceNoteDurationAdmin]}>
                {item.attachment.duration}s
              </Text>
            </TouchableWeb>
          )}
          {hasAttachment && item.attachment.type !== 'image' && item.attachment.type !== 'voice' && (
            <TouchableWeb 
              onPress={() => handleAttachmentClick(item.attachment)}
              activeOpacity={0.8}
              style={styles.attachmentFileContainer}
            >
              <MaterialCommunityIcons 
                name={item.attachment.type === 'audio' ? 'music' : 'file-document'} 
                size={24} 
                color={isPatient ? COLORS.white : COLORS.primary} 
              />
              <Text style={[styles.attachmentFileName, isPatient ? styles.attachmentFileNameAdmin : styles.attachmentFileNamePatient]}>
                {item.attachment.fileName}
              </Text>
              <MaterialCommunityIcons 
                name="download" 
                size={20} 
                color={isPatient ? COLORS.white : COLORS.primary} 
              />
            </TouchableWeb>
          )}
          <Text style={[styles.messageText, isPatient ? styles.adminMessageText : styles.patientMessageText]}>
            {messageText}
          </Text>
          <View style={styles.messageFooter}>
            <Text style={[styles.messageTime, isPatient ? styles.adminTimeText : styles.patientTimeText]}>
              {messageTime}
            </Text>
            {isPatient && (
              <MaterialCommunityIcons 
                name="check-all" 
                size={14} 
                color={isRead ? '#4fc3f7' : 'rgba(0,0,0,0.4)'} 
                style={styles.checkIcon}
              />
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <LinearGradient
        colors={GRADIENTS.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 16 }]}
      >
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>Chats</Text>

      {/* Watermark Logo */}
      <Image
        source={require('../assets/Images/Nurses-logo.png')}
        style={styles.watermarkLogo}
        resizeMode="contain"
      />

          <View style={styles.headerActions}>
            <TouchableWeb
              style={styles.headerButton}
              onPress={() => setSearchVisible(!searchVisible)}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons 
                name="magnify" 
                size={22} 
                color={COLORS.white} 
              />
            </TouchableWeb>
          </View>
        </View>
        
        {searchVisible && (
          <View style={styles.searchContainer}>
            <View style={styles.searchInputWrapper}>
              <MaterialCommunityIcons name="magnify" size={20} color="rgba(255,255,255,0.7)" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search users to chat with..."
                placeholderTextColor="rgba(255,255,255,0.7)"
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoFocus
              />
              {searchQuery.length > 0 && (
                <TouchableWeb
                  onPress={() => {
                    setSearchQuery('');
                    setShowSearchDropdown(false);
                  }}
                  activeOpacity={0.7}
                >
                  <MaterialCommunityIcons name="close-circle" size={20} color="rgba(255,255,255,0.7)" />
                </TouchableWeb>
              )}
            </View>
            
            {/* Search Dropdown */}
            {showSearchDropdown && searchResults.length > 0 && (
              <View style={styles.searchDropdown}>
                <ScrollView 
                  style={styles.searchDropdownScroll}
                  nestedScrollEnabled
                  keyboardShouldPersistTaps="handled"
                >
                  {searchResults.map((user, index) => {
                    const profilePhoto = userProfiles[user.id]?.profilePhoto;
                    return (
                      <TouchableWeb
                        key={`search-${user.id}-${index}`}
                        style={styles.searchResultItem}
                        onPress={() => handleUserSelect(user)}
                        activeOpacity={0.7}
                      >
                        {profilePhoto ? (
                          <Image source={{ uri: profilePhoto }} style={styles.searchResultAvatar} />
                        ) : (
                          <View style={[styles.searchResultAvatar, { backgroundColor: getAvatarColor(user.role) }]}>
                            <Text style={styles.searchResultAvatarText}>{getInitials(user.name)}</Text>
                          </View>
                        )}
                        <View style={styles.searchResultInfo}>
                          <Text style={styles.searchResultName}>{user.name}</Text>
                          <Text style={styles.searchResultEmail}>{user.contactEmail || user.email}</Text>
                        </View>
                      </TouchableWeb>
                    );
                  })}
                </ScrollView>
              </View>
            )}
          </View>
        )}
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Display active chats only */}
        <View style={styles.chatListSection}>
          {healthcareTeam.length > 0 ? (
            healthcareTeam.map((contact, index) => {
              const profilePhoto = userProfiles[contact.id]?.profilePhoto;
              return (
                <SwipeableChatItem
                  key={`contact-${contact.id}-${index}`}
                  onDelete={() => deleteChat(contact)}
                  contactName={contact.name}
                >
                  <TouchableWeb
                    style={styles.chatItem}
                    onPress={() => openChat(contact)}
                    activeOpacity={0.95}
                  >
                    {profilePhoto ? (
                      <Image source={{ uri: profilePhoto }} style={styles.chatAvatar} />
                    ) : (
                      <View style={[styles.chatAvatar, { backgroundColor: getAvatarColor(contact.role) }]}>
                        <Text style={styles.avatarText}>{getInitials(contact.name)}</Text>
                      </View>
                    )}
                    <View style={styles.chatInfo}>
                      <View style={styles.chatHeader}>
                        <Text style={styles.chatName}>{contact.name}</Text>
                        <Text style={styles.chatTime}>{String(contact.lastMessageTime || '')}</Text>
                      </View>
                      <View style={styles.chatLastMessageRow}>
                        {contact.status === 'online' && (
                          <View style={styles.onlineIndicator} />
                        )}
                        {(contact.lastMessageSender === 'PATIENT001' || contact.lastMessageSender === 'patient-001') && (
                          <MaterialCommunityIcons 
                            name="check-all" 
                            size={16} 
                            color={contact.otherUserUnreadCount === 0 ? '#4fc3f7' : COLORS.textLight} 
                            style={{ marginRight: 4 }}
                          />
                        )}
                        <Text style={styles.chatLastMessage} numberOfLines={1}>
                          {contact.lastMessage}
                        </Text>
                        {contact.unreadCount > 0 && (
                          <View style={styles.unreadBadge}>
                            <Text style={styles.unreadCount}>{contact.unreadCount}</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </TouchableWeb>
                </SwipeableChatItem>
              );
            })
          ) : (
            <View style={styles.noResultsContainer}>
              <MaterialCommunityIcons name="message-outline" size={48} color={COLORS.textLight} />
              <Text style={styles.noResultsText}>No chats yet</Text>
              <Text style={styles.noResultsSubtext}>Start a conversation with your healthcare team</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Chat Modal */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={chatModalVisible}
        onRequestClose={() => setChatModalVisible(false)}
      >
        <KeyboardAvoidingView 
          style={{ flex: 1 }} 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
          <SafeAreaView style={styles.chatModalContainer} edges={['bottom']}>
            {/* Chat Header */}
            <LinearGradient
              colors={GRADIENTS.header}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={styles.chatModalHeader}
            >
              <View style={styles.chatModalHeaderRow}>
                <TouchableWeb
                  style={styles.chatBackButton}
                  onPress={() => setChatModalVisible(false)}
                  activeOpacity={0.7}
                >
                  <MaterialCommunityIcons name="arrow-left" size={24} color={COLORS.white} />
                </TouchableWeb>
                <View style={styles.chatPatientInfo}>
                  {userProfiles[selectedContact?.id]?.profilePhoto ? (
                    <View style={styles.chatModalAvatarContainer}>
                      <Image 
                        source={{ uri: userProfiles[selectedContact?.id]?.profilePhoto }} 
                        style={styles.chatModalAvatarImage} 
                      />
                      <View style={[styles.chatModalStatus, { backgroundColor: selectedContact?.status === 'online' ? COLORS.success : COLORS.textLight }]} />
                    </View>
                  ) : (
                    <View style={styles.chatModalAvatarContainer}>
                      <View style={[styles.chatModalAvatar, { backgroundColor: getAvatarColor(selectedContact?.role) }]}>
                        <Text style={styles.chatModalAvatarText}>{getInitials(selectedContact?.name || '')}</Text>
                      </View>
                      <View style={[styles.chatModalStatus, { backgroundColor: selectedContact?.status === 'online' ? COLORS.success : COLORS.textLight }]} />
                    </View>
                  )}
                  <View>
                    <Text style={styles.chatModalPatientName}>{selectedContact?.name}</Text>
                    <Text style={styles.chatModalPatientStatus}>
                      {selectedContact?.status === 'online' ? 'Online' : 'Last seen recently'}
                    </Text>
                  </View>
                </View>
                <TouchableWeb style={styles.chatMenuButton} onPress={() => setChatOptionsVisible(true)} activeOpacity={0.7}>
                  <MaterialCommunityIcons name="dots-vertical" size={24} color={COLORS.white} />
                </TouchableWeb>
              </View>
            </LinearGradient>

            {/* Messages */}
            <FlatList
              ref={flatListRef}
              data={currentMessages}
              renderItem={renderMessage}
              keyExtractor={(item) => item.id}
              style={styles.messagesList}
              contentContainerStyle={styles.messagesContent}
              showsVerticalScrollIndicator={false}
              onScrollBeginDrag={() => Keyboard.dismiss()}
              keyboardShouldPersistTaps="handled"
              maintainVisibleContentPosition={{
                minIndexForVisible: 0,
                autoscrollToTopThreshold: 10,
              }}
            />

            {/* Attachment Preview */}
            {selectedAttachment && (
              <View style={styles.attachmentPreview}>
                <View style={styles.attachmentPreviewContent}>
                  {selectedAttachment.type === 'image' ? (
                    <>
                      <Image source={{ uri: selectedAttachment.uri }} style={styles.attachmentPreviewImage} />
                      <View style={styles.attachmentPreviewInfo}>
                        <MaterialCommunityIcons name="image" size={20} color={COLORS.primary} />
                        <Text style={styles.attachmentPreviewText} numberOfLines={1}>
                          {selectedAttachment.fileName}
                        </Text>
                      </View>
                    </>
                  ) : selectedAttachment.type === 'voice' ? (
                    <View style={styles.attachmentPreviewInfo}>
                      <MaterialCommunityIcons 
                        name="microphone" 
                        size={20} 
                        color={COLORS.primary} 
                      />
                      <Text style={styles.attachmentPreviewText} numberOfLines={1}>
                        Voice message ({selectedAttachment.duration}s)
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.attachmentPreviewInfo}>
                      <MaterialCommunityIcons 
                        name={selectedAttachment.type === 'audio' ? 'music' : 'file-document'} 
                        size={20} 
                        color={COLORS.primary} 
                      />
                      <Text style={styles.attachmentPreviewText} numberOfLines={1}>
                        {selectedAttachment.fileName}
                      </Text>
                    </View>
                  )}
                  <TouchableWeb 
                    style={styles.attachmentPreviewClose}
                    onPress={() => setSelectedAttachment(null)}
                    activeOpacity={0.7}
                  >
                    <MaterialCommunityIcons name="close" size={20} color={COLORS.textLight} />
                  </TouchableWeb>
                </View>
              </View>
            )}

            {/* Message Input */}
            <View style={styles.messageInputContainer}>
              {isRecording ? (
                <View style={styles.recordingContainer}>
                  <TouchableWeb 
                    style={styles.cancelRecordingButton}
                    onPress={cancelRecording}
                    activeOpacity={0.7}
                  >
                    <MaterialCommunityIcons name="close" size={24} color={COLORS.error} />
                  </TouchableWeb>
                  <View style={styles.recordingIndicator}>
                    <View style={styles.recordingDot} />
                    <Text style={styles.recordingTime}>
                      {Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, '0')}
                    </Text>
                  </View>
                  <Text style={styles.recordingHint}>Slide to cancel</Text>
                  <TouchableWeb 
                    style={styles.sendRecordingButton}
                    onPress={stopRecording}
                    activeOpacity={0.7}
                  >
                    <MaterialCommunityIcons name="send" size={24} color={COLORS.white} />
                  </TouchableWeb>
                </View>
              ) : (
                <View style={styles.messageInput}>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Type a message..."
                    placeholderTextColor={COLORS.textLight}
                    value={messageText}
                    onChangeText={setMessageText}
                    multiline
                    maxLength={500}
                  />
                  {!messageText.trim() && !selectedAttachment && (
                    <>
                      <TouchableWeb style={styles.attachButton} onPress={handleAttachFile} activeOpacity={0.7}>
                        <MaterialCommunityIcons name="paperclip" size={22} color={COLORS.textLight} />
                      </TouchableWeb>
                      <TouchableWeb 
                        style={styles.voiceButton} 
                        onPress={startRecording}
                        activeOpacity={0.7}
                      >
                        <MaterialCommunityIcons 
                          name="microphone" 
                          size={22} 
                          color={COLORS.textLight} 
                        />
                      </TouchableWeb>
                    </>
                  )}
                  {(messageText.trim() || selectedAttachment) && (
                    <TouchableWeb
                      style={styles.sendButtonInline}
                      onPress={sendMessageToContact}
                      activeOpacity={0.7}
                    >
                      <View style={styles.sendCircle}>
                        <MaterialCommunityIcons 
                          name="arrow-up" 
                          size={20} 
                          color={COLORS.white} 
                        />
                      </View>
                    </TouchableWeb>
                  )}
                </View>
              )}
            </View>

            {/* Chat Options Modal */}
            <Modal
              animationType="fade"
              transparent={true}
              visible={chatOptionsVisible}
              onRequestClose={() => setChatOptionsVisible(false)}
            >
              <TouchableWeb
                style={styles.optionsModalOverlay}
                activeOpacity={1}
                onPress={() => setChatOptionsVisible(false)}
              >
                <TouchableWeb activeOpacity={1} onPress={(e) => e.stopPropagation()}>
                  <View style={styles.optionsMenu}>
                    <TouchableWeb
                      style={styles.optionItem}
                      onPress={() => {
                        if (pinnedChats.includes(selectedContact?.id)) {
                          setPinnedChats(pinnedChats.filter(id => id !== selectedContact?.id));
                        } else {
                          setPinnedChats([...pinnedChats, selectedContact?.id]);
                        }
                        setChatOptionsVisible(false);
                      }}
                      activeOpacity={0.7}
                    >
                      <MaterialCommunityIcons name={pinnedChats.includes(selectedContact?.id) ? "pin" : "pin-outline"} size={20} color={COLORS.primary} />
                      <Text style={styles.optionText}>{pinnedChats.includes(selectedContact?.id) ? 'Unpin Chat' : 'Pin Chat'}</Text>
                    </TouchableWeb>
                    <TouchableWeb
                      style={styles.optionItem}
                      onPress={() => {
                        if (mutedChats.includes(selectedContact?.id)) {
                          setMutedChats(mutedChats.filter(id => id !== selectedContact?.id));
                        } else {
                          setMutedChats([...mutedChats, selectedContact?.id]);
                        }
                        setChatOptionsVisible(false);
                      }}
                      activeOpacity={0.7}
                    >
                      <MaterialCommunityIcons name={mutedChats.includes(selectedContact?.id) ? "bell" : "bell-off"} size={20} color={COLORS.primary} />
                      <Text style={styles.optionText}>{mutedChats.includes(selectedContact?.id) ? 'Unmute Notifications' : 'Mute Notifications'}</Text>
                    </TouchableWeb>
                    <TouchableWeb
                      style={styles.optionItem}
                      onPress={() => {
                        setCurrentMessages([]);
                        setChatOptionsVisible(false);
                        Alert.alert('Success', 'Chat cleared');
                      }}
                      activeOpacity={0.7}
                    >
                      <MaterialCommunityIcons name="delete" size={20} color={COLORS.error} />
                      <Text style={[styles.optionText, { color: COLORS.error }]}>Clear Chat</Text>
                    </TouchableWeb>
                  </View>
                </TouchableWeb>
              </TouchableWeb>
            </Modal>

            {/* Attachment Menu Overlay - Inside Chat Modal */}
            {attachmentMenuVisible && (
              <TouchableWeb
                style={styles.attachmentOverlay}
                activeOpacity={1}
                onPress={() => setAttachmentMenuVisible(false)}
              >
                <View style={styles.attachmentMenuContainer}>
                  <TouchableWeb activeOpacity={1} onPress={(e) => e.stopPropagation()}>
                    <View style={styles.attachmentMenuContent}>
                      <View style={styles.attachmentDragHandle} />
                
                                      
                      <View style={styles.attachmentHeader}>
                        <Text style={styles.attachmentTitle}>Add Attachments</Text>
                        <TouchableWeb
                          onPress={() => setAttachmentMenuVisible(false)}
                          activeOpacity={0.7}
                        >
                          <MaterialCommunityIcons name="close" size={26} color={COLORS.text} />
                        </TouchableWeb>
                      </View>

                      <View style={styles.attachmentGrid}>
                        <TouchableWeb
                          style={styles.attachmentItem}
                          onPress={handleCamera}
                          activeOpacity={0.7}
                        >
                          <LinearGradient
                            colors={['#F36B2E', '#E85D2D']}
                            style={styles.attachmentIconGradient}
                          >
                            <MaterialCommunityIcons name="camera" size={28} color={COLORS.white} />
                          </LinearGradient>
                          <Text style={styles.attachmentLabel}>Camera</Text>
                        </TouchableWeb>

                        <TouchableWeb
                          style={styles.attachmentItem}
                          onPress={handleGallery}
                          activeOpacity={0.7}
                        >
                          <LinearGradient
                            colors={['#FFA500', '#FF9500']}
                            style={styles.attachmentIconGradient}
                          >
                            <MaterialCommunityIcons name="image-multiple" size={28} color={COLORS.white} />
                          </LinearGradient>
                          <Text style={styles.attachmentLabel}>Gallery</Text>
                        </TouchableWeb>

                        <TouchableWeb
                          style={styles.attachmentItem}
                          onPress={handleDocument}
                          activeOpacity={0.7}
                        >
                          <LinearGradient
                            colors={['#4E7AC8', '#3E6BA8']}
                            style={styles.attachmentIconGradient}
                          >
                            <MaterialCommunityIcons name="file-document" size={28} color={COLORS.white} />
                          </LinearGradient>
                          <Text style={styles.attachmentLabel}>Document</Text>
                        </TouchableWeb>

                        <TouchableWeb
                          style={styles.attachmentItem}
                          onPress={handleAudio}
                          activeOpacity={0.7}
                        >
                          <LinearGradient
                            colors={['#F49C3D', '#EB8C2D']}
                            style={styles.attachmentIconGradient}
                          >
                            <MaterialCommunityIcons name="microphone" size={28} color={COLORS.white} />
                          </LinearGradient>
                          <Text style={styles.attachmentLabel}>Audio</Text>
                        </TouchableWeb>

                        <TouchableWeb
                          style={styles.attachmentItem}
                          onPress={handleContact}
                          activeOpacity={0.7}
                        >
                          <LinearGradient
                            colors={['#2FACB6', '#2A9BA3']}
                            style={styles.attachmentIconGradient}
                          >
                            <MaterialCommunityIcons name="contacts" size={32} color={COLORS.white} />
                          </LinearGradient>
                          <Text style={styles.attachmentLabel}>Contact</Text>
                        </TouchableWeb>

                        <TouchableWeb
                          style={styles.attachmentItem}
                          onPress={handleLocation}
                          activeOpacity={0.7}
                        >
                          <LinearGradient
                            colors={['#2DA842', '#27952E']}
                            style={styles.attachmentIconGradient}
                          >
                            <MaterialCommunityIcons name="map-marker" size={32} color={COLORS.white} />
                          </LinearGradient>
                          <Text style={styles.attachmentLabel}>Location</Text>
                        </TouchableWeb>
                      </View>
                    </View>
                  </TouchableWeb>
                </View>
              </TouchableWeb>
            )}

            {/* Image Viewer Modal - Inside Chat Modal */}
            <Modal
              visible={imageViewerVisible}
              transparent={true}
              animationType="fade"
              onRequestClose={() => setImageViewerVisible(false)}
            >
              <View style={styles.imageViewerModal}>
                <TouchableWeb
                  style={styles.imageViewerCloseButton}
                  onPress={() => setImageViewerVisible(false)}
                >
                  <MaterialCommunityIcons name="close" size={30} color={COLORS.white} />
                </TouchableWeb>
                {viewerImageUri && (
                  <Image
                    source={{ uri: viewerImageUri }}
                    style={styles.imageViewerImage}
                    resizeMode="contain"
                  />
                )}
              </View>
            </Modal>

            {/* Document Viewer Modal - Inside Chat Modal */}
            <Modal
              visible={documentViewerVisible}
              transparent={false}
              animationType="slide"
              onRequestClose={() => setDocumentViewerVisible(false)}
            >
              <SafeAreaView style={styles.documentViewerContainer}>
                <View style={styles.documentViewerHeader}>
                  <Text style={styles.documentViewerTitle} numberOfLines={1}>
                    {viewerDocumentName}
                  </Text>
                  <TouchableWeb
                    style={styles.documentViewerCloseButton}
                    onPress={() => setDocumentViewerVisible(false)}
                  >
                    <MaterialCommunityIcons name="close" size={24} color={COLORS.text} />
                  </TouchableWeb>
                </View>
                {viewerDocumentUri && (
                  <WebView
                    source={{ uri: viewerDocumentUri }}
                    style={styles.documentWebView}
                    startInLoadingState={true}
                    renderLoading={() => (
                      <View style={styles.documentLoading}>
                        <MaterialCommunityIcons name="file-document-outline" size={48} color={COLORS.primary} />
                        <Text style={styles.documentLoadingText}>Loading document...</Text>
                      </View>
                    )}
                    onError={(error) => {
                      console.error('WebView error:', error);
                      Alert.alert('Error', 'Unable to load document');
                    }}
                  />
                )}
              </SafeAreaView>
            </Modal>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  watermarkLogo: {
    position: 'absolute',
    width: 250,
    height: 250,
    alignSelf: 'center',
    top: '40%',
    opacity: 0.05,
    zIndex: 0,
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: 'Poppins_700Bold',
    color: COLORS.white,
    flex: 1,
    textAlign: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  headerButton: {
    padding: 4,
  },
  searchContainer: {
    marginTop: 12,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: COLORS.white,
    fontFamily: 'Poppins_400Regular',
  },
  searchDropdown: {
    marginTop: 8,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    maxHeight: 300,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  searchDropdownScroll: {
    maxHeight: 300,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    gap: 12,
  },
  searchResultAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchResultAvatarText: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.white,
  },
  searchResultInfo: {
    flex: 1,
  },
  searchResultName: {
    fontSize: 15,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.textDark,
  },
  searchResultEmail: {
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.textLight,
    marginTop: 2,
  },
  content: {
    flex: 1,
  },
  chatListSection: {
    backgroundColor: COLORS.white,
    flex: 1,
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 12,
    marginVertical: 6,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  chatAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#00A884',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 18,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.white,
  },
  chatInfo: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  chatName: {
    fontSize: 16,
    fontFamily: 'Poppins_500Medium',
    color: '#000',
    flex: 1,
  },
  chatTime: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    color: '#667781',
    marginLeft: 8,
  },
  chatLastMessageRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  onlineIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#25D366',
    marginRight: 6,
  },
  chatLastMessage: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: '#667781',
  },
  unreadBadge: {
    backgroundColor: '#25D366',
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    marginLeft: 8,
  },
  unreadCount: {
    fontSize: 11,
    fontFamily: 'Poppins_700Bold',
    color: COLORS.white,
  },
  noResultsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    backgroundColor: COLORS.white,
  },
  noResultsText: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.text,
    marginTop: 12,
  },
  noResultsSubtext: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.textLight,
    marginTop: 4,
  },
  noResultsSubtext: {
    fontSize: 14,
    color: COLORS.textLight,
    marginTop: 4,
  },

  // Chat Modal Styles
  chatModalContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  chatModalHeader: {
    paddingTop: 60,
    paddingBottom: 15,
    paddingHorizontal: 20,
  },
  chatModalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chatBackButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  chatPatientInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  chatModalAvatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  chatModalAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatModalAvatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  chatModalAvatarText: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.white,
  },
  chatModalStatus: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  chatModalPatientName: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.white,
  },
  chatModalPatientStatus: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.white,
    opacity: 0.8,
  },
  chatMenuButton: {
    padding: 8,
  },
  messagesList: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 8,
  },
  messageContainer: {
    marginBottom: 8,
  },
  adminMessage: {
    alignItems: 'flex-end',
  },
  patientMessage: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '75%',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    marginVertical: 1,
  },
  adminBubble: {
    backgroundColor: '#DCF8C6',
    borderBottomRightRadius: 4,
  },
  patientBubble: {
    backgroundColor: COLORS.white,
    borderBottomLeftRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  messageText: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    lineHeight: 18,
    marginBottom: 2,
  },
  attachmentImageContainer: {
    marginBottom: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },
  attachmentImage: {
    width: 200,
    height: 200,
    borderRadius: 12,
  },
  attachmentFileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 8,
    marginBottom: 8,
  },
  attachmentFileName: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
  },
  attachmentFileNameAdmin: {
    color: COLORS.white,
  },
  attachmentFileNamePatient: {
    color: COLORS.text,
  },
  adminMessageText: {
    color: COLORS.text,
  },
  patientMessageText: {
    color: COLORS.text,
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    marginTop: 2,
  },
  messageTime: {
    fontSize: 10,
    fontFamily: 'Poppins_400Regular',
  },
  adminTimeText: {
    color: COLORS.textLight,
    opacity: 0.8,
  },
  patientTimeText: {
    color: COLORS.textLight,
  },
  checkIcon: {
    marginLeft: 2,
  },
  attachmentPreview: {
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  attachmentPreviewContent: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    padding: 8,
    gap: 8,
  },
  attachmentPreviewImage: {
    width: 40,
    height: 40,
    borderRadius: 6,
  },
  attachmentPreviewInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  attachmentPreviewText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.text,
  },
  attachmentPreviewClose: {
    padding: 4,
  },
  messageInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 20,
    backgroundColor: COLORS.white,
  },
  messageInput: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#F2F2F7',
    borderRadius: 20,
    paddingLeft: 12,
    paddingRight: 6,
    paddingVertical: 6,
    minHeight: 36,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.text,
    maxHeight: 100,
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  attachButton: {
    padding: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  voiceButton: {
    padding: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  voiceButtonRecording: {
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    borderRadius: 16,
  },
  recordingContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 12,
  },
  cancelRecordingButton: {
    padding: 4,
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.error,
  },
  recordingTime: {
    fontSize: 16,
    fontFamily: 'Poppins_500Medium',
    color: COLORS.text,
  },
  recordingHint: {
    flex: 1,
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.textLight,
    textAlign: 'center',
  },
  sendRecordingButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  voiceNoteContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    marginBottom: 8,
  },
  voiceNoteWaveform: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    height: 30,
  },
  voiceNoteBar: {
    width: 3,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 1.5,
  },
  voiceNoteBarAdmin: {
    backgroundColor: 'rgba(255,255,255,0.6)',
  },
  voiceNoteDuration: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.text,
  },
  voiceNoteDurationAdmin: {
    color: COLORS.white,
  },
  sendButtonInline: {
    padding: 2,
  },
  sendCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionsModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-start',
    paddingTop: 70,
    paddingHorizontal: 16,
  },
  optionsMenu: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 8,
    alignSelf: 'flex-end',
    minWidth: 220,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 12,
  },
  optionText: {
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
    color: COLORS.text,
  },
  attachmentMenuContainer: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'flex-end',
  },
  attachmentOverlay: {
    position: 'absolute',
    bottom: 70,
    left: 0,
    right: 0,
    backgroundColor: 'transparent',
  },
  attachmentMenuContent: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    marginHorizontal: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -5 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 20,
  },
  attachmentDragHandle: {
    width: 48,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E0E0E0',
    alignSelf: 'center',
    marginBottom: 8,
  },
  attachmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  attachmentTitle: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.text,
    letterSpacing: 0.3,
  },
  attachmentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    paddingVertical: 4,
  },
  attachmentItem: {
    width: '33%',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  attachmentIconGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  attachmentLabel: {
    fontSize: 12,
    fontFamily: 'Poppins_500Medium',
    color: COLORS.text,
    textAlign: 'center',
    lineHeight: 16,
    letterSpacing: 0.2,
  },
  // Image Viewer Styles
  imageViewerModal: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageViewerCloseButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 22,
  },
  imageViewerImage: {
    width: '100%',
    height: '80%',
  },
  // Document Viewer Styles
  documentViewerContainer: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  documentViewerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  documentViewerTitle: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.text,
    marginRight: 12,
  },
  documentViewerCloseButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  documentWebView: {
    flex: 1,
  },
  documentLoading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  documentLoadingText: {
    marginTop: 12,
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.textLight,
  },
  // Swipe to delete styles
  swipeContainer: {
    position: 'relative',
    backgroundColor: COLORS.background,
  },
  swipeableRow: {
    backgroundColor: COLORS.card,
    zIndex: 2,
  },
  deleteBackground: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: 80,
    backgroundColor: '#ff4444',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  deleteButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  deleteText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: 'Poppins_600SemiBold',
    marginTop: 4,
    textAlign: 'center',
  },
});