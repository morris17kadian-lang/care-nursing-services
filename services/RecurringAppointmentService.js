import AsyncStorage from '@react-native-async-storage/async-storage';
import PushNotificationService from './PushNotificationService';

/**
 * Service to handle recurring appointment logic
 * - Generates multiple appointment instances based on recurrence pattern
 * - Schedules reminder notifications for each instance
 * - Manages recurring appointment series
 */
class RecurringAppointmentService {
  static STORAGE_KEY = '@care_recurring_appointments';
  static APPOINTMENTS_KEY = '@care_appointments';

  /**
   * Calculate next appointment date based on frequency
   * @param {Date} currentDate - Current appointment date
   * @param {string} frequency - 'daily', 'weekly', '2weeks', 'monthly'
   * @returns {Date} Next appointment date
   */
  static calculateNextDate(currentDate, frequency) {
    const nextDate = new Date(currentDate);
    
    switch (frequency) {
      case 'daily':
        nextDate.setDate(nextDate.getDate() + 1);
        break;
      case 'weekly':
        nextDate.setDate(nextDate.getDate() + 7);
        break;
      case '2weeks':
        nextDate.setDate(nextDate.getDate() + 14);
        break;
      case 'monthly':
        nextDate.setMonth(nextDate.getMonth() + 1);
        break;
      default:
        // Default to weekly if frequency not recognized
        nextDate.setDate(nextDate.getDate() + 7);
    }
    
    return nextDate;
  }

  /**
   * Generate multiple appointment instances based on recurrence pattern
   * @param {Object} appointmentData - Base appointment data
   * @param {string} frequency - Recurrence frequency
   * @param {number} duration - Number of occurrences to generate
   * @returns {Array} Array of appointment instances
   */
  static generateRecurringInstances(appointmentData, frequency, duration) {
    const instances = [];
    const baseDate = this.parseAppointmentDate(appointmentData.date, appointmentData.time);
    
    // Generate the specified number of instances
    for (let i = 0; i < duration; i++) {
      const instanceDate = i === 0 ? baseDate : this.calculateNextDate(
        this.parseAppointmentDate(instances[i - 1].date, instances[i - 1].time),
        frequency
      );
      
      // Format date and time
      const formattedDate = instanceDate.toLocaleDateString('en-US', {
        month: 'short',
        day: '2-digit',
        year: 'numeric'
      });
      
      const formattedTime = instanceDate.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
      
      // Create instance with unique ID but linked to series
      const instance = {
        ...appointmentData,
        id: `${appointmentData.id || Date.now()}-${i}`,
        seriesId: appointmentData.id || `SERIES-${Date.now()}`,
        instanceNumber: i + 1,
        totalInstances: duration,
        date: formattedDate,
        time: formattedTime,
        preferredDate: formattedDate,
        preferredTime: formattedTime,
        recurringFrequency: frequency,
        isRecurringInstance: true,
        isFirstInstance: i === 0,
        isLastInstance: i === duration - 1,
        createdAt: new Date().toISOString(),
      };
      
      instances.push(instance);
    }
    
    return instances;
  }

  /**
   * Parse appointment date and time into a Date object
   * @param {string} dateStr - Date string (e.g., "Nov 15, 2025")
   * @param {string} timeStr - Time string (e.g., "10:00 AM")
   * @returns {Date} Parsed date object
   */
  static parseAppointmentDate(dateStr, timeStr) {
    try {
      // Parse date
      const dateParts = dateStr.match(/(\w+)\s+(\d+),\s+(\d+)/);
      if (!dateParts) {
        return new Date();
      }
      
      const [, month, day, year] = dateParts;
      const monthIndex = new Date(`${month} 1, 2000`).getMonth();
      
      // Parse time
      const timeParts = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
      if (!timeParts) {
        return new Date(year, monthIndex, day);
      }
      
      let [, hours, minutes, period] = timeParts;
      hours = parseInt(hours);
      minutes = parseInt(minutes);
      
      // Convert to 24-hour format
      if (period.toUpperCase() === 'PM' && hours !== 12) {
        hours += 12;
      } else if (period.toUpperCase() === 'AM' && hours === 12) {
        hours = 0;
      }
      
      return new Date(year, monthIndex, day, hours, minutes);
    } catch (error) {
      console.error('Error parsing appointment date:', error);
      return new Date();
    }
  }

  /**
   * Schedule reminder notifications for all instances
   * @param {Array} instances - Array of appointment instances
   * @param {string} patientName - Patient name for notification
   * @returns {Promise<void>}
   */
  static async scheduleReminders(instances, patientName) {
    try {
      for (const instance of instances) {
        const appointmentDate = this.parseAppointmentDate(instance.date, instance.time);
        
        // Schedule reminder 24 hours before appointment
        const reminderTime = new Date(appointmentDate);
        reminderTime.setHours(reminderTime.getHours() - 24);
        
        // Only schedule if reminder time is in the future
        if (reminderTime > new Date()) {
          await PushNotificationService.scheduleNotification(
            'Upcoming Appointment Reminder',
            `Your appointment for ${instance.service} is scheduled for tomorrow at ${instance.time}`,
            reminderTime,
            {
              type: 'appointment_reminder',
              appointmentId: instance.id,
              seriesId: instance.seriesId,
              service: instance.service,
              date: instance.date,
              time: instance.time,
              isRecurring: true,
              instanceNumber: instance.instanceNumber,
            }
          );
          
          console.log(`✅ Reminder scheduled for appointment ${instance.instanceNumber}/${instance.totalInstances} on ${instance.date}`);
        }
      }
    } catch (error) {
      console.error('Error scheduling reminders:', error);
      throw error;
    }
  }

