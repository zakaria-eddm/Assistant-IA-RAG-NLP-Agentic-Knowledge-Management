import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'http://192.168.255.185:8000/api/v1'; // Remplacez par votre IP locale

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
});

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  // DEBUG: Voir ce qui est envoyé
  console.log('Request:', {
    url: config.url,
    method: config.method,
    data: config.data,
    headers: config.headers
  });
  
  return config;
});

export const chatService = {
  sendMessage: async (message, conversationId = null) => {
    const response = await api.post('/chat', {
      message,
      conversation_id: conversationId
    });
    return response.data;
  },

  getConversations: async () => {
    const response = await api.get('/chat/conversations');
    return response.data;
  },

  getConversation: async (conversationId) => {
    const response = await api.get(`/chat/conversations/${conversationId}`);
    return response.data;
  },

  deleteConversation: async (conversationId) => {
    const response = await api.delete(`/chat/conversations/${conversationId}`);
    return response.data;
  }
};

export const authService = {
  login: async (email, password) => {
    // SOLUTION POUR REACT NATIVE
    const formData = new FormData();
    formData.append('username', email);
    formData.append('password', password);
    
    const response = await api.post('/auth/login', formData, {
      headers: {
        'Content-Type': 'multipart/form-data', // Changé ici
      }
    });
    return response.data;
  },

  signup: async (userData) => {
    try {
      // ESSAYEZ EN JSON
      const response = await api.post('/auth/signup', {
        email: userData.email,
        name: userData.name,
        password: userData.password
      }, {
        headers: {
          'Content-Type': 'application/json',
        }
      });
      return response.data;
    } catch (error) {
      console.error('Signup error:', error.response?.data);
      throw error;
    }
  },

  logout: async () => {
    const response = await api.post('/auth/logout');
    return response.data;
  }
};

export const userService = {
  getProfile: async () => {
    const response = await api.get('/users/me');
    return response.data;
  },

  updateProfile: async (userData) => {
    const response = await api.put('/users/me', userData);
    return response.data;
  },

  deleteAccount: async () => {
    const response = await api.delete('/users/me');
    return response.data;
  }
};

export const documentService = {
  uploadFile: async (formData) => {
    const response = await api.post('/documents/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      transformRequest: (data) => data, // Important pour React Native
    });
    return response.data;
  },

  addText: async (text, source = 'manual_input') => {
    const response = await api.post('/documents/text', {
      text,
      source
    });
    return response.data;
  }
};

export default api;