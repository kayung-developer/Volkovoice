// frontend/src/context/AuthContext.jsx (Enhanced)
import React, { createContext, useState, useEffect, useMemo, useCallback } from 'react';
import PropTypes from 'prop-types';
import { onAuth } from '../api/firebase';
import apiClient from '../api/axios';

const AuthContext = createContext({
  user: null,          // Firebase user object
  profile: null,       // User profile from our backend
  isLoading: true,     // True during initial auth check and profile fetch
  apiClient: apiClient,
  updateProfile: async () => {}, // Function to update the backend profile
});

/**
 * -----------------------------------------------------------------------------
 * Enhanced Authentication Provider
 * -----------------------------------------------------------------------------
 * This provider now orchestrates both Firebase authentication and backend profile
 * management, creating a single source of truth for all user-related data.
 */
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuth(async (firebaseUser) => {
      setIsLoading(true);
      if (firebaseUser) {
        setUser(firebaseUser);
        try {
          // User is logged in. Fetch their application-specific profile.
          const { data } = await apiClient.get('/api/users/me');
          setProfile(data);
        } catch (error) {
          console.error("Failed to fetch user profile:", error);
          // Handle case where user exists in Firebase but not our DB (should be rare)
          setProfile(null);
        }
      } else {
        // User is logged out. Clear all data.
        setUser(null);
        setProfile(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  /**
   * Provides a stable function for components to update the user's profile.
   * Using useCallback ensures this function's reference doesn't change on
   * every render, optimizing performance for child components.
   */
  const updateProfile = useCallback(async (profileData) => {
    try {
      const { data } = await apiClient.put('/api/users/me', profileData);
      setProfile(data); // Update the global state with the new profile
      return data;
    } catch (error) {
      console.error("Failed to update profile:", error);
      throw error; // Re-throw the error to be caught in the component
    }
  }, []);

  // Memoize the context value to prevent unnecessary re-renders.
  const value = useMemo(() => ({
    user,
    profile,
    isLoading,
    apiClient,
    updateProfile,
  }), [user, profile, isLoading, updateProfile]);

  // Render children only after the initial loading is complete.
  return (
    <AuthContext.Provider value={value}>
      {!isLoading && children}
    </AuthContext.Provider>
  );
};

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export default AuthContext;