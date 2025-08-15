import React, { createContext, useContext, useReducer, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

// Initial state
const initialState = {
  user: null,
  token: localStorage.getItem('token'),
  isAuthenticated: false,
  loading: true,
  error: null,
};

// Action types
const actionTypes = {
  AUTH_START: 'AUTH_START',
  AUTH_SUCCESS: 'AUTH_SUCCESS',
  AUTH_FAIL: 'AUTH_FAIL',
  LOGOUT: 'LOGOUT',
  CLEAR_ERROR: 'CLEAR_ERROR',
  UPDATE_USER: 'UPDATE_USER',
};

// Reducer
const authReducer = (state, action) => {
  switch (action.type) {
    case actionTypes.AUTH_START:
      return {
        ...state,
        loading: true,
        error: null,
      };
    case actionTypes.AUTH_SUCCESS:
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: true,
        loading: false,
        error: null,
      };
    case actionTypes.AUTH_FAIL:
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        loading: false,
        error: action.payload,
      };
    case actionTypes.LOGOUT:
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        loading: false,
        error: null,
      };
    case actionTypes.CLEAR_ERROR:
      return {
        ...state,
        error: null,
      };
    case actionTypes.UPDATE_USER:
      return {
        ...state,
        user: action.payload,
      };
    default:
      return state;
  }
};

// Create context
const AuthContext = createContext();

// Setup axios interceptors
const setupAxiosInterceptors = (token, dispatch) => {
  // Request interceptor to add token
  axios.interceptors.request.use(
    (config) => {
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  // Response interceptor for token expiration
  axios.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401) {
        // Token expired or invalid
        dispatch({ type: actionTypes.LOGOUT });
        localStorage.removeItem('token');
        toast.error('Session expired. Please login again.');
      }
      return Promise.reject(error);
    }
  );
};

// Provider component
export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Setup axios interceptors when token changes
  useEffect(() => {
    if (state.token) {
      setupAxiosInterceptors(state.token, dispatch);
    }
  }, [state.token]);

  // Check token validity on app start
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      
      if (!token) {
        dispatch({ type: actionTypes.AUTH_FAIL, payload: null });
        return;
      }

      try {
        dispatch({ type: actionTypes.AUTH_START });
        
        const response = await axios.get('/api/auth/verify', {
          headers: { Authorization: `Bearer ${token}` }
        });

        dispatch({
          type: actionTypes.AUTH_SUCCESS,
          payload: {
            user: response.data.user,
            token: token,
          },
        });
      } catch (error) {
        localStorage.removeItem('token');
        dispatch({ 
          type: actionTypes.AUTH_FAIL, 
          payload: error.response?.data?.message || 'Authentication failed' 
        });
      }
    };

    checkAuth();
  }, []);

  // Login function
  const login = async (credentials) => {
    try {
      dispatch({ type: actionTypes.AUTH_START });

      const response = await axios.post('/api/auth/login', credentials);
      const { token, user } = response.data;

      localStorage.setItem('token', token);
      
      dispatch({
        type: actionTypes.AUTH_SUCCESS,
        payload: { user, token },
      });

      toast.success(`Welcome back, ${user.username}!`);
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Login failed';
      dispatch({ type: actionTypes.AUTH_FAIL, payload: message });
      toast.error(message);
      return { success: false, error: message };
    }
  };

  // Register function
  const register = async (userData) => {
    try {
      dispatch({ type: actionTypes.AUTH_START });

      const response = await axios.post('/api/auth/register', userData);
      const { token, user } = response.data;

      localStorage.setItem('token', token);
      
      dispatch({
        type: actionTypes.AUTH_SUCCESS,
        payload: { user, token },
      });

      toast.success(`Welcome to ESP32 Zero Code Platform, ${user.username}!`);
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Registration failed';
      dispatch({ type: actionTypes.AUTH_FAIL, payload: message });
      toast.error(message);
      return { success: false, error: message };
    }
  };

  // Logout function
  const logout = () => {
    localStorage.removeItem('token');
    dispatch({ type: actionTypes.LOGOUT });
    toast.success('Logged out successfully');
  };

  // Update user profile
  const updateProfile = async (profileData) => {
    try {
      const response = await axios.put('/api/auth/profile', profileData);
      
      dispatch({
        type: actionTypes.UPDATE_USER,
        payload: response.data.user,
      });

      toast.success('Profile updated successfully');
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Profile update failed';
      toast.error(message);
      return { success: false, error: message };
    }
  };

  // Change password
  const changePassword = async (passwordData) => {
    try {
      await axios.put('/api/auth/change-password', passwordData);
      toast.success('Password changed successfully');
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Password change failed';
      toast.error(message);
      return { success: false, error: message };
    }
  };

  // Clear error
  const clearError = () => {
    dispatch({ type: actionTypes.CLEAR_ERROR });
  };

  // Get user subscription status
  const getSubscriptionStatus = () => {
    if (!state.user) return null;
    
    return {
      subscription: state.user.subscription,
      isActive: state.user.subscription === 'premium' ? 
        (state.user.subscriptionExpiry ? new Date(state.user.subscriptionExpiry) > new Date() : false) :
        true,
      limits: state.user.limits,
      expiry: state.user.subscriptionExpiry,
    };
  };

  // Check if user has permission
  const hasPermission = (permission) => {
    if (!state.user) return false;
    
    switch (permission) {
      case 'admin':
        return state.user.role === 'admin';
      case 'premium':
        return getSubscriptionStatus()?.isActive && state.user.subscription === 'premium';
      default:
        return true;
    }
  };

  const value = {
    ...state,
    login,
    register,
    logout,
    updateProfile,
    changePassword,
    clearError,
    getSubscriptionStatus,
    hasPermission,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};