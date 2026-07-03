import { LanguageService } from '@/app/shared/services/language.service';
import { inject } from '@angular/core';
import type { ValueHandler } from '../value-handler.types';

const DATE_STYLES = new Set(['full', 'long', 'medium', 'short']);

export const formatDateValueHandler = (): ValueHandler => {
    const language = inject(LanguageService);

    return {
        id: 'formatDate',
        resolve: (_ctx, args) => {
            const rawValue = args?.[0];
            const fallback = String(args?.[1] ?? '').trim();
            const style = String(args?.[2] ?? 'long').trim();

            if (rawValue == null || String(rawValue).trim().length === 0) {
                return fallback;
            }

            const date = new Date(String(rawValue));
            if (Number.isNaN(date.getTime())) {
                return fallback;
            }

            const dateStyle = DATE_STYLES.has(style) ? style as Intl.DateTimeFormatOptions['dateStyle'] : 'long';
            try {
                return new Intl.DateTimeFormat(language.getCurrentLanguage(), { dateStyle }).format(date);
            } catch {
                return fallback;
            }
        },
    };
};
