import { ConfigurationsOrchestratorService } from '@/app/shared/services/configurations-orchestrator';
import { TestBed } from '@angular/core/testing';
import type { EventExecutionContext } from '../event-handler.types';
import { downloadDraftPayloadsHandler, writeDraftsToDiskHandler } from './debug-drafts.handlers';

describe('debug draft event handlers', () => {
    let orchestrator: jasmine.SpyObj<ConfigurationsOrchestratorService>;
    let context: EventExecutionContext;

    beforeEach(() => {
        orchestrator = jasmine.createSpyObj<ConfigurationsOrchestratorService>(
            'ConfigurationsOrchestratorService',
            ['downloadDraftPayloads', 'writeDraftPayloadsToDisk'],
        );
        orchestrator.writeDraftPayloadsToDisk.and.returnValue(Promise.resolve());

        TestBed.configureTestingModule({
            providers: [
                { provide: ConfigurationsOrchestratorService, useValue: orchestrator },
            ],
        });

        context = {
            event: {
                componentId: 'debugDownloadDraftPayloadsButton',
                eventName: 'pressed',
            },
            host: null,
        };
    });

    it('delegates downloadDraftPayloads to the orchestrator service', () => {
        const handler = TestBed.runInInjectionContext(() => downloadDraftPayloadsHandler());

        handler.handle(context, []);

        expect(orchestrator.downloadDraftPayloads).toHaveBeenCalledOnceWith();
    });

    it('delegates writeDraftPayloadsToDisk to the orchestrator service', () => {
        const handler = TestBed.runInInjectionContext(() => writeDraftsToDiskHandler());

        handler.handle(context, []);

        expect(orchestrator.writeDraftPayloadsToDisk).toHaveBeenCalledOnceWith();
    });
});
