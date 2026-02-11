import AsyncStorage from '@react-native-async-storage/async-storage';
import PushNotificationService from './PushNotificationService';
import ApiService from './ApiService';

/**
 * Service to handle recurring appointment logic
 * - Generates multiple appointment instances based on recurrence pattern
 * - Schedules reminder notifications for each instance
 * - Manages recurring appointment series
 */
class RecurringAppointmentService {
  static STORAGE_KEY = '@care_recurring_appointments';
  static getAppointmentsStorageKey(patientId) {
    return `@care_appointments_${patientId || 'guest'}`;
  }

  static async getAllAppointmentStorageKeys() {
    try {
      const keys = await AsyncStorage.getAllKeys();
      return keys.filter(key => key.startsWith('@care_appointments_'));
    } catch (error) {
      // console.error('Error listing appointment storage keys:', error);
      return [];
    }
  }

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

    const normalizeTimeString = (value) => {
      if (typeof value !== 'string') return null;
      return value.replace(/\u202F|\u00A0/g, ' ').replace(/\s+/g, ' ').trim();
    };

    const sourceTime = normalizeTimeString(appointmentData.startTime || appointmentData.time);
    
    // Generate the specified number of instances
    for (let i = 0; i < duration; i++) {
      const instanceDate = i === 0 ? baseDate : this.calculateNextDate(
        this.parseAppointmentDate(instances[i - 1].date, instances[i - 1].time),
        frequency
      );
      
      // Validate instance date
      if (isNaN(instanceDate.getTime())) {
        // console.error(`❌ Invalid date generated for instance ${i+1}. Skipping.`);
        continue;
      }

      // Format date and time
      const formattedDate = instanceDate.toLocaleDateString('en-US', {
        month: 'short',
        day: '2-digit',
        year: 'numeric'
      });
      
      // Format time as HH:MM with 12-hour format (e.g., "2:24 PM")
      // Ensure we use standard ASCII space (U+0020) and remove any non-breaking spaces
      const hour = instanceDate.getHours();
      const minute = instanceDate.getMinutes();
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour % 12 || 12; // Convert to 12-hour format
      const formattedTime = `${displayHour}:${String(minute).padStart(2, '0')} ${ampm}`;
      const timeValue = sourceTime && /\d{1,2}:\d{2}\s*(AM|PM)$/i.test(sourceTime)
        ? sourceTime
        : formattedTime;
      
      // Create instance with unique ID but linked to series
      const instance = {
        ...appointmentData,
        id: `${appointmentData.id || Date.now()}-${i}`,
        seriesId: appointmentData.id || `SERIES-${Date.now()}`,
        instanceNumber: i + 1,
        totalInstances: duration,
        date: formattedDate,
        time: timeValue,
        preferredDate: formattedDate,
        preferredTime: timeValue,
        startDate: appointmentData.startDate || formattedDate,
        startTime: appointmentData.startTime || timeValue,
        endDate: appointmentData.endDate || formattedDate,
        endTime: appointmentData.endTime || timeValue,
        recurringFrequency: frequency,
        recurringDuration: duration,
        selectedDays: appointmentData.selectedDays || appointmentData.daysOfWeek || [],
        daysOfWeek: appointmentData.daysOfWeek || appointmentData.selectedDays || [],
        isRecurring: true,
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
      // Parsing date and time
      
      // Handle case where dateStr might be ISO or other format
      if (!dateStr) return new Date();

      // Try parsing date with regex for "Month DD, YYYY" or "Month DD YYYY"
      // Allow for optional comma and dot (e.g. "Nov. 20, 2025")
      const dateParts = dateStr.match(/([a-zA-Z]+)\.?\s+(\d+),?\s+(\d+)/);
      
      let year, monthIndex, day;

      if (dateParts) {
        const [, month, d, y] = dateParts;
        day = parseInt(d);
        year = parseInt(y);
        
        // Try to parse month name
        const monthDate = new Date(`${month} 1, 2000`);
        if (!isNaN(monthDate.getTime())) {
          monthIndex = monthDate.getMonth();
        } else {
          // console.warn(`Could not parse month: "${month}"`);
          // Fallback: try to parse the whole string
          const fallbackDate = new Date(dateStr);
          if (!isNaN(fallbackDate.getTime())) {
            return this.applyTimeToDate(fallbackDate, timeStr);
          }
          return new Date(); // Fail safe
        }
      } else {
        // Try parsing as standard date string
        const d = new Date(dateStr);
        if (!isNaN(d.getTime())) {
          year = d.getFullYear();
          monthIndex = d.getMonth();
          day = d.getDate();
        } else {
          // console.warn(`Could not parse date string: "${dateStr}"`);
          return new Date();
        }
      }
      
      const baseDate = new Date(year, monthIndex, day);
      return this.applyTimeToDate(baseDate, timeStr);

    } catch (error) {
      // console.error('Error parsing appointment date:', error);
      return new Date();
    }
  }

