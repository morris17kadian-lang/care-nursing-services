import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';
import PushNotificationService from '../services/PushNotificationService';

const NotificationContext = createContext();

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pushToken, setPushToken] = useState(null);
  const [pushPermissionStatus, setPushPermissionStatus] = useState('undetermined');

  const STORAGE_KEY = '@care_notifications';

  // Load notifications from storage
  const loadNotifications = async () => {
    if (!user?.id) return;
    
    try {
      const userKey = `${STORAGE_KEY}_${user.id}`;
      const stored = await AsyncStorage.getItem(userKey);
      if (stored) {
        const notificationList = JSON.parse(stored);
        setNotifications(notificationList);
        updateUnreadCount(notificationList);
      }
    } catch (error) {
      console.error('Failed to load notifications:', error);
    }
  };

  // Refresh notifications from storage (used to detect new notifications from other sources)
  const refreshNotifications = async () => {
    if (!user?.id) return;
    
    try {
      const userKey = `${STORAGE_KEY}_${user.id}`;
      const stored = await AsyncStorage.getItem(userKey);
      if (stored) {
        const notificationList = JSON.parse(stored);
        // Only update if there are new notifications
        if (notificationList.length !== notifications.length || 
            (notificationList.length > 0 && notificationList[0].id !== notifications[0]?.id)) {
          
          // Check for new notifications (ones we haven't seen before)
          const newNotifications = notificationList.filter(newNotif => 
            !notifications.find(existing => existing.id === newNotif.id)
          );
          
          // Only send local push notifications for truly new notifications
          if (newNotifications.length > 0) {
            // Only log if we actually have new content (not just the same notifications)
            const hasNewContent = newNotifications.some(notif => !notif.pushSent);
            if (hasNewContent) {
              console.log(`📱 Found ${newNotifications.length} new notifications`);
            }
            
            for (const newNotif of newNotifications) {
              try {
                // Only send push notification if we haven't already sent one for this notification
                if (!newNotif.pushSent) {
                  let permissionStatus = pushPermissionStatus;
                  if (permissionStatus !== 'granted') {
                    permissionStatus = await requestPushPermissions();
                  }
                  
                  await PushNotificationService.sendLocalNotification(
                    newNotif.title,
                    newNotif.message,
                    { notificationId: newNotif.id, ...newNotif.data }
                  );
                  
                  // Mark this notification as having had its push notification sent
                  newNotif.pushSent = true;
                  console.log('📱 Push notification sent for:', newNotif.title);
                }
              } catch (error) {
                console.error('Failed to send push notification for new message:', error);
              }
            }
            
            // Update storage with pushSent flags
            await AsyncStorage.setItem(userKey, JSON.stringify(notificationList));
          }
          
          setNotifications(notificationList);
          updateUnreadCount(notificationList);
        }
      }
    } catch (error) {
      console.error('Failed to refresh notifications:', error);
    }
  };

  // Save notifications to storage
  const saveNotifications = async (notificationList) => {
    if (!user?.id) return;
    
    try {
      const userKey = `${STORAGE_KEY}_${user.id}`;
      await AsyncStorage.setItem(userKey, JSON.stringify(notificationList));
    } catch (error) {
      console.error('Failed to save notifications:', error);
    }
  };

  // Initialize push notifications
  const initializePushNotifications = async () => {
    try {
      const token = await PushNotificationService.initialize();
      setPushToken(token);
      
      const status = await PushNotificationService.getPermissionStatus();
      setPushPermissionStatus(status);
    } catch (error) {
      console.error('Failed to initialize push notifications:', error);
    }
  };

  // Request push notification permissions
  const requestPushPermissions = async () => {
    try {
      const status = await PushNotificationService.requestPermissions();
      setPushPermissionStatus(status);
      
      if (status === 'granted') {
        const token = await PushNotificationService.initialize();
        setPushToken(token);
      }
      
      return status;
    } catch (error) {
      console.error('Failed to request push permissions:', error);
      return 'denied';
    }
  };

  // Update unread count
  const updateUnreadCount = (notificationList) => {
    // Filter notifications based on user role (same logic as NotificationsScreen)
    const userNotifications = notificationList.filter(notification => {
      return !notification.data?.targetRole || notification.data?.targetRole === user?.role;
    });
    
    const unread = userNotifications.filter(n => !n.read).length;
    setUnreadCount(unread);
    
    // Update app badge count for push notifications
    PushNotificationService.setBadgeCount(unread);
  };

  // Add new notification
  const addNotification = async (notificationData) => {
    const newNotification = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      read: false,
      ...notificationData,
    };

    const updatedNotifications = [newNotification, ...notifications];
    setNotifications(updatedNotifications);
    updateUnreadCount(updatedNotifications);
    await saveNotifications(updatedNotifications);

    // Send local push notification - request permissions if needed
    try {
      let permissionStatus = pushPermissionStatus;
      if (permissionStatus !== 'granted') {
        console.log('Requesting notification permissions for local notification...');
        permissionStatus = await requestPushPermissions();
      }
      
      // Send local notification
      await PushNotificationService.sendLocalNotification(
        newNotification.title,
        newNotification.message,
        { notificationId: newNotification.id, ...newNotification.data }
      );
      console.log('📱 Local notification sent:', newNotification.title);
    } catch (error) {
      console.error('Failed to send local notification:', error);
    }

    return newNotification;
  };

  // Mark notification as read
  const markAsRead = async (notificationId) => {
    const updatedNotifications = notifications.map(notification => 
      notification.id === notificationId 
        ? { ...notification, read: true }
        : notification
    );
    
    setNotifications(updatedNotifications);
    updateUnreadCount(updatedNotifications);
    await saveNotifications(updatedNotifications);
  };

  // Mark all notifications as read
  const markAllAsRead = async () => {
    const updatedNotifications = notifications.map(notification => ({
      ...notification,
      read: true
    }));
    
    setNotifications(updatedNotifications);
    updateUnreadCount(updatedNotifications);
    await saveNotifications(updatedNotifications);
  };

  // Delete notification
  const deleteNotification = async (notificationId) => {
    const updatedNotifications = notifications.filter(n => n.id !== notificationId);
    setNotifications(updatedNotifications);
    updateUnreadCount(updatedNotifications);
    await saveNotifications(updatedNotifications);
  };

  // Clear all notifications
  const clearAllNotifications = async () => {
    setNotifications([]);
    setUnreadCount(0);
    if (user?.id) {
      const userKey = `${STORAGE_KEY}_${user.id}`;
      await AsyncStorage.removeItem(userKey);
    }
  };

  // Clear notifications for a specific user (utility function)
  const clearNotificationsForUser = async (userId) => {
    try {
      const userKey = `${STORAGE_KEY}_${userId}`;
      await AsyncStorage.removeItem(userKey);
      console.log(`Cleared notifications for user: ${userId}`);
    } catch (error) {
      console.error('Failed to clear notifications for user:', error);
    }
  };

  // Clear all notifications for all users (testing utility)
  const clearAllUserNotifications = async () => {
    try {
      // Clear for common user IDs
      const userIds = ['NURSE001', 'ADMIN001', 'user_001'];
      await Promise.all(userIds.map(userId => clearNotificationsForUser(userId)));
      console.log('Cleared all notifications for testing');
    } catch (error) {
      console.error('Failed to clear all notifications:', error);
    }
  };

  // Get relative time string
  const getRelativeTime = (timestamp) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now - time;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return time.toLocaleDateString();
  };

  // Predefined notification types
  const NotificationTypes = {
    MESSAGE: {
      type: 'message',
      icon: 'message-text',
      color: '#4ECDC4',
    },
    APPOINTMENT: {
      type: 'appointment',
      icon: 'calendar-clock',
      color: '#FFD93D',
    },
    REMINDER: {
      type: 'reminder',
      icon: 'bell-ring',
      color: '#FF6B6B',
    },
    SERVICE: {
      type: 'service',
      icon: 'medical-bag',
      color: '#95E1D3',
    },
    SYSTEM: {
      type: 'system',
      icon: 'information',
      color: '#6C5CE7',
    },
    ALERT: {
      type: 'alert',
      icon: 'alert-circle',
      color: '#FF7675',
    },
  };

  // Helper functions to create specific notification types
  const createMessageNotification = (senderName, message, conversationId) => {
    return addNotification({
      ...NotificationTypes.MESSAGE,
      title: `New message from ${senderName}`,
      message: message.length > 50 ? `${message.substring(0, 50)}...` : message,
      data: { conversationId, type: 'chat' },
    });
  };

  const createAppointmentNotification = (title, message, appointmentData) => {
    // Only create notifications for the current user (no cross-user targeting)
    return addNotification({
      ...NotificationTypes.APPOINTMENT,
      title,
      message,
      data: { ...appointmentData, type: 'appointment' },
    });
  };

  const createReminderNotification = (title, message, reminderData) => {
    return addNotification({
      ...NotificationTypes.REMINDER,
      title,
      message,
      data: { ...reminderData, type: 'reminder' },
    });
  };

  const createServiceNotification = (title, message, serviceData) => {
    return addNotification({
      ...NotificationTypes.SERVICE,
      title,
      message,
      data: { ...serviceData, type: 'service' },
    });
  };

  const createSystemNotification = (title, message, systemData) => {
    // Route system notifications based on targetRole
    const targetRole = systemData?.targetRole;
    
    if (targetRole && targetRole !== user?.role) {
      return Promise.resolve(); // Don't show to users not in target role
    }
    
    // Show assignment notifications to nurses only
    if (systemData?.type === 'assignment_received' && user?.role !== 'nurse') {
      return Promise.resolve();
    }
    
    // Show assignment accepted/declined notifications to admins only
    if ((systemData?.type === 'assignment_accepted' || systemData?.type === 'assignment_declined') && user?.role !== 'admin') {
      return Promise.resolve();
    }
    
    return addNotification({
      ...NotificationTypes.SYSTEM,
      title,
      message,
      data: { ...systemData, type: 'system' },
    });
  };

  const createAlertNotification = (title, message, alertData) => {
    return addNotification({
      ...NotificationTypes.ALERT,
      title,
      message,
      data: { ...alertData, type: 'alert' },
    });
  };

  // Schedule appointment reminder notifications
  const scheduleAppointmentReminder = async (appointmentTitle, appointmentTime, reminderMinutes = 30) => {
    const reminderTime = new Date(appointmentTime);
    reminderTime.setMinutes(reminderTime.getMinutes() - reminderMinutes);

    if (reminderTime > new Date()) {
      await PushNotificationService.scheduleNotification(
        'Appointment Reminder',
        `${appointmentTitle} in ${reminderMinutes} minutes`,
        reminderTime,
        { type: 'appointment', appointmentTime: appointmentTime.toISOString() }
      );
    }
  };

  // Send cross-user notification (simplified for demo - would require backend in real app)
  const sendNotificationToUser = async (targetUserId, targetRole, title, message, data = {}) => {
    // In a real app, this would send through backend API
    // For demo purposes, we'll store it in a shared notification pool with better syncing
    
    try {
      // Use a global notification storage for better cross-device sync
      const globalNotificationKey = `@care_notifications_global`;
      const targetUserKey = `${STORAGE_KEY}_${targetUserId}`;
      
      const existingNotifications = await AsyncStorage.getItem(targetUserKey);
      const notificationList = existingNotifications ? JSON.parse(existingNotifications) : [];
      
      // Determine notification type based on data.type or default to SYSTEM
      let notificationType = NotificationTypes.SYSTEM;
      if (data.type === 'shift_request' || data.type === 'shift_approved' || data.type === 'shift_denied') {
        notificationType = NotificationTypes.APPOINTMENT;
      } else if (data.type === 'appointment_approved') {
        notificationType = NotificationTypes.APPOINTMENT;
      } else if (data.type === 'chat') {
        notificationType = NotificationTypes.MESSAGE;
      }
      
      const newNotification = {
        id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, // More unique ID
        timestamp: new Date().toISOString(),
        read: false,
        title,
        message,
        ...notificationType, // Add icon, color, type from notification type
        data: { ...data, targetRole },
        pushSent: false
      };
      
      const updatedNotifications = [newNotification, ...notificationList];
      await AsyncStorage.setItem(targetUserKey, JSON.stringify(updatedNotifications));
      
      // Also store in global pool for better cross-device sync
      try {
        const globalNotifications = await AsyncStorage.getItem(globalNotificationKey);
        const allNotifications = globalNotifications ? JSON.parse(globalNotifications) : [];
        allNotifications.push({
          ...newNotification,
          targetUserId,
          targetRole,
          sentAt: new Date().toISOString()
        });
        await AsyncStorage.setItem(globalNotificationKey, JSON.stringify(allNotifications));
        console.log('📨 Notification stored in global pool for cross-device sync');
      } catch (globalError) {
        console.error('Failed to store in global notification pool:', globalError);
      }
      
      console.log(`📨 Notification sent to ${targetUserId}:`, { title, type: data.type });
      
      // If this is for the current user, also send a local push notification
      if (targetUserId === user?.id) {
        try {
          // First ensure we have permissions for local notifications
          let permissionStatus = pushPermissionStatus;
          if (permissionStatus !== 'granted') {
            console.log('Requesting notification permissions...');
            permissionStatus = await requestPushPermissions();
          }
          
          // Send local notification regardless of permission status (for demo purposes)
          await PushNotificationService.sendLocalNotification(title, message, {
            notificationId: newNotification.id,
            ...data
          });
          console.log('📱 Local notification sent:', title);
        } catch (error) {
          console.error('Failed to send local notification:', error);
        }
      }
      
      return newNotification;
    } catch (error) {
      console.error('Failed to send notification to user:', error);
      return null;
    }
  };

  // Load notifications on user change
  useEffect(() => {
    if (user) {
      loadNotifications();
      initializePushNotifications();

      // Poll for new notifications every 15 seconds (reduced frequency to prevent log spam)
      // This ensures notification delivery while reducing excessive polling
      const pollInterval = setInterval(() => {
        refreshNotifications();
      }, 15000); // Increased from 5 seconds to 15 seconds

      return () => {
        clearInterval(pollInterval);
      };
    } else {
      setNotifications([]);
      setUnreadCount(0);
      PushNotificationService.setBadgeCount(0);
    }
  }, [user]);

  const value = {
    notifications,
    unreadCount,
    pushToken,
    pushPermissionStatus,
    addNotification,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAllNotifications,
    getRelativeTime,
    NotificationTypes,
    createMessageNotification,
    createAppointmentNotification,
    createReminderNotification,
    createServiceNotification,
    createSystemNotification,
    createAlertNotification,
    scheduleAppointmentReminder,
    sendNotificationToUser,
    clearAllNotifications,
    clearNotificationsForUser,
    clearAllUserNotifications,
    requestPushPermissions,
    refreshNotifications,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};