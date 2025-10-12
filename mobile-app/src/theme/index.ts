import { MD3LightTheme, MD3DarkTheme } from 'react-native-paper';

// Medical-focused color palette matching web application
const colors = {
  primary: {
    main: '#2563eb', // Blue-600
    light: '#60a5fa', // Blue-400
    dark: '#1e40af', // Blue-700
  },
  secondary: {
    main: '#10b981', // Emerald-500
    light: '#34d399', // Emerald-400
    dark: '#059669', // Emerald-600
  },
  accent: {
    main: '#8b5cf6', // Violet-500
    light: '#a78bfa', // Violet-400
    dark: '#7c3aed', // Violet-600
  },
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6',
};

export const lightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: colors.primary.main,
    secondary: colors.secondary.main,
    accent: colors.accent.main,
    error: colors.error,
    success: colors.success,
    warning: colors.warning,
    info: colors.info,
    background: '#ffffff',
    surface: '#f9fafb',
    surfaceVariant: '#f3f4f6',
    onSurface: '#111827',
    onSurfaceVariant: '#6b7280',
  },
};

export const darkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: colors.primary.light,
    secondary: colors.secondary.light,
    accent: colors.accent.light,
    error: colors.error,
    success: colors.success,
    warning: colors.warning,
    info: colors.info,
    background: '#0f172a',
    surface: '#1e293b',
    surfaceVariant: '#334155',
    onSurface: '#f1f5f9',
    onSurfaceVariant: '#cbd5e1',
  },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const typography = {
  fontFamily: {
    regular: 'System',
    medium: 'System',
    bold: 'System',
  },
  fontSize: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    xxxl: 32,
  },
};

export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
};
