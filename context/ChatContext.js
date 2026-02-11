import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';
import ApiService from '../services/ApiService';

const ChatContext = createContext();

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};

export const ChatProvider = ({ children }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState({});
  const [unreadCounts, setUnreadCounts] = useState({});
  const [lastMessages, setLastMessages] = useState({});
  const [lastReadTimestamps, setLastReadTimestamps] = useState({}); // Track when users last read conversations
  const [isLoading, setIsLoading] = useState(false);
  const [backendStatus, setBackendStatus] = useState('checking');
  const [lastRefreshTime, setLastRefreshTime] = useState(0);

  // Load messages from storage on app start and check backend connection
  useEffect(() => {
    if (user) {
      loadMessages();
      checkBackendConnection();
      // Clean up any invalid unread count keys
      setTimeout(() => cleanupUnreadCounts(), 1000);
    }
  }, [user?.id]); // Only depend on user ID, not the entire user object

  const clearAllChatData = async () => {
    try {
      await AsyncStorage.removeItem('chatMessages');
      await AsyncStorage.removeItem('chatLastMessages');
      await AsyncStorage.removeItem('chatUnreadCounts');
      console.log('✅ Cleared all chat data for fresh testing');
      // Reset state
      setMessages({});
      setUnreadCounts({});
      setLastMessages({});
    } catch (error) {
      console.error('Error clearing chat data:', error);
    }
  };

  const checkBackendConnection = async () => {
    try {
      const apiUrl = __DEV__ 
        ? 'http://192.168.100.82:5000/api/health' // Development
        : 'https://shielded-coast-08850-f496a70eafdb.herokuapp.com/api/health'; // Production
      const response = await fetch(apiUrl);
      const data = await response.json();
      
      if (response.ok && data.message) {
        setBackendStatus('connected');
      } else {
        setBackendStatus('disconnected');
      }
    } catch (error) {
      setBackendStatus('disconnected');
    }
  };

  const loadMessages = async () => {
    try {
      setIsLoading(true);

      // First load from local storage for immediate display
      const storedMessages = await AsyncStorage.getItem('chatMessages');
      const storedUnreadCounts = await AsyncStorage.getItem('chatUnreadCounts');
      const storedLastMessages = await AsyncStorage.getItem('chatLastMessages');
      const storedReadTimestamps = await AsyncStorage.getItem('chatLastReadTimestamps');
      
      if (storedMessages) {
        setMessages(JSON.parse(storedMessages));
      }
      if (storedUnreadCounts) {
        setUnreadCounts(JSON.parse(storedUnreadCounts));
      }
      if (storedLastMessages) {
        setLastMessages(JSON.parse(storedLastMessages));
      }
      if (storedReadTimestamps) {
        setLastReadTimestamps(JSON.parse(storedReadTimestamps));
      }

      // Try to refresh messages from backend if connected
      if (backendStatus === 'connected') {
        try {
          console.log('🔄 Refreshing messages from backend...');
          await refreshMessagesFromBackend();
        } catch (error) {
          console.error('⚠️ Failed to refresh from backend:', error.message);
        }
      }

    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveMessages = async (newMessages) => {
    try {
      await AsyncStorage.setItem('chatMessages', JSON.stringify(newMessages));
    } catch (error) {
      console.error('Error saving messages:', error);
    }
  };

  const saveUnreadCounts = async (newUnreadCounts) => {
    try {
      await AsyncStorage.setItem('chatUnreadCounts', JSON.stringify(newUnreadCounts));
    } catch (error) {
      console.error('Error saving unread counts:', error);
    }
  };

  const saveLastMessages = async (newLastMessages) => {
    try {
      await AsyncStorage.setItem('chatLastMessages', JSON.stringify(newLastMessages));
    } catch (error) {
      console.error('Error saving last messages:', error);
    }
  };

    const sendMessage = async (conversationId, text, senderType, receiverType, attachment = null) => {
    const message = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      text,
      sender: senderType,
      recipient: receiverType,
      timestamp: new Date().toISOString(),
      conversationId,
      ...(attachment && { attachment })
    };

    // Store message locally immediately
    const currentConversationMessages = messages[conversationId] || [];
    const updatedConversationMessages = [...currentConversationMessages, message];
    const updatedMessages = {
      ...messages,
      [conversationId]: updatedConversationMessages
    };
    setMessages(updatedMessages);
    saveMessages(updatedMessages);

    // Update unread count for receiver
    // Validate that we have proper IDs (not timestamps or malformed data)
    if (!conversationId || conversationId.match(/^\d+$/) || !receiverType) {
      console.error('Invalid conversation ID or receiver type:', { conversationId, receiverType });
      return updatedConversationMessages;
    }
    
    const receiverKey = `${conversationId}_${receiverType}`;
    const currentCount = unreadCounts[receiverKey] || 0;
    const updatedUnreadCounts = {
      ...unreadCounts,
      [receiverKey]: currentCount + 1
    };

    setUnreadCounts(updatedUnreadCounts);
    saveUnreadCounts(updatedUnreadCounts);

    // Store last message with proper formatting for contact previews
    const formattedLastMessage = {
      text: message.text,
      time: new Date(message.timestamp).toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      }),
      timestamp: message.timestamp,
      sender: message.sender
    };
    
    const updatedLastMessages = {
      ...lastMessages,
      [conversationId]: formattedLastMessage
    };
    console.log('💾 SAVING lastMessages:', conversationId, formattedLastMessage);
    console.log('📊 NEW unreadCounts:', updatedUnreadCounts);
    setLastMessages(updatedLastMessages);
    saveLastMessages(updatedLastMessages);

    // Send to backend if connected so messages sync across devices
    if (backendStatus === 'connected') {
      try {
        console.log('📤 Sending message to backend via ApiService.sendMessage()');

        const payload = {
          conversationId,
          receiver: receiverType,
          content: text,
          messageType: attachment?.type || 'text',
          attachment: attachment || null,
        };

        const response = await ApiService.sendMessage(payload);

        if (response?.success && response.data) {
          console.log('✅ Message sent via backend:', response.data._id || message.id);
          // Update local message with backend ID if available
          if (response.data._id) {
            message.backendId = response.data._id;
            const updatedConversationMessagesWithId = [...updatedConversationMessages.slice(0, -1), message];
            const updatedMessagesWithId = {
              ...messages,
              [conversationId]: updatedConversationMessagesWithId,
            };
            setMessages(updatedMessagesWithId);
            saveMessages(updatedMessagesWithId);
          }
        }
      } catch (error) {
        console.error('⚠️ Failed to send message to backend:', error.message);
        // Message is already saved locally, so don't fail
      }
    } else {
      console.log('📱 Backend not connected, message saved locally');
    }
    
    // Return the updated messages for this conversation
    return updatedConversationMessages;
  };

  const markAsRead = async (conversationId, userType) => {
    const key = `${conversationId}_${userType}`;

    // Store the timestamp when this user read this conversation
    const timestampKey = `${conversationId}_${userType}_readAt`;
    const readTimestamp = new Date().toISOString();
    const updatedTimestamps = {
      ...lastReadTimestamps,
      [timestampKey]: readTimestamp
    };
    setLastReadTimestamps(updatedTimestamps);
    await AsyncStorage.setItem('chatLastReadTimestamps', JSON.stringify(updatedTimestamps));

    if (unreadCounts[key] > 0) {
      const updatedUnreadCounts = {
        ...unreadCounts,
        [key]: 0
      };
      setUnreadCounts(updatedUnreadCounts);
      saveUnreadCounts(updatedUnreadCounts);
    }
  };

  const getConversationMessages = async (conversationId) => {
    // Always start from local cache for instant display
    let conversationMessages = messages[conversationId] || [];

    // If backend is connected, try to refresh from server
    if (backendStatus === 'connected') {
      try {
        const response = await ApiService.getConversationMessages(conversationId);
        if (response?.success && Array.isArray(response.messages)) {
          // Map backend messages into the local message shape
          const backendMessages = response.messages.map((msg) => {
            const base = {
              id: msg._id || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              text: msg.content || msg.text || '',
              sender: msg.sender || msg.senderRole || msg.senderUserId || '',
              recipient: msg.receiver || msg.receiverRole || msg.receiverUserId || '',
              timestamp: msg.createdAt || msg.timestamp || new Date().toISOString(),
              conversationId: msg.conversationId || conversationId,
            };

            // Preserve attachment metadata if backend stores it
            if (msg.attachment) {
              base.attachment = {
                type: msg.attachment.type,
                fileName: msg.attachment.fileName,
                uri: msg.attachment.uri,
                duration: msg.attachment.duration,
                size: msg.attachment.size,
              };
            }

            return base;
          });

          conversationMessages = backendMessages.reverse();

          const updatedMessages = {
            ...messages,
            [conversationId]: conversationMessages,
          };
          setMessages(updatedMessages);
          saveMessages(updatedMessages);
        }
      } catch (error) {
        console.error('⚠️ Failed to load messages from backend:', error.message);
      }
    }

    return conversationMessages;
  };

  const getUnreadCount = (conversationId, userType) => {
    const key = `${conversationId}_${userType}`;
    const count = unreadCounts[key] || 0;
    return count;
  };

  const getLastReadTimestamp = (conversationId, userType) => {
    const timestampKey = `${conversationId}_${userType}_readAt`;
    return lastReadTimestamps[timestampKey] || null;
  };

  const getLastMessage = (conversationId) => {
    return lastMessages[conversationId] || null;
  };

  // Reset all unread counts (for debugging/cleanup)
  const resetUnreadCounts = async () => {
    setUnreadCounts({});
    await AsyncStorage.removeItem('unreadCounts');
  };

  // Initialize user-specific chat data (called when user logs in)
  const initializeUserChats = async (userId, userRole) => {
    // Clean up any invalid or orphaned unread count keys for this user
    const validKeys = Object.keys(unreadCounts).filter(key => {
      // Keep keys that don't belong to this user OR are properly formatted for this user
      return !key.endsWith(`_${userId}`) || 
             (key.split('_').length >= 2 && !key.match(/^\d+_/));
    });
    
    const cleanedUnreadCounts = {};
    validKeys.forEach(key => {
      cleanedUnreadCounts[key] = unreadCounts[key];
    });
    
    // Only update if there were changes
    if (Object.keys(cleanedUnreadCounts).length !== Object.keys(unreadCounts).length) {
      setUnreadCounts(cleanedUnreadCounts);
      saveUnreadCounts(cleanedUnreadCounts);
    }
    
    // For admin users, ensure they have access to common conversations
    if (userRole === 'admin') {
      const commonUsers = ['nurse-001', 'patient-001', 'PATIENT001'];
      const updatedLastMessages = { ...lastMessages };
      let hasNewConversations = false;
      
      commonUsers.forEach(otherUserId => {
        const conversationId = getConversationId(userId, otherUserId);
        if (!lastMessages[conversationId]) {
          updatedLastMessages[conversationId] = {
            text: "Start a conversation",
            time: "Now",
            timestamp: new Date().toISOString(),
            sender: "system"
          };
          hasNewConversations = true;
        }
      });
      
      if (hasNewConversations) {
        setLastMessages(updatedLastMessages);
        await AsyncStorage.setItem('lastMessages', JSON.stringify(updatedLastMessages));
      }
    }
  };

  // Clean up invalid unread count keys
  const cleanupUnreadCounts = async () => {
    const validKeys = Object.keys(unreadCounts).filter(key => {
      // Filter out malformed keys (those starting with timestamp or having wrong format)
      const parts = key.split('_');
      return parts.length >= 2 && !key.match(/^\d+_/) && 
             (key.endsWith('_admin') || key.endsWith('_admin-001') || 
              key.endsWith('_nurse') || key.endsWith('_nurse-001') || 
              key.endsWith('_patient') || key.endsWith('_patient-001') || key.endsWith('_PATIENT001'));
    });
    
    const cleanedUnreadCounts = {};
    validKeys.forEach(key => {
      cleanedUnreadCounts[key] = unreadCounts[key];
    });
    
    console.log('🧹 Cleanup: Before:', Object.keys(unreadCounts).length, 'After:', Object.keys(cleanedUnreadCounts).length);
    if (Object.keys(cleanedUnreadCounts).length !== Object.keys(unreadCounts).length) {
      console.log('🧹 Removed keys:', Object.keys(unreadCounts).filter(k => !validKeys.includes(k)));
      setUnreadCounts(cleanedUnreadCounts);
      saveUnreadCounts(cleanedUnreadCounts);
    }
  };

  const getTotalUnreadCount = (userType) => {
    // Handle both old and new user ID formats
    let userIds = [];
    if (userType === 'admin' || userType === 'admin-001') {
      userIds = ['admin', 'admin-001'];
    } else if (userType?.startsWith('admin-')) {
      // Handle admin-002, admin-003, etc.
      userIds = ['admin', userType];
    } else if (userType === 'nurse' || userType === 'nurse-001') {
      userIds = ['nurse', 'nurse-001'];
    } else if (userType?.startsWith('nurse-')) {
      // Handle nurse-002, nurse-003, etc.
      userIds = ['nurse', userType];
    } else if (userType === 'patient' || userType === 'patient-001' || userType === 'PATIENT001') {
      userIds = ['patient', 'patient-001', 'PATIENT001'];
    } else if (userType?.startsWith('patient-')) {
      // Handle patient-002, patient-003, etc.
      userIds = ['patient', userType];
    } else {
      userIds = [userType]; // Use the provided userType as-is
    }
    
    // Track conversations we've already counted to avoid duplicates
    const countedConversations = new Map(); // conversationKey -> count
    
    const relevantKeys = Object.keys(unreadCounts)
      .filter(key => {
        // Only count valid conversation keys (should have format: conversationId_receiverId)
        const parts = key.split('_');
        // Check if key ends with any of the valid user IDs
        const matches = parts.length >= 2 && userIds.some(id => key.endsWith(`_${id}`)) && !key.match(/^\d+_/);
        return matches;
      });
    
    relevantKeys
      .forEach(key => {
        const count = unreadCounts[key] || 0;
        
        // Extract the conversation participants to identify duplicates
        // Key format: conversationId_receiverId where conversationId = user1_user2
        const parts = key.split('_');
        const receiverId = parts[parts.length - 1]; // Last part is receiver
        const conversationId = parts.slice(0, -1).join('_'); // Everything before last part
        
        // Normalize the conversation participants (sort them to create a unique key)
        const participants = conversationId.split('_').map(id => {
          // Normalize IDs: admin-001 -> admin, nurse-001 -> nurse, etc.
          if (id === 'admin' || id === 'admin-001') return 'admin';
          if (id === 'nurse' || id === 'nurse-001') return 'nurse';
          if (id === 'patient' || id === 'PATIENT001') return 'patient';
          return id;
        }).sort().join('_');
        
        const conversationKey = participants;
        
        // Only count the highest value if we've seen this conversation before
        if (countedConversations.has(conversationKey)) {
          const existingCount = countedConversations.get(conversationKey);
          if (count > existingCount) {
            countedConversations.set(conversationKey, count);
          }
        } else {
          countedConversations.set(conversationKey, count);
        }
      });
    
    const total = Array.from(countedConversations.values()).reduce((sum, count) => sum + count, 0);
    return total;
  };

  // Generate conversation ID between two users
  const getConversationId = (user1Id, user2Id) => {
    return [user1Id, user2Id].sort().join('_');
  };

  const refreshMessagesFromBackend = async () => {
    if (!user) {
      console.log('⏭️ User not authenticated, skipping message refresh');
      return;
    }
    
    try {
      console.log('🔄 Fetching conversations from backend...');
      const response = await ApiService.getConversations();
      
      if (response.success && response.conversations) {
        console.log(`📦 Found ${response.conversations.length} conversations from backend`);
        
        // Transform backend conversations to local format
        const backendMessages = {};
        const backendUnreadCounts = {};
        const backendLastMessages = {};
        
        for (const conversation of response.conversations) {
          const conversationId = conversation.conversationId;
          
          // Fetch messages for each conversation
          try {
            const messagesResponse = await ApiService.getConversationMessages(conversationId);
            if (messagesResponse.success && messagesResponse.messages) {
              // Transform backend messages to local format
              const transformedMessages = messagesResponse.messages.map(msg => ({
                id: msg._id,
                text: msg.content,
                sender: msg.sender,
                recipient: msg.receiver,
                timestamp: msg.createdAt,
                conversationId: msg.conversationId,
                backendId: msg._id
              }));
              
              backendMessages[conversationId] = transformedMessages;
              
              // Set unread count
              const unreadCount = await ApiService.getUnreadCount(conversationId);
              if (unreadCount.success) {
                backendUnreadCounts[`${conversationId}_${user.role}`] = unreadCount.count || 0;
              }
              
              // Set last message
              if (transformedMessages.length > 0) {
                const lastMsg = transformedMessages[transformedMessages.length - 1];
                backendLastMessages[conversationId] = {
                  text: lastMsg.text,
                  time: new Date(lastMsg.timestamp).toLocaleTimeString('en-US', { 
                    hour: 'numeric', 
                    minute: '2-digit',
                    hour12: true 
                  }),
                  timestamp: lastMsg.timestamp,
                  sender: lastMsg.sender
                };
              }
            }
          } catch (msgError) {
            console.warn(`⚠️ Failed to fetch messages for ${conversationId}:`, msgError.message);
          }
        }
        
        // Merge backend data with local data (backend takes precedence)
        setMessages(prevMessages => ({ ...prevMessages, ...backendMessages }));
        setUnreadCounts(prevCounts => ({ ...prevCounts, ...backendUnreadCounts }));
        setLastMessages(prevLast => ({ ...prevLast, ...backendLastMessages }));
        
        // Save merged data locally
        const mergedMessages = { ...messages, ...backendMessages };
        const mergedUnreadCounts = { ...unreadCounts, ...backendUnreadCounts };
        const mergedLastMessages = { ...lastMessages, ...backendLastMessages };
        
        await saveMessages(mergedMessages);
        await saveUnreadCounts(mergedUnreadCounts);
        await saveLastMessages(mergedLastMessages);
        
        console.log('✅ Messages synchronized with backend');
      }
    } catch (error) {
      console.error('⚠️ Failed to refresh messages from backend:', error.message);
    }
  };

  const refreshConversations = async () => {
    // Debounce: Only refresh if it's been at least 1 second since last refresh
    const now = Date.now();
    if (now - lastRefreshTime < 1000) {
      return;
    }
    
    setLastRefreshTime(now);
    await checkBackendConnection();
    await loadMessages();
  };

  const value = {
    messages,
    unreadCounts,
    lastMessages,
    isLoading,
    backendStatus,
    sendMessage,
    markAsRead,
    getConversationMessages,
    getUnreadCount,
    getLastReadTimestamp,
    getLastMessage,
    getTotalUnreadCount,
    getConversationId,
    refreshConversations,
    cleanupUnreadCounts,
    resetUnreadCounts,
    initializeUserChats
  };

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
};