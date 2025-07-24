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
  accent: string;
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  border: string;
  shadow: string;
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
