import type { Provider } from '@angular/core';
import { EVENT_HANDLERS } from './event-handlers.token';
import { scrollToSectionHandler, skipToMainHandler } from './handlers/accessibility.handlers';
import {
    navigationToSectionHandler,
    trackCtaClickHandler,
    trackFaqToggleHandler,
    trackNavClickHandler,
} from './handlers/analytics.handlers';
import {
    acceptConsentHandler,
    declineConsentHandler,
    remindLaterHandler,
    removeConsentRequestHandler,
} from './handlers/consent.handlers';
import { showDemoModalHandler } from './handlers/demo-modal.handlers';
import { setInteractiveProcessStepHandler } from './handlers/interactive-process.handlers';
import {
    closeModalHandler,
    openFooterDataHandler,
    openFooterTermsHandler,
} from './handlers/legal-modal.handlers';
import {
    clearAllToastsHandler,
    showActionToastHandler,
    showDemoToastHandler,
    showErrorToastHandler,
    showPositionDemoHandler,
} from './handlers/toast-demo.handlers';
import { setLanguageHandler, toggleLanguageHandler, toggleThemeHandler } from './handlers/ui.handlers';
import {
    openFaqCtaWhatsAppHandler,
    openFinalCtaWhatsAppHandler,
    openWhatsAppHandler,
} from './handlers/whatsapp.handlers';

export const provideEventHandlers = (): Provider[] => {
    // NOTE: Each handler id maps 1:1 with the DSL action token used in `eventInstructions`.
    return [
        { provide: EVENT_HANDLERS, multi: true, useFactory: openWhatsAppHandler },
        { provide: EVENT_HANDLERS, multi: true, useFactory: trackCtaClickHandler },
        { provide: EVENT_HANDLERS, multi: true, useFactory: trackNavClickHandler },
        { provide: EVENT_HANDLERS, multi: true, useFactory: navigationToSectionHandler },
        { provide: EVENT_HANDLERS, multi: true, useFactory: setInteractiveProcessStepHandler },
        { provide: EVENT_HANDLERS, multi: true, useFactory: trackFaqToggleHandler },
        { provide: EVENT_HANDLERS, multi: true, useFactory: openFaqCtaWhatsAppHandler },
        { provide: EVENT_HANDLERS, multi: true, useFactory: openFinalCtaWhatsAppHandler },

        // Migrated off ConfigurationsOrchestratorService (no host dependency)
        { provide: EVENT_HANDLERS, multi: true, useFactory: toggleThemeHandler },
        { provide: EVENT_HANDLERS, multi: true, useFactory: toggleLanguageHandler },
        { provide: EVENT_HANDLERS, multi: true, useFactory: setLanguageHandler },
        { provide: EVENT_HANDLERS, multi: true, useFactory: openFooterTermsHandler },
        { provide: EVENT_HANDLERS, multi: true, useFactory: openFooterDataHandler },
        { provide: EVENT_HANDLERS, multi: true, useFactory: closeModalHandler },

        { provide: EVENT_HANDLERS, multi: true, useFactory: showDemoModalHandler },
        { provide: EVENT_HANDLERS, multi: true, useFactory: acceptConsentHandler },
        { provide: EVENT_HANDLERS, multi: true, useFactory: declineConsentHandler },
        { provide: EVENT_HANDLERS, multi: true, useFactory: remindLaterHandler },
        { provide: EVENT_HANDLERS, multi: true, useFactory: removeConsentRequestHandler },
        { provide: EVENT_HANDLERS, multi: true, useFactory: showDemoToastHandler },
        { provide: EVENT_HANDLERS, multi: true, useFactory: showErrorToastHandler },
        { provide: EVENT_HANDLERS, multi: true, useFactory: showActionToastHandler },
        { provide: EVENT_HANDLERS, multi: true, useFactory: showPositionDemoHandler },
        { provide: EVENT_HANDLERS, multi: true, useFactory: clearAllToastsHandler },
        { provide: EVENT_HANDLERS, multi: true, useFactory: scrollToSectionHandler },
        { provide: EVENT_HANDLERS, multi: true, useFactory: skipToMainHandler },
    ];
};
