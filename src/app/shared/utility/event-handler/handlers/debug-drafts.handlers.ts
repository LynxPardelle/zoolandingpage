import { ConfigurationsOrchestratorService } from '@/app/shared/services/configurations-orchestrator';
import { inject, Injector } from '@angular/core';
import type { EventHandler } from '../event-handler.types';

export const downloadDraftPayloadsHandler = (): EventHandler => {
    const injector = inject(Injector);

    return {
        id: 'downloadDraftPayloads',
        handle: () => {
            injector.get(ConfigurationsOrchestratorService).downloadDraftPayloads();
        },
    };
};

export const writeDraftsToDiskHandler = (): EventHandler => {
    const injector = inject(Injector);

    return {
        id: 'writeDraftsToDisk',
        handle: () => {
            void injector.get(ConfigurationsOrchestratorService).writeDraftPayloadsToDisk();
        },
    };
};
