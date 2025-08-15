import axios from 'axios';

// Base API configuration
const API_BASE_URL = process.env.REACT_APP_API_URL || 
  (process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:3001/api');

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 seconds
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Add auth token if available
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Add request ID for tracking
    config.headers['X-Request-ID'] = generateRequestId();

    // Log request in development
    if (process.env.NODE_ENV === 'development') {
      console.log('API Request:', {
        method: config.method.toUpperCase(),
        url: config.url,
        data: config.data
      });
    }

    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    // Log response in development
    if (process.env.NODE_ENV === 'development') {
      console.log('API Response:', {
        status: response.status,
        url: response.config.url,
        data: response.data
      });
    }

    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Handle network errors
    if (!error.response) {
      console.error('Network error:', error.message);
      throw new ApiError('Network error. Please check your connection.', 'NETWORK_ERROR');
    }

    const { status, data } = error.response;

    // Handle 401 - Unauthorized
    if (status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      // Clear token and redirect to login
      localStorage.removeItem('authToken');
      window.location.href = '/login';
      return Promise.reject(error);
    }

    // Handle 403 - Forbidden
    if (status === 403) {
      throw new ApiError('Access denied. You don\'t have permission to perform this action.', 'FORBIDDEN');
    }

    // Handle 404 - Not Found
    if (status === 404) {
      throw new ApiError('Resource not found.', 'NOT_FOUND');
    }

    // Handle 429 - Rate Limited
    if (status === 429) {
      const retryAfter = error.response.headers['retry-after'] || 60;
      throw new ApiError(`Rate limit exceeded. Please try again in ${retryAfter} seconds.`, 'RATE_LIMITED', { retryAfter });
    }

    // Handle 500+ - Server errors with retry logic
    if (status >= 500 && originalRequest._retryCount < 3) {
      originalRequest._retryCount = (originalRequest._retryCount || 0) + 1;
      
      const delay = Math.pow(2, originalRequest._retryCount) * 1000; // Exponential backoff
      
      console.log(`Retrying request in ${delay}ms (attempt ${originalRequest._retryCount})`);
      
      await new Promise(resolve => setTimeout(resolve, delay));
      return api(originalRequest);
    }

    // Create descriptive error message
    const errorMessage = data?.error?.message || data?.message || 'An unexpected error occurred';
    const errorType = data?.error?.type || 'UNKNOWN_ERROR';
    const errorId = data?.error?.id;

    console.error('API Error:', {
      status,
      message: errorMessage,
      type: errorType,
      id: errorId,
      url: originalRequest.url
    });

    throw new ApiError(errorMessage, errorType, { status, errorId });
  }
);

// Custom API Error class
class ApiError extends Error {
  constructor(message, type = 'UNKNOWN_ERROR', details = {}) {
    super(message);
    this.name = 'ApiError';
    this.type = type;
    this.details = details;
  }
}

// Generate unique request ID
function generateRequestId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// API methods
const apiClient = {
  // Authentication
  auth: {
    login: (credentials) => api.post('/auth/login', credentials),
    register: (userData) => api.post('/auth/register', userData),
    logout: () => api.post('/auth/logout'),
    refreshToken: () => api.post('/auth/refresh'),
    forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
    resetPassword: (token, password) => api.post('/auth/reset-password', { token, password }),
    verifyEmail: (token) => api.post('/auth/verify-email', { token }),
  },

  // User management
  users: {
    getProfile: () => api.get('/users/profile'),
    updateProfile: (data) => api.put('/users/profile', data),
    changePassword: (data) => api.put('/users/change-password', data),
    deleteAccount: () => api.delete('/users/account'),
  },

  // Device management
  devices: {
    getAll: () => api.get('/devices'),
    getById: (id) => api.get(`/devices/${id}`),
    create: (data) => api.post('/devices', data),
    update: (id, data) => api.put(`/devices/${id}`, data),
    delete: (id) => api.delete(`/devices/${id}`),
    getLogs: (id, params) => api.get(`/devices/${id}/logs`, { params }),
  },

  // Project management
  projects: {
    getAll: () => api.get('/projects'),
    getById: (id) => api.get(`/projects/${id}`),
    create: (data) => api.post('/projects', data),
    update: (id, data) => api.put(`/projects/${id}`, data),
    delete: (id) => api.delete(`/projects/${id}`),
    deploy: (id) => api.post(`/projects/${id}/deploy`),
    share: (id, data) => api.post(`/projects/${id}/share`, data),
  },

  // System
  system: {
    health: () => api.get('/health'),
    metrics: () => api.get('/metrics'),
    settings: () => api.get('/settings'),
  }
};

// Export both the axios instance and the client
export { api, ApiError };
export default apiClient;