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
  'successColor',
  'onSuccessColor',
  'errorColor',
  'onErrorColor',
  'warningColor',
  'onWarningColor',
  'infoColor',
  'onInfoColor',
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
  successColor: string;
  onSuccessColor: string;
  errorColor: string;
  onErrorColor: string;
  warningColor: string;
  onWarningColor: string;
  infoColor: string;
  onInfoColor: string;
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
  altSuccessColor: string;
  altOnSuccessColor: string;
  altErrorColor: string;
  altOnErrorColor: string;
  altWarningColor: string;
  altOnWarningColor: string;
  altInfoColor: string;
  altOnInfoColor: string;
};

export type TAllThemeColors = TThemeColors & TAltThemeColors;

export type TThemePaletteName = 'light' | 'dark';
export type TThemeAccentColorToken = (typeof THEME_ACCENT_COLOR_TOKENS)[number];

export type TThemePalettes = {
  light: TThemeColors;
  dark: TThemeColors;
};

export type TThemeVariableConfig = {
  defaultMode?: ThemeMode;
  palettes: TThemePalettes;
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
