import { InjectionToken } from '@angular/core';

export const DEFAULT_ALLOWED_EVENT_IDS = [
    'openWhatsApp',
    'trackCTAClick',
    'trackNavClick',
    'navigationToSection',
    'setInteractiveProcessStep',
    'trackFaqToggle',
    'openFaqCtaWhatsApp',
    'openFinalCtaWhatsApp',
    'toggleTheme',
    'toggleLanguage',
    'setLanguage',
    'setScopeValue',
    'resetScope',
    'submitScope',
    'openFooterTerms',
    'openFooterData',
    // [MODALS-8]
    'closeModal',
    'showDemoModal',
    'acceptConsent',
    'declineConsent',
    'remindLater',
    'removeConsentRequest',
    // Dev-only toast demos
    'showDemoToast',
    'showErrorToast',
    'showActionToast',
    'showPositionDemo',
    'clearAllToasts',
    'downloadDraftPayloads',
    'writeDraftsToDisk',
    // Accessibility
    'skipToMain',
    'scrollToSection',
] as const;

/**
 * Global allowlist for EventOrchestrator action IDs.
 *
 * This is a policy decision (what is allowed to execute), not a handler registry.
 */
export const ALLOWED_EVENT_IDS = new InjectionToken<readonly string[]>('ALLOWED_EVENT_IDS', {
    providedIn: 'root',
    factory: () => DEFAULT_ALLOWED_EVENT_IDS,
});
