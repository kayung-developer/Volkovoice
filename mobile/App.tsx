import React from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { AuthProvider } from './src/context/AuthContext'; // We will create this next
import { ThemeProvider, useTheme } from './src/context/ThemeContext'; // We will create this
import RootNavigator from './src/navigation/RootNavigator'; // We will create this
import { Toaster } from 'react-hot-toast/native'; // Mobile-specific toaster

/**
 * A small helper component to manage the status bar style based on the current theme.
 * This is nested inside ThemeProvider so it can access the theme context.
 */
const ThemedStatusBar = () => {
  const { isDarkMode } = useTheme();
  return <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />;
};

/**
 * The main AppWrapper component that sets up all global context providers.
 * This clean separation allows the main App function to be simple.
 */
const AppWrapper = () => {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <NavigationContainer>
            <ThemedStatusBar />
            <RootNavigator />
            <Toaster position="top-center" />
          </NavigationContainer>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
};

const App = () => {
  return <AppWrapper />;
};

export default App;