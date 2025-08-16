/**
 * Layout Types - Foundation Components
 *
 * Core type definitions for layout components following MANDATORY requirements:
 * - Use 'type' keyword only (NO interfaces/enums)
 * - Keep atomic and focused
 */

// Container component types
export type ContainerSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

export type ContainerAlignment = 'left' | 'center' | 'right';

export type ContainerProps = {
  size?: ContainerSize;
  alignment?: ContainerAlignment;
  className?: string;
  children?: any;
};

// Section component types
export type SectionVariant = 'default' | 'secondary' | 'accent' | 'transparent';

export type SectionSpacing = 'none' | 'sm' | 'md' | 'lg' | 'xl';

export type SectionProps = {
  variant?: SectionVariant;
  spacing?: SectionSpacing;
  className?: string;
  children?: any;
};

// Header component types
export type HeaderProps = {
  showLogo?: boolean;
  showNavigation?: boolean;
  showLanguageToggle?: boolean;
  showThemeToggle?: boolean;
  isSticky?: boolean;
  className?: string;
};

// Footer component types
export type FooterProps = {
  showSocialLinks?: boolean;
  showContactInfo?: boolean;
  showCopyright?: boolean;
  className?: string;
};
