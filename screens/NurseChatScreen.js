import TouchableWeb from "../components/TouchableWeb";
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, FlatList, Modal, KeyboardAvoidingView, Platform, Keyboard, Alert, Linking, Image } from 'react-native';
import { WebView } from 'react-native-webview';
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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
// Helper function to safely extract message text from various formats
const getMessageText = (lastMsg) => {
  if (!lastMsg) return 'Start a conversation';
  
  // If it's already a string, return it
  if (typeof lastMsg === 'string') return lastMsg;
  
  // If it's an object, try different properties
  if (typeof lastMsg === 'object') {
    // Check for text property
    if (lastMsg.text && typeof lastMsg.text === 'string') {
      return lastMsg.text;
    }
    
    // Check for message property
    if (lastMsg.message && typeof lastMsg.message === 'string') {
      return lastMsg.message;
    }
    
    // If it has the corrupted format with senderId/receiverId
    if (lastMsg.senderId || lastMsg.receiverId || lastMsg.senderRole) {
      return 'Start a conversation'; // Corrupted data, show default
    }
    
    return 'Start a conversation';
  }
  
  return 'Start a conversation';
};

// Helper function to safely extract message time
const getMessageTime = (lastMsg) => {
  if (!lastMsg) return '';
  
  if (typeof lastMsg === 'object' && lastMsg.time) {
    return lastMsg.time;
  }
  
  if (typeof lastMsg === 'object' && lastMsg.timestamp) {
    const date = new Date(lastMsg.timestamp);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  }
  
  return '';
};

