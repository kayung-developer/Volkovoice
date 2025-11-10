export const palette = {
  // Brand Colors
  primary: '#4F46E5', // Indigo 600
  secondary: '#10B981', // Emerald 500

  // Grayscale
  black: '#111827', // Gray 900
  gray800: '#1F2937', // Gray 800
  gray700: '#374151', // Gray 700
  gray600: '#4B5563', // Gray 600
  gray500: '#6B7280', // Gray 500
  gray400: '#9CA3AF', // Gray 400
  gray300: '#D1D5DB', // Gray 300
  gray200: '#E5E7EB', // Gray 200
  gray100: '#F3F4F6', // Gray 100
  white: '#FFFFFF',

  // Semantic Colors
  error: '#EF4444', // Red 500
  success: '#22C55E', // Green 500
  warning: '#F97316', // Orange 500
  info: '#3B82F6', // Blue 500
};

export const lightTheme = {
  background: palette.gray100,
  card: palette.white,
  text: palette.black,
  textSecondary: palette.gray600,
  border: palette.gray200,
  primary: palette.primary,
  secondary: palette.secondary,
  ...palette, // Include all base palette colors
};

export const darkTheme = {
  background: palette.black,
  card: palette.gray800,
  text: palette.white,
  textSecondary: palette.gray400,
  border: palette.gray700,
  primary: palette.primary,
  secondary: palette.secondary,
  ...palette, // Include all base palette colors
};

export type Theme = typeof lightTheme;