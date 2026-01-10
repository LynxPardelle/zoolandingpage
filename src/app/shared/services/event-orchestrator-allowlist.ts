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
    // Accessibility
    'skipToMain',
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
