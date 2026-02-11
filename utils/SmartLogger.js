/**
 * Smart Logger Utility
 * Reduces log spam by throttling repetitive messages
 */

class SmartLogger {
  static logHistory = new Map();
  static LOG_THROTTLE_TIME = 10000; // 10 seconds default throttle

  /**
   * Log with throttling - only logs if message hasn't been logged recently
   */
  static throttleLog(message, level = 'log', throttleTime = this.LOG_THROTTLE_TIME) {
    const now = Date.now();
    const lastLogged = this.logHistory.get(message);
    
    if (!lastLogged || now - lastLogged > throttleTime) {
      console[level](message);
      this.logHistory.set(message, now);
      return true;
    }
    return false;
  }

  /**
   * Log only when value changes
   */
  static logOnChange(key, value, message, level = 'log') {
    const storageKey = `change_${key}`;
    const lastValue = this.logHistory.get(storageKey);
    
    if (lastValue !== value) {
      console[level](message, value);
      this.logHistory.set(storageKey, value);
      return true;
    }
    return false;
  }

  /**
   * Log with counter - shows how many times message would have been logged
   */
  static logWithCounter(message, level = 'log', counterThreshold = 10) {
    const counterKey = `counter_${message}`;
    const currentCount = (this.logHistory.get(counterKey) || 0) + 1;
    this.logHistory.set(counterKey, currentCount);
    
    if (currentCount === 1 || currentCount % counterThreshold === 0) {
      const displayMessage = currentCount === 1 ? message : `${message} (×${currentCount})`;
      console[level](displayMessage);
      return true;
    }
    return false;
  }

  /**
   * Clear log history for cleanup
   */
  static clearHistory() {
    this.logHistory.clear();
  }

  /**
   * Log important messages (bypasses throttling)
   */
  static important(message, level = 'log') {
    console[level](`🔔 ${message}`);
  }

  /**
   * Log debug messages (only in development)
   */
  static debug(message, data = null) {
    if (__DEV__) {
      if (data) {
        console.log(`🐛 ${message}`, data);
      } else {
        console.log(`🐛 ${message}`);
      }
    }
  }
}

export default SmartLogger;