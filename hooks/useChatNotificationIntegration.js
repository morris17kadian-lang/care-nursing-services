import { useEffect } from 'react';
import { useChat } from '../context/ChatContext';
import { useNotifications } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';

// Hook to integrate chat messages with notifications
export const useChatNotificationIntegration = () => {
  const { user } = useAuth();
  const { createMessageNotification } = useNotifications();
  const { messages } = useChat();

  useEffect(() => {
    // Listen for new messages and create notifications
    const checkForNewMessages = () => {
      if (!user || !messages) return;

      // Get all conversations
      Object.keys(messages).forEach(conversationId => {
        const conversationMessages = messages[conversationId];
        if (!conversationMessages || conversationMessages.length === 0) return;

        // Get the latest message
        const latestMessage = conversationMessages[conversationMessages.length - 1];
        
        // Only create notification if message is not from current user
        if (latestMessage.sender !== getUserType(user) && shouldCreateNotification(latestMessage)) {
          const senderName = getSenderDisplayName(latestMessage.sender);
          createMessageNotification(senderName, latestMessage.text, conversationId);
        }
      });
    };

    // Check for new messages when messages change
    checkForNewMessages();
  }, [messages, user, createMessageNotification]);

  const getUserType = (user) => {
    if (user.role === 'admin') return 'admin';
    if (user.role === 'nurse') return 'nurse';
    return 'patient';
  };

  const getSenderDisplayName = (senderType) => {
    switch (senderType) {
      case 'admin':
        return 'Admin';
      case 'nurse':
        return 'Nurse';
      case 'patient':
        return 'Patient';
      default:
        return 'User';
    }
  };

  const shouldCreateNotification = (message) => {
    // Only create notification for messages from the last 5 minutes
    // This prevents creating notifications for old messages when loading
    const messageTime = new Date(message.timestamp);
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    return messageTime > fiveMinutesAgo;
  };
};

// Component to be placed in App.js to enable chat notification integration
export const ChatNotificationIntegrator = () => {
  useChatNotificationIntegration();
  return null;
};