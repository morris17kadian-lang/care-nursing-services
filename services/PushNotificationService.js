import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Check if running in Expo Go (notifications not supported on Android)
const isExpoGo = Constants.appOwnership === 'expo';

// Configure how notifications are handled when app is in foreground
// Only set handler if not in Expo Go on Android
if (!isExpoGo || Platform.OS !== 'android') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: false, // Don't show system alert - only in-app
      shouldPlaySound: true,  // Still play sound
      shouldSetBadge: true,   // Still update badge
    }),
  });
}

class PushNotificationService {
  constructor() {
    this.expoPushToken = null;
    this.notificationListener = null;
    this.responseListener = null;
  }

  // Initialize push notifications
  async initialize() {
    try {
      // Skip push notifications in Expo Go on Android
      if (isExpoGo && Platform.OS === 'android') {
        // Push notifications disabled in Expo Go on Android
        return null;
      }

      // Register for push notifications
      const token = await this.registerForPushNotificationsAsync();
      this.expoPushToken = token;

      // Listen for incoming notifications
      this.notificationListener = Notifications.addNotificationReceivedListener(
        this.handleNotificationReceived
      );

      // Listen for notification interactions
      this.responseListener = Notifications.addNotificationResponseReceivedListener(
        this.handleNotificationResponse
      );

      return token;
    } catch (error) {
      // console.error('Failed to initialize push notifications:', error);
      return null;
    }
  }

  // Register device for push notifications
  async registerForPushNotificationsAsync() {
    let token;

    if (Platform.OS === 'android') {
      // Setting up Android notification channel
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    if (Device.isDevice) {
      // Checking notification permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      // Existing permission status
      
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        // Requesting notification permissions
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
        // Permission request result
      }
      
      if (finalStatus !== 'granted') {
        // Failed to get push token for push notification
        return null;
      }
      
      // Notification permissions granted
      
      try {
        const projectId = Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
        if (!projectId) {
          throw new Error('Project ID not found');
        }
        // Getting Expo push token with project ID
        token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
        // Push token obtained
      } catch (e) {
        // console.error('❌ Error getting push token:', e);
        token = `${e}`;
      }
    } else {
      // Must use physical device for Push Notifications
    }

    return token;
  }

  // Handle notification received while app is in foreground
  handleNotificationReceived = (notification) => {
    // Notification received while app active - adding to in-app list
    // When app is in foreground, we rely on NotificationContext to handle it
    // The notification will appear in the notification screen, not as system alert
  };

  // Handle notification tap/interaction (when user taps notification)
  handleNotificationResponse = (response) => {
    // User tapped notification - routing to app
    const { notification } = response;
    const data = notification.request.content.data;
    
    // Store the navigation intent for the app to handle
    this.pendingNavigation = {
      screen: data?.screen || 'Notifications',
      params: data || {}
    };
    
    // Navigation queued
  };

  // Get and clear pending navigation (called by app when ready)
  getPendingNavigation() {
    const nav = this.pendingNavigation;
    this.pendingNavigation = null;
    return nav;
  }

  // Send local notification (immediate)
  async sendLocalNotification(title, body, data = {}) {
    try {
      // Sending local notification
      
      const result = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: 'default',
        },
        trigger: null, // Send immediately
      });
      
      // Local notification scheduled successfully
      return result;
    } catch (error) {
      // console.error('❌ Failed to send local notification:', error);
      throw error;
    }
  }

  // Schedule notification for later
  async scheduleNotification(title, body, scheduledTime, data = {}) {
    try {
      const triggerDate = scheduledTime instanceof Date
        ? scheduledTime
        : new Date(scheduledTime);

      if (!(triggerDate instanceof Date) || Number.isNaN(triggerDate.getTime())) {
        throw new TypeError('Invalid scheduledTime for notification trigger');
      }

      // expo-notifications SDK 53+ requires a trigger object with a `type`.
      const trigger = {
        type: Notifications.SchedulableTriggerInputTypes?.DATE ?? 'date',
        date: triggerDate,
      };

      // Scheduling notification for trigger

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: 'default',
        },
        trigger,
      });

      // Notification scheduled with ID
      return notificationId;
    } catch (error) {
      // console.error('❌ Failed to schedule notification:', error);
      throw error;
    }
  }

  // Send push notification to specific user (requires backend)
  async sendPushNotification(expoPushToken, title, body, data = {}) {
    const message = {
      to: expoPushToken,
      sound: 'default',
      title,
      body,
      data,
    };

    try {
      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      });

      const result = await response.json();
      // Push notification sent
      return result;
    } catch (error) {
      // console.error('Failed to send push notification:', error);
      return null;
    }
  }

  // Cancel all scheduled notifications
  async cancelAllNotifications() {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch (error) {
      // console.error('Failed to cancel notifications:', error);
    }
  }

  // Cancel specific notification by ID
  async cancelNotification(notificationId) {
    try {
      if (notificationId) {
        await Notifications.cancelScheduledNotificationAsync(notificationId);
        // Notification cancelled
      }
    } catch (error) {
      // console.error('Failed to cancel notification:', error);
    }
  }

  // Get notification permissions status
  async getPermissionStatus() {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      return status;
    } catch (error) {
      // console.error('Failed to get permission status:', error);
      return 'undetermined';
    }
  }

  // Request notification permissions
  async requestPermissions() {
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      return status;
    } catch (error) {
      // console.error('Failed to request permissions:', error);
      return 'denied';
    }
  }

  // Set app badge count (iOS)
  async setBadgeCount(count) {
    try {
      await Notifications.setBadgeCountAsync(count);
    } catch (error) {
      // console.error('Failed to set badge count:', error);
    }
  }

  // Send overdue payment notification
  async sendOverduePaymentNotification(notificationData) {
    try {
      const { title, body, data } = notificationData;
      
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: 'default',
          priority: 'high',
        },
        trigger: null, // Send immediately
      });

      // Overdue payment notification sent
    } catch (error) {
      // console.error('Failed to send overdue payment notification:', error);
    }
  }

  // Send batch overdue notifications
  async sendBatchOverdueNotifications(notifications) {
    try {
      for (const notification of notifications) {
        await this.sendOverduePaymentNotification(notification.patient);
        await this.sendOverduePaymentNotification(notification.admin);
        
        // Small delay between notifications
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } catch (error) {
      // console.error('Failed to send batch overdue notifications:', error);
    }
  }

  // Cleanup listeners
  cleanup() {
    if (this.notificationListener) {
      Notifications.removeNotificationSubscription(this.notificationListener);
    }
    if (this.responseListener) {
      Notifications.removeNotificationSubscription(this.responseListener);
    }
  }
}

// Export singleton instance
export default new PushNotificationService();