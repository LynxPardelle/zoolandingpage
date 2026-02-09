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

/** Pick between (enValue, esValue) based on current language. */
export const langPickValueHandler = (): ValueHandler => {
    const language = inject(LanguageService);

    return {
        id: 'langPick',
        resolve: (_ctx, args) => {
            const lang = language.currentLanguage();
            const enValue = args?.[0];
            const esValue = args?.[1];
            if (lang === 'es') return esValue ?? enValue ?? '';
            return enValue ?? esValue ?? '';
        },
    };
};
