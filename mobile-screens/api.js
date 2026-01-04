// api.js - Axios instance for mobile app (same as web app)
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = "https://er-emr-backend.onrender.com/api";

const api = axios.create({
  baseURL: API_URL,
  timeout: 30000, // 30 second timeout
});

// Request interceptor - adds token to all requests
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (e) {
      console.log('Error getting token:', e);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - handles errors globally
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expired - clear storage
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
      // Navigation to login will be handled by the app
    }
    return Promise.reject(error);
  }
);

export default api;