export default function NurseChatScreen({ navigation: navProp }) {
  const navigation = navProp || useNavigation();
  const { user } = useAuth();
  const { sendMessage, getConversationMessages, markAsRead, getUnreadCount, getLastReadTimestamp, getTotalUnreadCount, getConversationId, lastMessages, unreadCounts, refreshConversations } = useChat();
  const insets = useSafeAreaInsets();
  
  const [selectedContact, setSelectedContact] = useState(null);
  const [messageText, setMessageText] = useState('');
  const [chatModalVisible, setChatModalVisible] = useState(false);
  const [searchVisible, setSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [currentMessages, setCurrentMessages] = useState([]);
  const [chatOptionsVisible, setChatOptionsVisible] = useState(false);
  const [pinnedChats, setPinnedChats] = useState([]);
  const [mutedChats, setMutedChats] = useState([]);
  const [attachmentMenuVisible, setAttachmentMenuVisible] = useState(false);
  const [recording, setRecording] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [sound, setSound] = useState(null);
  const [playingAudioId, setPlayingAudioId] = useState(null);
  const recordingInterval = useRef(null);
  const [userProfiles, setUserProfiles] = useState({});
  const [selectedAttachment, setSelectedAttachment] = useState(null);
  const [imageViewerVisible, setImageViewerVisible] = useState(false);
  const [viewerImageUri, setViewerImageUri] = useState(null);
  const [documentViewerVisible, setDocumentViewerVisible] = useState(false);
  const [viewerDocumentUri, setViewerDocumentUri] = useState(null);
  const [viewerDocumentName, setViewerDocumentName] = useState('');
  
  // Load user profiles with photos
  useEffect(() => {
    const loadUserProfiles = async () => {
      try {
        const usersData = await AsyncStorage.getItem('users');
        const profileMap = {};
        
        if (usersData) {
          const users = JSON.parse(usersData);
          console.log('Loaded users for profile photos:', users.length);
          users.forEach(user => {
            // Check both profilePhoto and profileImage fields
            const photo = user.profilePhoto || user.profileImage;
            profileMap[user.id] = {
              profilePhoto: photo,
              username: user.username,
              role: user.role
            };
            if (photo) {
              console.log(`User ${user.username} has profile photo`);
            }
          });
        }
        
        // Also load admin profiles separately (for Shertonia/ADMIN001)
        try {
          const admin001Profile = await AsyncStorage.getItem('adminProfile_ADMIN001');
          if (admin001Profile) {
            const adminData = JSON.parse(admin001Profile);
            const photo = adminData.profilePhoto || adminData.profileImage;
            if (photo) {
              profileMap['admin-001'] = {
                profilePhoto: photo,
                username: adminData.username || 'Shertonia Walker',
                role: 'admin'
              };
              console.log('Loaded Shertonia profile photo from adminProfile_ADMIN001');
            }
          }
        } catch (e) {
          console.log('No admin profile found for ADMIN001');
        }
        
        setUserProfiles(profileMap);
      } catch (error) {
        console.error('Error loading user profiles:', error);
      }
    };
    loadUserProfiles();
  }, []);
  
  // Helper function to get initials from name
  const getInitials = (name) => {
    if (!name) return '?';
    const nameParts = name.trim().split(' ');
    if (nameParts.length >= 2) {
      return (nameParts[0][0] + nameParts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  // Helper function to get color based on user type
  const getAvatarColor = (isAdmin) => {
    return isAdmin ? '#FF6B9D' : '#00A884'; // Pink for admin, green for patient
  };
  
  // Ref for auto-scrolling to bottom
  const flatListRef = useRef(null);

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

  // Refresh conversations when screen loads
  useEffect(() => {
    if (user) {
      refreshConversations();
    }
  }, [user]);

  // Load all users from AsyncStorage for search
  const [allUsers, setAllUsers] = useState([]);
  // Track active conversations (users we've chatted with)
  const [activeChats, setActiveChats] = useState([]);
  
  useEffect(() => {
    const loadAllUsers = async () => {
      try {
        const usersData = await AsyncStorage.getItem('users');
        const formattedUsers = [];
        
        if (usersData) {
          const users = JSON.parse(usersData);
          // Filter to show admins and patients (not other nurses)
          const regularUsers = users
            .filter(u => u.role === 'admin' || u.role === 'patient')
            .map(u => ({
              id: u.id,
              name: u.username || `${u.firstName || ''} ${u.lastName || ''}`.trim(),
              email: u.email || '',
              isAdmin: u.role === 'admin',
              status: 'offline',
              profilePhoto: u.profilePhoto || u.profileImage,
            }));
          
          formattedUsers.push(...regularUsers);
        }
        
        // Also load Shertonia's profile separately if it exists
        try {
          const admin001Profile = await AsyncStorage.getItem('adminProfile_ADMIN001');
          if (admin001Profile) {
            const adminData = JSON.parse(admin001Profile);
            formattedUsers.push({
              id: 'admin-001',
              name: adminData.username || 'Shertonia Walker',
              email: adminData.email || '',
              isAdmin: true,
              status: 'offline',
              profilePhoto: adminData.profilePhoto || adminData.profileImage,
            });
          }
        } catch (e) {
          console.log('No admin profile found for ADMIN001');
        }
        
        setAllUsers(formattedUsers);
        console.log('Loaded users for search:', formattedUsers.length);
      } catch (error) {
        console.error('Error loading users:', error);
      }
    };
    
    if (user) {
      loadAllUsers();
    }
  }, [user]); // Load once when user is available

  // Load active chats from lastMessages
  useEffect(() => {
    const loadActiveChats = async () => {
      try {
        const usersData = await AsyncStorage.getItem('users');
        if (!usersData) return;
        
        const allUsersFromStorage = JSON.parse(usersData);
        
        // Get all conversations from lastMessages
        const conversationIds = Object.keys(lastMessages);
        console.log('🔍 NURSE: Conversation IDs from lastMessages:', conversationIds);
        console.log('🔍 NURSE: Current user ID:', user?.id || 'NURSE001');
        const activeConversations = [];
        const seenUserIds = new Set(); // Track users we've already added
        
        for (const conversationId of conversationIds) {
          // Check if this conversation involves the current user
          const parts = conversationId.split('_');
          if (parts.length !== 2) continue;
          
          const [userId1, userId2] = parts;
          const currentUserId = user?.id || 'nurse-001';
          
          // Skip if this conversation doesn't involve current user
          if (userId1 !== currentUserId && userId2 !== currentUserId) continue;
          
          // Get the other user's ID
          const otherUserId = userId1 === currentUserId ? userId2 : userId1;
          
          // Skip if we've already added this user, BUT check if this conversation has a newer message
          if (seenUserIds.has(otherUserId)) {
            // Find the existing conversation for this user
            const existingConvIndex = activeConversations.findIndex(c => c.id === otherUserId);
            if (existingConvIndex >= 0) {
              const currentMsg = lastMessages[conversationId];
              const existingMsg = activeConversations[existingConvIndex].lastMessage;
              
              // Compare timestamps - use the newer message
              const currentTimestamp = currentMsg?.timestamp ? new Date(currentMsg.timestamp).getTime() : 0;
              const existingTimestamp = existingMsg?.timestamp ? new Date(existingMsg.timestamp).getTime() : 0;
              
              if (currentTimestamp > existingTimestamp) {
                console.log('🔄 NURSE: Found newer message for', otherUserId, 'updating');
                // Update with the newer message
                const lastMsg = currentMsg;
                
                // Recalculate unread counts - check both conversation IDs
                let nurseUnreadCount = getUnreadCount(conversationId, user?.id || 'nurse-001');
                let otherUserUnreadCount = getUnreadCount(conversationId, otherUserId);
                
                // Also check legacy conversation ID if chatting with admin
                if (otherUserId === 'admin-001' || otherUserId === 'admin') {
                  const legacyConversationId = getConversationId('nurse-001', 'admin');
                  const legacyNurseUnread = getUnreadCount(legacyConversationId, user?.id || 'nurse-001');
                  nurseUnreadCount = Math.max(nurseUnreadCount, legacyNurseUnread);
                  
                  const legacyOtherUnread = getUnreadCount(legacyConversationId, 'admin-001');
                  const altLegacyOtherUnread = getUnreadCount(legacyConversationId, 'admin');
                  otherUserUnreadCount = Math.max(otherUserUnreadCount, legacyOtherUnread, altLegacyOtherUnread);
                }
                
                // Update the existing conversation
                activeConversations[existingConvIndex].lastMessage = lastMsg;
                activeConversations[existingConvIndex].lastMessageTime = getMessageTime(lastMsg);
                activeConversations[existingConvIndex].timestamp = lastMsg?.timestamp || 0;
                activeConversations[existingConvIndex].unreadCount = nurseUnreadCount;
                activeConversations[existingConvIndex].otherUserUnreadCount = otherUserUnreadCount;
              }
            }
            continue;
          }
          seenUserIds.add(otherUserId);
          
          // Find the other user in allUsers or load from storage
          let otherUser = allUsers.find(u => u.id === otherUserId);
          
          if (!otherUser) {
            // User not in allUsers, load from storage
            const userFromStorage = allUsersFromStorage.find(u => u.id === otherUserId);
            if (userFromStorage) {
              otherUser = {
                id: userFromStorage.id,
                name: userFromStorage.username || `${userFromStorage.firstName || ''} ${userFromStorage.lastName || ''}`.trim(),
                email: userFromStorage.email || '',
                isAdmin: userFromStorage.role === 'admin',
                status: 'offline',
                profilePhoto: userFromStorage.profilePhoto || userFromStorage.profileImage,
              };
            }
          }
          
          if (otherUser) {
            const lastMsg = lastMessages[conversationId];
            
            // Get unread count for this nurse (messages from others)
            // Check both possible conversation IDs
            let nurseUnreadCount = getUnreadCount(conversationId, user?.id || 'nurse-001');
            
            // Also check legacy conversation ID if chatting with admin
            if (otherUserId === 'admin-001' || otherUserId === 'admin') {
              const legacyConversationId = getConversationId('nurse-001', 'admin');
              const legacyNurseUnread = getUnreadCount(legacyConversationId, user?.id || 'nurse-001');
              nurseUnreadCount = Math.max(nurseUnreadCount, legacyNurseUnread);
            }
            
            // Get unread count for the other user (messages from nurse that they haven't read)
            let otherUserUnreadCount = getUnreadCount(conversationId, otherUserId);
            if (otherUserId === 'admin-001' || otherUserId === 'admin') {
              const legacyConversationId = getConversationId('nurse-001', 'admin');
              const legacyOtherUnread = getUnreadCount(legacyConversationId, otherUserId === 'admin-001' ? 'admin-001' : 'admin');
              const altLegacyOtherUnread = getUnreadCount(legacyConversationId, 'admin');
              otherUserUnreadCount = Math.max(otherUserUnreadCount, legacyOtherUnread, altLegacyOtherUnread);
            }
            
            activeConversations.push({
              ...otherUser,
              lastMessage: lastMsg,
              lastMessageTime: getMessageTime(lastMsg),
              timestamp: lastMsg?.timestamp || 0,
              unreadCount: nurseUnreadCount,
              otherUserUnreadCount: otherUserUnreadCount
            });
          }
        }
        
        // Sort by timestamp, most recent first
        activeConversations.sort((a, b) => {
          const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
          const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
          return timeB - timeA;
        });
        
        setActiveChats(activeConversations);
        console.log('Active chats loaded:', activeConversations.length);
        
        // Badge is displayed by ChatTabIcon in App.js, no need to set here
        const totalUnread = getTotalUnreadCount('nurse-001');
        console.log('📊 NURSE: Total unread count:', totalUnread);
      } catch (error) {
        console.error('Error loading active chats:', error);
      }
    };
    
    if (user) {
      loadActiveChats();
    }
  }, [lastMessages, unreadCounts, allUsers, user]); // Reload when lastMessages, unreadCounts, or users change
  const getMessages = async (contactId) => {
    if (!contactId || !selectedContact) return [];
    
    const conversationId = getConversationId(user?.id || 'NURSE001', contactId);
    
    // Get messages from ChatContext
    const messages = await getConversationMessages(conversationId);
    
    return messages;
  };

  const handleSendMessage = async () => {
    if ((messageText.trim() || selectedAttachment) && selectedContact) {
      const conversationId = getConversationId(user?.id || 'NURSE001', selectedContact.id);
      let messageContent = messageText.trim();
      
      // If there's an attachment, append it to the message
      if (selectedAttachment) {
        const attachmentText = selectedAttachment.type === 'image' 
          ? `📷 Image: ${selectedAttachment.fileName}`
          : selectedAttachment.type === 'document'
          ? `📄 Document: ${selectedAttachment.fileName}`
          : selectedAttachment.type === 'audio'
          ? `🎵 Audio: ${selectedAttachment.fileName}`
          : `📎 Attachment: ${selectedAttachment.fileName}`;
        
        messageContent = messageContent ? `${messageContent}\n${attachmentText}` : attachmentText;
      }
      
      // Create the new message object immediately
      const newMessage = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        text: messageContent,
        sender: user?.id || 'nurse-001',
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
        // Send message to ChatContext and get the updated messages - pass attachment
        const updatedMessages = await sendMessage(conversationId, messageContent, user?.id || 'nurse-001', selectedContact.id, selectedAttachment);
        
        // Use the updated messages directly from ChatContext
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

  const openChat = async (contact) => {
    console.log('👁️ NURSE: Opening chat with', contact.name, 'conversationId will be:', getConversationId(user?.id || 'nurse-001', contact.id));
    setSelectedContact(contact);
    setChatModalVisible(true);
    
    const conversationId = getConversationId(user?.id || 'nurse-001', contact.id);
    
    // Load messages for this conversation
    const messages = await getConversationMessages(conversationId);
    console.log('📩 NURSE: Loaded', messages.length, 'messages');
    setCurrentMessages(messages);
    
    // Mark messages as read when opening chat
    console.log('📖 NURSE: Calling markAsRead for', conversationId, user?.id || 'nurse-001');
    markAsRead(conversationId, user?.id || 'nurse-001');
    
    // Also mark legacy conversation ID as read (if admin used old 'admin' ID)
    if (contact.id === 'admin-001' || contact.id === 'admin') {
      const legacyConversationId = getConversationId('nurse-001', 'admin');
      console.log('📖 NURSE: Also marking legacy conversationId as read:', legacyConversationId);
      markAsRead(legacyConversationId, user?.id || 'nurse-001');
    }
    
    // Scroll to bottom after messages load
    setTimeout(() => {
      scrollToBottom();
    }, 200);
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
      
      // Start duration timer
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
      // Stop the interval
      if (recordingInterval.current) {
        clearInterval(recordingInterval.current);
        recordingInterval.current = null;
      }

      await recording.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });
      
      const uri = recording.getURI();
      const duration = recordingDuration;
      
      setRecording(null);
      setIsRecording(false);
      
      // Set as voice attachment
      setSelectedAttachment({
        type: 'voice',
        uri: uri,
        fileName: `Voice ${duration}s.m4a`,
        duration: duration
      });
    } catch (error) {
      console.error('Failed to stop recording:', error);
      Alert.alert('Error', 'Failed to stop recording');
      setIsRecording(false);
    }
  };

  const cancelRecording = async () => {
    if (!recording) return;

    try {
      // Stop the interval
      if (recordingInterval.current) {
        clearInterval(recordingInterval.current);
        recordingInterval.current = null;
      }

      await recording.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });
      
      setRecording(null);
      setIsRecording(false);
      setRecordingDuration(0);
    } catch (error) {
      console.error('Failed to cancel recording:', error);
      setIsRecording(false);
    }
  };

  const playVoiceNote = async (messageId, uri) => {
    try {
      // If already playing this audio, pause it
      if (playingAudioId === messageId && sound) {
        await sound.pauseAsync();
        setPlayingAudioId(null);
        return;
      }

      // If another audio is playing, stop it first
      if (sound) {
        await sound.stopAsync();
        await sound.unloadAsync();
      }

      // Load and play the new audio
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri },
        { shouldPlay: true }
      );

      setSound(newSound);
      setPlayingAudioId(messageId);

      // When audio finishes, reset state
      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.didJustFinish) {
          setPlayingAudioId(null);
        }
      });
    } catch (error) {
      console.error('Failed to play voice note:', error);
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

  // Filter search results from all users (only when searching)
  const searchResults = searchQuery.trim() 
    ? allUsers.filter(u =>
        u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (u.email && u.email.toLowerCase().includes(searchQuery.toLowerCase()))
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
  const handleUserSelect = (user) => {
    setSearchQuery('');
    setShowSearchDropdown(false);
    openChat(user);
  };

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
    
    const currentNurseId = user?.id || 'nurse-001';
    const isNurse = item.sender === currentNurseId || item.sender === 'nurse-001';
    
    // Check if message has an attachment
    const hasAttachment = item.attachment && item.attachment.uri;
    
    // Check if message has been read by recipient using last read timestamp
    let isRead = false;
    if (isNurse && selectedContact && item.timestamp) {
      const conversationId = item.conversationId || getConversationId(currentNurseId, selectedContact.id);
      const recipientLastRead = getLastReadTimestamp(conversationId, selectedContact.id);
      
      // Also check legacy conversation ID if chatting with admin
      let legacyRecipientLastRead = null;
      if (selectedContact.id === 'admin-001' || selectedContact.id === 'admin') {
        const legacyConversationId = getConversationId('nurse-001', 'admin');
        legacyRecipientLastRead = getLastReadTimestamp(legacyConversationId, 'admin-001') || 
                                  getLastReadTimestamp(legacyConversationId, 'admin');
      }
      
      // Message is read if recipient's last read time is after message timestamp
      const messageTimestamp = new Date(item.timestamp).getTime();
      const lastReadTime = recipientLastRead ? new Date(recipientLastRead).getTime() : 0;
      const legacyLastReadTime = legacyRecipientLastRead ? new Date(legacyRecipientLastRead).getTime() : 0;
      
      isRead = (lastReadTime > 0 && lastReadTime >= messageTimestamp) || 
               (legacyLastReadTime > 0 && legacyLastReadTime >= messageTimestamp);
    }
    
    return (
      <View style={[styles.messageContainer, isNurse ? styles.nurseMessage : styles.otherMessage]}>
        <View style={[styles.messageBubble, isNurse ? styles.nurseBubble : styles.otherBubble]}>
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
            <View style={styles.voiceNoteContainer}>
              <TouchableWeb 
                onPress={() => playVoiceNote(item.id, item.attachment.uri)}
                activeOpacity={0.8}
                style={styles.voiceNotePlayButton}
              >
                <MaterialCommunityIcons 
                  name={playingAudioId === item.id ? "pause" : "play"} 
                  size={24} 
                  color={isNurse ? COLORS.white : COLORS.primary} 
                />
              </TouchableWeb>
              <View style={styles.voiceNoteWaveform}>
                {[...Array(5)].map((_, i) => (
                  <View 
                    key={i} 
                    style={[
                      styles.voiceNoteBar,
                      { 
                        height: 12 + Math.random() * 20,
                        backgroundColor: isNurse ? COLORS.white : COLORS.primary 
                      }
                    ]} 
                  />
                ))}
              </View>
              <Text style={[styles.voiceNoteDuration, isNurse ? styles.nurseMessageText : styles.otherMessageText]}>
                {item.attachment.duration}s
              </Text>
            </View>
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
                color={isNurse ? COLORS.white : COLORS.primary} 
              />
              <Text style={[styles.attachmentFileName, isNurse ? styles.attachmentFileNameNurse : styles.attachmentFileNameOther]}>
                {item.attachment.fileName}
              </Text>
              <MaterialCommunityIcons 
                name="download" 
                size={20} 
                color={isNurse ? COLORS.white : COLORS.primary} 
              />
            </TouchableWeb>
          )}
          {messageText && !messageText.startsWith('🎤 Voice message') && (
            <Text style={[styles.messageText, isNurse ? styles.nurseMessageText : styles.otherMessageText]}>
              {messageText}
            </Text>
          )}
          <View style={styles.messageFooter}>
            <Text style={[styles.messageTime, isNurse ? styles.nurseTimeText : styles.otherTimeText]}>
              {messageTime}
            </Text>
            {isNurse && (
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
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Header */}
      <LinearGradient
        colors={GRADIENTS.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 16 }]}
      >
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>Chats</Text>
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
                  {searchResults.map((user) => {
                    const profilePhoto = userProfiles[user.id]?.profilePhoto;
                    return (
                      <TouchableWeb
                        key={user.id}
                        style={styles.searchResultItem}
                        onPress={() => handleUserSelect(user)}
                        activeOpacity={0.7}
                      >
                        {profilePhoto ? (
                          <Image source={{ uri: profilePhoto }} style={styles.searchResultAvatar} />
                        ) : (
                          <View style={[styles.searchResultAvatar, { backgroundColor: getAvatarColor(user.isAdmin) }]}>
                            <Text style={styles.searchResultAvatarText}>{getInitials(user.name)}</Text>
                          </View>
                        )}
                        <View style={styles.searchResultInfo}>
                          <Text style={styles.searchResultName}>{user.name}</Text>
                          <Text style={styles.searchResultEmail}>{user.email}</Text>
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
        <View style={styles.section}>
          {activeChats.length > 0 ? (
            activeChats.map((contact) => {
              const profilePhoto = userProfiles[contact.id]?.profilePhoto;
              return (
                  <TouchableWeb
                    key={contact.id}
                    style={styles.contactItem}
                    onPress={() => openChat(contact)}
                    activeOpacity={0.95}
                  >
                    {profilePhoto ? (
                      <Image source={{ uri: profilePhoto }} style={styles.contactAvatar} />
                    ) : (
                      <View style={[styles.contactAvatar, { backgroundColor: getAvatarColor(contact.isAdmin) }]}>
                        <Text style={styles.avatarText}>{getInitials(contact.name)}</Text>
                      </View>
                    )}
                    <View style={styles.contactInfo}>
                      <View style={styles.contactHeader}>
                        <Text style={styles.contactName}>{contact.name}</Text>
                        <Text style={styles.contactTime}>{contact.lastMessageTime || ''}</Text>
                      </View>
                      <View style={styles.contactLastMessageRow}>
                        {contact.status === 'online' && (
                          <View style={styles.onlineIndicator} />
                        )}
                        {(contact.lastMessage?.sender === (user?.id || 'nurse-001') || contact.lastMessage?.sender === 'nurse') && (
                          <MaterialCommunityIcons 
                            name="check-all" 
                            size={16} 
                            color={contact.otherUserUnreadCount === 0 ? '#4fc3f7' : COLORS.textLight} 
                            style={{ marginRight: 4 }}
                          />
                        )}
                        <Text style={styles.contactLastMessage} numberOfLines={1}>
                          {getMessageText(contact.lastMessage)}
                        </Text>
                        {contact.unreadCount > 0 && (
                          <View style={styles.unreadBadge}>
                            <Text style={styles.unreadCount}>{contact.unreadCount}</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </TouchableWeb>
                );
              })
            ) : (
            <View style={styles.noResultsContainer}>
              <MaterialCommunityIcons 
                name="message-text-outline" 
                size={64} 
                color={COLORS.textLight} 
              />
              <Text style={styles.noResultsText}>No chats yet</Text>
              <Text style={styles.noResultsSubtext}>
                Use search to find someone to chat with
              </Text>
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
                <View style={styles.chatContactInfo}>
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
                      <View style={[styles.chatModalAvatar, { backgroundColor: getAvatarColor(selectedContact?.isAdmin) }]}>
                        <Text style={styles.chatModalAvatarText}>{getInitials(selectedContact?.name || '')}</Text>
                      </View>
                      <View style={[styles.chatModalStatus, { backgroundColor: selectedContact?.status === 'online' ? COLORS.success : COLORS.textLight }]} />
                    </View>
                  )}
                  <View>
                    <Text style={styles.chatModalContactName}>{selectedContact?.name}</Text>
                    <Text style={styles.chatModalContactRole}>{selectedContact?.isAdmin ? 'Admin' : 'Patient'}</Text>
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
              keyExtractor={(item) => item.id}
              renderItem={renderMessage}
              style={styles.messagesList}
              contentContainerStyle={styles.messagesContent}
              showsVerticalScrollIndicator={false}
              onScrollBeginDrag={() => Keyboard.dismiss()}
              keyboardShouldPersistTaps="handled"
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
              <View style={styles.messageInput}>
                <TextInput
                  style={styles.textInput}
                  placeholder="iMessage"
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
                      style={[styles.voiceButton, isRecording && styles.voiceButtonRecording]} 
                      onPress={handleVoiceRecording}
                      activeOpacity={0.7}
                    >
                      <MaterialCommunityIcons 
                        name={isRecording ? "stop" : "microphone"} 
                        size={22} 
                        color={isRecording ? COLORS.error : COLORS.textLight} 
                      />
                    </TouchableWeb>
                  </>
                )}
                {(messageText.trim() || selectedAttachment) && (
                  <TouchableWeb
                    style={styles.sendButtonInline}
                    onPress={handleSendMessage}
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
                            <MaterialCommunityIcons name="contacts" size={28} color={COLORS.white} />
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
                            <MaterialCommunityIcons name="map-marker" size={28} color={COLORS.white} />
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
    backgroundColor: COLORS.background,
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
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
  filterContainer: {
    backgroundColor: COLORS.white,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E8E8E8',
  },
  filterContent: {
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
    marginRight: 8,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterPillActive: {
    backgroundColor: COLORS.primary,
  },
  filterText: {
    fontSize: 11,
    fontFamily: 'Poppins_700Bold',
    color: COLORS.text,
    textAlign: 'center',
  },
  filterTextActive: {
    color: COLORS.white,
  },
  headerButton: {
    padding: 4,
  },
  welcomeText: {
    fontSize: 18,
    fontFamily: 'Poppins_700Bold',
    color: COLORS.white,
    opacity: 0.98,
    textAlign: 'center',
    flex: 1,
    marginHorizontal: 12,
  },
  searchButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
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
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  section: {
    backgroundColor: COLORS.white,
    flex: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.textLight,
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  contactItem: {
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
  contactAvatar: {
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
  contactStatus: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  contactInfo: {
    flex: 1,
  },
  contactHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  contactName: {
    fontSize: 16,
    fontFamily: 'Poppins_500Medium',
    color: '#000',
    flex: 1,
  },
  contactTime: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    color: '#667781',
    marginLeft: 8,
  },
  contactRole: {
    fontSize: 12,
    fontFamily: 'Poppins_500Medium',
    color: COLORS.primary,
    marginBottom: 2,
  },
  contactLastMessageRow: {
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
  contactLastMessage: {
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
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.white,
  },
  
  // Chat Modal Styles
  chatModalContainer: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  chatModalHeader: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
  },
  chatModalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  chatBackButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatContactInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 16,
  },
  chatModalAvatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  chatModalAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
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
  chatModalContactName: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.white,
  },
  chatModalContactRole: {
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
  nurseMessage: {
    alignItems: 'flex-end',
  },
  otherMessage: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '75%',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    marginVertical: 1,
  },
  nurseBubble: {
    backgroundColor: '#DCF8C6',
    borderBottomRightRadius: 4,
  },
  otherBubble: {
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
  attachmentFileNameNurse: {
    color: COLORS.white,
  },
  attachmentFileNameOther: {
    color: COLORS.text,
  },
  nurseMessageText: {
    color: COLORS.text,
  },
  otherMessageText: {
    color: COLORS.text,
  },
  messageTime: {
    fontSize: 10,
    fontFamily: 'Poppins_400Regular',
  },
  nurseTimeText: {
    color: COLORS.textLight,
    opacity: 0.8,
  },
  otherTimeText: {
    color: COLORS.textLight,
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    marginTop: 2,
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
  sendButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    overflow: 'hidden',
  },
  sendButtonActive: {
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  sendButtonInactive: {},
  sendButtonGradient: {
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noResultsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 30,
    paddingHorizontal: 20,
  },
  noResultsText: {
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
    color: COLORS.textLight,
    marginTop: 8,
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
  voiceNoteContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 4,
  },
  voiceNotePlayButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  voiceNoteWaveform: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    flex: 1,
    height: 30,
  },
  voiceNoteBar: {
    width: 3,
    borderRadius: 1.5,
  },
  voiceNoteDuration: {
    fontSize: 12,
    fontFamily: 'Poppins_500Medium',
    marginLeft: 8,
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
});