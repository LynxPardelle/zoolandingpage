/**
 * AppHeader Constants
 * 
 * Constants and default values for AppHeader component.
 * Following MANDATORY atomic file structure (keep under 80 lines).
 */

import { AppHeaderConfig } from "./app-header.types";

// Default header configuration
export const APP_HEADER_DEFAULTS: Partial<AppHeaderConfig> = {
  showLogo: true,
  showNavigation: true,
  showLanguageToggle: true,
  showThemeToggle: true,
  isSticky: true,
  className: ''
} as const;

// Header base classes using ngx-angora-css
export const BASE_HEADER_CLASSES = [
  'ank-width-full',
  'ank-bg-primary',
  'ank-borderBottom-1px',
  'ank-borderColor-border',
  'ank-zIndex-50'
] as const;

// Sticky header classes
export const STICKY_HEADER_CLASSES = [
  'ank-position-sticky',
  'ank-top-0'
] as const;

// Header content classes
export const HEADER_CONTENT_CLASSES = [
  'ank-display-flex',
  'ank-alignItems-center',
  'ank-justifyContent-spaceBetween',
  'ank-paddingTop-16px',
  'ank-paddingBottom-16px'
] as const;
