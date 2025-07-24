/**
 * AppHeader Types
 * 
 * Type definitions for AppHeader component.
 * Following MANDATORY type-only definitions (no interfaces, no enums).
 */

// AppHeader configuration type
export type AppHeaderConfig = {
  readonly showLogo: boolean;
  readonly showNavigation: boolean;
  readonly showLanguageToggle: boolean;
  readonly showThemeToggle: boolean;
  readonly isSticky: boolean;
  readonly className: string;
  readonly logoText: string;
  readonly logoUrl: string;
};

// AppHeader state type
export type AppHeaderState = {
  readonly isMobileMenuOpen: boolean;
  readonly isScrolled: boolean;
};

// Mobile menu state type
export type MobileMenuState = 'closed' | 'opening' | 'open' | 'closing';

// Header navigation item type
export type HeaderNavItem = {
  readonly label: string;
  readonly href: string;
  readonly isActive: boolean;
  readonly isExternal: boolean;
};
