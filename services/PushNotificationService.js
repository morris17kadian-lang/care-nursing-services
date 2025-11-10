import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Configure how notifications are handled when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: false, // Don't show system alert - only in-app
    shouldPlaySound: true,  // Still play sound
    shouldSetBadge: true,   // Still update badge
  }),
});

class PushNotificationService {
  constructor() {
    this.expoPushToken = null;
    this.notificationListener = null;
    this.responseListener = null;
  }

  // Initialize push notifications
  async initialize() {
    try {
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
      console.error('Failed to initialize push notifications:', error);
      return null;
    }
  }

  // Register device for push notifications
  async registerForPushNotificationsAsync() {
    let token;

    if (Platform.OS === 'android') {
      console.log('📱 Setting up Android notification channel...');
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    if (Device.isDevice) {
      console.log('📱 Checking notification permissions...');
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      console.log('📱 Existing permission status:', existingStatus);
      
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        console.log('📱 Requesting notification permissions...');
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
        console.log('📱 Permission request result:', status);
      }
      
      if (finalStatus !== 'granted') {
        console.log('❌ Failed to get push token for push notification!');
        return null;
      }
      
      console.log('✅ Notification permissions granted');
      
      try {
        const projectId = Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
        if (!projectId) {
          throw new Error('Project ID not found');
        }
        console.log('📱 Getting Expo push token with project ID:', projectId);
        token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
        console.log('✅ Push token obtained:', token);
      } catch (e) {
        console.error('❌ Error getting push token:', e);
        token = `${e}`;
      }
    } else {
      console.log('❌ Must use physical device for Push Notifications');
    }

    return token;
  }

  // Handle notification received while app is in foreground
  handleNotificationReceived = (notification) => {
    console.log('📱 Notification received while app active - adding to in-app list');
    // When app is in foreground, we rely on NotificationContext to handle it
    // The notification will appear in the notification screen, not as system alert
  };

  // Handle notification tap/interaction (when user taps notification)
  handleNotificationResponse = (response) => {
    console.log('📱 User tapped notification - routing to app');
    const { notification } = response;
    const data = notification.request.content.data;
    
    // Store the navigation intent for the app to handle
    this.pendingNavigation = {
      screen: data?.screen || 'Notifications',
      params: data || {}
    };
    
    console.log('📱 Navigation queued:', this.pendingNavigation);
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
      console.log('📱 Sending local notification:', { title, body, data });
      
      const result = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: 'default',
        },
        trigger: null, // Send immediately
      });
      
      console.log('✅ Local notification scheduled successfully:', result);
      return result;
    } catch (error) {
      console.error('❌ Failed to send local notification:', error);
      throw error;
    }
  }

  // Schedule notification for later
  async scheduleNotification(title, body, scheduledTime, data = {}) {
    try {
      const trigger = scheduledTime instanceof Date 
        ? scheduledTime 
        : new Date(scheduledTime);

      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: 'default',
        },
        trigger,
      });
    } catch (error) {
      console.error('Failed to schedule notification:', error);
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
      console.log('Push notification sent:', result);
      return result;
    } catch (error) {
      console.error('Failed to send push notification:', error);
      return null;
    }
  }

  // Cancel all scheduled notifications
  async cancelAllNotifications() {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('Failed to cancel notifications:', error);
    }
  }

  // Get notification permissions status
  async getPermissionStatus() {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      return status;
    } catch (error) {
      console.error('Failed to get permission status:', error);
      return 'undetermined';
    }
  }

  // Request notification permissions
  async requestPermissions() {
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      return status;
    } catch (error) {
      console.error('Failed to request permissions:', error);
      return 'denied';
    }
  }

  // Set app badge count (iOS)
  async setBadgeCount(count) {
    try {
      await Notifications.setBadgeCountAsync(count);
    } catch (error) {
      console.error('Failed to set badge count:', error);
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

      console.log('Overdue payment notification sent:', title);
    } catch (error) {
      console.error('Failed to send overdue payment notification:', error);
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
      console.error('Failed to send batch overdue notifications:', error);
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