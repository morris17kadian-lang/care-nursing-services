import TouchableWeb from "../components/TouchableWeb";
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, FlatList, Modal, KeyboardAvoidingView, Platform, Keyboard, Alert, Linking, Image, Animated, PanResponder, Dimensions } from 'react-native';
import { WebView } from 'react-native-webview';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, GRADIENTS } from '../constants';
import { useChat } from '../context/ChatContext';
import { useAuth } from '../context/AuthContext';
import ApiService from '../services/ApiService';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Audio } from 'expo-av';
import * as Contacts from 'expo-contacts';
import * as Location from 'expo-location';
import * as Sharing from 'expo-sharing';
import { useNavigation } from '@react-navigation/native';

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

export default function AdminChatScreen({ navigation: navProp, route }) {
  const navigation = navProp || useNavigation();
  const { sendMessage, getConversationMessages, markAsRead, getUnreadCount, getLastReadTimestamp, getTotalUnreadCount, getConversationId, lastMessages, unreadCounts, resetUnreadCounts, initializeUserChats } = useChat();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [selectedPatient, setSelectedPatient] = useState(null);

  // Handle navigation from notifications
  useEffect(() => {
    if (route?.params?.openConversation && user) {
      const conversationId = route.params.openConversation;
      
      // Parse conversation ID to find the other user
      const parts = conversationId.split('_');
      if (parts.length === 2) {
        const currentAdminId = user?.id || 'admin-001';
        const otherUserId = parts[0] === currentAdminId ? parts[1] : parts[0];
        
        // Find the user in activeChats first
        let targetUser = activeChats.find(chat => chat.id === otherUserId);
        
        // If not found in activeChats, try allUsers
        if (!targetUser) {
          targetUser = allUsers.find(u => u.id === otherUserId);
          if (targetUser) {
            // Convert allUsers format to activeChats format
            targetUser = {
              ...targetUser,
              name: targetUser.name || targetUser.username || otherUserId,
              type: targetUser.role === 'nurse' || targetUser.role === 'doctor' ? 'nurse' : 
                    targetUser.role === 'admin' ? 'admin' : 'patient'
            };
          }
        }
        
        if (targetUser) {
          openChat(targetUser);
        } else {
          // Create a basic user object for opening chat
          const basicUser = {
            id: otherUserId,
            name: otherUserId.includes('ADMIN') ? 'Admin User' : 
                  otherUserId.includes('NURSE') ? 'Nurse User' : 
                  otherUserId.includes('PATIENT') ? 'Patient User' : otherUserId,
            type: otherUserId.toLowerCase().includes('admin') ? 'admin' : 
                  otherUserId.toLowerCase().includes('nurse') ? 'nurse' : 'patient'
          };
          openChat(basicUser);
        }
      }
      
      // Clear the navigation parameter to prevent repeated opens
      setTimeout(() => {
        navigation.setParams({ openConversation: null });
      }, 500);
    }
  }, [route?.params?.openConversation, activeChats, allUsers, user]);
  const [messageText, setMessageText] = useState('');
  const [chatModalVisible, setChatModalVisible] = useState(false);
  const [searchVisible, setSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
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
  
  // Ref for auto-scrolling to bottom
  const flatListRef = useRef(null);

  // Load user profiles with photos
  useEffect(() => {
    const loadUserProfiles = async () => {
      try {
        const usersData = await AsyncStorage.getItem('users');
        const profileMap = {};
        
        if (usersData) {
          const users = JSON.parse(usersData);
          users.forEach(user => {
            // Check both profilePhoto and profileImage fields
            const photo = user.profilePhoto || user.profileImage;
            profileMap[user.id] = {
              profilePhoto: photo,
              username: user.username,
              role: user.role
            };
          });
        }
        
        // Also load admin profiles separately (for Nurse Bernard/ADMIN001)
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
          // No admin profile found for ADMIN001
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
  const getAvatarColor = (type) => {
    switch (type) {
      case 'admin': return '#FF6B9D'; // Pink for admin
      case 'nurse': return '#4FC3F7'; // Blue for nurse
      case 'patient': return '#00A884'; // Green for patient
      default: return '#00A884';
    }
  };

  // Helper function to safely extract text from lastMessage
  const getMessageText = (lastMsg) => {
    if (!lastMsg) return 'Start a conversation';
    if (typeof lastMsg === 'string') return lastMsg;
    if (typeof lastMsg === 'object') {
      // Check for text property
      if (lastMsg.text && typeof lastMsg.text === 'string') return lastMsg.text;
      // Check if it's a full message object with nested properties
      if (lastMsg.message && typeof lastMsg.message === 'string') return lastMsg.message;
      // Handle old message format with senderId, receiverId, etc
      if (lastMsg.senderId || lastMsg.receiverId || lastMsg.senderRole) {
        // This is an old message object format, return default
        return 'Start a conversation';
      }
      // Fallback for any other object structure
      return 'Start a conversation';
    }
    return 'Start a conversation';
  };

  // Helper function to safely extract time from lastMessage
  const getMessageTime = (lastMsg) => {
    if (!lastMsg) return '';
    if (typeof lastMsg === 'object') {
      if (lastMsg.time && typeof lastMsg.time === 'string') return lastMsg.time;
      if (lastMsg.timestamp) {
        // Format timestamp to time
        const date = new Date(lastMsg.timestamp);
        return date.toLocaleTimeString('en-US', { 
          hour: 'numeric', 
          minute: '2-digit',
          hour12: true 
        });
      }
    }
    return '';
  };

  // Function to scroll to bottom of messages
  const scrollToBottom = () => {
    if (flatListRef.current && currentMessages.length > 0) {
      setTimeout(() => {
        flatListRef.current.scrollToEnd({ animated: true });
      }, 100);
    }
  };

  // Initialize chat system for current user
  useEffect(() => {
    if (user?.id && user?.role) {
      initializeUserChats(user.id, user.role);
    }
  }, [user?.id, user?.role]);

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

  // Load all users from AsyncStorage for search
  const [allUsers, setAllUsers] = useState([]);
  // Track active conversations (users we've chatted with)
  const [activeChats, setActiveChats] = useState([]);
  
  useEffect(() => {
    const loadAllUsers = async () => {
      try {
        const usersData = await AsyncStorage.getItem('users');
        const users = usersData ? JSON.parse(usersData) : [];
        
        if (users && users.length > 0) {
          // Filter out the current admin user but allow ADMIN001 and other role users
          const formattedUsers = users
            .filter(userObj => {
              // Don't show the current admin user (themselves)
              if (userObj.id === user?.id) {
                return false;
              }
              // Allow ADMIN001 (Nurse Bernard) to appear in searches for other admins
              if (userObj.code === 'ADMIN001' || userObj.isSuperAdmin || userObj.email === 'nurse@876.com') {
                return true;
              }
              // Allow nurses, doctors, and patients
              const isNonAdmin = userObj.role !== 'admin';
              return isNonAdmin;
            })
            .map(userObj => ({
              id: userObj.id,
              name: userObj.username || `${userObj.firstName || ''} ${userObj.lastName || ''}`.trim(),
              email: userObj.email || '',
              type: userObj.role === 'nurse' || userObj.role === 'doctor' ? 'nurse' : 'patient',
              status: 'offline',
              profilePhoto: userObj.profilePhoto || userObj.profileImage,
            }));
          
          setAllUsers(formattedUsers);
        }
      } catch (error) {
        console.error('Error loading users:', error);
      }
    };
    
    loadAllUsers();
  }, []); // Load once on mount

  // Load active chats from lastMessages
  useEffect(() => {
    const loadActiveChats = async () => {
      try {
        const usersData = await AsyncStorage.getItem('users');
        if (!usersData) {
          return;
        }
        
        const allUsersFromStorage = JSON.parse(usersData);
        
        // Get all conversations from lastMessages
        const conversationIds = Object.keys(lastMessages);
        const activeConversations = [];
        const seenUserIds = new Set(); // Track users we've already added
        
        for (const conversationId of conversationIds) {
          // Check if this conversation involves the current user (admin)
          const parts = conversationId.split('_');
          if (parts.length !== 2) continue;
          
          const [userId1, userId2] = parts;
          // Admin can have various ID formats: 'admin', 'admin-001', 'admin-002', 'admin-003', etc.
          const currentAdminId = user?.id || 'admin-001';
          
          // Check if either user in the conversation is an admin (current user or any admin)
          const isUser1Admin = userId1 === currentAdminId || userId1 === 'admin' || userId1.startsWith('admin-');
          const isUser2Admin = userId2 === currentAdminId || userId2 === 'admin' || userId2.startsWith('admin-');
          const isCurrentUserInConversation = userId1 === currentAdminId || userId2 === currentAdminId;
          
          // Prioritize conversations where current user is directly involved
          if (isCurrentUserInConversation) {
            // Direct conversation for current user
          } else if ((user?.role === 'admin' || user?.role === 'superAdmin') && (isUser1Admin || isUser2Admin)) {
            // Admin supervision conversation
          } else {
            continue;
          }
          
          // Skip supervision conversations if user has direct conversations available
          const hasDirectConversations = conversationIds.some(cId => {
            const parts = cId.split('_');
            return parts.includes(currentAdminId);
          });
          
          if (hasDirectConversations && !isCurrentUserInConversation) {
            continue;
          }
          
          // Get the other user's ID (the one that's not the current admin)
          // For admin users viewing all conversations, we need to be smarter about this
          let otherUserId;
          if (userId1 === currentAdminId) {
            otherUserId = userId2;
          } else if (userId2 === currentAdminId) {
            otherUserId = userId1;
          } else {
            // Neither user is the current admin - this happens when admin supervises other conversations
            // For admin supervision, show the non-admin user as the "other" user
            const isUser1Admin = userId1 === 'admin' || userId1.startsWith('admin-');
            const isUser2Admin = userId2 === 'admin' || userId2.startsWith('admin-');
            
            if (isUser1Admin && !isUser2Admin) {
              otherUserId = userId2; // Show the non-admin user
            } else if (!isUser1Admin && isUser2Admin) {
              otherUserId = userId1; // Show the non-admin user
            } else if (isUser1Admin && isUser2Admin) {
              // Both are admins - show the one that's not current admin, or the "higher priority" one
              otherUserId = userId1 === 'admin-001' ? userId1 : userId2;
            } else {
              // Neither is admin (nurse-patient conversation)
              otherUserId = userId1; // Default to first user
            }
          }
          
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
                // Update with the newer message
                const lastMsg = currentMsg;
                
                // Recalculate unread counts with BOTH conversation IDs
                // First check the current conversation ID we're iterating over
                let adminUnreadCount = getUnreadCount(conversationId, user?.id || 'admin-001');
                
                // Then check the legacy conversation ID
                const legacyConversationId = getConversationId('admin', otherUserId);
                if (legacyConversationId !== conversationId) {
                  const legacyAdminUnread = getUnreadCount(legacyConversationId, 'admin');
                  const legacyAdminUnread2 = getUnreadCount(legacyConversationId, 'admin-001');
                  adminUnreadCount = Math.max(adminUnreadCount, legacyAdminUnread, legacyAdminUnread2);
                }
                
                // Also check the NEW conversation ID format (admin-001_nurse-001)
                const newConversationId = getConversationId('admin-001', otherUserId);
                if (newConversationId !== conversationId && newConversationId !== legacyConversationId) {
                  const newAdminUnread = getUnreadCount(newConversationId, 'admin-001');
                  adminUnreadCount = Math.max(adminUnreadCount, newAdminUnread);
                }
                
                let otherUserUnreadCount = getUnreadCount(conversationId, otherUserId);
                if (legacyConversationId !== conversationId) {
                  const legacyOtherUnread = getUnreadCount(legacyConversationId, otherUserId);
                  otherUserUnreadCount = Math.max(otherUserUnreadCount, legacyOtherUnread);
                }
                if (newConversationId !== conversationId && newConversationId !== legacyConversationId) {
                  const newOtherUnread = getUnreadCount(newConversationId, otherUserId);
                  otherUserUnreadCount = Math.max(otherUserUnreadCount, newOtherUnread);
                }
                
                // Update the existing conversation
                activeConversations[existingConvIndex].lastMessage = lastMsg;
                activeConversations[existingConvIndex].lastMessageTime = getMessageTime(lastMsg);
                activeConversations[existingConvIndex].timestamp = lastMsg?.timestamp || 0;
                activeConversations[existingConvIndex].unreadCount = adminUnreadCount;
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
                type: userFromStorage.role === 'nurse' || userFromStorage.role === 'doctor' ? 'nurse' : 'patient',
                status: 'offline',
                profilePhoto: userFromStorage.profilePhoto || userFromStorage.profileImage,
              };
            }
          }

          // Fallback: If user still not found, create a placeholder so the chat is visible
          if (!otherUser) {
            const isNurse = otherUserId.toLowerCase().includes('nurse');
            const isPatient = otherUserId.toLowerCase().includes('patient');
            const isSystem = otherUserId.toLowerCase() === 'system';
            
            otherUser = {
              id: otherUserId,
              name: isNurse ? `Nurse (${otherUserId})` : 
                    isPatient ? `Patient (${otherUserId})` : 
                    isSystem ? 'System' : `User ${otherUserId}`,
              email: '',
              type: isNurse ? 'nurse' : 'patient',
              status: 'offline',
              profilePhoto: null,
              isPlaceholder: true
            };
          }
          
          if (otherUser) {
            const lastMsg = lastMessages[conversationId];
            
            // Get unread count for this admin (messages from others)
            // Check both possible conversation IDs (new: admin-001_nurse-001, old: admin_nurse-001)
            let adminUnreadCount = getUnreadCount(conversationId, user?.id || 'admin-001');
            // Also check legacy conversation ID with 'admin' instead of 'admin-001'
            const legacyConversationId = getConversationId('admin', otherUserId);
            if (legacyConversationId !== conversationId) {
              const legacyAdminUnread = getUnreadCount(legacyConversationId, 'admin');
              const legacyAdminUnread2 = getUnreadCount(legacyConversationId, 'admin-001');
              adminUnreadCount = Math.max(adminUnreadCount, legacyAdminUnread, legacyAdminUnread2);
            }
            
            // Get unread count for the other user (messages from admin that they haven't read)
            // Check both new and legacy conversation IDs
            let otherUserUnreadCount = getUnreadCount(conversationId, otherUserId);
            if (legacyConversationId !== conversationId) {
              const legacyOtherUnread = getUnreadCount(legacyConversationId, otherUserId);
              otherUserUnreadCount = Math.max(otherUserUnreadCount, legacyOtherUnread);
            }
            
            activeConversations.push({
              ...otherUser,
              lastMessage: lastMsg,
              lastMessageTime: getMessageTime(lastMsg),
              timestamp: lastMsg?.timestamp || 0,
              unreadCount: adminUnreadCount,
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
        
        // Badge is displayed by ChatTabIcon in App.js, no need to set here
        const totalUnread = getTotalUnreadCount(user?.id || 'admin-001');
      } catch (error) {
        console.error('Error loading active chats:', error);
      }
    };
    
    loadActiveChats();
  }, [lastMessages, unreadCounts, allUsers, user, navigation]); // Reload when lastMessages, unreadCounts, or users change

  const handleSendMessage = async () => {
    if ((messageText.trim() || selectedAttachment) && selectedPatient) {
      const conversationId = getConversationId(user?.id || 'admin-001', selectedPatient.id);
      
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
        sender: user?.id || 'admin-001',
        recipient: selectedPatient.id,
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
        const senderRole = 'admin';
        const receiverRole = selectedPatient.type === 'nurse'
          ? 'nurse'
          : 'patient';

        // Send message to ChatContext and get the updated messages - pass attachment
        const updatedMessages = await sendMessage(conversationId, messageContent, senderRole, receiverRole, selectedAttachment);
        
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

  const openChat = async (patient) => {

    // SAFETY CHECK: Don't open chat with yourself
    if (patient.id === (user?.id || 'admin-001')) {
      Alert.alert('Error', 'Cannot open chat with yourself');
      return;
    }

    setSelectedPatient(patient);
    setChatModalVisible(true);
    
    const currentAdminId = user?.id || 'admin-001';
    const conversationId = getConversationId(currentAdminId, patient.id);
    // Load messages for this conversation
    const messages = await getConversationMessages(conversationId);
    setCurrentMessages(messages);
    
    // Mark messages as read when opening chat
    markAsRead(conversationId, user?.id || 'admin-001');
    
    // Also mark legacy conversation ID as read (if we used old 'admin' ID)
    if (patient.id === 'nurse-001' || patient.id.includes('nurse')) {
      const legacyConversationId = getConversationId('admin', patient.id);
      markAsRead(legacyConversationId, user?.id || 'admin-001');
      // Also mark with 'admin' as the user ID for complete legacy support
      markAsRead(legacyConversationId, 'admin');
    }
    
    // Scroll to bottom after messages load
    setTimeout(() => {
      scrollToBottom();
    }, 200);
  };

  const deleteChat = async (patient) => {
    try {
      const currentUserId = user?.id || 'admin-001';
      const conversationId = getConversationId(currentUserId, patient.id);
      
      // Remove from AsyncStorage
      await AsyncStorage.removeItem(`messages_${conversationId}`);
      await AsyncStorage.removeItem(`lastRead_${conversationId}`);
      
      // Also clear legacy conversation ID formats
      const legacyConversationId = getConversationId('admin', patient.id);
      if (legacyConversationId !== conversationId) {
        await AsyncStorage.removeItem(`messages_${legacyConversationId}`);
        await AsyncStorage.removeItem(`lastRead_${legacyConversationId}`);
      }
      
      // Update local state to remove the chat from the list
      setActiveChats(prevChats => prevChats.filter(chat => chat.id !== patient.id));
      
      Alert.alert('Success', `Conversation with ${patient.name} has been deleted.`);
    } catch (error) {
      console.error('Error deleting chat:', error);
      Alert.alert('Error', 'Failed to delete conversation. Please try again.');
    }
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
  const handleUserSelect = (user) => {
    setSearchQuery('');
    setShowSearchDropdown(false);
    openChat(user);
  };

  const renderPatientItem = ({ item }) => (
    <TouchableWeb
      style={[styles.patientItem, selectedPatient?.id === item.id && styles.selectedPatient]}
      onPress={() => setSelectedPatient(item)}
      activeOpacity={0.7}
    >
      <View style={styles.patientAvatar}>
        <MaterialCommunityIcons name="account" size={32} color={COLORS.white} />
        <View style={[styles.statusIndicator, { backgroundColor: item.status === 'online' ? COLORS.success : COLORS.textLight }]} />
      </View>
      <View style={styles.patientInfo}>
        <View style={styles.patientHeader}>
          <Text style={styles.patientName}>{item.name}</Text>
          <Text style={styles.messageTime}>{String(item.lastMessageTime || '')}</Text>
        </View>
        <Text style={styles.lastMessage} numberOfLines={1}>
          {getMessageText(item.lastMessage)}
        </Text>
      </View>
      {item.unreadCount > 0 && (
        <View style={styles.unreadBadge}>
          <Text style={styles.unreadCount}>{item.unreadCount}</Text>
        </View>
      )}
    </TouchableWeb>
  );

  const renderMessage = ({ item }) => {
    // Safely extract message text and time
    const messageText = typeof item.text === 'string' ? item.text : 
                       (item.message && typeof item.message === 'string' ? item.message : 
                       'Message');
    const messageTime = item.time || 
                       (item.timestamp ? new Date(item.timestamp).toLocaleTimeString('en-US', { 
                         hour: 'numeric', 
                         minute: '2-digit',
                         hour12: true 
                       }) : '');
    
    const currentAdminId = user?.id || 'admin-001';
    const isAdmin = item.sender === currentAdminId || item.sender === 'admin';
    
    // Check if message has an attachment
    const hasAttachment = item.attachment && item.attachment.uri;
    
    // Check if message has been read by recipient
    // Compare message timestamp with recipient's last read timestamp
    let isRead = false;
    if (isAdmin && selectedPatient && item.timestamp) {
      const conversationId = item.conversationId || getConversationId(currentAdminId, selectedPatient.id);
      const recipientLastRead = getLastReadTimestamp(conversationId, selectedPatient.id);
      
      // Also check legacy conversation ID
      const legacyConversationId = getConversationId('admin', selectedPatient.id);
      const legacyRecipientLastRead = getLastReadTimestamp(legacyConversationId, selectedPatient.id);
      
      // Message is read if recipient's last read time is after message timestamp
      const messageTimestamp = new Date(item.timestamp).getTime();
      const lastReadTime = recipientLastRead ? new Date(recipientLastRead).getTime() : 0;
      const legacyLastReadTime = legacyRecipientLastRead ? new Date(legacyRecipientLastRead).getTime() : 0;
      
      isRead = (lastReadTime > 0 && lastReadTime >= messageTimestamp) || 
               (legacyLastReadTime > 0 && legacyLastReadTime >= messageTimestamp);
    }
    
    return (
      <View style={[styles.messageContainer, isAdmin ? styles.adminMessage : styles.patientMessage]}>
        <View style={[styles.messageBubble, isAdmin ? styles.adminBubble : styles.patientBubble]}>
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
                  color={isAdmin ? COLORS.white : COLORS.primary} 
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
                        backgroundColor: isAdmin ? COLORS.white : COLORS.primary 
                      }
                    ]} 
                  />
                ))}
              </View>
              <Text style={[styles.voiceNoteDuration, isAdmin ? styles.adminMessageText : styles.patientMessageText]}>
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
                color={isAdmin ? COLORS.white : COLORS.primary} 
              />
              <Text style={[styles.attachmentFileName, isAdmin ? styles.attachmentFileNameAdmin : styles.attachmentFileNamePatient]}>
                {item.attachment.fileName}
              </Text>
              <MaterialCommunityIcons 
                name="download" 
                size={20} 
                color={isAdmin ? COLORS.white : COLORS.primary} 
              />
            </TouchableWeb>
          )}
          {messageText && !messageText.startsWith('🎤 Voice message') && (
            <Text style={[styles.messageText, isAdmin ? styles.adminMessageText : styles.patientMessageText]}>
              {messageText}
            </Text>
          )}
          <View style={styles.messageFooter}>
            <Text style={[styles.messageTime, isAdmin ? styles.adminTimeText : styles.patientTimeText]}>
              {messageTime}
            </Text>
            {isAdmin && (
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
                  {searchResults.map((userResult, index) => {
                    const profilePhoto = userProfiles[userResult.id]?.profilePhoto;
                    return (
                      <TouchableWeb
                        key={`search-${userResult.id}-${index}`}
                        style={styles.searchResultItem}
                        onPress={() => handleUserSelect(userResult)}
                        activeOpacity={0.7}
                      >
                        {profilePhoto ? (
                          <Image source={{ uri: profilePhoto }} style={styles.searchResultAvatar} />
                        ) : (
                          <View style={[styles.searchResultAvatar, { backgroundColor: getAvatarColor(userResult.type) }]}>
                            <Text style={styles.searchResultAvatarText}>{getInitials(userResult.name)}</Text>
                          </View>
                        )}
                        <View style={styles.searchResultInfo}>
                          <Text style={styles.searchResultName}>{userResult.name}</Text>
                          <Text style={styles.searchResultEmail}>{userResult.contactEmail || userResult.email}</Text>
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
          {activeChats.length > 0 ? (
            activeChats.map((contact, index) => {
              const profilePhoto = userProfiles[contact.id]?.profilePhoto;
              return (
                <SwipeableChatItem
                  key={`${contact.id}-${index}`}
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
                      <View style={[styles.chatAvatar, { backgroundColor: getAvatarColor(contact.type) }]}>
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
                          {(contact.lastMessage?.sender === (user?.id || 'admin-001') || contact.lastMessage?.sender === 'admin') && (
                            <MaterialCommunityIcons 
                              name="check-all" 
                              size={16} 
                              color={contact.otherUserUnreadCount === 0 ? '#4fc3f7' : COLORS.textLight} 
                              style={{ marginRight: 4 }}
                            />
                          )}
                          <Text style={styles.chatLastMessage} numberOfLines={1}>
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
                  </SwipeableChatItem>
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
                <View style={styles.chatPatientInfo}>
                  {userProfiles[selectedPatient?.id]?.profilePhoto ? (
                    <View style={styles.chatModalAvatarContainer}>
                      <Image 
                        source={{ uri: userProfiles[selectedPatient?.id]?.profilePhoto }} 
                        style={styles.chatModalAvatarImage} 
                      />
                      <View style={[styles.chatModalStatus, { backgroundColor: selectedPatient?.status === 'online' ? COLORS.success : COLORS.textLight }]} />
                    </View>
                  ) : (
                    <View style={styles.chatModalAvatarContainer}>
                      <View style={[styles.chatModalAvatar, { backgroundColor: getAvatarColor(selectedPatient?.type) }]}>
                        <Text style={styles.chatModalAvatarText}>{getInitials(selectedPatient?.name || '')}</Text>
                      </View>
                      <View style={[styles.chatModalStatus, { backgroundColor: selectedPatient?.status === 'online' ? COLORS.success : COLORS.textLight }]} />
                    </View>
                  )}
                  <View>
                    <Text style={styles.chatModalPatientName}>{selectedPatient?.name}</Text>
                    <Text style={styles.chatModalPatientStatus}>
                      {selectedPatient?.status === 'online' ? 'Online' : 'Last seen recently'}
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
                  ) : selectedAttachment.type === 'voice' ? (
                    <View style={styles.attachmentPreviewInfo}>
                      <MaterialCommunityIcons name="microphone" size={20} color={COLORS.primary} />
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
              <View style={styles.messageInputContainer}>
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
            )}

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
                        if (pinnedChats.includes(selectedPatient?.id)) {
                          setPinnedChats(pinnedChats.filter(id => id !== selectedPatient?.id));
                        } else {
                          setPinnedChats([...pinnedChats, selectedPatient?.id]);
                        }
                        setChatOptionsVisible(false);
                      }}
                      activeOpacity={0.7}
                    >
                      <MaterialCommunityIcons name={pinnedChats.includes(selectedPatient?.id) ? "pin" : "pin-outline"} size={20} color={COLORS.primary} />
                      <Text style={styles.optionText}>{pinnedChats.includes(selectedPatient?.id) ? 'Unpin Chat' : 'Pin Chat'}</Text>
                    </TouchableWeb>
                    <TouchableWeb
                      style={styles.optionItem}
                      onPress={() => {
                        if (mutedChats.includes(selectedPatient?.id)) {
                          setMutedChats(mutedChats.filter(id => id !== selectedPatient?.id));
                        } else {
                          setMutedChats([...mutedChats, selectedPatient?.id]);
                        }
                        setChatOptionsVisible(false);
                      }}
                      activeOpacity={0.7}
                    >
                      <MaterialCommunityIcons name={mutedChats.includes(selectedPatient?.id) ? "bell" : "bell-off"} size={20} color={COLORS.primary} />
                      <Text style={styles.optionText}>{mutedChats.includes(selectedPatient?.id) ? 'Unmute Notifications' : 'Mute Notifications'}</Text>
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
  headerLeft: {
    width: 44,
  },
  welcomeText: {
    fontSize: 18,
    fontFamily: 'Poppins_700Bold',
    color: COLORS.white,
    opacity: 0.98,
    textAlign: 'center',
    flex: 1,
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
    backgroundColor: COLORS.white,
    marginRight: 8,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  filterPillActive: {
    backgroundColor: COLORS.primary,
    shadowOpacity: 0.08,
    elevation: 2,
  },
  filterText: {
    fontSize: 11,
    fontFamily: 'Poppins_700Bold',
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  filterTextActive: {
    color: COLORS.white,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  content: {
    flex: 1,
  },
  favoritesSection: {
    backgroundColor: COLORS.white,
    paddingVertical: 20,
    marginBottom: 8,
  },
  favoritesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  favoritesTitle: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.textLight,
  },
  moreButton: {
    padding: 4,
  },
  favoritesScroll: {
    paddingLeft: 20,
  },
  favoritesContainer: {
    flexDirection: 'row',
    gap: 16,
    paddingRight: 20,
  },
  favoriteItem: {
    alignItems: 'center',
    gap: 8,
  },
  favoriteAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  favoriteStatus: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  favoriteName: {
    fontSize: 12,
    fontFamily: 'Poppins_500Medium',
    color: COLORS.text,
  },
  chatListSection: {
    backgroundColor: COLORS.white,
    flex: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.textLight,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 8,
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
  selectedChatItem: {
    backgroundColor: '#F5F5F5',
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
  chatStatus: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.white,
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
  newBadge: {
    backgroundColor: '#FF4757',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 12,
  },
  newBadgeText: {
    fontSize: 10,
    fontFamily: 'Poppins_600SemiBold',
    color: COLORS.white,
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
  chatPatientInfo: {
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
    paddingVertical: 40,
    backgroundColor: COLORS.white,
    marginBottom: 8,
  },
  noResultsText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 12,
  },
  noResultsSubtext: {
    fontSize: 14,
    color: COLORS.textLight,
    marginTop: 4,
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
  recordingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 20,
    backgroundColor: COLORS.white,
  },
  cancelRecordingButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFE5E5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recordingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.error,
    marginRight: 8,
  },
  recordingTime: {
    fontSize: 16,
    fontFamily: 'Poppins_500Medium',
    color: COLORS.text,
  },
  recordingHint: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.textLight,
    marginLeft: 16,
  },
  sendRecordingButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
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