/**
 * AppFooter Component
 *
 * Footer component with responsive layout, copyright info, and contact details.
 * Following MANDATORY requirements: Angular 17+, ngx-angora-css, type-only definitions, atomic structure.
 */

import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { ModalService } from '../../../../shared/components/modal';
import { I18nService } from '../../../../shared/services/i18n.service';
import {
  APP_FOOTER_DEFAULTS,
  BASE_FOOTER_CLASSES,
  FOOTER_CONTENT_CLASSES,
  FOOTER_RESPONSIVE_CLASSES,
} from './app-footer.constants';
import type { AppFooterConfig, ContactInfo, SocialLink } from './app-footer.types';

@Component({
  selector: 'app-footer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './app-footer.component.html',
})
export class AppFooterComponent {
  // Services
  private readonly modal = inject(ModalService);
  private readonly i18n = inject(I18nService);

  // Configuration input with defaults
  readonly config = input(APP_FOOTER_DEFAULTS, {
    transform: (value: Partial<AppFooterConfig>) => ({
      ...APP_FOOTER_DEFAULTS,
      ...value,
    }),
  });

  // Contact information input
  readonly contactInfo = input<ContactInfo>({
    email: 'mylandingpage@zoolanding.com',
    phone: '+52 (55) 2269-9563',
    address: 'Mexico City, Mexico',
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

  // i18n helper for template
  readonly t = (key: string, params?: Record<string, any>) => this.i18n.t(key, params);

  constructor() { }

  openTerms(): void {
    this.modal.open({
      id: 'terms-of-service',
      size: 'lg',
      ariaLabel: this.t('footer.legal.terms.title'),
      showAccentBar: true,
      accentColor: 'secondaryAccentColor',
    });
  }

  openDataUse(): void {
    this.modal.open({
      id: 'data-use',
      size: 'md',
      ariaLabel: this.t('footer.legal.data.title'),
      showAccentBar: true,
      accentColor: 'secondaryAccentColor',
    });
  }

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
    const contentClasses = [...FOOTER_CONTENT_CLASSES, ...FOOTER_RESPONSIVE_CLASSES];
    return contentClasses.join(' ');
  });
}
