import { InjectionToken } from '@angular/core';

export const DEFAULT_ALLOWED_VALUE_IDS = [
    'i18n',
    'i18nGetIndex',
    'i18nParams',
    'literal',
    'concat',
    'coalesce',
    'upper',
    'lower',
    'language',
    'langPick',
    'theme',
    'themePick',
    'env',
    'envOr',
    'var',
    'varOr',
] as const;

/**
 * Global allowlist for ValueOrchestrator resolver IDs.
 * This is a policy decision (what is allowed to resolve), not a handler registry.
 */
export const ALLOWED_VALUE_IDS = new InjectionToken<readonly string[]>('ALLOWED_VALUE_IDS', {
    providedIn: 'root',
    factory: () => DEFAULT_ALLOWED_VALUE_IDS,
});
