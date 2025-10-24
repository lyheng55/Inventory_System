// Authentication service
import api from '../utils/api';
import { API_ENDPOINTS, STORAGE_KEYS } from '../constants';

class AuthService {
  // Login user
  async login(email, password) {
    try {
      const response = await api.post(API_ENDPOINTS.AUTH.LOGIN, {
        email,
        password,
      });
      
      if (response.token) {
        localStorage.setItem(STORAGE_KEYS.TOKEN, response.token);
        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(response.user));
      }
      
      return response;
    } catch (error) {
      throw error;
    }
  }

  // Register user
  async register(userData) {
    try {
      const response = await api.post(API_ENDPOINTS.AUTH.REGISTER, userData);
      return response;
    } catch (error) {
      throw error;
    }
  }

  // Logout user
  async logout() {
    try {
      await api.post(API_ENDPOINTS.AUTH.LOGOUT);
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem(STORAGE_KEYS.TOKEN);
      localStorage.removeItem(STORAGE_KEYS.USER);
    }
  }

  // Get current user
  getCurrentUser() {
    const userData = localStorage.getItem(STORAGE_KEYS.USER);
    return userData ? JSON.parse(userData) : null;
  }

  // Get auth token
  getToken() {
    return localStorage.getItem(STORAGE_KEYS.TOKEN);
  }

  // Check if user is authenticated
  isAuthenticated() {
    const token = this.getToken();
    return !!token;
  }

  // Refresh token
  async refreshToken() {
    try {
      const response = await api.post(API_ENDPOINTS.AUTH.REFRESH);
      
      if (response.token) {
        localStorage.setItem(STORAGE_KEYS.TOKEN, response.token);
      }
      
      return response;
    } catch (error) {
      // If refresh fails, logout user
      this.logout();
      throw error;
    }
  }

  // Update user profile
  async updateProfile(userData) {
    try {
      const response = await api.put(API_ENDPOINTS.AUTH.PROFILE, userData);
      
      if (response.user) {
        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(response.user));
      }
      
      return response;
    } catch (error) {
      throw error;
    }
  }

  // Change password
  async changePassword(currentPassword, newPassword) {
    try {
      const response = await api.put(`${API_ENDPOINTS.AUTH.PROFILE}/password`, {
        currentPassword,
        newPassword,
      });
      
      return response;
    } catch (error) {
      throw error;
    }
  }
}

export default new AuthService();
