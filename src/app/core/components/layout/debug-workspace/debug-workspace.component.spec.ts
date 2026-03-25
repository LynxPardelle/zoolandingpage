import { Component, Input } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of, Subject } from 'rxjs';
import { WrapperOrchestrator } from '../../../../shared/components/wrapper-orchestrator/wrapper-orchestrator.component';
import { AnalyticsService } from '../../../../shared/services/analytics.service';
import { ConfigurationsOrchestratorService } from '../../../../shared/services/configurations-orchestrator';
import { DraftRegistryService } from '../../../../shared/services/draft-registry.service';
import { DebugWorkspaceComponent } from './debug-workspace.component';

@Component({
    selector: 'wrapper-orchestrator',
    standalone: true,
    template: '',
})
class WrapperOrchestratorStub {
    @Input() componentsIds: readonly unknown[] = [];
}

const ORCHESTRATOR_STUB = {
    devDemoControlsComponents: [] as string[],
};

describe('DebugWorkspaceComponent', () => {
    let analyticsEvents$: Subject<any>;

    beforeEach(async () => {
        analyticsEvents$ = new Subject();

        await TestBed.configureTestingModule({
            imports: [DebugWorkspaceComponent],
            providers: [
                {
                    provide: AnalyticsService,
                    useValue: {
                        onEvent: () => analyticsEvents$.asObservable(),
                    },
                },
                {
                    provide: DraftRegistryService,
                    useValue: {
                        listDrafts: () => of([
                            { domain: 'zoolandingpage.com.mx', pageId: 'default' },
                            { domain: 'music.lynxpardelle.com', pageId: 'default' },
                            { domain: 'despacholegalastralex.com', pageId: 'default' },
                        ]),
                    },
                },
                { provide: ConfigurationsOrchestratorService, useValue: ORCHESTRATOR_STUB },
            ],
        }).compileComponents();

        TestBed.overrideComponent(DebugWorkspaceComponent, {
            remove: { imports: [WrapperOrchestrator] },
            add: { imports: [WrapperOrchestratorStub] },
        });
    });

    it('starts with both debug panels collapsed', () => {
        const fixture = TestBed.createComponent(DebugWorkspaceComponent);
        fixture.detectChanges();
        const component = fixture.componentInstance;
        const panel = component.debugDraftPanelComponents()[0] as any;
        const children = panel.config.components as any[];
        const diagnosticsPanel = component.debugWorkspaceComponents()[0] as any;
        const workspaceChildren = diagnosticsPanel.config.components as any[];
        const diagnosticsRoot = workspaceChildren.find((entry) => entry.id === 'debugDiagnosticsPanelRoot');
        const diagnosticsChildren = diagnosticsRoot.config.components as any[];

        expect(panel.id).toBe('debugDraftPanelRoot');
        expect(component.draftPanelCollapsed()).toBeTrue();
        expect(component.diagnosticsPanelCollapsed()).toBeTrue();
        expect(children.some((entry) => entry.id === 'debugDraftPanelCollapsedSummary')).toBeTrue();
        expect(children.some((entry) => entry.id === 'debugDraftPanelDraftButtons')).toBeFalse();
        expect(diagnosticsChildren.some((entry) => entry.id === 'debugDiagnosticsPanelCollapsedSummary')).toBeTrue();
        expect(diagnosticsChildren.some((entry) => entry.id === 'debugAnalyticsEventsSection')).toBeFalse();
    });

    it('builds the debug draft panel with dynamic draft buttons when expanded', () => {
        const fixture = TestBed.createComponent(DebugWorkspaceComponent);
        fixture.detectChanges();
        const component = fixture.componentInstance;

        component.draftPanelCollapsed.set(false);
        fixture.detectChanges();

        const panel = component.debugDraftPanelComponents()[0] as any;
        const children = panel.config.components as any[];
        const draftButtonsContainer = children.find((entry) => entry.id === 'debugDraftPanelDraftButtons');
        const footerRow = children.find((entry) => entry.id === 'debugDraftPanelFooterRow');
        const draftButtons = draftButtonsContainer.config.components as any[];
        const refreshButton = (footerRow.config.components as any[]).find((entry) => entry.id === 'debugDraftRefreshButton');

        expect(panel.id).toBe('debugDraftPanelRoot');
        expect(draftButtons.map((entry) => entry.config.label)).toEqual([
            'despacholegalastralex.com / default',
            'music.lynxpardelle.com / default',
            'zoolandingpage.com.mx / default',
        ]);
        expect(refreshButton.config.icon).toBe('refresh');
    });

    it('wraps the debug UI into a single orchestrated root component', () => {
        const fixture = TestBed.createComponent(DebugWorkspaceComponent);
        fixture.detectChanges();

        const debugWorkspace = fixture.componentInstance.debugWorkspaceComponents()[0] as any;
        const children = debugWorkspace.config.components as any[];

        expect(debugWorkspace.id).toBe('debugWorkspaceRoot');
        expect(children.some((entry) => entry.id === 'debugDraftPanelRoot')).toBeTrue();
        expect(children.some((entry) => entry.id === 'debugDiagnosticsPanelRoot')).toBeTrue();
    });

    it('captures recent analytics events for the diagnostics panel', () => {
        const fixture = TestBed.createComponent(DebugWorkspaceComponent);
        fixture.detectChanges();

        analyticsEvents$.next({ name: 'page_view', category: 'navigation', label: '/home' });

        expect(fixture.componentInstance.recentEvents()).toEqual(['page_view | navigation | /home']);
    });
});
