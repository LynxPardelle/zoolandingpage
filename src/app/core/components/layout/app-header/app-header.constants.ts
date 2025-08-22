/**
 * AppHeader Constants
 *
 * Constants and default values for AppHeader component.
 * Following MANDATORY atomic file structure (keep under 80 lines).
 */

import { AppHeaderConfig } from './app-header.types';

// Utility partial class maps leveraging angora token naming conventions.
// We will build classes dynamically like `ank-bg-${colorKey}` & `ank-color-${colorKey}`.
// NOTE: Only keys present in ThemeColors should be referenced; caller ensures validity.

export const HEADER_ELEVATED_CLASSES = [
  'ank-boxShadow-sm',
  'ank-backdropFilter-blur-6px',
  'ank-bg-opacity-90',
] as const;

/** Build background color class for a given theme color key */
export const buildBgColorClass = (key: string): string => `ank-bg-${key}`;
/** Build text color class for a given theme color key */
export const buildTextColorClass = (key: string): string => `ank-color-${key}`;
export type buildClassesParams = {
  colors: string[];
  deg?: number;
  backgroundSize?: number;
  duration?: number | string;
  timeFunction?: string;
  iterationcount?: string;
  animationName?: string;
};
/** Build gradient classes (using two theme keys) */
export const buildGradientClasses = (p: buildClassesParams): string => {
  p = {
    colors: p.colors,
    deg: p.deg ?? 90,
    backgroundSize: p.backgroundSize ?? 150,
    animationName: p.animationName ?? 'gradientShiftAnimation',
    duration: p.duration?.toString().replace(/\./g, '_') ?? 7,
    timeFunction: p.timeFunction ?? 'ease',
    iterationcount: p.iterationcount ?? 'infinite',
  };
  return `ank-bgcl-borderMINbox ank-bgi-linearMINgradientSD${p.deg}degCOM${p.colors.join('COM')}ED ank-bgs-${
    p.backgroundSize
  }per ank-and-${p.duration}s ank-antf-${p.timeFunction} ank-anic-${p.iterationcount}  gradientShiftAnimation`;
};

// Default header configuration
export const APP_HEADER_DEFAULTS: Partial<AppHeaderConfig> = {
  showLogo: true,
  logoText: 'Logo',
  logoUrl: '/',
  showNavigation: true,
  showLanguageToggle: true,
  showThemeToggle: true,
  isSticky: true,
  className: '',
  transparentUntilScroll: true,
  elevateOnScroll: true,
  backgroundColorKey: 'bgColor',
  textColorKey: 'textColor',
  enableScrollSpy: true,
  useGradient: true,
  navItems: [
    { label: 'Home', href: '#home', isActive: true, isExternal: false },
    { label: 'Features', href: '#features', isActive: false, isExternal: false },
    { label: 'Services', href: '#services', isActive: false, isExternal: false },
    { label: 'Contact', href: '#contact', isActive: false, isExternal: false },
  ],
} as const;

// Header base classes using ngx-angora-css
export const BASE_HEADER_CLASSES = [
  'ank-width-100per',
  'ank-bg-bgColor',
  'ank-borderBottom-1px',
  'ank-borderColor-secondaryBgColor',
  'ank-zIndex-50',
] as const;

// Sticky header classes
export const STICKY_HEADER_CLASSES = ['ank-position-sticky', 'ank-top-0'] as const;

// Header content classes
export const HEADER_CONTENT_CLASSES = [
  'ank-display-flex',
  'ank-alignItems-center',
  'ank-justifyContent-spaceMINbetween',
  'ank-justifyContent-md-start',
  'ank-paddingTop-16px',
  'ank-paddingBottom-16px',
] as const;
