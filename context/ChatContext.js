import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';

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
      const response = await fetch('http://192.168.100.82:5000/api/health');
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

    } catch (error) {
      console.error('Error loading messages:', error);
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
    console.log('📤 SENDMESSAGE:', { conversationId, sender: senderType, recipient: receiverType, hasAttachment: !!attachment });
    
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
    console.log('📊 Incrementing unread count for', receiverKey, 'from', currentCount, 'to', currentCount + 1);
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

    // TODO: Send to backend when connected
    if (backendStatus === 'connected') {
      try {
        // Send to backend
      } catch (error) {
        console.error('Failed to send to backend:', error);
      }
    }
    
    // Return the updated messages for this conversation
    return updatedConversationMessages;
  };

  const markAsRead = async (conversationId, userType) => {
    const key = `${conversationId}_${userType}`;
    console.log('📖 MARK AS READ:', key, 'current count:', unreadCounts[key]);

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
      console.log('✅ MARK AS READ: Setting count to 0, timestamp:', readTimestamp);
      setUnreadCounts(updatedUnreadCounts);
      saveUnreadCounts(updatedUnreadCounts);
    } else {
      console.log('⚠️ MARK AS READ: Already 0 or undefined, but saving timestamp:', readTimestamp);
    }
  };

  const getConversationMessages = async (conversationId) => {
    const messages_list = messages[conversationId] || [];
    return messages_list;
  };

  const getUnreadCount = (conversationId, userType) => {
    const key = `${conversationId}_${userType}`;
    const count = unreadCounts[key] || 0;
    if (key.includes('admin-001_nurse-001_admin-001')) {
      console.log('🔍 getUnreadCount:', key, '=', count, '| All keys:', Object.keys(unreadCounts));
    }
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
    } else if (userType === 'nurse' || userType === 'nurse-001') {
      userIds = ['nurse', 'nurse-001'];
    } else if (userType === 'patient' || userType === 'patient-001' || userType === 'PATIENT001') {
      userIds = ['patient', 'patient-001', 'PATIENT001'];
    } else {
      userIds = [userType]; // Use the provided userType as-is
    }
    
    // Track conversations we've already counted to avoid duplicates
    const countedConversations = new Map(); // conversationKey -> count
    
    Object.keys(unreadCounts)
      .filter(key => {
        // Only count valid conversation keys (should have format: conversationId_receiverId)
        const parts = key.split('_');
        // Check if key ends with any of the valid user IDs
        return parts.length >= 2 && userIds.some(id => key.endsWith(`_${id}`)) && !key.match(/^\d+_/);
      })
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
    resetUnreadCounts
  };

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
};