  /**
   * Helper to apply time string to a date object
   */
  static applyTimeToDate(dateObj, timeStr) {
    if (!timeStr) return dateObj;

    // Parse time - handle unicode spaces and various separators
    // Matches "10:00 AM", "10:00AM", "10:00 PM", "10:00 PM"
    const timeParts = timeStr.match(/(\d+):(\d+)[^\d\w]*([AP]M)/i);
    
    if (!timeParts) {
      // console.warn(`Could not parse time string: "${timeStr}"`);
      return dateObj;
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
    
    const newDate = new Date(dateObj);
    newDate.setHours(hours, minutes, 0, 0);
    return newDate;
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
      // Recurring series saved
    } catch (error) {
      // console.error('Error saving recurring series:', error);
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
      const groupedByPatient = instances.reduce((acc, instance) => {
        const patientIdentifier = instance.patientId || instance.clientId || instance.patientEmail || instance.email;
        const key = this.getAppointmentsStorageKey(patientIdentifier);
        if (!acc[key]) {
          acc[key] = [];
        }
        acc[key].push(instance);
        return acc;
      }, {});

      await Promise.all(
        Object.entries(groupedByPatient).map(async ([storageKey, patientInstances]) => {
          const existingData = await AsyncStorage.getItem(storageKey);
          const appointments = existingData ? JSON.parse(existingData) : [];
          appointments.push(...patientInstances);
          await AsyncStorage.setItem(storageKey, JSON.stringify(appointments));
        })
      );
      // Saved recurring appointment instances
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
      // Creating recurring appointments
      
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

      // Sync to backend
      try {
        // Syncing recurring appointments to backend
        const apiPromises = instances.map(instance => {
          // Convert time to 24h format if needed, or let backend handle it
          // Backend handles "10:00 AM" format
          
          // Convert date to ISO format for backend (YYYY-MM-DD)
          // instance.date is in "Nov 20, 2025" format
          const dateObj = new Date(instance.date);
          const isoDate = !isNaN(dateObj.getTime()) 
            ? dateObj.toISOString().split('T')[0] 
            : instance.date;

          const apiPayload = {
            patientId: instance.patientId,
            patientName: instance.patientName || instance.name,
            name: instance.name || instance.patientName,
            email: instance.email,
            phone: instance.phone,
            appointmentType: instance.service,
            scheduledDate: isoDate,
            scheduledTime: instance.time, // Time is already formatted cleanly as "HH:MM AM/PM"
            scheduledEndTime: instance.endTime || instance.appointmentEndTime || null,
            startDate: instance.startDate || instance.date || null,
            endDate: instance.endDate || null,
            location: instance.address,
            address: instance.address,
            notes: instance.notes,
            isRecurring: true,
            seriesId: seriesId,
            recurringFrequency: frequency,
            recurringDuration: duration,
            daysOfWeek: instance.daysOfWeek || instance.selectedDays || [],
            preferredNurseId: instance.preferredNurseId || null,
            preferredNurseName: instance.preferredNurseName || null,
            preferredNurseCode: instance.preferredNurseCode || null
          };
          
          return ApiService.createAppointment(apiPayload)
            .then(response => {
              if (response.success && response.appointment) {
                // Update local instance with backend ID if needed
                // For now, we just ensure it's created on backend
                // Synced instance to backend
              }
            })
            .catch(err => console.error(`Failed to sync instance ${instance.instanceNumber} to backend:`, err.message));
        });
        
        // We don't await all of them to block the UI, but we start them
        // Or we can await if we want to ensure they are created
        // Let's await to be safe for this "test"
        await Promise.all(apiPromises);
        // Recurring appointments sync completed
      } catch (apiError) {
        console.error('Error syncing to backend:', apiError);
        // Don't fail the whole process if backend sync fails, as we have local storage
      }
      
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
      
      // NOTE: Reminders are now managed by the backend via ReminderService
      // No need to schedule them locally anymore
      
      // Successfully created recurring appointments
      
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
      const keys = await this.getAllAppointmentStorageKeys();
      if (keys.length === 0) {
        return [];
      }

      const entries = await AsyncStorage.multiGet(keys);
      const matches = [];
      entries.forEach(([key, value]) => {
        if (!value) {
          return;
        }
        try {
          const appointments = JSON.parse(value);
          appointments.forEach(apt => {
            if (apt.seriesId === seriesId) {
              matches.push(apt);
            }
          });
        } catch (error) {
          console.error('Error parsing appointments for key:', key, error);
        }
      });
      
      return matches;
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
      const keys = await this.getAllAppointmentStorageKeys();
      if (keys.length === 0) {
        return;
      }

      const now = new Date();

      await Promise.all(
        keys.map(async storageKey => {
          const existingData = await AsyncStorage.getItem(storageKey);
          if (!existingData) {
            return;
          }

          let updated = false;
          const appointments = JSON.parse(existingData);
          const updatedAppointments = appointments.map(apt => {
            if (apt.seriesId === seriesId) {
              const aptDate = this.parseAppointmentDate(apt.date, apt.time);
              if (aptDate > now) {
                updated = true;
                return { ...apt, status: 'cancelled', cancelledAt: new Date().toISOString() };
              }
            }
            return apt;
          });

          if (updated) {
            await AsyncStorage.setItem(storageKey, JSON.stringify(updatedAppointments));
          }
        })
      );
      // Cancelled future instances of series
    } catch (error) {
      console.error('Error cancelling recurring series:', error);
      throw error;
    }
  }
}

export default RecurringAppointmentService;
