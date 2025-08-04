/**
 * AppFooter Constants
 *
 * Constants and default values for AppFooter component.
 * Following MANDATORY atomic file structure (keep under 80 lines).
 */

import { AppFooterConfig } from './app-footer.types';

// Default footer configuration
export const APP_FOOTER_DEFAULTS: Partial<AppFooterConfig> = {
  showCopyright: true,
  showSocialLinks: false,
  showContactInfo: true,
  className: '',
  copyrightText: '© 2025 Zoo Landing Page. All rights reserved.',
  organizationName: 'Zoo Landing',
} as const;

// Footer base classes using ngx-angora-css
export const BASE_FOOTER_CLASSES: string[] = [
  'ank-width-full',
  'ank-bg-secondaryBgColor',
  'ank-borderTop-1px',
  'ank-borderColor-secondaryBgColor',
  'ank-marginTop-auto',
] as const;

// Footer content classes
export const FOOTER_CONTENT_CLASSES: string[] = [
  'ank-display-flex',
  'ank-flexDirection-column',
  'ank-alignItems-center',
  'ank-justifyContent-center',
  'ank-padding-24px',
  'ank-gap-16px',
] as const;

// Responsive footer classes
export const FOOTER_RESPONSIVE_CLASSES: string[] = [
  'ank-flexDirectionMd-row',
  'ank-justifyContentMd-spaceBetween',
  'ank-alignItemsMd-center',
] as const;
