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
  readonly logoUrlIsExternal: boolean;
  readonly logoImgUrl: string;
  /** Optional background theme color key (any key from ThemeColors) */
  readonly backgroundColorKey?: keyof import('../../../types/theme.types').ThemeColors;
  /** Optional text theme color key */
  readonly textColorKey?: keyof import('../../../types/theme.types').ThemeColors;
  /** If true header starts transparent until scrolled threshold */
  readonly transparentUntilScroll?: boolean;
  /** Add elevation (shadow / blur) once scrolled */
  readonly elevateOnScroll?: boolean;
  /** Navigation items to render (desktop & mobile) */
  readonly navItems?: readonly HeaderNavItem[];
  /** Enable automatic scrollspy to highlight current section */
  readonly enableScrollSpy?: boolean;
  /** Apply animated gradient background (overrides solid bg) */
  readonly useGradient?: boolean;
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

/** Internal threshold (px) after which we consider header scrolled */
export const APP_HEADER_SCROLL_THRESHOLD = 10;
