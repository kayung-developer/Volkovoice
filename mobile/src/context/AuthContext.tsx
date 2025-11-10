import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  useMemo,
  ReactNode,
  useCallback,
} from 'react';
import { FirebaseAuthTypes } from '@react-native-firebase/auth';
import apiClient from '../api/axios';
import { onAuthStateChanged } from '../api/firebase';

// Define the shape of our user profile from the backend
interface UserProfile {
  email: string;
  full_name: string | null;
  preferences: {
    theme: string;
    default_target_language: string;
    interface_language: string;
    avatar_url: string | null;
  };
}

interface AuthContextType {
  user: FirebaseAuthTypes.User | null;
  profile: UserProfile | null;
  isLoading: boolean;
  apiClient: typeof apiClient;
  updateProfile: (profileData: Partial<UserProfile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<FirebaseAuthTypes.User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Subscribe to auth state changes
    const subscriber = onAuthStateChanged(async firebaseUser => {
      setUser(firebaseUser);
      if (firebaseUser) {
        try {
          // User is signed in, fetch their profile from our backend
          const { data } = await apiClient.get<UserProfile>('/api/users/me');
          setProfile(data);
        } catch (error) {
          console.error('Failed to fetch user profile:', error);
          // This might happen if the user is in Firebase but our backend
          // hasn't created their profile yet. The backend will auto-create on next call.
          setProfile(null);
        }
      } else {
        // User is signed out, clear profile
        setProfile(null);
      }
      if (isLoading) {
        setIsLoading(false);
      }
    });

    return subscriber; // Unsubscribe on unmount
  }, [isLoading]);

  const updateProfile = useCallback(async (profileData: Partial<UserProfile>) => {
    try {
      const { data } = await apiClient.put<UserProfile>('/api/users/me', profileData);
      setProfile(data); // Update global state with the new profile
    } catch (error) {
      console.error('Failed to update profile:', error);
      throw error; // Re-throw to be handled by the component
    }
  }, []);


  const value = useMemo(
    () => ({ user, profile, isLoading, apiClient, updateProfile }),
    [user, profile, isLoading, updateProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook for consuming the auth context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};