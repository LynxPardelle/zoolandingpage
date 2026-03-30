/**
 * Theme Service
 *
 * Manages dynamic theme switching using ngx-angora-css pushColors method.
 * REQUIRED: All theme changes must use pushColors (NO hardcoded colors)
 */

import { isPlatformBrowser } from '@angular/common';
import { computed, effect, inject, Injectable, PLATFORM_ID, REQUEST, signal } from '@angular/core';
import { NgxAngoraService } from 'ngx-angora-css';
import { ThemeConfig, ThemeMode, TThemeColors, TThemeVariableConfig } from '../types/theme.types';
import { isThemeVariableConfig } from '../utility/config-validation/config-payload.validators';
import { DomainResolverService } from './domain-resolver.service';
import { VariableStoreService } from './variable-store.service';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly request = inject(REQUEST, { optional: true });
  private readonly _ank = inject(NgxAngoraService);
  private readonly variableStore = inject(VariableStoreService);
  private readonly domainResolver = inject(DomainResolverService);
  private readonly isBrowser = isPlatformBrowser(this.platformId) && !this.request;

  // Theme state using signals (MANDATORY Angular 17+ features)
  private readonly _currentTheme = signal<ThemeMode>('light');
  private readonly _systemPreference = signal<'light' | 'dark'>('light');
  private readonly _hasStoredThemePreference = signal(false);

  // Computed theme based on current selection and system preference
  readonly activeTheme = computed(() => {
    const theme: ThemeMode = this._currentTheme();
    if (theme === 'auto') {
      return this._systemPreference();
    }
    return theme;
  });

  private readonly _draftThemeConfig = computed<TThemeVariableConfig | null>(() => {
    const value = this.variableStore.get('theme');
    return isThemeVariableConfig(value) ? value : null;
  });

  private readonly _lightThemeConfig = computed<ThemeConfig | null>(() => {
    const config = this._draftThemeConfig();
    if (!config) return null;

    return {
      name: 'light',
      isDark: false,
      colors: config.palettes.light,
    };
  });

  private readonly _darkThemeConfig = computed<ThemeConfig | null>(() => {
    const config = this._draftThemeConfig();
    if (!config) return null;

    return {
      name: 'dark',
      isDark: true,
      colors: config.palettes.dark,
    };
  });

  private initialized: boolean = false;

  constructor() {
    this._detectSystemPreference();
    this._loadSavedTheme();
    effect(() => {
      if (this._hasStoredThemePreference()) return;
      const configuredMode = this._draftThemeConfig()?.defaultMode ?? 'light';
      if (this._currentTheme() !== configuredMode) {
        this._currentTheme.set(configuredMode);
      }
    });
    effect(() => {
      this._draftThemeConfig();
      this.activeTheme();
      this.applyTheme();
    });
  }

  // Public methods
  setTheme(theme: ThemeMode): void {
    this._hasStoredThemePreference.set(true);
    this._currentTheme.set(theme);
    this._saveTheme(theme);
  }

  toggleTheme(): void {
    const current = this._currentTheme();
    const next: ThemeMode = current === 'light' ? 'dark' : 'light';
    this.setTheme(next);
  }

  currentTheme(): 'light' | 'dark' {
    return this.activeTheme();
  }

  getCurrentTheme(): ThemeMode {
    return this._currentTheme();
  }

  getCurrentThemeConfig(): ThemeConfig {
    return this.activeTheme() === 'dark'
      ? this.requireThemeConfig(this._darkThemeConfig(), 'dark')
      : this.requireThemeConfig(this._lightThemeConfig(), 'light');
  }

  // Private methods
  private _detectSystemPreference(): void {
    if (!this.isBrowser) return;

    const mediaQuery: MediaQueryList = window.matchMedia('(prefers-color-scheme: dark)');
    this._systemPreference.set(mediaQuery.matches ? 'dark' : 'light');

    const handleChange = (e: MediaQueryListEvent): void => {
      this._systemPreference.set(e.matches ? 'dark' : 'light');
    };

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleChange);
    } else if (typeof (mediaQuery as any).addListener === 'function') {
      (mediaQuery as any).addListener(handleChange);
    }
  }

  private _loadSavedTheme(): void {
    if (typeof localStorage === 'undefined') return;

    const storageKey = this.storageKey();
    const saved: string | null = localStorage.getItem(storageKey);
    const savedTheme = saved as ThemeMode;

    if (saved && ['light', 'dark', 'auto'].includes(saved)) {
      this._hasStoredThemePreference.set(true);
      this._currentTheme.set(savedTheme);
    }
  }

  private _saveTheme(theme: ThemeMode): void {
    if (typeof localStorage === 'undefined') return;
    const storageKey = this.storageKey();
    localStorage.setItem(storageKey, theme);
  }

  // MANDATORY: All color changes must use pushColors method
  applyTheme(): void {
    if (!this.isBrowser) return; // Skip SSR
    const currentThemeConfig = this.activeTheme() === 'dark' ? this._darkThemeConfig() : this._lightThemeConfig();
    const altThemeConfig = this.activeTheme() === 'dark' ? this._lightThemeConfig() : this._darkThemeConfig();
    if (!currentThemeConfig || !altThemeConfig) {
      return;
    }
    const themeColors: TThemeColors = currentThemeConfig.colors;
    const altThemeColors: TThemeColors = altThemeConfig.colors;

    // Use ngx-angora-css pushColors || updateColors for dynamic theme management
    this._ank[!this.initialized ? 'pushColors' : 'updateColors']({
      bgColor: themeColors.bgColor,
      textColor: themeColors.textColor,
      titleColor: themeColors.titleColor,
      linkColor: themeColors.linkColor,
      accentColor: themeColors.accentColor,
      secondaryBgColor: themeColors.secondaryBgColor,
      secondaryTextColor: themeColors.secondaryTextColor,
      secondaryTitleColor: themeColors.secondaryTitleColor,
      secondaryLinkColor: themeColors.secondaryLinkColor,
      secondaryAccentColor: themeColors.secondaryAccentColor,
      altBgColor: altThemeColors.bgColor,
      altTextColor: altThemeColors.textColor,
      altTitleColor: altThemeColors.titleColor,
      altLinkColor: altThemeColors.linkColor,
      altAccentColor: altThemeColors.accentColor,
      altSecondaryBgColor: altThemeColors.secondaryBgColor,
      altSecondaryTextColor: altThemeColors.secondaryTextColor,
      altSecondaryTitleColor: altThemeColors.secondaryTitleColor,
      altSecondaryLinkColor: altThemeColors.secondaryLinkColor,
      altSecondaryAccentColor: altThemeColors.secondaryAccentColor,
    });
    if (!this.initialized) this.initialized = true;
    const angoraColors: { [key: string]: string } = {};
    for (const [key, value] of Object.entries(themeColors)) {
      angoraColors[key] = value;
    }
  }

  private storageKey(): string {
    return this.domainResolver.resolveStorageKey('theme');
  }

  private requireThemeConfig(config: ThemeConfig | null, mode: 'light' | 'dark'): ThemeConfig {
    if (config) {
      return config;
    }

    throw new Error(`Theme payload is required before reading the ${ mode } theme config.`);
  }
}
