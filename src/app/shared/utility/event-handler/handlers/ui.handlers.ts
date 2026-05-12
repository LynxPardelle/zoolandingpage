import { normalizeLocaleCode } from '@/app/shared/i18n/locale.utils';
import { AnalyticsCategories, AnalyticsEvents } from '@/app/shared/services/analytics.events';
import { AnalyticsService } from '@/app/shared/services/analytics.service';
import { DRAFT_RUNTIME_STICKY_QUERY_PARAMS } from '@/app/shared/services/draft-runtime.service';
import { LanguageService } from '@/app/shared/services/language.service';
import { ThemeService } from '@/app/shared/services/theme.service';
import type { SupportedLanguage } from '@/app/shared/types/navigation.types';
import type { TDraftNavigationScrollRestorationConfig } from '@/app/shared/types/config-payloads.types';
import { inject } from '@angular/core';
import { navigateInCurrentWindow } from '../../navigation/browser-navigation.utility';
import { resolveNavigationTarget } from '../../navigation/navigation-target.utility';
import type { EventHandler } from '../event-handler.types';

const isRecord = (value: unknown): value is Record<string, unknown> =>
    !!value && typeof value === 'object' && !Array.isArray(value);

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
    return {
        id: 'navigateToUrl',
        handle: (_ctx, args) => {
            const resolved = resolveNavigationTarget(String(args?.[0] ?? ''), {
                stickyQueryParams: DRAFT_RUNTIME_STICKY_QUERY_PARAMS,
            });
            const href = resolved.href;
            const target = String(args?.[1] ?? '_self').trim() || '_self';
            const scrollRestoration = resolveNavigationScrollRestoration(args?.[2]);

            if (!href || typeof window === 'undefined') return;

            if (target === '_blank' && !resolved.internal) {
                window.open(href, '_blank', 'noopener,noreferrer');
                return;
            }

            if (!resolved.internal && /^[a-z][a-z0-9+.-]*:/i.test(href)) {
                window.location.assign(href);
                return;
            }

            navigateInCurrentWindow(href, { scrollRestoration });
        },
    };
};

function resolveNavigationScrollRestoration(value: unknown): TDraftNavigationScrollRestorationConfig | undefined {
    const mode = String(value ?? '').trim();
    if (mode === 'top') {
        return { mode: 'top' };
    }
    if (mode === 'preserve') {
        return { mode: 'preserve' };
    }
    return undefined;
}

export const navigateWithScopeQueryHandler = (): EventHandler => ({
    id: 'navigateWithScopeQuery',
    handle: (ctx, args) => {
        if (typeof window === 'undefined') return;

        const rawBase = String(args?.[0] ?? window.location.pathname ?? '/').trim() || '/';
        const rawFragment = String(args?.[1] ?? '').trim();
        const currentUrl = new URL(window.location.href);
        const targetUrl = new URL(rawBase, currentUrl.origin);
        const params = new URLSearchParams(targetUrl.search);

        DRAFT_RUNTIME_STICKY_QUERY_PARAMS.forEach((key) => {
            const currentValue = currentUrl.searchParams.get(key);
            if (currentValue != null && !params.has(key)) {
                params.set(key, currentValue);
            }
        });

        args.slice(2).forEach((mappingArg) => {
            const mapping = String(mappingArg ?? '').trim();
            const equalsIndex = mapping.indexOf('=');
            if (equalsIndex <= 0) return;

            const key = mapping.slice(0, equalsIndex).trim();
            const source = mapping.slice(equalsIndex + 1).trim();
            if (!key || !source) return;

            const value = resolveScopeQueryMappingValue(ctx.event.eventData, source);
            const normalizedValue = normalizeQueryValue(value);
            if (shouldOmitQueryValue(normalizedValue)) {
                params.delete(key);
                return;
            }

            params.set(key, normalizedValue);
        });

        const search = params.toString();
        const fragment = normalizeFragment(rawFragment || targetUrl.hash);
        navigateInCurrentWindow(`${ targetUrl.pathname }${ search ? `?${ search }` : '' }${ fragment }`);
    },
});

function resolveScopeQueryMappingValue(eventData: unknown, source: string): unknown {
    if (!source.startsWith('values.')
        && !source.startsWith('fields.')
        && !source.startsWith('computed.')
        && !source.startsWith('meta.')
    ) {
        return source;
    }

    return source
        .split('.')
        .filter(Boolean)
        .reduce<unknown>((current, segment) => {
            if (!isRecord(current)) return undefined;
            return current[segment];
        }, eventData);
}

function normalizeQueryValue(value: unknown): string {
    return String(value ?? '').trim();
}

function shouldOmitQueryValue(value: string): boolean {
    if (!value) return true;
    const lower = value.toLowerCase();
    return lower === 'all' || lower === 'undefined' || lower === 'null';
}

function normalizeFragment(value: string): string {
    const normalized = value.trim();
    if (!normalized) return '';
    return normalized.startsWith('#') ? normalized : `#${ normalized }`;
}
