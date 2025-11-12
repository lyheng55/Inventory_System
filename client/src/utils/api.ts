// API utility functions
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

interface RequestOptions extends RequestInit {
  headers?: HeadersInit;
}

interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  [key: string]: any;
}

export const api = {
  // Generic API call function
  async request<T = any>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    // Add auth token if available
    const token = localStorage.getItem('token');
    if (token && config.headers) {
      (config.headers as Record<string, string>).Authorization = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  },

  // HTTP methods
  get: <T = any>(endpoint: string, options: RequestOptions = {}): Promise<T> => 
    api.request<T>(endpoint, { ...options, method: 'GET' }),
  
  post: <T = any>(endpoint: string, data: any, options: RequestOptions = {}): Promise<T> => 
    api.request<T>(endpoint, { 
      ...options, 
      method: 'POST', 
      body: JSON.stringify(data) 
    }),
  
  put: <T = any>(endpoint: string, data: any, options: RequestOptions = {}): Promise<T> => 
    api.request<T>(endpoint, { 
      ...options, 
      method: 'PUT', 
      body: JSON.stringify(data) 
    }),
  
  delete: <T = any>(endpoint: string, options: RequestOptions = {}): Promise<T> => 
    api.request<T>(endpoint, { ...options, method: 'DELETE' }),
};

export default api;

