import AsyncStorage from '@react-native-async-storage/async-storage';

// IMPORTANT: Update this IP address when you change networks
// To find your current IP, run: ipconfig getifaddr en0 (Mac)
// Your current IP: 192.168.100.82
const BASE_URL = 'http://192.168.100.82:5000/api'; // ⚠️ UPDATE THIS WHEN NETWORK CHANGES

class ApiService {
  static isOffline = false; // Track offline status to reduce log spam
  static lastOfflineCheck = 0; // Timestamp of last offline check
  static OFFLINE_CHECK_INTERVAL = 30000; // Check every 30 seconds
  
  // Throttle shift request calls
  static lastShiftRequestCall = 0;
  static SHIFT_REQUEST_THROTTLE = 5000; // Minimum 5 seconds between calls
  
  static async getAuthToken() {
    try {
      // Try to get the auth token saved during login
      const authToken = await AsyncStorage.getItem('authToken');
      if (authToken) {
        // Removed excessive logging
        return authToken;
      }

      // Fallback: Try to get Firebase token
      const firebaseToken = await AsyncStorage.getItem('firebaseToken');
      if (firebaseToken) {
        return firebaseToken;
      }

      console.warn('⚠️ No auth token found - user needs to log in');
      return null;
    } catch (error) {
      console.error('Error getting auth token:', error);
      return null;
    }
  }

