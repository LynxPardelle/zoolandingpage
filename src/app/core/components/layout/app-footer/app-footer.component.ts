/**
 * AppFooter Component
 *
 * Footer component with responsive layout, copyright info, and contact details.
 * Following MANDATORY requirements: Angular 17+, ngx-angora-css, type-only definitions, atomic structure.
 */

import {
  Component,
  ChangeDetectionStrategy,
  computed,
  input,
} from '@angular/core';

import {
  APP_FOOTER_DEFAULTS,
  BASE_FOOTER_CLASSES,
  FOOTER_CONTENT_CLASSES,
  FOOTER_RESPONSIVE_CLASSES,
} from './app-footer.constants';
import type {
  AppFooterConfig,
  ContactInfo,
  SocialLink,
} from './app-footer.types';

@Component({
  selector: 'app-footer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './app-footer.component.html',
})
export class AppFooterComponent {
  // Configuration input with defaults
  readonly config = input(APP_FOOTER_DEFAULTS, {
    transform: (value: Partial<AppFooterConfig>) => ({
      ...APP_FOOTER_DEFAULTS,
      ...value,
    }),
  });

  // Contact information input
  readonly contactInfo = input<ContactInfo>({
    email: 'contact@zoolanding.com',
    phone: '+1 (555) 123-4567',
    address: '123 Zoo Street, Animal City, AC 12345',
  });

  // Social links input
  readonly socialLinks = input<readonly SocialLink[]>([
    {
      name: 'Facebook',
      url: 'https://facebook.com/zoolanding',
      icon: '📘',
      ariaLabel: 'Visit our Facebook page',
    },
    {
      name: 'Twitter',
      url: 'https://twitter.com/zoolanding',
      icon: '🐦',
      ariaLabel: 'Follow us on Twitter',
    },
    {
      name: 'Instagram',
      url: 'https://instagram.com/zoolanding',
      icon: '📷',
      ariaLabel: 'Follow us on Instagram',
    },
  ]);

  // Computed classes
  readonly computedFooterClasses = computed(() => {
    const config = this.config();
    const baseClasses = [...BASE_FOOTER_CLASSES];

    if (config.className) {
      baseClasses.push(config.className);
    }
    return baseClasses.join(' ');
  });

  readonly computedContentClasses = computed(() => {
    const contentClasses = [
      ...FOOTER_CONTENT_CLASSES,
      ...FOOTER_RESPONSIVE_CLASSES,
    ];
    return contentClasses.join(' ');
  });
}
