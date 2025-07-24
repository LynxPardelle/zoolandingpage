/**
 * AppFooter Types
 * 
 * Type definitions for AppFooter component.
 * Following MANDATORY type-only definitions (no interfaces, no enums).
 */

// AppFooter configuration type
export type AppFooterConfig = {
  readonly showCopyright: boolean;
  readonly showSocialLinks: boolean;
  readonly showContactInfo: boolean;
  readonly className: string;
  readonly copyrightText: string;
  readonly organizationName: string;
};

// Social link type
export type SocialLink = {
  readonly name: string;
  readonly url: string;
  readonly icon: string;
  readonly ariaLabel: string;
};

// Contact information type
export type ContactInfo = {
  readonly email: string;
  readonly phone: string;
  readonly address: string;
};

// Footer section type
export type FooterSection = {
  readonly title: string;
  readonly items: readonly FooterLink[];
};

// Footer link type
export type FooterLink = {
  readonly label: string;
  readonly href: string;
  readonly isExternal: boolean;
};
