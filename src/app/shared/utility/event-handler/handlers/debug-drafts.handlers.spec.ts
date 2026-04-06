import { ConfigurationsOrchestratorService } from '@/app/shared/services/configurations-orchestrator';
import { TestBed } from '@angular/core/testing';
import type { EventExecutionContext } from '../event-handler.types';
import {
    downloadDraftPayloadsHandler,
    refreshDebugDraftRegistryHandler,
    selectDebugDraftHandler,
    toggleDebugDiagnosticsPanelHandler,
    toggleDebugDraftPanelHandler,
    writeDraftsToDiskHandler,
} from './debug-drafts.handlers';

describe('debug draft event handlers', () => {
    let orchestrator: jasmine.SpyObj<ConfigurationsOrchestratorService>;
    let context: EventExecutionContext;
    const host = {
        selectDebugDraft: jasmine.createSpy('selectDebugDraft'),
        refreshDebugDraftRegistry: jasmine.createSpy('refreshDebugDraftRegistry'),
        toggleDebugDraftPanel: jasmine.createSpy('toggleDebugDraftPanel'),
        toggleDebugDiagnosticsPanel: jasmine.createSpy('toggleDebugDiagnosticsPanel'),
    };

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
            host,
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

    it('delegates debug workspace host actions to the host component', () => {
        const selectHandler = TestBed.runInInjectionContext(() => selectDebugDraftHandler());
        const refreshHandler = TestBed.runInInjectionContext(() => refreshDebugDraftRegistryHandler());
        const toggleDraftHandler = TestBed.runInInjectionContext(() => toggleDebugDraftPanelHandler());
        const toggleDiagnosticsHandler = TestBed.runInInjectionContext(() => toggleDebugDiagnosticsPanelHandler());

        selectHandler.handle(context, ['preview.example.test::default']);
        refreshHandler.handle(context, []);
        toggleDraftHandler.handle(context, []);
        toggleDiagnosticsHandler.handle(context, []);

        expect(host.selectDebugDraft).toHaveBeenCalledOnceWith('preview.example.test::default');
        expect(host.refreshDebugDraftRegistry).toHaveBeenCalledOnceWith();
        expect(host.toggleDebugDraftPanel).toHaveBeenCalledOnceWith();
        expect(host.toggleDebugDiagnosticsPanel).toHaveBeenCalledOnceWith();
    });
});
