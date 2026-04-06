import { normalizeLocaleCode } from '@/app/shared/i18n/locale.utils';
import { AnalyticsCategories, AnalyticsEvents } from '@/app/shared/services/analytics.events';
import { AnalyticsService } from '@/app/shared/services/analytics.service';
import { DRAFT_RUNTIME_STICKY_QUERY_PARAMS } from '@/app/shared/services/draft-runtime.service';
import { LanguageService } from '@/app/shared/services/language.service';
import { ThemeService } from '@/app/shared/services/theme.service';
import type { SupportedLanguage } from '@/app/shared/types/navigation.types';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { resolveNavigationTarget } from '../../navigation/navigation-target.utility';
import type { EventHandler } from '../event-handler.types';

const resolveLanguageArg = (value: unknown): SupportedLanguage | null => {
    const next = normalizeLocaleCode(value);
    return next || null;
};

export const toggleThemeHandler = (): EventHandler => {
    const theme = inject(ThemeService);
    const analytics = inject(AnalyticsService);

    return {
        id: 'toggleTheme',
        handle: () => {
            const before = theme.currentTheme();
            theme.toggleTheme();
            const after = theme.currentTheme();

            void analytics.track(AnalyticsEvents.ThemeToggle, {
                category: AnalyticsCategories.Theme,
                label: `${ before }->${ after }`,
                meta: { before, after, type: 'theme', action: 'toggle' },
            });
        },
    };
};

export const toggleLanguageHandler = (): EventHandler => {
    const language = inject(LanguageService);
    const analytics = inject(AnalyticsService);

    return {
        id: 'toggleLanguage',
        handle: () => {
            const before = language.currentLanguage();
            language.toggleLanguage();
            const after = language.currentLanguage();

            void analytics.track(AnalyticsEvents.LanguageToggle, {
                category: AnalyticsCategories.I18N,
                label: `${ before }->${ after }`,
                meta: { before, after, type: 'language', action: 'toggle' },
            });
        },
    };
};

export const setLanguageHandler = (): EventHandler => {
    const language = inject(LanguageService);
    const analytics = inject(AnalyticsService);

    return {
        id: 'setLanguage',
        handle: (_ctx, args) => {
            const requested = resolveLanguageArg(args?.[0]);
            if (!requested) return;
            if (!language.getAvailableLanguages().includes(requested)) return;

            const before = language.currentLanguage();
            if (before === requested) return;

            language.setLanguage(requested);
            const after = language.currentLanguage();

            void analytics.track(AnalyticsEvents.LanguageToggle, {
                category: AnalyticsCategories.I18N,
                label: `${ before }->${ after }`,
                meta: { before, after, type: 'language', action: 'set' },
            });
        },
    };
};

export const navigateToUrlHandler = (): EventHandler => {
    const router = inject(Router);

    return {
        id: 'navigateToUrl',
        handle: (_ctx, args) => {
            const resolved = resolveNavigationTarget(String(args?.[0] ?? ''), {
                stickyQueryParams: DRAFT_RUNTIME_STICKY_QUERY_PARAMS,
            });
            const href = resolved.href;
            const target = String(args?.[1] ?? '_self').trim() || '_self';

            if (!href || typeof window === 'undefined') return;

            if (target === '_blank' && !resolved.internal) {
                window.open(href, '_blank', 'noopener,noreferrer');
                return;
            }

            if (!resolved.internal && /^[a-z][a-z0-9+.-]*:/i.test(href)) {
                window.location.assign(href);
                return;
            }

            void router.navigateByUrl(href).catch(() => window.location.assign(href));
        },
    };
};
