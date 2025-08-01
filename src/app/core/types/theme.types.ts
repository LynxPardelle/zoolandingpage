/**
 * Theme Types - Foundation Components
 *
 * Core type definitions for theme management following MANDATORY requirements:
 * - Use 'type' keyword only (NO interfaces/enums)
 * - Keep atomic and focused
 */

// Theme color definitions
export type ThemeColors = {
  primary: string;
  secondary: string;
  success: string;
  info: string;
  warning: string;
  danger: string;
  light: string;
  dark: string;
  accent: string;
};

// Theme configuration
export type ThemeConfig = {
  name: string;
  colors: ThemeColors;
  isDark: boolean;
};

// Theme state
export type ThemeState = {
  currentTheme: ThemeMode;
  systemPreference: 'light' | 'dark';
  availableThemes: ThemeConfig[];
};

// Import from navigation types
export type ThemeMode = 'light' | 'dark' | 'auto';
