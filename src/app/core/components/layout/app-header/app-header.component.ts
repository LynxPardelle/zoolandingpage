/**
 * AppHeader Component
 *
 * Main header component with responsive navigation, mobile menu, and theme/language toggles.
 * Following MANDATORY requirements: Angular 17+, ngx-angora-css, type-only definitions, atomic structure.
 */

import {
  Component,
  ChangeDetectionStrategy,
  afterNextRender,
  computed,
  input,
  signal,
  inject,
  PLATFORM_ID,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

import { ThemeService } from '../../../services/theme.service';
import { LanguageService } from '../../../services/language.service';
import {
  APP_HEADER_DEFAULTS,
  BASE_HEADER_CLASSES,
  STICKY_HEADER_CLASSES,
  HEADER_CONTENT_CLASSES,
} from './app-header.constants';
import type {
  AppHeaderConfig,
  AppHeaderState,
  MobileMenuState,
} from './app-header.types';

@Component({
  selector: 'app-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './app-header.component.html',
  imports: [],
})
export class AppHeaderComponent {
  // Injected services
  protected readonly themeService = inject(ThemeService);
  protected readonly languageService = inject(LanguageService);
  private readonly platformId = inject(PLATFORM_ID);

  // Configuration input with defaults
  readonly config = input(APP_HEADER_DEFAULTS, {
    transform: (value: Partial<AppHeaderConfig>) => ({
      ...APP_HEADER_DEFAULTS,
      logoText: 'Zoo Landing',
      logoUrl: '/',
      ...value,
    }),
  });

  // Internal state
  private readonly internalState = signal<AppHeaderState>({
    isMobileMenuOpen: false,
    isScrolled: false,
  });

  // Public state accessor
  readonly state = computed(() => this.internalState());

  // Computed classes
  readonly computedHeaderClasses = computed(() => {
    const config = this.config();
    const baseClasses: string[] = [...BASE_HEADER_CLASSES];

    if (config.isSticky) {
      baseClasses.push(...STICKY_HEADER_CLASSES);
    }

    if (config.className) {
      baseClasses.push(config.className);
    }

    return baseClasses.join(' ');
  });

  readonly computedContentClasses = computed(() => {
    return HEADER_CONTENT_CLASSES.join(' ');
  });

  constructor() {
    // Handle scroll detection for sticky header effects
    afterNextRender(() => {
      if (isPlatformBrowser(this.platformId)) {
        this.setupScrollListener();
      }
    });
  }

  // Toggle mobile menu
  toggleMobileMenu(): void {
    this.internalState.update((state: AppHeaderState) => ({
      ...state,
      isMobileMenuOpen: !state.isMobileMenuOpen,
    }));
  }

  // Setup scroll listener for header effects
  private setupScrollListener(): void {
    const handleScroll = () => {
      const isScrolled = window.scrollY > 10;
      this.internalState.update((state: AppHeaderState) => ({
        ...state,
        isScrolled,
      }));
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
  }
}
