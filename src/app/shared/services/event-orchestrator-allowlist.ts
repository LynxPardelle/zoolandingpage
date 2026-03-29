import { InjectionToken } from '@angular/core';

export const DEFAULT_ALLOWED_EVENT_IDS = [
    'openModal',
    'openWhatsApp',
    'trackCTAClick',
    'trackNavClick',
    'navigationToSection',
    'trackFaqToggle',
    'trackProcessStepChange',
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
