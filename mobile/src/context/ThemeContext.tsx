import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  useMemo,
  useCallback,
  ReactNode,
} from 'react';
import { Appearance, ColorSchemeName } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { lightTheme, darkTheme, Theme } from '../theme/colors';

type ThemePreference = 'system' | 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  isDarkMode: boolean;
  themePreference: ThemePreference;
  setThemePreference: (preference: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [themePreference, setThemePreference] = useState<ThemePreference>('system');
  const colorScheme = Appearance.getColorScheme();

  // Load user's theme preference from storage on initial app load
  useEffect(() => {
    const loadThemePreference = async () => {
      try {
        const storedPreference = (await AsyncStorage.getItem(
          '@themePreference',
        )) as ThemePreference | null;
        if (storedPreference) {
          setThemePreference(storedPreference);
        }
      } catch (error) {
        console.error('Failed to load theme preference from storage:', error);
      }
    };
    loadThemePreference();
  }, []);

  const isDarkMode = useMemo(() => {
    if (themePreference === 'system') {
      return colorScheme === 'dark';
    }
    return themePreference === 'dark';
  }, [themePreference, colorScheme]);

  const theme = isDarkMode ? darkTheme : lightTheme;

  const handleSetThemePreference = useCallback(
    async (preference: ThemePreference) => {
      try {
        await AsyncStorage.setItem('@themePreference', preference);
        setThemePreference(preference);
      } catch (error) {
        console.error('Failed to save theme preference to storage:', error);
      }
    },
    [],
  );

  // Memoize the context value to prevent unnecessary re-renders
  const value = useMemo(
    () => ({
      theme,
      isDarkMode,
      themePreference,
      setThemePreference: handleSetThemePreference,
    }),
    [theme, isDarkMode, themePreference, handleSetThemePreference],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
};

// Custom hook for consuming the theme context
export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};