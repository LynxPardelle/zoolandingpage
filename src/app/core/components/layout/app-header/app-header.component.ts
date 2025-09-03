/**
 * AppHeader Component
 *
 * Main header component with responsive navigation, mobile menu, and theme/language toggles.
 * Following MANDATORY requirements: Angular 17+, ngx-angora-css, type-only definitions, atomic structure.
 */

import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  PLATFORM_ID,
  afterNextRender,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';

import { AnalyticsCategories, AnalyticsEventPayload, AnalyticsEvents } from '@/app/shared/services/analytics.events';
import { AriaLiveService } from '@/app/shared/services/aria-live.service';
import { output } from '@angular/core';
import { LanguageService } from '../../../services/language.service';
import { ThemeService } from '../../../services/theme.service';
import {
  APP_HEADER_DEFAULTS,
  BASE_HEADER_CLASSES,
  HEADER_CONTENT_CLASSES,
  HEADER_ELEVATED_CLASSES,
  STICKY_HEADER_CLASSES,
  buildBgColorClass,
  buildGradientClasses,
  buildTextColorClass,
} from './app-header.constants';
import type { AppHeaderConfig, AppHeaderState, HeaderNavItem } from './app-header.types';

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
  // Centralized analytics: emit events upward
  readonly analyticsEvent = output<AnalyticsEventPayload>();
  private readonly ariaLive = inject(AriaLiveService);

  // Configuration input with defaults
  readonly config = input(APP_HEADER_DEFAULTS, {
    transform: (value: Partial<AppHeaderConfig>) => ({
      ...APP_HEADER_DEFAULTS,
      logoText: 'Zoo Landing',
      logoUrl: '/',
      ...value,
    }),
  });

  // Build gradient classes for the theme
  readonly themeGradientClasses: string = buildGradientClasses({
    colors: ['altBgColor', 'altAccentColor', 'altSecondaryBgColor'],
  });

  // Output: emit active nav item changes (manual selection or scroll spy)
  readonly navChange = output<HeaderNavItem>();

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
    const { isScrolled } = this.state();
    const classes: string[] = [...BASE_HEADER_CLASSES];

    if (config.isSticky) classes.push(...STICKY_HEADER_CLASSES);

    // Transparent until scroll behavior
    if (config.transparentUntilScroll && !isScrolled) {
      classes.push('ank-bg-transparent');
    }

    // Color variants or gradient
    if (config.useGradient) {
      classes.push(
        buildGradientClasses({ colors: ['bgColor', 'secondaryBgColor'], backgroundSize: 200, duration: 15 })
      );
    } else if (config.backgroundColorKey) {
      classes.push(buildBgColorClass(config.backgroundColorKey));
    }
    if (config.textColorKey) classes.push(buildTextColorClass(config.textColorKey));

    // Elevation once scrolled
    if (config.elevateOnScroll && isScrolled) classes.push(...HEADER_ELEVATED_CLASSES);

    if (config.className) classes.push(config.className);
    return classes.join(' ');
  });

  readonly computedContentClasses = computed(() => {
    return HEADER_CONTENT_CLASSES.join(' ');
  });

  constructor() {
    // Handle scroll detection for sticky header effects
    afterNextRender(() => {
      if (isPlatformBrowser(this.platformId)) {
        this.setupScrollListener();
        if (this.config().enableScrollSpy) this.setupScrollSpy();
      }
    });
  }

  // Toggle mobile menu
  toggleMobileMenu(): void {
    this.internalState.update((state: AppHeaderState) => ({
      ...state,
      isMobileMenuOpen: !state.isMobileMenuOpen,
    }));
    const open = this.internalState().isMobileMenuOpen;
    this.analyticsEvent.emit({
      name: open ? AnalyticsEvents.MobileMenuOpen : AnalyticsEvents.MobileMenuClose,
      category: AnalyticsCategories.Navigation,
    });
  }

  selectNav(item: HeaderNavItem): void {
    if (!item) return;
    // Defensive: ensure href exists
    const href = (item as any).href || '';
    /* if (!href) {
      // Debug log to trace source of undefined href
      try { console.warn('[AppHeader] nav item without href', item); } catch { }
    } */
    this.analyticsEvent.emit({
      name: AnalyticsEvents.NavClick,
      category: AnalyticsCategories.Navigation,
      label: item.label,
      meta: { href },
    });
    this.navChange.emit(item);
    if (href.startsWith('#')) {
      const el = document.querySelector(href);
      if (el) {
        // Suppress section_view events during programmatic scroll to avoid noise
        const suppressMs = 200; // 200ms should be enough for the scroll to finish
        // Emit a suppression hint so AppShell can apply it centrally
        this.analyticsEvent.emit({
          name: AnalyticsEvents.SectionView,
          category: AnalyticsCategories.Navigation,
          label: 'suppress_request',
          meta: { suppressForMs: suppressMs, intent: 'suppress_section_view_during_programmatic_scroll' }
        });
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }

  toggleTheme(): void {
    const before = this.themeService.currentTheme();
    this.themeService.toggleTheme();
    const after = this.themeService.currentTheme();
    this.analyticsEvent.emit({
      name: AnalyticsEvents.ThemeToggle,
      category: AnalyticsCategories.Theme,
      label: `${ before }->${ after }`,
      meta: {
        before,
        after,
        type: 'theme',
        action: 'toggle'
      }
    });
  }

  toggleLanguage(): void {
    const before = this.languageService.currentLanguage();
    this.languageService.toggleLanguage();
    const after = this.languageService.currentLanguage();
    this.analyticsEvent.emit({
      name: AnalyticsEvents.LanguageToggle,
      category: AnalyticsCategories.I18N,
      label: `${ before }->${ after }`,
      meta: {
        before,
        after,
        type: 'language',
        action: 'toggle'
      }
    });
    const msg = after === 'en' ? 'Language changed to English' : 'Idioma cambiado a Español';
    this.ariaLive.announce(msg, 'polite');
  }

  // Setup scroll listener for header effects
  private setupScrollListener(): void {
    const handleScroll = () => {
      const isScrolled = window.scrollY > 10;
      this.internalState.update((state: AppHeaderState) => ({ ...state, isScrolled }));
    };
    handleScroll(); // initialize state on load
    window.addEventListener('scroll', handleScroll, { passive: true });
  }

  // Track by for nav items
  protected trackByNav = (index: number, item: HeaderNavItem): string => item.href + '::' + index;

  private setupScrollSpy(): void {
    const cfg = this.config();
    if (!cfg.navItems) return;
    const anchorItems = cfg.navItems.filter(i => i.href.startsWith('#'));
    if (!anchorItems.length) return;
    const observer = new IntersectionObserver(
      entries => {
        let best: IntersectionObserverEntry | null = null;
        for (const entry of entries) {
          if (entry.isIntersecting) {
            if (!best || entry.boundingClientRect.top < (best?.boundingClientRect.top ?? 0)) best = entry;
          }
        }
        if (best?.target?.id) {
          const id = `#${ best.target.id }`;
          const match = anchorItems.find(a => a.href === id);
          if (match) this.navChange.emit(match);
        }
      },
      { rootMargin: '-40% 0px -50% 0px', threshold: [0, 0.25, 0.5] }
    );
    anchorItems.forEach(a => {
      const el = document.querySelector(a.href);
      if (el) observer.observe(el);
    });
  }
}
