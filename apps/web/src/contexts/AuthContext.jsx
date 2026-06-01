import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import pb from '@/lib/pocketbaseClient.js';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [isRefreshingUser, setIsRefreshingUser] = useState(false);
  const [token, setToken] = useState('');

  // Initialize auth state from PocketBase on app load
  useEffect(() => {
    if (pb.authStore.isValid && pb.authStore.model) {
      setCurrentUser(pb.authStore.model);
      setToken(pb.authStore.token);
    }
    setInitialLoading(false);

    // Listen for auth store changes to keep context in sync across tabs
    const unsubscribe = pb.authStore.onChange((authToken, authModel) => {
      setCurrentUser(authModel);
      setToken(authToken);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const refreshUserData = useCallback(async (userId = pb.authStore.model?.id) => {
    if (!userId) return null;
    
    setIsRefreshingUser(true);
    try {
      const updatedUser = await pb.collection('users').getOne(userId, { $autoCancel: false });
      setCurrentUser(updatedUser);
      
      // Only update the auth store if this is the currently logged-in user
      if (pb.authStore.model?.id === userId) {
        pb.authStore.save(pb.authStore.token, updatedUser);
      }
      
      return updatedUser;
    } catch (error) {
      console.error('[Auth] Failed to refresh user data:', error);
      return null;
    } finally {
      setIsRefreshingUser(false);
    }
  }, []);

  const login = async (email, password) => {
    console.log(`[Auth] Login attempted for email: ${email}`);
    try {
      const authData = await pb.collection('users').authWithPassword(email, password, { $autoCancel: false });
      console.log(`[Auth] Login successful for user: ${authData.record.id}`);
      
      setToken(authData.token);
      setCurrentUser(authData.record);
      
      // Fetch the absolute latest user data immediately after login
      await refreshUserData(authData.record.id);
      
      return authData;
    } catch (error) {
      console.error(`[Auth] Login failed for email: ${email}`, error);
      
      // Specific error mapping based on PocketBase responses
      if (error.status === 400) {
        throw new Error('Invalid email or password. Please verify your credentials and try again.');
      } else if (error.status === 403) {
        throw new Error('This account is currently blocked or requires verification.');
      } else if (error.status === 404) {
        throw new Error('User account not found.');
      } else if (!navigator.onLine) {
        throw new Error('Network error. Please check your internet connection.');
      }
      
      throw new Error(error.message || 'An unexpected network error occurred during login. Please try again later.');
    }
  };

  const signup = async (email, password, fullName) => {
    console.log(`[Auth] Signup attempted for email: ${email}`);
    const data = {
      email,
      password,
      passwordConfirm: password,
      fullName,
      name: fullName,
      subscription_status: 'free',
      role: 'user'
    };
    
    try {
      const record = await pb.collection('users').create(data, { $autoCancel: false });
      console.log(`[Auth] Signup successful for new user: ${record.id}`);
      
      // Auto-login immediately after successful signup
      await login(email, password);
      
      return record;
    } catch (error) {
      console.error(`[Auth] Signup failed for email: ${email}`, error);
      
      // Detailed error mapping for validation failures
      if (error.response?.data?.email?.code === 'validation_not_unique') {
        throw new Error('An account with this email already exists. Please log in.');
      }
      if (error.response?.data?.email?.code === 'validation_invalid_email') {
        throw new Error('Please enter a valid email address.');
      }
      if (error.response?.data?.password?.code === 'validation_length_out_of_range') {
        throw new Error('Password must be at least 8 characters long.');
      }
      if (!navigator.onLine) {
        throw new Error('Network error. Please check your internet connection.');
      }
      
      throw new Error(error.message || 'Failed to create account. Please try again.');
    }
  };

  const logout = () => {
    console.log(`[Auth] User logged out: ${currentUser?.email}`);
    pb.authStore.clear(); // Clears token and model from local storage securely
    setCurrentUser(null);
    setToken('');
  };

  const getCurrentUser = () => {
    return pb.authStore.model;
  };

  const fetchUserByEmail = async (email) => {
    try {
      const records = await pb.collection('users').getFullList({ filter: `email="${email}"`, $autoCancel: false });
      return records.length > 0 ? records[0] : null;
    } catch (error) {
      console.error('[Auth] Failed to fetch user by email:', error);
      return null;
    }
  };

  const refreshUser = async () => {
    return await refreshUserData();
  };

  const refreshUserProfile = async () => {
    return await refreshUserData();
  };

  const authenticateWithToken = async (newToken, model = null) => {
    pb.authStore.save(newToken, model);
    if (!model) {
      await refreshUserData();
    } else {
      setCurrentUser(model);
      setToken(newToken);
    }
  };

  // Bulletproof Admin Check
  const isAdmin = Boolean(currentUser && currentUser.role === 'admin');
  
  // Bulletproof Premium Check
  const isPremium = Boolean(
    isAdmin || 
    currentUser?.subscription_status === 'premium' || 
    currentUser?.membershipTier === 'premium' || 
    currentUser?.membership_type === 'premium' ||
    currentUser?.premium_status === 'Active' ||
    currentUser?.account_type === 'Premium Member'
  );

  const accountType = isAdmin ? 'Admin' : (isPremium ? 'Premium Member' : 'Free Member');
  const subscriptionStatus = currentUser?.subscription_status || (isPremium ? 'premium' : 'free');

  const value = {
    currentUser,
    isAuthenticated: !!(currentUser && token && pb.authStore.isValid),
    token,
    login,
    signup,
    logout,
    getCurrentUser,
    fetchUserByEmail,
    refreshUser,
    refreshUserProfile,
    refreshUserData,
    authenticateWithToken,
    initialLoading,
    isRefreshingUser,
    subscriptionStatus,
    accountType,
    isAdmin,
    isPremium
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};