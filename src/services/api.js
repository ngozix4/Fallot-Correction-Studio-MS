import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// For development - adjust based on your environment
const API_URL = 'https://fallot-correction-studio-ms.onrender.com/api';

// For production - you'll update this to your Render URL
// const API_URL = 'https://your-backend.onrender.com/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add token
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log('🔑 [Interceptor] Adding token to request:', {
        url: config.url,
        method: config.method,
        tokenPreview: `${token.substring(0, 20)}...`,
        timestamp: new Date().toISOString(),
      });
    } else {
      console.log('⚠️ [Interceptor] No token available for request:', {
        url: config.url,
        method: config.method,
        timestamp: new Date().toISOString(),
      });
    }
    
    console.log('📤 [Interceptor] Request Headers:', {
      url: config.url,
      headers: config.headers,
      data: config.data,
      timestamp: new Date().toISOString(),
    });
    
    return config;
  },
  (error) => {
    console.error('❌ [Interceptor] Request Error:', {
      error: error.message,
      timestamp: new Date().toISOString(),
    });
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    console.log('✅ [Interceptor] Response Success:', {
      url: response.config.url,
      status: response.status,
      statusText: response.statusText,
      data: response.data,
      timestamp: new Date().toISOString(),
    });
    return response;
  },
  async (error) => {
    console.error('❌ [Interceptor] Response Error:', {
      url: error.config?.url,
      status: error.response?.status,
      statusText: error.response?.statusText,
      message: error.message,
      data: error.response?.data,
      timestamp: new Date().toISOString(),
    });
    
    const originalRequest = error.config;

    // If token expired (401) and not already retrying
    if (error.response?.status === 401 && !originalRequest._retry) {
      console.log('🔄 [Interceptor] Token expired, attempting refresh');
      originalRequest._retry = true;

      try {
        // Try to refresh token
        const refreshToken = await AsyncStorage.getItem('refreshToken');
        if (refreshToken) {
          console.log('🔄 [Interceptor] Refreshing token...');
          const response = await axios.post(`${API_URL}/auth/refresh`, {
            refreshToken,
          });

          const { token } = response.data;
          await AsyncStorage.setItem('token', token);

          console.log('🔄 [Interceptor] Token refreshed successfully');
          
          // Retry original request with new token
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        console.error('❌ [Interceptor] Token refresh failed:', refreshError.message);
        // Refresh failed, logout user
        await AsyncStorage.removeItem('token');
        await AsyncStorage.removeItem('refreshToken');
        await AsyncStorage.removeItem('user');

        // You might want to navigate to login screen here
        // navigationRef.navigate('Login');
      }
    }

    return Promise.reject(error);
  }
);

// Auth API with debugging
export const authAPI = {
  register: async (userData) => {
  try {
    console.log('📤 [API] Register Request - userData received:', {
      userData,
      isUndefined: userData === undefined,
      isNull: userData === null,
      type: typeof userData,
      timestamp: new Date().toISOString(),
    });
    
    if (!userData) {
      console.error('❌ [API] Register Error: userData is undefined or null');
      throw new Error('User data is required for registration');
    }
    
    console.log('📤 [API] Register Request Details:', {
      endpoint: '/auth/register',
      data: { 
        ...userData, 
        password: userData.password ? '[HIDDEN]' : undefined 
      },
      timestamp: new Date().toISOString(),
    });
    
    const response = await api.post('/auth/register', userData);
    
    console.log('✅ [API] Register Success:', {
      status: response.status,
      statusText: response.statusText,
      data: response.data,
      timestamp: new Date().toISOString(),
    });
    
    return response;
  } catch (error) {
    console.error('❌ [API] Register Error:', {
      errorType: 'AxiosError',
      message: error.message,
      code: error.code,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      config: error.config ? {
        url: error.config.url,
        method: error.config.method,
        baseURL: error.config.baseURL,
        headers: error.config.headers,
        data: error.config.data,
      } : 'No config available',
      timestamp: new Date().toISOString(),
    });
    
    // Also log the raw response if available
    if (error.response) {
      console.error('📄 [API] Raw Error Response:', {
        headers: error.response.headers,
        data: error.response.data,
      });
    }
    
    throw error;
  }
},
  
  login: async (credentials) => {
    try {
      console.log('📤 [API] Login Request:', {
        endpoint: '/auth/login',
        data: { ...credentials, password: '[HIDDEN]' },
        timestamp: new Date().toISOString(),
      });
      
      const response = await api.post('/auth/login', credentials);
      
      console.log('✅ [API] Login Success:', {
        status: response.status,
        hasToken: !!response.data?.token,
        userEmail: response.data?.email,
        timestamp: new Date().toISOString(),
      });
      
      return response;
    } catch (error) {
      console.error('❌ [API] Login Error:', {
        errorType: 'AxiosError',
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
        timestamp: new Date().toISOString(),
      });
      
      throw error;
    }
  },
  
  getProfile: async () => {
    try {
      console.log('📤 [API] Get Profile Request:', {
        endpoint: '/auth/profile',
        timestamp: new Date().toISOString(),
      });
      
      // Log token if available
      const token = await AsyncStorage.getItem('token');
      console.log('🔑 [API] Current Token:', token ? `${token.substring(0, 20)}...` : 'No token');
      
      const response = await api.get('/auth/profile');
      
      console.log('✅ [API] Get Profile Success:', {
        status: response.status,
        user: response.data?.email,
        timestamp: new Date().toISOString(),
      });
      
      return response;
    } catch (error) {
      console.error('❌ [API] Get Profile Error:', {
        errorType: 'AxiosError',
        message: error.message,
        status: error.response?.status,
        timestamp: new Date().toISOString(),
      });
      
      throw error;
    }
  },
  
  updateProfile: async (userData) => {
    try {
      console.log('📤 [API] Update Profile Request:', {
        endpoint: '/auth/profile',
        data: userData,
        timestamp: new Date().toISOString(),
      });
      
      const response = await api.put('/auth/profile', userData);
      
      console.log('✅ [API] Update Profile Success:', {
        status: response.status,
        updatedFields: Object.keys(userData),
        timestamp: new Date().toISOString(),
      });
      
      return response;
    } catch (error) {
      console.error('❌ [API] Update Profile Error:', {
        errorType: 'AxiosError',
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
        timestamp: new Date().toISOString(),
      });
      
      throw error;
    }
  },
};

