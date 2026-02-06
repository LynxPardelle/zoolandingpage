/**
 * Theme Types - Foundation Components
 *
 * Core type definitions for theme management following MANDATORY requirements:
 * - Use 'type' keyword only (NO interfaces/enums)
 * - Keep atomic and focused
 */

// Theme color definitions
export type TThemeColors = {
  bgColor: string;
  textColor: string;
  titleColor: string;
  linkColor: string;
  accentColor: string;
  secondaryBgColor: string;
  secondaryTextColor: string;
  secondaryTitleColor: string;
  secondaryLinkColor: string;
  secondaryAccentColor: string;
};

export type TAltThemeColors = {
  altBgColor: string;
  altTextColor: string;
  altTitleColor: string;
  altLinkColor: string;
  altAccentColor: string;
  altSecondaryBgColor: string;
  altSecondaryTextColor: string;
  altSecondaryTitleColor: string;
  altSecondaryLinkColor: string;
  altSecondaryAccentColor: string;
};

export type TAllThemeColors = TThemeColors & TAltThemeColors;

// Theme configuration
export type ThemeConfig = {
  name: string;
  colors: TThemeColors;
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
