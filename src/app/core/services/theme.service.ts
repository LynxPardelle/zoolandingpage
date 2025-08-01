/**
 * Theme Service
 *
 * Manages dynamic theme switching using ngx-angora-css pushColors method.
 * REQUIRED: All theme changes must use pushColors (NO hardcoded colors)
 */

import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { NgxAngoraService } from 'ngx-angora-css';
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
      primary: '#0d6efd',
      secondary: '#6c757d',
      success: '#198754',
      info: '#0dcaf0',
      warning: '#ffc107',
      danger: '#dc3545',
      light: '#f8f9fa',
      dark: '#212529',
      accent: '#6f42c1',
    },
  };

  private readonly _darkThemeConfig: ThemeConfig = {
    name: 'dark',
    isDark: true,
    colors: {
      primary: '#4dabf7',
      secondary: '#adb5bd',
      success: '#51cf66',
      info: '#22b8cf',
      warning: '#ffd43b',
      danger: '#ff6b6b',
      light: '#212529',
      dark: '#f8f9fa',
      accent: '#9775fa',
    },
  };

  constructor() {
    this._detectSystemPreference();
    this._loadSavedTheme();

    // MANDATORY: Apply theme using pushColors whenever theme changes
    effect(() => {
      this._applyTheme();
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
  private _applyTheme(): void {
    if (typeof window === 'undefined') return; // Skip SSR
    const currentThemeConfig: ThemeConfig =
      this.activeTheme() === 'dark' ? this._darkThemeConfig : this._lightThemeConfig;
    const themeColors: ThemeColors = currentThemeConfig.colors;
    // Use ngx-angora-css pushColors for dynamic theme management
    this._ank.pushColors({
      primary: themeColors.primary,
      secondary: themeColors.secondary,
      accent: themeColors.success,
      background: themeColors.info,
      surface: themeColors.warning,
      text: themeColors.danger,
      'text-secondary': themeColors.light,
      border: themeColors.dark,
      shadow: themeColors.accent,
    });
    // Update colors using Object.keys to iterate through theme colors
    Object.keys(themeColors).forEach(key => {
      const colorKey = key === 'textSecondary' ? 'text-secondary' : key;
      this._ank.updateColor(colorKey, themeColors[key as keyof ThemeColors]);
    });

    // Generate CSS with new colors
    this._ank.cssCreate();
  }
}
