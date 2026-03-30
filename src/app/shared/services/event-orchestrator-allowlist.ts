import { InjectionToken } from '@angular/core';

const BASE_ALLOWED_EVENT_IDS = [
    'openModal',
    'openWhatsApp',
    'trackEvent',
    'trackEventWhen',
    'trackNumericSuffixEvent',
    'navigationToSection',
    'openFaqCtaWhatsApp',
    'openFinalCtaWhatsApp',
    'toggleTheme',
    'toggleLanguage',
    'setLanguage',
    'navigateToUrl',
    'setScopeValue',
    'resetScope',
    'submitScope',
    // [MODALS-8]
    'closeModal',
    'acceptConsent',
    'declineConsent',
    'remindLater',
    'removeConsentRequest',
    // Accessibility
    'skipToMain',
    'scrollToSection',
] as const;

const DEBUG_ALLOWED_EVENT_IDS = [
    // Dev-only toast demos
    'showDemoToast',
    'showErrorToast',
    'showActionToast',
    'showPositionDemo',
    'clearAllToasts',
    'downloadDraftPayloads',
    'writeDraftsToDisk',
    'selectDebugDraft',
    'refreshDebugDraftRegistry',
    'toggleDebugDraftPanel',
    'toggleDebugDiagnosticsPanel',
] as const;

export const DEFAULT_ALLOWED_EVENT_IDS: readonly string[] = [
    ...BASE_ALLOWED_EVENT_IDS,
    ...DEBUG_ALLOWED_EVENT_IDS,
];

/**
 * Global allowlist for EventOrchestrator action IDs.
 *
 * This is a policy decision (what is allowed to execute), not a handler registry.
 */
export const ALLOWED_EVENT_IDS = new InjectionToken<readonly string[]>('ALLOWED_EVENT_IDS', {
    providedIn: 'root',
    factory: () => DEFAULT_ALLOWED_EVENT_IDS,
});
