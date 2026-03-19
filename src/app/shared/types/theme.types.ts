/**
 * Theme Types - Foundation Components
 *
 * Core type definitions for theme management following MANDATORY requirements:
 * - Use 'type' keyword only (NO interfaces/enums)
 * - Keep atomic and focused
 */

export const THEME_COLOR_KEYS = [
  'bgColor',
  'textColor',
  'titleColor',
  'linkColor',
  'accentColor',
  'secondaryBgColor',
  'secondaryTextColor',
  'secondaryTitleColor',
  'secondaryLinkColor',
  'secondaryAccentColor',
] as const;

export const THEME_MODES = ['light', 'dark', 'auto'] as const;
export const THEME_ACCENT_COLOR_TOKENS = ['accentColor', 'secondaryAccentColor'] as const;

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

export type TThemePaletteName = 'light' | 'dark';
export type TThemeAccentColorToken = (typeof THEME_ACCENT_COLOR_TOKENS)[number];

export type TThemePalettes = {
  light: TThemeColors;
  dark: TThemeColors;
};

export type TThemeUiConfig = {
  modalAccentColor?: TThemeAccentColorToken;
  legalModalAccentColor?: TThemeAccentColorToken;
  demoModalAccentColor?: TThemeAccentColorToken;
};

export type TThemeVariableConfig = {
  defaultMode?: ThemeMode;
  palettes: TThemePalettes;
  ui?: TThemeUiConfig;
};

// Theme configuration
export type ThemeConfig = {
  name: TThemePaletteName;
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
export type ThemeMode = (typeof THEME_MODES)[number];
