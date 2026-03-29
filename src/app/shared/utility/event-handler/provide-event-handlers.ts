import type { Provider } from '@angular/core';
import { EVENT_HANDLERS } from './event-handlers.token';
import { scrollToSectionHandler, skipToMainHandler } from './handlers/accessibility.handlers';
import {
    navigationToSectionHandler,
    trackCtaClickHandler,
    trackFaqToggleHandler,
    trackNavClickHandler,
    trackProcessStepChangeHandler,
} from './handlers/analytics.handlers';
import {
    acceptConsentHandler,
    declineConsentHandler,
    remindLaterHandler,
    removeConsentRequestHandler,
} from './handlers/consent.handlers';
import { downloadDraftPayloadsHandler, writeDraftsToDiskHandler } from './handlers/debug-drafts.handlers';
import { resetScopeHandler, setScopeValueHandler, submitScopeHandler } from './handlers/interaction-scope.handlers';
import {
    closeModalHandler,
    openModalHandler,
} from './handlers/legal-modal.handlers';
import {
    clearAllToastsHandler,
    showActionToastHandler,
    showDemoToastHandler,
    showErrorToastHandler,
    showPositionDemoHandler,
} from './handlers/toast-demo.handlers';
import { navigateToUrlHandler, setLanguageHandler, toggleLanguageHandler, toggleThemeHandler } from './handlers/ui.handlers';
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
        { provide: EVENT_HANDLERS, multi: true, useFactory: trackFaqToggleHandler },
        { provide: EVENT_HANDLERS, multi: true, useFactory: trackProcessStepChangeHandler },
        { provide: EVENT_HANDLERS, multi: true, useFactory: openFaqCtaWhatsAppHandler },
        { provide: EVENT_HANDLERS, multi: true, useFactory: openFinalCtaWhatsAppHandler },

        // Migrated off ConfigurationsOrchestratorService (no host dependency)
        { provide: EVENT_HANDLERS, multi: true, useFactory: toggleThemeHandler },
        { provide: EVENT_HANDLERS, multi: true, useFactory: toggleLanguageHandler },
        { provide: EVENT_HANDLERS, multi: true, useFactory: setLanguageHandler },
        { provide: EVENT_HANDLERS, multi: true, useFactory: navigateToUrlHandler },
        { provide: EVENT_HANDLERS, multi: true, useFactory: setScopeValueHandler },
        { provide: EVENT_HANDLERS, multi: true, useFactory: resetScopeHandler },
        { provide: EVENT_HANDLERS, multi: true, useFactory: submitScopeHandler },
        { provide: EVENT_HANDLERS, multi: true, useFactory: openModalHandler },
        { provide: EVENT_HANDLERS, multi: true, useFactory: closeModalHandler },

        { provide: EVENT_HANDLERS, multi: true, useFactory: acceptConsentHandler },
        { provide: EVENT_HANDLERS, multi: true, useFactory: declineConsentHandler },
        { provide: EVENT_HANDLERS, multi: true, useFactory: remindLaterHandler },
        { provide: EVENT_HANDLERS, multi: true, useFactory: removeConsentRequestHandler },
        { provide: EVENT_HANDLERS, multi: true, useFactory: showDemoToastHandler },
        { provide: EVENT_HANDLERS, multi: true, useFactory: showErrorToastHandler },
        { provide: EVENT_HANDLERS, multi: true, useFactory: showActionToastHandler },
        { provide: EVENT_HANDLERS, multi: true, useFactory: showPositionDemoHandler },
        { provide: EVENT_HANDLERS, multi: true, useFactory: clearAllToastsHandler },
        { provide: EVENT_HANDLERS, multi: true, useFactory: downloadDraftPayloadsHandler },
        { provide: EVENT_HANDLERS, multi: true, useFactory: writeDraftsToDiskHandler },
        { provide: EVENT_HANDLERS, multi: true, useFactory: scrollToSectionHandler },
        { provide: EVENT_HANDLERS, multi: true, useFactory: skipToMainHandler },
    ];
};
