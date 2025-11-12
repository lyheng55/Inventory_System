import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from '../utils/axios';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

  const fetchUserProfile = useCallback(async () => {
    try {
      const response = await axios.get('/auth/profile');
      setUser(response.data.user);
      setIsInitialized(true);
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
      // Only remove token if it's a 401 (unauthorized) error
      // This means the token is invalid or expired
      if (error.response?.status === 401) {
        localStorage.removeItem('token');
        delete axios.defaults.headers.common['Authorization'];
        setUser(null);
      } else {
        // For other errors, keep the user logged in if they exist
        console.warn('Profile fetch failed but keeping user logged in:', error.message);
      }
    } finally {
      setLoading(false);
      setIsInitialized(true);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token && !isInitialized && !user) {
      // Only fetch profile on initial load if we have a token but no user
      // This prevents fetching after successful login
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchUserProfile();
    } else if (!token) {
      // Set loading to false immediately if no token
      setLoading(false);
      setIsInitialized(true);
    } else if (user && !isInitialized) {
      // User is already set (from login), just mark as initialized
      setLoading(false);
      setIsInitialized(true);
    }
  }, [isInitialized, user, fetchUserProfile]);

  const login = async (username, password) => {
    try {
      const response = await axios.post('/auth/login', { username, password });
      const { token, user } = response.data;
      
      localStorage.setItem('token', token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setUser(user);
      setIsInitialized(true);
      setLoading(false);
      
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.error || 'Login failed' 
      };
    }
  };

  const register = async (userData) => {
    try {
      const response = await axios.post('/auth/register', userData);
      const { token, user } = response.data;
      
      localStorage.setItem('token', token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setUser(user);
      setIsInitialized(true);
      setLoading(false);
      
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.error || 'Registration failed' 
      };
    }
  };

  const logout = async () => {
    try {
      // Call server logout endpoint to log the action
      await axios.post('/auth/logout');
    } catch (error) {
      // Even if server call fails, proceed with local logout
      // This ensures user can always log out
      console.warn('Logout endpoint call failed, proceeding with local logout:', error);
    } finally {
      // Always clear local state regardless of server response
      // Clear all possible storage keys (both patterns used in the app)
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user_data');
      
      // Clear axios authorization header
      delete axios.defaults.headers.common['Authorization'];
      
      // Reset all state
      setUser(null);
      setIsInitialized(false);
      setLoading(false);
      
      // Navigate to clean login page (reset URL to root)
      window.location.href = '/';
    }
  };

  const updateProfile = async (profileData) => {
    try {
      const response = await axios.put('/auth/profile', profileData);
      setUser(response.data.user);
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.error || 'Profile update failed' 
      };
    }
  };

  const changePassword = async (currentPassword, newPassword) => {
    try {
      await axios.put('/auth/change-password', {
        currentPassword,
        newPassword
      });
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.error || 'Password change failed' 
      };
    }
  };

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    updateProfile,
    changePassword
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
