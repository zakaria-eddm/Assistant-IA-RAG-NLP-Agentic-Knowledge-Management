// contexts/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService, userService } from '../services/api';

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
      const token = localStorage.getItem('authToken');
      if (token) {
        const userProfile = await userService.getProfile();
        setUser({ ...userProfile, token });
      }
    } catch (error) {
      console.error('Auth check error:', error);
      localStorage.removeItem('authToken');
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      const authData = await authService.login(email, password);
      
      if (authData.access_token) {
        localStorage.setItem('authToken', authData.access_token);
        localStorage.setItem('refreshToken', authData.refresh_token);
        
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
      localStorage.removeItem('authToken');
      localStorage.removeItem('refreshToken');
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
      const token = localStorage.getItem('authToken');
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
      {!loading && children}
    </AuthContext.Provider>
  );
};