  /**
   * Save recurring appointment series to storage
   * @param {string} seriesId - Unique series identifier
   * @param {Object} seriesData - Series metadata
   * @returns {Promise<void>}
   */
  static async saveRecurringSeries(seriesId, seriesData) {
    try {
      const existingData = await AsyncStorage.getItem(this.STORAGE_KEY);
      const series = existingData ? JSON.parse(existingData) : {};
      
      series[seriesId] = {
        ...seriesData,
        createdAt: new Date().toISOString(),
      };
      
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(series));
      console.log(`✅ Recurring series ${seriesId} saved`);
    } catch (error) {
      console.error('Error saving recurring series:', error);
      throw error;
    }
  }

  /**
   * Save appointment instances to main appointments storage
   * @param {Array} instances - Array of appointment instances
   * @returns {Promise<void>}
   */
  static async saveAppointmentInstances(instances) {
    try {
      const existingData = await AsyncStorage.getItem(this.APPOINTMENTS_KEY);
      const appointments = existingData ? JSON.parse(existingData) : [];
      
      // Add all instances to appointments array
      appointments.push(...instances);
      
      await AsyncStorage.setItem(this.APPOINTMENTS_KEY, JSON.stringify(appointments));
      console.log(`✅ Saved ${instances.length} recurring appointment instances`);
    } catch (error) {
      console.error('Error saving appointment instances:', error);
      throw error;
    }
  }

  /**
   * Main method to create recurring appointments
   * @param {Object} appointmentData - Base appointment data
   * @param {string} frequency - Recurrence frequency
   * @param {number} duration - Number of occurrences
   * @returns {Promise<Object>} Result with instances and series info
   */
  static async createRecurringAppointments(appointmentData, frequency, duration) {
    try {
      console.log(`🔄 Creating recurring appointments: ${frequency} for ${duration} occurrences`);
      
      // Generate unique series ID
      const seriesId = `SERIES-${Date.now()}`;
      
      // Add series ID to base appointment data
      const enhancedData = {
        ...appointmentData,
        id: seriesId,
        isRecurring: true,
      };
      
      // Generate all instances
      const instances = this.generateRecurringInstances(
        enhancedData,
        frequency,
        duration
      );
      
      // Save instances to appointments storage
      await this.saveAppointmentInstances(instances);
      
      // Save series metadata
      await this.saveRecurringSeries(seriesId, {
        frequency,
        duration,
        totalInstances: instances.length,
        patientId: appointmentData.patientId || appointmentData.email,
        patientName: appointmentData.name,
        service: appointmentData.service,
        startDate: instances[0].date,
        endDate: instances[instances.length - 1].date,
      });
      
      // Schedule reminder notifications
      await this.scheduleReminders(instances, appointmentData.name);
      
      console.log(`✅ Successfully created ${instances.length} recurring appointments`);
      
      return {
        success: true,
        seriesId,
        instances,
        totalInstances: instances.length,
      };
    } catch (error) {
      console.error('Error creating recurring appointments:', error);
      throw error;
    }
  }

  /**
   * Get all instances of a recurring series
   * @param {string} seriesId - Series identifier
   * @returns {Promise<Array>} Array of appointment instances
   */
  static async getSeriesInstances(seriesId) {
    try {
      const existingData = await AsyncStorage.getItem(this.APPOINTMENTS_KEY);
      const appointments = existingData ? JSON.parse(existingData) : [];
      
      return appointments.filter(apt => apt.seriesId === seriesId);
    } catch (error) {
      console.error('Error getting series instances:', error);
      return [];
    }
  }

  /**
   * Cancel all future instances of a recurring series
   * @param {string} seriesId - Series identifier
   * @returns {Promise<void>}
   */
  static async cancelRecurringSeries(seriesId) {
    try {
      const existingData = await AsyncStorage.getItem(this.APPOINTMENTS_KEY);
      const appointments = existingData ? JSON.parse(existingData) : [];
      
      const now = new Date();
      
      // Filter out future instances of this series
      const updatedAppointments = appointments.map(apt => {
        if (apt.seriesId === seriesId) {
          const aptDate = this.parseAppointmentDate(apt.date, apt.time);
          if (aptDate > now) {
            return { ...apt, status: 'cancelled', cancelledAt: new Date().toISOString() };
          }
        }
        return apt;
      });
      
      await AsyncStorage.setItem(this.APPOINTMENTS_KEY, JSON.stringify(updatedAppointments));
      console.log(`✅ Cancelled future instances of series ${seriesId}`);
    } catch (error) {
      console.error('Error cancelling recurring series:', error);
      throw error;
    }
  }
}

export default RecurringAppointmentService;
