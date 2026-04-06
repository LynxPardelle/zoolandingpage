import { Component, Input, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { RuntimeService } from '../../../core/services/runtime.service';
import { WrapperOrchestrator } from '../../../shared/components/wrapper-orchestrator/wrapper-orchestrator.component';
import { AnalyticsService } from '../../../shared/services/analytics.service';
import { ConfigStoreService } from '../../../shared/services/config-store.service';
import { DraftRuntimeService } from '../../../shared/services/draft-runtime.service';
import { DebugWorkspaceComponent } from './debug-workspace.component';

@Component({
    selector: 'wrapper-orchestrator',
    standalone: true,
    template: '',
})
class WrapperOrchestratorStub {
    @Input() componentsIds: readonly unknown[] = [];
    @Input() hostContext: unknown;
}

const PRIMARY_DOMAIN = 'preview.example.test';
const SECONDARY_DOMAIN = 'music.example.test';
const LEGAL_DOMAIN = 'legal.example.test';

describe('DebugWorkspaceComponent', () => {
    let analyticsEvents$: Subject<any>;
    let selectDraftByKey: jasmine.Spy;
    let refreshRegistry: jasmine.Spy;
    const debugWorkspaceRootIds = signal<readonly string[]>(['debugWorkspaceRoot']);

    beforeEach(async () => {
        analyticsEvents$ = new Subject();
        selectDraftByKey = jasmine.createSpy('selectDraftByKey');
        refreshRegistry = jasmine.createSpy('refreshRegistry');

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
                    provide: ConfigStoreService,
                    useValue: {
                        validationIssues: () => [],
                    },
                },
                {
                    provide: DraftRuntimeService,
                    useValue: {
                        draftOptions: () => [
                            { domain: PRIMARY_DOMAIN, pageId: 'default', key: `${ PRIMARY_DOMAIN }::default`, label: `${ PRIMARY_DOMAIN } / default` },
                            { domain: SECONDARY_DOMAIN, pageId: 'default', key: `${ SECONDARY_DOMAIN }::default`, label: `${ SECONDARY_DOMAIN } / default` },
                            { domain: LEGAL_DOMAIN, pageId: 'default', key: `${ LEGAL_DOMAIN }::default`, label: `${ LEGAL_DOMAIN } / default` },
                        ],
                        activeDraftLabel: () => `${ PRIMARY_DOMAIN } / default`,
                        draftRegistryLoading: () => false,
                        selectedDraftKey: () => `${ PRIMARY_DOMAIN }::default`,
                        selectDraftByKey,
                        refreshRegistry,
                        initRegistryAutoRefresh: () => undefined,
                    },
                },
                {
                    provide: RuntimeService,
                    useValue: {
                        debugWorkspaceRootIds,
                    },
                },
            ],
        }).compileComponents();

        TestBed.overrideComponent(DebugWorkspaceComponent, {
            remove: { imports: [WrapperOrchestrator] },
            add: { imports: [WrapperOrchestratorStub] },
        });
    });

    it('exposes derived host state for the payload-driven debug panel', () => {
        const fixture = TestBed.createComponent(DebugWorkspaceComponent);
        fixture.detectChanges();
        const component = fixture.componentInstance;

        expect(component.draftPanelCollapsed).toBeTrue();
        expect(component.diagnosticsPanelCollapsed).toBeTrue();
        expect(component.draftOptionsEyebrow).toBe('3 drafts detected');
        expect(component.draftOptionsReadyLabel).toBe('3 options ready');
        expect(component.draftOptions[0]['buttonClasses']).toEqual(jasmine.stringContaining('ank-bg-accentColor'));
        expect(component.draftOptions[1]['buttonClasses']).toEqual(jasmine.stringContaining('ank-bg-transparent'));
    });

    it('delegates debug workspace actions to the draft runtime and local panel state', () => {
        const fixture = TestBed.createComponent(DebugWorkspaceComponent);
        fixture.detectChanges();
        const component = fixture.componentInstance;

        component.toggleDebugDraftPanel();
        component.toggleDebugDiagnosticsPanel();
        component.selectDebugDraft(`${ SECONDARY_DOMAIN }::default`);
        component.refreshDebugDraftRegistry();

        expect(component.draftPanelCollapsed).toBeFalse();
        expect(component.diagnosticsPanelCollapsed).toBeFalse();
        expect(selectDraftByKey).toHaveBeenCalledOnceWith(`${ SECONDARY_DOMAIN }::default`);
        expect(refreshRegistry).toHaveBeenCalledOnceWith();
    });

    it('passes runtime-owned roots and itself as hostContext to the wrapper', () => {
        const fixture = TestBed.createComponent(DebugWorkspaceComponent);
        fixture.detectChanges();
        const wrapper = fixture.debugElement.children[0].componentInstance as WrapperOrchestratorStub;

        expect(wrapper.componentsIds).toEqual(['debugWorkspaceRoot']);
        expect(wrapper.hostContext).toBe(fixture.componentInstance);
    });

    it('captures recent analytics events for the diagnostics panel', () => {
        const fixture = TestBed.createComponent(DebugWorkspaceComponent);
        fixture.detectChanges();

        analyticsEvents$.next({ name: 'page_view', category: 'navigation', label: '/home' });

        expect(fixture.componentInstance.recentEvents).toEqual(['page_view | navigation | /home']);
    });
});
