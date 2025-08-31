import { Injectable, computed, inject } from '@angular/core';
import { LanguageService } from '../../../core/services/language.service';
import { getTranslations } from './i18n.constants';
import type { LandingPageTranslations, Language } from './i18n.types';

/**
 * Centralized internationalization service for landing page components
 * Provides reactive access to translations and language switching
 */
@Injectable({
    providedIn: 'root',
})
export class LandingPageI18nService {
    private readonly languageService = inject(LanguageService);

    /**
     * Current language reactive signal
     */
    readonly currentLanguage = this.languageService.currentLanguage;

    /**
     * Current translations based on selected language
     */
    readonly translations = computed<LandingPageTranslations>(() => {
        const lang = this.currentLanguage();
        return getTranslations(lang);
    });

    /**
     * Hero section translations
     */
    readonly hero = computed(() => this.translations().hero);

    /**
     * Features section header translations
     */
    readonly featuresSection = computed(() => this.translations().featuresSection);

    /**
     * Features section translations
     */
    readonly features = computed(() => this.translations().features);

    /**
     * Services section translations
     */
    readonly services = computed(() => this.translations().services);

    /**
     * Testimonials section translations
     */
    readonly testimonials = computed(() => this.translations().testimonials);

    /**
     * Process section header translations
     */
    readonly processSection = computed(() => this.translations().processSection);

    /**
     * Process section translations
     */
    readonly process = computed(() => this.translations().process);

    /**
     * FAQ section header translations
     */
    readonly faqSection = computed(() => this.translations().faqSection);

    /**
     * FAQ section translations
     */
    readonly faq = computed(() => this.translations().faq);

    /**
     * Conversion Note section translations
     */
    readonly conversionNote = computed(() => this.translations().conversionNote);

    /**
     * Calculator section translations
     */
    readonly calculator = computed(() => this.translations().calculator);

    /**
     * Stats strip section translations
     */
    readonly statsStrip = computed(() => this.translations().statsStrip);

    /**
     * Final CTA section translations
     */
    readonly finalCtaSection = computed(() => this.translations().finalCtaSection);

    /**
     * UI text translations
     */
    readonly ui = computed(() => this.translations().ui);

    /**
     * Switch language
     */
    setLanguage(language: Language): void {
        this.languageService.setLanguage(language);
    }

    /**
     * Get specific translation by section and key
     */
    getTranslation(section: keyof LandingPageTranslations, key?: string): any {
        const sectionTranslations = this.translations()[section];

        if (!key) {
            return sectionTranslations;
        }

        if (Array.isArray(sectionTranslations)) {
            return sectionTranslations;
        }

        if (typeof sectionTranslations === 'object' && sectionTranslations !== null) {
            return (sectionTranslations as any)[key];
        }

        return sectionTranslations;
    }
}
