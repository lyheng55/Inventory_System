import axios from 'axios';

// Configure axios with base URL
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // Increased timeout to 30 seconds for operations that might take longer
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Enhanced error logging for debugging
    if (error.code === 'ECONNABORTED') {
      console.error('Request timeout:', error.config?.url);
      error.message = 'Request timeout. Please try again.';
    } else if (error.code === 'ERR_NETWORK' || !error.response) {
      console.error('Network error:', {
        message: error.message,
        code: error.code,
        url: error.config?.url,
        baseURL: error.config?.baseURL
      });
      error.message = 'Network error. Please check if the server is running and try again.';
    }
    
    if (error.response?.status === 401) {
      // Token expired or invalid
      // Only clear token and redirect if we're not already on a login page
      // and if the error is not from the profile endpoint (which might fail during initial load)
      const isProfileEndpoint = error.config?.url?.includes('/auth/profile');
      if (!isProfileEndpoint) {
        localStorage.removeItem('token');
        delete axiosInstance.defaults.headers.common['Authorization'];
        // Don't redirect - let the AuthContext handle the state
        // The App component will show Login when user is null
      }
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
