import { resolveLocaleMapValue } from '@/app/shared/i18n/locale.utils';
import { LanguageService } from '@/app/shared/services/language.service';
import { inject } from '@angular/core';
import type { ValueHandler } from '../value-handler.types';

export const languageValueHandler = (): ValueHandler => {
    const language = inject(LanguageService);

    return {
        id: 'language',
        resolve: () => language.currentLanguage(),
    };
};

/**
 * Pick a localized value based on current language.
 *
 * Supported forms:
 * - Legacy two-argument mode: (enValue, esValue)
 * - Locale map mode: ({ 'pt-BR': 'Ola', pt: 'Ola', en: 'Hello', default: 'Hello' }, fallback?)
 */
export const langPickValueHandler = (): ValueHandler => {
    const language = inject(LanguageService);

    return {
        id: 'langPick',
        resolve: (_ctx, args) => {
            const lang = language.currentLanguage();
            const localeMapValue = resolveLocaleMapValue(args?.[0], lang);
            if (localeMapValue !== undefined) return localeMapValue;

            const enValue = args?.[0];
            const esValue = args?.[1];
            if (lang === 'es') return esValue ?? enValue ?? '';
            return enValue ?? esValue ?? '';
        },
    };
};
