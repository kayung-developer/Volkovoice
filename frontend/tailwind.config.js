/** @type {import('tailwindcss').Config} */
import defaultTheme from 'tailwindcss/defaultTheme';

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class', // Enable class-based dark mode (controlled by JS)
  theme: {
    extend: {
      // Use the 'Inter' font family we loaded from Google Fonts
      fontFamily: {
        sans: ['Inter', ...defaultTheme.fontFamily.sans],
      },
      colors: {
        // Define our brand colors using CSS variables for consistency
        primary: 'var(--color-primary)',
        secondary: 'var(--color-secondary)',
        // Define our core background/text colors
        'dark-bg': 'var(--background-dark)',
        'dark-card': '#1F2937', // A slightly lighter card background for contrast
      },
      // Add custom keyframes for reusable animations
      keyframes: {
        fadeIn: {
          '0%': { opacity: 0, transform: 'translateY(-10px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
        pulseOrb: {
          '0%, 100%': { transform: 'scale(1)', opacity: 0.7 },
          '50%': { transform: 'scale(1.1)', opacity: 1 },
        },
      },
      // Register the custom animations for use with the `animate-*` utilities
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out forwards',
        'pulse-orb': 'pulseOrb 2.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
}