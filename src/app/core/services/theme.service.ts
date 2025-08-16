/**
 * Theme Service
 *
 * Manages dynamic theme switching using ngx-angora-css pushColors method.
 * REQUIRED: All theme changes must use pushColors (NO hardcoded colors)
 */

import { computed, effect, inject, Injectable, signal } from '@angular/core';
// import { NgxAngoraService } from 'ngx-angora-css';
import { NgxAngoraService } from '@/app/angora-css/ngx-angora.service';
import { environment } from '../../../environments/environment';
import { ThemeColors, ThemeConfig, ThemeMode } from '../types/theme.types';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private readonly _ank = inject(NgxAngoraService);

  // Theme state using signals (MANDATORY Angular 17+ features)
  private readonly _currentTheme = signal<ThemeMode>('light');
  private readonly _systemPreference = signal<'light' | 'dark'>('light');

  // Computed theme based on current selection and system preference
  readonly activeTheme = computed(() => {
    const theme: ThemeMode = this._currentTheme();
    if (theme === 'auto') {
      return this._systemPreference();
    }
    return theme;
  });

  // Theme configurations using ThemeConfig type
  private readonly _lightThemeConfig: ThemeConfig = {
    name: 'light',
    isDark: false,
    colors: {
      bgColor: '#f0ede7ff',
      textColor: '#3e3d3dff',
      titleColor: '#292929ff',
      linkColor: '#fFf619',
      accentColor: '#c5aa25ff',
      secondaryBgColor: '#e5d2bfff',
      secondaryTextColor: '#19363F',
      secondaryTitleColor: '#163038ff',
      secondaryLinkColor: '#F36391',
      secondaryAccentColor: '#199F96',
    },
  };

  private readonly _darkThemeConfig: ThemeConfig = {
    name: 'dark',
    isDark: true,
    colors: {
      bgColor: '#1a1a1a',
      textColor: '#ffffff',
      titleColor: '#d8dadbff',
      linkColor: '#66b3ff',
      accentColor: '#225783ff',
      secondaryBgColor: '#2d2d2d',
      secondaryTextColor: '#d9dcdfff',
      secondaryTitleColor: '#6cc3e6ff',
      secondaryLinkColor: '#30a464ff',
      secondaryAccentColor: '#20673cff',
    },
  };

  constructor() {
    this._detectSystemPreference();
    this._loadSavedTheme();

    // MANDATORY: Apply theme using pushColors whenever theme changes
    effect(() => {
      console.log(`Applying theme: ${this.activeTheme()}`);
      this.applyTheme();
    });
  }

  // Public methods
  setTheme(theme: ThemeMode): void {
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
    return this.activeTheme() === 'dark' ? this._darkThemeConfig : this._lightThemeConfig;
  }

  // Private methods
  private _detectSystemPreference(): void {
    if (typeof window === 'undefined') return;

    const mediaQuery: MediaQueryList = window.matchMedia('(prefers-color-scheme: dark)');
    this._systemPreference.set(mediaQuery.matches ? 'dark' : 'light');

    const handleChange = (e: MediaQueryListEvent): void => {
      this._systemPreference.set(e.matches ? 'dark' : 'light');
    };

    mediaQuery.addEventListener('change', handleChange);
  }

  private _loadSavedTheme(): void {
    if (typeof localStorage === 'undefined') return;

    const storageKey: string = environment.localStorage.themeKey;
    const saved: string | null = localStorage.getItem(storageKey);
    const savedTheme = saved as ThemeMode;

    if (saved && ['light', 'dark', 'auto'].includes(saved)) {
      this._currentTheme.set(savedTheme);
    }
  }

  private _saveTheme(theme: ThemeMode): void {
    if (typeof localStorage === 'undefined') return;
    const storageKey: string = environment.localStorage.themeKey;
    localStorage.setItem(storageKey, theme);
  }

  // MANDATORY: All color changes must use pushColors method
  applyTheme(): void {
    if (typeof window === 'undefined') return; // Skip SSR
    const currentThemeConfig: ThemeConfig =
      this.activeTheme() === 'dark' ? this._darkThemeConfig : this._lightThemeConfig;
    const themeColors: ThemeColors = currentThemeConfig.colors;

    // Use ngx-angora-css pushColors for dynamic theme management
    this._ank.pushColors({
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
    });
    console.log('colors', this._ank.getColors());
  }
}
