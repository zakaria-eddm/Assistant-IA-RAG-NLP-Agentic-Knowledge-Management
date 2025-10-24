import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService, userService } from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (token) {
        const userProfile = await userService.getProfile();
        setUser({ ...userProfile, token });
      }
    } catch (error) {
      console.error('Auth check error:', error);
      await AsyncStorage.removeItem('authToken');
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      const authData = await authService.login(email, password);
      
      if (authData.access_token) {
        await AsyncStorage.setItem('authToken', authData.access_token);
        await AsyncStorage.setItem('refreshToken', authData.refresh_token);
        
        const userProfile = await userService.getProfile();
        setUser({ ...userProfile, token: authData.access_token });
        
        return authData;
      }
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      await AsyncStorage.removeItem('authToken');
      await AsyncStorage.removeItem('refreshToken');
      setUser(null);
    }
  };

  const deleteAccount = async () => {
    try {
      await userService.deleteAccount();
      await logout();
    } catch (error) {
      throw error;
    }
  };

  const updateUserProfile = async (userData) => {
    try {
      const updatedUser = await userService.updateProfile(userData);
      setUser(prev => ({ ...prev, ...updatedUser }));
      return updatedUser;
    } catch (error) {
      throw error;
    }
  };

  const refreshUser = async () => {
    try {
      const userProfile = await userService.getProfile();
      const token = await AsyncStorage.getItem('authToken');
      setUser({ ...userProfile, token });
      return userProfile;
    } catch (error) {
      console.error('Error refreshing user:', error);
      throw error;
    }
  };

  const value = {
    user,
    login,
    logout,
    deleteAccount,
    updateUserProfile,
    refreshUser,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Export par défaut pour le contexte si nécessaire
export default AuthContext;