/**
 * Language Service - Foundation Component Support with ngx-translate
 * 
 * Manages language switching between Spanish and English using ngx-translate.
 * Uses Angular signals for reactive state management.
 */

import { Injectable, signal, computed, inject } from '@angular/core';
// TODO: Install @ngx-translate/core package
// import { TranslateService } from '@ngx-translate/core';
import { SupportedLanguage } from '../types/navigation.types';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class LanguageService {
  // TODO: Inject TranslateService once package is installed
  // private readonly translateService = inject(TranslateService);
  
  // Language state using signals (MANDATORY Angular 17+ features)
  private readonly _currentLanguage = signal<SupportedLanguage>('es');
  private readonly _availableLanguages = signal<readonly SupportedLanguage[]>(['es', 'en'] as const);
  
  // Public readonly signals
  readonly currentLanguage = computed(() => this._currentLanguage());
  readonly availableLanguages = this._availableLanguages.asReadonly();
  
  // Computed properties with proper typing
  readonly languageLabel = computed(() => {
    const current: SupportedLanguage = this._currentLanguage();
    const labels: Record<SupportedLanguage, string> = {
      'es': 'ES',
      'en': 'EN'
    };
    return labels[current];
  });
  
  readonly nextLanguage = computed(() => {
    const current: SupportedLanguage = this._currentLanguage();
    return current === 'es' ? 'en' : 'es';
  });
  
  constructor() {
    this._loadSavedLanguage();
    // TODO: Initialize TranslateService when available
    // this._initializeTranslateService();
  }
  
  // Public methods
  setLanguage(language: SupportedLanguage): void {
    if (this._availableLanguages().includes(language)) {
      this._currentLanguage.set(language);
      this._saveLanguage(language);
      // TODO: Update TranslateService when available
      // this.translateService.use(language);
    }
  }
  
  toggleLanguage(): void {
    const nextLang: SupportedLanguage = this.nextLanguage();
    this.setLanguage(nextLang);
  }
  
  getCurrentLanguage(): SupportedLanguage {
    return this._currentLanguage();
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
    if (typeof localStorage === 'undefined') return;
    
    const storageKey: string = environment.localStorage.languageKey;
    const saved: string | null = localStorage.getItem(storageKey);
    const savedLanguage = saved as SupportedLanguage;
    
    if (saved && this._availableLanguages().includes(savedLanguage)) {
      this._currentLanguage.set(savedLanguage);
    } else {
      // Detect browser language
      const browserLang: string = this._detectBrowserLanguage();
      const detectedLang = browserLang as SupportedLanguage;
      
      if (this._availableLanguages().includes(detectedLang)) {
        this._currentLanguage.set(detectedLang);
      }
    }
  }
  
  private _saveLanguage(language: SupportedLanguage): void {
    if (typeof localStorage === 'undefined') return;
    const storageKey: string = environment.localStorage.languageKey;
    localStorage.setItem(storageKey, language);
  }
  
  private _detectBrowserLanguage(): string {
    if (typeof navigator === 'undefined') return 'es';
    
    const browserLang: string | undefined = navigator.language?.split('-')[0];
    return browserLang || 'es';
  }
  
  // TODO: Initialize TranslateService when available
  // private _initializeTranslateService(): void {
  //   this.translateService.addLangs(this._availableLanguages());
  //   this.translateService.setDefaultLang('es');
  //   this.translateService.use(this._currentLanguage());
  // }
}
