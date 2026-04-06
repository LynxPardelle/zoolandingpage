/**
 * Manages runtime language switching for the locales declared by the active payload.
 */

import { isPlatformBrowser } from '@angular/common';
import { computed, inject, Injectable, PLATFORM_ID, REQUEST, signal } from '@angular/core';
import { formatLocaleLabel, normalizeLocaleCode, resolveBestLocaleMatch } from '../i18n/locale.utils';
import { SupportedLanguage } from '../types/navigation.types';
import { DomainResolverService } from './domain-resolver.service';

const FRAMEWORK_DEFAULT_LANGUAGE = 'en';

@Injectable({
  providedIn: 'root'
})
export class LanguageService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly request = inject(REQUEST, { optional: true });
  private readonly isBrowser = isPlatformBrowser(this.platformId) && !this.request;
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

  private _loadSavedLanguage(): void {
    const preferred = this.getSavedLanguage() ?? this._detectBrowserLanguage() ?? this._defaultLanguage();
    this._currentLanguage.set(this.resolvePreferredLanguage(preferred));
  }

  private _saveLanguage(language: SupportedLanguage): void {
    if (typeof localStorage === 'undefined') return;
    const storageKey = this.storageKey();
    localStorage.setItem(storageKey, language);
  }

  private getSavedLanguage(): SupportedLanguage | null {
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
}
