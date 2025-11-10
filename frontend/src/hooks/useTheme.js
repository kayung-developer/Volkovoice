// frontend/src/hooks/useTheme.js
import { useState, useEffect } from 'react';

/**
 * -----------------------------------------------------------------------------
 * Custom Hook: useTheme
 * -----------------------------------------------------------------------------
 * Manages the application's theme (light, dark, or system preference).
 * - Persists the selected theme in localStorage.
 * - Applies the 'dark' class to the root HTML element for Tailwind CSS.
 * - Listens for changes in the OS theme when 'system' is selected.
 */
export const useTheme = () => {
  // Initialize state from localStorage or default to 'system'
  const [theme, setTheme] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') || 'system';
    }
    return 'system';
  });

  useEffect(() => {
    const root = window.document.documentElement;
    const isDark =
      theme === 'dark' ||
      (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

    // Add or remove the 'dark' class from the <html> element
    root.classList.remove(isDark ? 'light' : 'dark');
    root.classList.add(isDark ? 'dark' : 'light');

    // Save the user's explicit choice to localStorage
    if (theme !== 'system') {
      localStorage.setItem('theme', theme);
    } else {
      localStorage.removeItem('theme');
    }
  }, [theme]); // Rerun this effect whenever the theme state changes

  // Effect to listen for OS theme changes only when 'system' is selected
  useEffect(() => {
    if (theme !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = () => {
      // Trigger a re-render to apply the new system theme
      setTheme('system');
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  return [theme, setTheme];
};