  static async makeRequest(endpoint, options = {}) {
    try {
      // Skip API calls if we're in offline mode and haven't waited long enough
      const now = Date.now();
      if (this.isOffline && (now - this.lastOfflineCheck) < this.OFFLINE_CHECK_INTERVAL) {
        throw new Error('API offline - using cached data');
      }

      const token = await this.getAuthToken();
      
      const config = {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
          ...options.headers,
        },
        ...options,
      };

      const fullUrl = `${BASE_URL}${endpoint}`;
      // Removed excessive API logging - only log errors
      
      const response = await fetch(fullUrl, config);
      const data = await response.json();

      if (!response.ok) {
        console.error(`API Error ${response.status}:`, data);
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }

      // Mark as online if request succeeds
      if (this.isOffline) {
        console.log('✅ Backend connection restored');
        this.isOffline = false;
      }

      return data;
    } catch (error) {
      // Mark as offline and update timestamp
      if (!this.isOffline) {
        console.error(`❌ API request failed for ${endpoint}:`, error.message);
        console.log('🔴 Switching to offline mode - will retry in 30s');
        this.isOffline = true;
      }
      this.lastOfflineCheck = Date.now();
      
      throw error;
    }
  }

  // Chat API methods
  static async sendMessage(receiver, content, messageType = 'text') {
    return this.makeRequest('/messages/send', {
      method: 'POST',
      body: JSON.stringify({
        receiver,
        content,
        messageType
      })
    });
  }

  static async getConversationMessages(conversationId, limit = 50, page = 1) {
    return this.makeRequest(`/messages/conversation/${conversationId}?limit=${limit}&page=${page}`);
  }

  static async getConversations() {
    return this.makeRequest('/messages/conversations');
  }

  static async getUnreadCount(conversationId = null) {
    const query = conversationId ? `?conversationId=${conversationId}` : '';
    return this.makeRequest(`/messages/unread-count${query}`);
  }

  static async markConversationAsRead(conversationId) {
    return this.makeRequest(`/messages/mark-read/${conversationId}`, {
      method: 'POST'
    });
  }

  static async deleteMessage(messageId) {
    return this.makeRequest(`/messages/${messageId}`, {
      method: 'DELETE'
    });
  }

  // Auth API methods
  static async login(email, password) {
    return this.makeRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
  }

  static async register(userData) {
    return this.makeRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
  }

  static async getCurrentUser() {
    return this.makeRequest('/auth/me');
  }

  // Helper method to generate conversation ID (matching backend logic)
  static generateConversationId(user1, user2) {
    const sorted = [user1, user2].sort();
    return `${sorted[0]}_${sorted[1]}`;
  }

  // Shift/Appointment API methods
  static async submitShiftRequest(shiftData) {
    return this.makeRequest('/shifts/request', {
      method: 'POST',
      body: JSON.stringify(shiftData)
    });
  }

  static async getShiftRequests(filters = {}) {
    // Throttle to prevent rapid repeated calls
    const now = Date.now();
    if (now - this.lastShiftRequestCall < this.SHIFT_REQUEST_THROTTLE) {
      return { success: true, shiftRequests: [] }; // Return empty result, no log
    }
    this.lastShiftRequestCall = now;
    
    const queryParams = new URLSearchParams(filters).toString();
    const endpoint = queryParams ? `/shifts/requests?${queryParams}` : '/shifts/requests';
    return this.makeRequest(endpoint);
  }

  static async approveShiftRequest(shiftId) {
    return this.makeRequest(`/shifts/requests/${shiftId}/approve`, {
      method: 'PUT'
    });
  }

  static async denyShiftRequest(shiftId, reason = '') {
    return this.makeRequest(`/shifts/requests/${shiftId}/deny`, {
      method: 'PUT',
      body: JSON.stringify({ reason })
    });
  }

  static async startShift(shiftId) {
    return this.makeRequest(`/shifts/requests/${shiftId}/start`, {
      method: 'PUT'
    });
  }

  static async completeShift(shiftId, hoursWorked, completionNotes) {
    return this.makeRequest(`/shifts/requests/${shiftId}/complete`, {
      method: 'PUT',
      body: JSON.stringify({ hoursWorked, completionNotes })
    });
  }

  // Notification API methods
  static async sendNotification(notificationData) {
    return this.makeRequest('/notifications/send', {
      method: 'POST',
      body: JSON.stringify(notificationData)
    });
  }

  static async getNotifications(filters = {}) {
    const queryParams = new URLSearchParams(filters).toString();
    const endpoint = queryParams ? `/notifications?${queryParams}` : '/notifications';
    return this.makeRequest(endpoint);
  }

  static async markNotificationRead(notificationId) {
    return this.makeRequest(`/notifications/${notificationId}/read`, {
      method: 'PUT'
    });
  }

  static async markAllNotificationsRead() {
    return this.makeRequest('/notifications/read-all', {
      method: 'PUT'
    });
  }

  static async updateFCMToken(token) {
    return this.makeRequest('/notifications/fcm-token', {
      method: 'POST',
      body: JSON.stringify({ token })
    });
  }

  // Appointment API methods
  static async createAppointment(appointmentData) {
    return this.makeRequest('/appointments', {
      method: 'POST',
      body: JSON.stringify(appointmentData)
    });
  }

  static async getAppointments(filters = {}) {
    const queryParams = new URLSearchParams(filters).toString();
    const endpoint = queryParams ? `/appointments?${queryParams}` : '/appointments';
    return this.makeRequest(endpoint);
  }

  static async getAppointmentById(appointmentId) {
    return this.makeRequest(`/appointments/${appointmentId}`);
  }

  static async updateAppointment(appointmentId, updateData) {
    return this.makeRequest(`/appointments/${appointmentId}`, {
      method: 'PUT',
      body: JSON.stringify(updateData)
    });
  }

  static async cancelAppointment(appointmentId) {
    return this.makeRequest(`/appointments/${appointmentId}`, {
      method: 'DELETE'
    });
  }

  static async assignNurseToAppointment(appointmentId, nurseId) {
    return this.makeRequest(`/appointments/${appointmentId}/assign`, {
      method: 'POST',
      body: JSON.stringify({ nurseId })
    });
  }

  static async getAppointmentStats() {
    return this.makeRequest('/appointments/stats/overview');
  }

  // Store/Product API methods
  static async getProducts(filters = {}) {
    const queryParams = new URLSearchParams(filters).toString();
    const endpoint = queryParams ? `/store/products?${queryParams}` : '/store/products';
    return this.makeRequest(endpoint);
  }

  static async getProductById(productId) {
    return this.makeRequest(`/store/products/${productId}`);
  }

  static async createProduct(productData) {
    return this.makeRequest('/store/products', {
      method: 'POST',
      body: JSON.stringify(productData)
    });
  }

  static async updateProduct(productId, updateData) {
    return this.makeRequest(`/store/products/${productId}`, {
      method: 'PUT',
      body: JSON.stringify(updateData)
    });
  }

  static async updateProductStock(productId, stock, operation = 'set') {
    return this.makeRequest(`/store/products/${productId}/stock`, {
      method: 'PATCH',
      body: JSON.stringify({ stock, operation })
    });
  }

  static async deleteProduct(productId) {
    return this.makeRequest(`/store/products/${productId}`, {
      method: 'DELETE'
    });
  }

  // Order API methods
  static async getOrders(filters = {}) {
    const queryParams = new URLSearchParams(filters).toString();
    const endpoint = queryParams ? `/store/orders?${queryParams}` : '/store/orders';
    return this.makeRequest(endpoint);
  }

  static async getOrderById(orderId) {
    return this.makeRequest(`/store/orders/${orderId}`);
  }

  static async createOrder(orderData) {
    return this.makeRequest('/store/orders', {
      method: 'POST',
      body: JSON.stringify(orderData)
    });
  }

  static async updateOrderStatus(orderId, status) {
    return this.makeRequest(`/store/orders/${orderId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    });
  }

  static async cancelOrder(orderId) {
    return this.makeRequest(`/store/orders/${orderId}`, {
      method: 'DELETE'
    });
  }

  // Invoice API methods
  static async getInvoices(filters = {}) {
    const queryParams = new URLSearchParams(filters).toString();
    const endpoint = queryParams ? `/invoices?${queryParams}` : '/invoices';
    return this.makeRequest(endpoint);
  }

  static async getInvoiceById(invoiceId) {
    return this.makeRequest(`/invoices/${invoiceId}`);
  }

  static async createInvoice(invoiceData) {
    return this.makeRequest('/invoices', {
      method: 'POST',
      body: JSON.stringify(invoiceData)
    });
  }

  static async createBulkInvoices(invoices) {
    return this.makeRequest('/invoices/bulk', {
      method: 'POST',
      body: JSON.stringify({ invoices })
    });
  }

  static async updateInvoice(invoiceId, updateData) {
    return this.makeRequest(`/invoices/${invoiceId}`, {
      method: 'PUT',
      body: JSON.stringify(updateData)
    });
  }

  static async updateInvoiceStatus(invoiceId, status) {
    return this.makeRequest(`/invoices/${invoiceId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    });
  }

  static async deleteInvoice(invoiceId) {
    return this.makeRequest(`/invoices/${invoiceId}`, {
      method: 'DELETE'
    });
  }

  static async getInvoiceStats() {
    return this.makeRequest('/invoices/stats/overview');
  }

  static async getInvoiceSeries(seriesId) {
    return this.makeRequest(`/invoices/series/${seriesId}`);
  }
}

export default ApiService;