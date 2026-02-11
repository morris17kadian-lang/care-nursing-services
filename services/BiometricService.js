import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';

class BiometricService {
  /**
   * Check if device has biometric hardware and it's available
   */
  static async isAvailable() {
    try {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      if (!compatible) {
        return { available: false, reason: 'Device does not have biometric hardware' };
      }

      const enrolled = await LocalAuthentication.isEnrolledAsync();
      if (!enrolled) {
        return { available: false, reason: 'No biometric data enrolled on device' };
      }

      // Get available biometric types
      const compatible_types = await LocalAuthentication.supportedAuthenticationTypesAsync();
      const types = [];
      if (compatible_types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
        types.push('Fingerprint');
      }
      if (compatible_types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
        types.push('Face ID');
      }
      if (compatible_types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
        types.push('Iris');
      }

      return {
        available: true,
        types: types,
        reason: `Device supports: ${types.join(', ')}`
      };
    } catch (error) {
      console.error('Error checking biometric availability:', error);
      return { available: false, reason: error.message };
    }
  }

  /**
   * Authenticate with biometric (fingerprint/face)
   * @param {string} reason - Reason to show user
   * @returns {boolean} - True if authentication successful
   */
  static async authenticate(reason = 'Authenticate to sign in') {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        disableDeviceFallback: false,
        reason: reason,
        fallbackLabel: 'Use passcode',
        requireConfirmation: false,
      });

      return result.success;
    } catch (error) {
      console.error('Biometric authentication error:', error);
      return false;
    }
  }

  /**
   * Save biometric credentials securely
   * @param {string} username - User's username/email
   * @param {string} password - User's password
   */
  static async saveCredentials(username, password) {
    try {
      const credentials = {
        username,
        password,
        savedAt: new Date().toISOString(),
      };
      
      await AsyncStorage.setItem(
        'biometricCredentials',
        JSON.stringify(credentials)
      );
      
      // Biometric credentials saved
      return true;
    } catch (error) {
      console.error('Error saving biometric credentials:', error);
      return false;
    }
  }

  /**
   * Get saved biometric credentials
   * @returns {object|null} - Credentials if available, null otherwise
   */
  static async getCredentials() {
    try {
      const credentials = await AsyncStorage.getItem('biometricCredentials');
      if (credentials) {
        return JSON.parse(credentials);
      }
      return null;
    } catch (error) {
      console.error('Error retrieving biometric credentials:', error);
      return null;
    }
  }

  /**
   * Clear saved biometric credentials
   */
  static async clearCredentials() {
    try {
      await AsyncStorage.removeItem('biometricCredentials');
      // Biometric credentials cleared
      return true;
    } catch (error) {
      console.error('Error clearing biometric credentials:', error);
      return false;
    }
  }

  /**
   * Check if biometric credentials are saved
   */
  static async hasCredentials() {
    try {
      const credentials = await AsyncStorage.getItem('biometricCredentials');
      return credentials !== null;
    } catch (error) {
      console.error('Error checking biometric credentials:', error);
      return false;
    }
  }

  /**
   * Biometric login flow
   * @returns {object} - { success: boolean, username: string, password: string, error: string }
   */
  static async biometricLogin() {
    try {
      // Check if biometric is available
      const availability = await this.isAvailable();
      if (!availability.available) {
        return {
          success: false,
          error: 'Biometric authentication not available: ' + availability.reason
        };
      }

      // Check if credentials are saved
      const savedCredentials = await this.getCredentials();
      if (!savedCredentials) {
        return {
          success: false,
          error: 'No biometric credentials saved'
        };
      }

      // Authenticate with biometric
      const authenticated = await this.authenticate(
        'Authenticate to sign in to CARE'
      );

      if (authenticated) {
        return {
          success: true,
          username: savedCredentials.username,
          password: savedCredentials.password
        };
      } else {
        return {
          success: false,
          error: 'Biometric authentication failed'
        };
      }
    } catch (error) {
      console.error('Biometric login error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Biometric password reset verification
   * @returns {boolean} - True if biometric auth successful
   */
  static async verifyForPasswordReset(reason = 'Verify identity to reset password') {
    try {
      const availability = await this.isAvailable();
      if (!availability.available) {
        return false;
      }

      return await this.authenticate(reason);
    } catch (error) {
      console.error('Biometric verification error:', error);
      return false;
    }
  }

  /**
   * Biometric verification for sensitive operations
   * @returns {boolean} - True if biometric auth successful
   */
  static async verifyForSensitiveOperation(operationName = 'this operation') {
    try {
      const availability = await this.isAvailable();
      if (!availability.available) {
        return false;
      }

      return await this.authenticate(
        `Authenticate to confirm ${operationName}`
      );
    } catch (error) {
      console.error('Biometric verification error:', error);
      return false;
    }
  }
}

export default BiometricService;
