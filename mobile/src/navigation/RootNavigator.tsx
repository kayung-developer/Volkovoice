import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, ActivityIndicator } from 'react-native';

import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { RootStackParamList } from './types';

// Import screens
import LoginScreen from '../screens/LoginScreen'; // We will create this
import MainNavigator from './MainNavigator'; // We will create this next
import TranslationSessionScreen from '../screens/TranslationSessionScreen'; // We will create this
import ChatSessionScreen from '../screens/ChatSessionScreen'; // We will create this
import SettingsScreen from '../screens/SettingsScreen'; // We will create this

const Stack = createNativeStackNavigator<RootStackParamList>();

const RootNavigator = () => {
  const { user, isLoading } = useAuth();
  const { theme } = useTheme();

  // Show a loading indicator while we check for an authenticated user
  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.background }}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false, // We will use custom headers in each screen
        animation: 'slide_from_right',
      }}>
      {!user ? (
        // No user is signed in, show the Login screen
        <Stack.Screen name="Login" component={LoginScreen} />
      ) : (
        // User is signed in, show the main app
        <>
          <Stack.Screen name="Main" component={MainNavigator} />
          <Stack.Screen
            name="TranslationSession"
            component={TranslationSessionScreen}
          />
           <Stack.Screen
            name="ChatSession"
            component={ChatSessionScreen}
          />
          <Stack.Screen
            name="Settings"
            component={SettingsScreen}
            options={{ presentation: 'modal' }} // Opens like a modal on iOS
          />
        </>
      )}
    </Stack.Navigator>
  );
};

export default RootNavigator;