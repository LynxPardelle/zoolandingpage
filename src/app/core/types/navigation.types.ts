/**
 * Navigation Types - Foundation Components
 * 
 * Core type definitions for navigation components following MANDATORY requirements:
 * - Use 'type' keyword only (NO interfaces/enums)
 * - Keep atomic and focused
 */

// Navigation menu types
export type NavigationItem = {
  id: string;
  label: string;
  href: string;
  isActive?: boolean;
  isExternal?: boolean;
};

export type NavMenuProps = {
  items: NavigationItem[];
  variant?: 'horizontal' | 'vertical';
  showMobileMenu?: boolean;
  className?: string;
};

// Language toggle types
export type SupportedLanguage = 'es' | 'en';

export type LanguageToggleProps = {
  currentLanguage: SupportedLanguage;
  onLanguageChange: (language: SupportedLanguage) => void;
  className?: string;
};

// Theme toggle types
export type ThemeMode = 'light' | 'dark' | 'auto';

export type ThemeToggleProps = {
  currentTheme: ThemeMode;
  onThemeChange: (theme: ThemeMode) => void;
  className?: string;
};
