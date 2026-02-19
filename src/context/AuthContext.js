import React, { createContext, useState, useContext, useEffect } from 'react';
import database from '../services/database';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      // Initialize database
      await database.init();
      
      // Check if any user exists
      let existingUser = await database.getCurrentUser();
      
      // If no user exists, create a default user
      if (!existingUser) {
        console.log('🟡 Creating default user...');
        const defaultUser = {
          name: 'Lloyd Dangis Mwelo',
          email: 'lomwelo1@gmail.com',
          password: 'password123',
          businessName: 'Fallot Correction Studio',
          phone: '+27 69 198 5031',
          address: '190 Bergatillirie Street, Pretoria Danvile ext 5, South Africa',
          startingCapital: 0,
          currentBalance: 0,
          profilePicture: ''
        };
        
        const result = await database.createUser(defaultUser);
        if (result.success) {
          existingUser = result.user;
          console.log('✅ Default user created:', existingUser.name);
        }
      }
      
      setUser(existingUser);
    } catch (error) {
      console.error('Error initializing app:', error);
      // Create a fallback user object
      setUser({
        id: 1,
        name: 'Lloyd Dangis Mwelo',
        email: 'lomwelo1@gmail.com',
        businessName: 'Fallot Correction Studio',
        startingCapital: 0,
        currentBalance: 0,
        profilePicture: ''
      });
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (updates) => {
    try {
      if (!user) return;
      
      const updatedUser = await database.updateUser(user.id, updates);
      if (updatedUser) {
        setUser(updatedUser);
      }
      return updatedUser;
    } catch (error) {
      console.error('Update profile error:', error);
      throw error;
    }
  };

  const updateBalance = async (startingCapital, currentBalance) => {
    try {
      if (!user) return;
      
      const updates = {
        startingCapital: parseFloat(startingCapital) || 0,
        currentBalance: parseFloat(currentBalance) || 0
      };
      
      return await updateProfile(updates);
    } catch (error) {
      console.error('Update balance error:', error);
      throw error;
    }
  };

  const value = {
    user,
    isAuthenticated: true, // Always authenticated
    updateProfile,
    updateBalance,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};