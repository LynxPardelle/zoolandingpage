/**
 * Theme Service
 *
 * Manages dynamic theme switching using ngx-angora-css pushColors method.
 * REQUIRED: All theme changes must use pushColors (NO hardcoded colors)
 */

import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { computed, effect, inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
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
  private readonly documentRef = inject(DOCUMENT, { optional: true });
  private readonly _ank = inject(NgxAngoraService);
  private readonly variableStore = inject(VariableStoreService);
  private readonly domainResolver = inject(DomainResolverService);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

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
    const value = this.variableStore.theme();
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
  private readonly themeUtilityOverrideStyleId = 'zlp-theme-utility-overrides';

  constructor() {
    this._detectSystemPreference();
    this._loadSavedTheme();
    effect(() => {
      this._draftThemeConfig();
      this._loadSavedTheme();
    });
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
    const currentThemeConfig = this.activeTheme() === 'dark' ? this._darkThemeConfig() : this._lightThemeConfig();
    const altThemeConfig = this.activeTheme() === 'dark' ? this._lightThemeConfig() : this._darkThemeConfig();
    if (!currentThemeConfig || !altThemeConfig) {
      return;
    }
    const themeColors: TThemeColors = currentThemeConfig.colors;
    const altThemeColors: TThemeColors = altThemeConfig.colors;

    this.syncCssVariables(themeColors, altThemeColors);

    if (!this.isBrowser) {
      this.syncThemeUtilityOverrides();
      return;
    }

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
      successColor: themeColors.successColor,
      onSuccessColor: themeColors.onSuccessColor,
      errorColor: themeColors.errorColor,
      onErrorColor: themeColors.onErrorColor,
      warningColor: themeColors.warningColor,
      onWarningColor: themeColors.onWarningColor,
      infoColor: themeColors.infoColor,
      onInfoColor: themeColors.onInfoColor,
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
      altSuccessColor: altThemeColors.successColor,
      altOnSuccessColor: altThemeColors.onSuccessColor,
      altErrorColor: altThemeColors.errorColor,
      altOnErrorColor: altThemeColors.onErrorColor,
      altWarningColor: altThemeColors.warningColor,
      altOnWarningColor: altThemeColors.onWarningColor,
      altInfoColor: altThemeColors.infoColor,
      altOnInfoColor: altThemeColors.onInfoColor,
    });
    this.syncThemeUtilityOverrides();
    if (!this.initialized) this.initialized = true;
    const angoraColors: { [key: string]: string } = {};
    for (const [key, value] of Object.entries(themeColors)) {
      angoraColors[key] = value;
    }
  }

  private storageKey(): string {
    return this.domainResolver.resolveStorageKey('theme');
  }

  private syncCssVariables(themeColors: TThemeColors, altThemeColors: TThemeColors): void {
    const root = this.documentRef?.documentElement;
    if (!root) return;

    const entries = [
      ...Object.entries(themeColors).map(([key, value]) => [`--ank-${ key }`, value] as const),
      ...Object.entries(altThemeColors).map(([key, value]) => [`--ank-alt${ key[0].toUpperCase() }${ key.slice(1) }`, value] as const),
    ];

    if (!this.isBrowser) {
      const existingStyle = root.getAttribute('style') ?? '';
      const cleanedStyle = existingStyle
        .replace(/(?:^|;)\s*--ank-[^:;]+:\s*[^;]*/g, '')
        .replace(/;\s*;/g, ';')
        .replace(/^;\s*/, '')
        .trim();
      const themeStyle = entries.map(([key, value]) => `${ key }: ${ value };`).join(' ');
      root.setAttribute('style', `${ cleanedStyle ? `${ cleanedStyle }; ` : '' }${ themeStyle }`);
      return;
    }

    const rootStyle = root.style;
    for (const [key, value] of entries) {
      rootStyle.setProperty(key, value);
    }
  }

  private syncThemeUtilityOverrides(): void {
    const doc = this.documentRef;
    const head = doc?.head;
    if (!doc || !head) return;

    let style = doc.getElementById(this.themeUtilityOverrideStyleId) as HTMLStyleElement | null;
    if (!style) {
      style = doc.createElement('style');
      style.id = this.themeUtilityOverrideStyleId;
      style.setAttribute('data-managed-by', 'ThemeService');
    }

    style.textContent = this.buildThemeUtilityOverrideCss();

    if (style.parentNode) {
      style.parentNode.removeChild(style);
    }
    head.appendChild(style);
  }

  private buildThemeUtilityOverrideCss(): string {
    const fixedUtilities = [
      '.ank-color-white{color:#fff}',
      '.ank-text-white{color:#fff}',
      '.ank-color-inherit{color:inherit}',
      '.ank-text-inherit{color:inherit}',
    ].join('');
    const keys = [
      'bgColor',
      'textColor',
      'titleColor',
      'linkColor',
      'accentColor',
      'secondaryBgColor',
      'secondaryTextColor',
      'secondaryTitleColor',
      'secondaryLinkColor',
      'secondaryAccentColor',
      'successColor',
      'onSuccessColor',
      'errorColor',
      'onErrorColor',
      'warningColor',
      'onWarningColor',
      'infoColor',
      'onInfoColor',
    ];

    return fixedUtilities + keys.map((key) => {
      const variable = `var(--ank-${ key })`;
      return [
        `.ank-color-${ key }{color:${ variable }}`,
        `.ank-text-${ key }{color:${ variable }}`,
        `.ank-bg-${ key }{background-color:${ variable }}`,
        `.ank-backgroundColor-${ key }{background-color:${ variable }}`,
        `.ank-borderColor-${ key }{border-color:${ variable }}`,
      ].join('');
    }).join('');
  }

  private requireThemeConfig(config: ThemeConfig | null, mode: 'light' | 'dark'): ThemeConfig {
    if (config) {
      return config;
    }

    throw new Error(`Theme payload is required before reading the ${ mode } theme config.`);
  }
}