// Invoice API
export const invoiceAPI = {
  create: (invoiceData) => api.post('/invoices', invoiceData),
  getAll: () => api.get('/invoices'),
  getById: (id) => api.get(`/invoices/${id}`),
  updatePayment: (id, paymentData) => api.put(`/invoices/${id}/payment`, paymentData),
  sendInvoice: (id) => api.post(`/invoices/${id}/send`),
  getStats: () => api.get('/invoices/stats'),
};

// Job API
export const jobAPI = {
  getAll: () => api.get('/jobs'),
  getById: (id) => api.get(`/jobs/${id}`),
  updateProgress: (id, progressData) => api.put(`/jobs/${id}/progress`, progressData),
  updateStatus: (id, statusData) => api.put(`/jobs/${id}/status`, statusData),
  addMaterials: (id, materials) => api.post(`/jobs/${id}/materials`, { materials }),
  getStats: () => api.get('/jobs/stats'),
};

// Gallery API
// Gallery API with debugging
export const galleryAPI = {
  upload: async (formData) => {
    try {
      console.log('📤 [API] Gallery Upload Request');
      const response = await api.post('/gallery/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      console.log('✅ [API] Gallery Upload Success:', response.data);
      return response;
    } catch (error) {
      console.error('❌ [API] Gallery Upload Error:', error.response?.data);
      throw error;
    }
  },
  
  getAll: async (params) => {
    try {
      console.log('📤 [API] Gallery GetAll Request:', {
        params,
        endpoint: '/gallery',
        timestamp: new Date().toISOString(),
      });
      
      const response = await api.get('/gallery', { params });
      
      console.log('✅ [API] Gallery GetAll Success:', {
        count: response.data?.length || 0,
        data: response.data,
        timestamp: new Date().toISOString(),
      });
      
      return response;
    } catch (error) {
      console.error('❌ [API] Gallery GetAll Error:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  },
  
  getById: async (id) => {
    try {
      console.log('📤 [API] Gallery GetById Request:', id);
      const response = await api.get(`/gallery/${id}`);
      return response;
    } catch (error) {
      console.error('❌ [API] Gallery GetById Error:', error.response?.data);
      throw error;
    }
  },
  
  update: (id, galleryData) => api.put(`/gallery/${id}`, galleryData),
  delete: (id) => api.delete(`/gallery/${id}`),
  addImages: (id, formData) => api.post(`/gallery/${id}/images`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  }),
};

// Financial API
export const financialAPI = {
  // Goals
  createGoal: (goalData) => api.post('/financial/goals', goalData),
  getGoals: () => api.get('/financial/goals'),
  updateGoal: (id, goalData) => api.put(`/financial/goals/${id}`, goalData),

  // Records
  createRecord: (recordData) => api.post('/financial/records', recordData),
  getRecords: (params) => api.get('/financial/records', { params }),
  getSummary: () => api.get('/financial/summary'),

  // Expenses
  createExpense: (expenseData) => api.post('/financial/expenses', expenseData),
  getExpenses: (params) => api.get('/financial/expenses', { params }),
  getExpenseStats: () => api.get('/financial/expenses/stats'),
};

export default api;