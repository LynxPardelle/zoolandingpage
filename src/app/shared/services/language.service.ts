/**
 * Language Service - Foundation Component Support with ngx-translate
 *
 * Manages runtime language switching for the supported draft locales.
 * Uses Angular signals for reactive state management.
 */

import { isPlatformBrowser } from '@angular/common';
import { computed, inject, Injectable, PLATFORM_ID, REQUEST, signal } from '@angular/core';
// TODO: Install @ngx-translate/core package
// import { TranslateService } from '@ngx-translate/core';
import { environment } from '../../../environments/environment';
import { formatLocaleLabel, normalizeLocaleCode, resolveBestLocaleMatch } from '../i18n/locale.utils';
import { SupportedLanguage } from '../types/navigation.types';

const DEFAULT_LANGUAGES = ['es', 'en'] as const;
const DEFAULT_LANGUAGE = 'es';

@Injectable({
  providedIn: 'root'
})
export class LanguageService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly request = inject(REQUEST, { optional: true });
  private readonly isBrowser = isPlatformBrowser(this.platformId) && !this.request;
  // TODO: Inject TranslateService once package is installed
  // private readonly translateService = inject(TranslateService);

  // Language state using signals (MANDATORY Angular 17+ features)
  private readonly _currentLanguage = signal<SupportedLanguage>(DEFAULT_LANGUAGE);
  private readonly _defaultLanguage = signal<SupportedLanguage>(DEFAULT_LANGUAGE);
  private readonly _availableLanguages = signal<readonly SupportedLanguage[]>([...DEFAULT_LANGUAGES]);

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
    // TODO: Initialize TranslateService when available
    // this._initializeTranslateService();
  }

  // Public methods
  configureLanguages(
    languages: readonly string[],
    opts?: { defaultLanguage?: string; requestedLanguage?: string }
  ): void {
    const normalized = this.normalizeLanguages(languages);
    const fallback = this.normalizeSingleLanguage(opts?.defaultLanguage)
      ?? normalized[0]
      ?? DEFAULT_LANGUAGE;

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
    // TODO: Update TranslateService when available
    // this.translateService.use(resolved);
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

  // TODO: Implement when ngx-translate is available
  // translate(key: string, params?: Record<string, any>): Observable<string> {
  //   return this.translateService.get(key, params);
  // }

  // TODO: Implement when ngx-translate is available
  // instant(key: string, params?: Record<string, any>): string {
  //   return this.translateService.instant(key, params);
  // }

  // Private methods
  private _loadSavedLanguage(): void {
    const preferred = this.getSavedLanguage() ?? this._detectBrowserLanguage() ?? this._defaultLanguage();
    this._currentLanguage.set(this.resolvePreferredLanguage(preferred));
  }

  private _saveLanguage(language: SupportedLanguage): void {
    if (typeof localStorage === 'undefined') return;
    const storageKey: string = environment.localStorage.languageKey;
    localStorage.setItem(storageKey, language);
  }

  private getSavedLanguage(): SupportedLanguage | null {
    if (typeof localStorage === 'undefined') return null;
    const storageKey: string = environment.localStorage.languageKey;
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
    return match ?? this._defaultLanguage() ?? available[0] ?? DEFAULT_LANGUAGE;
  }

  // TODO: Initialize TranslateService when available
  // private _initializeTranslateService(): void {
  //   this.translateService.addLangs(this._availableLanguages());
  //   this.translateService.setDefaultLang('es');
  //   this.translateService.use(this._currentLanguage());
  // }
}
