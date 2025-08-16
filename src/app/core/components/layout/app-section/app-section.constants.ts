/**
 * AppSection Constants
 *
 * Constants and default values for AppSection component.
 * Following MANDATORY atomic file structure (keep under 80 lines).
 */

import { SectionSpacing, SectionVariant } from '../../../types/layout.types';

// Default section configuration
export const APP_SECTION_DEFAULTS = {
  variant: 'default' as SectionVariant,
  spacing: 'md' as SectionSpacing,
  className: '',
} as const;

// Section spacing mappings for ngx-angora-css classes
export const SECTION_SPACING_CLASSES: Record<SectionSpacing, string> = {
  none: '',
  sm: 'ank-paddingTop-32px ank-paddingBottom-32px',
  md: 'ank-paddingTop-64px ank-paddingBottom-64px',
  lg: 'ank-paddingTop-96px ank-paddingBottom-96px',
  xl: 'ank-paddingTop-128px ank-paddingBottom-128px',
} as const;

// Section variant classes (colors set via pushColors in component)
export const SECTION_VARIANT_CLASSES: Record<SectionVariant, string> = {
  default: 'ank-bg-bgColor',
  accent: 'ank-bg-accentColor',
  secondary: 'ank-bg-secondaryBgColor',
  transparent: 'ank-bg-transparent',
} as const;

// Base section classes using ngx-angora-css
export const BASE_SECTION_CLASSES = ['ank-width-full', 'ank-position-relative'] as const;
