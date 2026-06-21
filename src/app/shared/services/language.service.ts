/**
 * Manages runtime language switching for the locales declared by the active payload.
 */

import { isPlatformBrowser } from '@angular/common';
import { computed, inject, Injectable, PLATFORM_ID, REQUEST, signal } from '@angular/core';
import { formatLocaleLabel, normalizeLocaleCode, resolveBestLocaleMatch } from '../i18n/locale.utils';
import { SupportedLanguage } from '../types/navigation.types';
import { DomainResolverService } from './domain-resolver.service';

const FRAMEWORK_DEFAULT_LANGUAGE = 'en';
const LANGUAGE_QUERY_PARAM = 'lang';
const LANGUAGE_COOKIE_NAME = 'zlp_lang';
const LANGUAGE_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

@Injectable({
  providedIn: 'root'
})
export class LanguageService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly request = inject(REQUEST, { optional: true });
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private readonly domainResolver = inject(DomainResolverService);

  private readonly _currentLanguage = signal<SupportedLanguage>(FRAMEWORK_DEFAULT_LANGUAGE);
  private readonly _defaultLanguage = signal<SupportedLanguage>(FRAMEWORK_DEFAULT_LANGUAGE);
  private readonly _availableLanguages = signal<readonly SupportedLanguage[]>([FRAMEWORK_DEFAULT_LANGUAGE]);

  // Public readonly signals
  readonly currentLanguage = computed(() => this._currentLanguage());
  readonly availableLanguages = this._availableLanguages.asReadonly();
  readonly hasMultipleLanguages = computed(() => this._availableLanguages().length > 1);

  // Computed properties with proper typing
  readonly languageLabel = computed(() => formatLocaleLabel(this._currentLanguage()));

  readonly nextLanguage = computed(() => {
    const available = this._availableLanguages();
    const current = this._currentLanguage();
    if (available.length <= 1) return current;

    const currentIndex = available.findIndex((lang) => lang === current);
    if (currentIndex < 0) return available[0];

    return available[(currentIndex + 1) % available.length];
  });

  constructor() {
    this._loadSavedLanguage();
  }

  // Public methods
  configureLanguages(
    languages: readonly string[],
    opts?: { defaultLanguage?: string; requestedLanguage?: string }
  ): void {
    const normalized = this.normalizeLanguages(languages);
    const fallback = this.normalizeSingleLanguage(opts?.defaultLanguage)
      ?? normalized[0]
      ?? FRAMEWORK_DEFAULT_LANGUAGE;

    const nextAvailable = normalized.length > 0 ? normalized : [fallback];
    this._availableLanguages.set(nextAvailable);
    this._defaultLanguage.set(nextAvailable.includes(fallback) ? fallback : nextAvailable[0]);

    const requested = this.normalizeSingleLanguage(opts?.requestedLanguage);
    const preferred = requested
      ?? this.getSavedLanguage()
      ?? this._detectBrowserLanguage()
      ?? this._defaultLanguage();

    const resolved = this.resolvePreferredLanguage(preferred);
    this._currentLanguage.set(resolved);
    this._saveLanguage(resolved);
  }

  setLanguage(language: SupportedLanguage): void {
    const resolved = this.resolvePreferredLanguage(language);
    this._currentLanguage.set(resolved);
    this._saveLanguage(resolved);
    this.syncUrlLanguage(resolved);
  }

  toggleLanguage(): void {
    const nextLang: SupportedLanguage = this.nextLanguage();
    this.setLanguage(nextLang);
  }

  getCurrentLanguage(): SupportedLanguage {
    return this._currentLanguage();
  }

  getAvailableLanguages(): readonly SupportedLanguage[] {
    return this._availableLanguages();
  }

  getRequestedLanguagePreference(): SupportedLanguage | null {
    return this.getSavedLanguage() ?? this._detectBrowserLanguage();
  }

  private _loadSavedLanguage(): void {
    const preferred = this.getSavedLanguage() ?? this._detectBrowserLanguage() ?? this._defaultLanguage();
    const normalized = this.normalizeSingleLanguage(preferred);
    if (!normalized) {
      this._currentLanguage.set(this._defaultLanguage());
      return;
    }

    this._currentLanguage.set(normalized);
    if (!this._availableLanguages().includes(normalized)) {
      this._availableLanguages.set([normalized]);
    }
  }

  private _saveLanguage(language: SupportedLanguage): void {
    if (typeof localStorage !== 'undefined') {
      const storageKey = this.storageKey();
      localStorage.setItem(storageKey, language);
    }

    this.writeCookieLanguage(language);
  }

  private getSavedLanguage(): SupportedLanguage | null {
    return this.getUrlLanguage()
      ?? this.getCookieLanguage()
      ?? this.getLocalStorageLanguage();
  }

  private getLocalStorageLanguage(): SupportedLanguage | null {
    if (typeof localStorage === 'undefined') return null;
    const storageKey = this.storageKey();
    return this.normalizeSingleLanguage(localStorage.getItem(storageKey));
  }

  private _detectBrowserLanguage(): SupportedLanguage | null {
    if (!this.isBrowser || typeof navigator === 'undefined') return null;
    return this.normalizeSingleLanguage(navigator.language);
  }

  private normalizeLanguages(languages: readonly string[]): readonly SupportedLanguage[] {
    const seen = new Set<string>();
    const normalized: SupportedLanguage[] = [];

    for (const language of languages) {
      const next = this.normalizeSingleLanguage(language);
      if (!next || seen.has(next)) continue;
      seen.add(next);
      normalized.push(next);
    }

    return normalized;
  }

  private normalizeSingleLanguage(language: unknown): SupportedLanguage | null {
    const normalized = normalizeLocaleCode(language);
    return normalized ? normalized : null;
  }

  private resolvePreferredLanguage(language: unknown): SupportedLanguage {
    const available = this._availableLanguages();
    const match = resolveBestLocaleMatch(language, available);
    return match ?? this._defaultLanguage() ?? available[0] ?? FRAMEWORK_DEFAULT_LANGUAGE;
  }

  private storageKey(): string {
    return this.domainResolver.resolveStorageKey('language');
  }

  private parseRequestUrl(): URL | null {
    const requestUrl = String(this.request?.url ?? '').trim();
    if (!requestUrl) {
      return null;
    }

    try {
      return new URL(requestUrl, 'http://localhost');
    } catch {
      return null;
    }
  }

  private parseCurrentBrowserUrl(): URL | null {
    if (!this.isBrowser || typeof window === 'undefined' || !window.location?.href) {
      return null;
    }

    try {
      return new URL(window.location.href);
    } catch {
      return null;
    }
  }

  private getUrlLanguage(): SupportedLanguage | null {
    const browserUrl = this.parseCurrentBrowserUrl();
    if (browserUrl) {
      return this.normalizeSingleLanguage(browserUrl.searchParams.get(LANGUAGE_QUERY_PARAM));
    }

    return this.normalizeSingleLanguage(this.parseRequestUrl()?.searchParams.get(LANGUAGE_QUERY_PARAM));
  }

  private getCookieHeader(): string {
    if (this.isBrowser && typeof document !== 'undefined') {
      return String(document.cookie ?? '');
    }

    const headers = (this.request as { headers?: unknown } | null | undefined)?.headers;
    if (!headers) {
      return '';
    }

    if (typeof (headers as Headers).get === 'function') {
      return String((headers as Headers).get('cookie') ?? '');
    }

    const cookie = (headers as Record<string, unknown>)['cookie'];
    if (Array.isArray(cookie)) {
      return cookie.map((entry) => String(entry)).join('; ');
    }

    return String(cookie ?? '');
  }

  private getCookieLanguage(): SupportedLanguage | null {
    const cookies = this.getCookieHeader()
      .split(';')
      .map((entry) => entry.trim())
      .filter(Boolean);

    for (const cookie of cookies) {
      const separator = cookie.indexOf('=');
      const key = separator >= 0 ? cookie.slice(0, separator).trim() : cookie;
      if (key !== LANGUAGE_COOKIE_NAME) {
        continue;
      }

      const rawValue = separator >= 0 ? cookie.slice(separator + 1).trim() : '';
      try {
        return this.normalizeSingleLanguage(decodeURIComponent(rawValue));
      } catch {
        return this.normalizeSingleLanguage(rawValue);
      }
    }

    return null;
  }

  private writeCookieLanguage(language: SupportedLanguage): void {
    if (!this.isBrowser || typeof document === 'undefined') {
      return;
    }

    const secure = window.location?.protocol === 'https:' ? '; Secure' : '';
    document.cookie = [
      `${ LANGUAGE_COOKIE_NAME }=${ encodeURIComponent(language) }`,
      'Path=/',
      `Max-Age=${ LANGUAGE_COOKIE_MAX_AGE_SECONDS }`,
      'SameSite=Lax',
    ].join('; ') + secure;
  }

  private syncUrlLanguage(language: SupportedLanguage): void {
    if (!this.isBrowser || typeof window === 'undefined' || !window.history?.replaceState) {
      return;
    }

    try {
      const url = this.parseCurrentBrowserUrl();
      if (!url) {
        return;
      }

      if (url.searchParams.get(LANGUAGE_QUERY_PARAM) === language) {
        return;
      }

      url.searchParams.set(LANGUAGE_QUERY_PARAM, language);
      window.history.replaceState(window.history.state, '', `${ url.pathname }${ url.search }${ url.hash }`);
    } catch {
      // URL persistence is best-effort; the signal and local storage still hold the selected language.
    }
  }
}
