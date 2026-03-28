import { WrapperOrchestrator } from '@/app/shared/components/wrapper-orchestrator/wrapper-orchestrator.component';
import { TGenericComponent } from '@/app/shared/components/wrapper-orchestrator/wrapper-orchestrator.types';
import { AnalyticsService } from '@/app/shared/services/analytics.service';
import { ConfigStoreService } from '@/app/shared/services/config-store.service';
import { ConfigurationsOrchestratorService } from '@/app/shared/services/configurations-orchestrator';
import { DraftRuntimeService } from '@/app/shared/services/draft-runtime.service';
import { GenericComponentBuilder } from '@/app/shared/utility/generic-component-builder.utility';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { buildDebugWorkspaceDiagnosticsPanel } from './debug-workspace-diagnostics-panel.builder';
import { buildDebugWorkspaceDraftPanel } from './debug-workspace-draft-panel.builder';

@Component({
    selector: 'debug-workspace',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [WrapperOrchestrator],
    template: '<wrapper-orchestrator [componentsIds]="debugWorkspaceComponents()"></wrapper-orchestrator>',
})
export class DebugWorkspaceComponent {
    private readonly debugWorkspaceRootId = 'debugWorkspaceRoot';
    private readonly debugDraftPanelId = 'debugDraftPanelRoot';
    private readonly debugDiagnosticsPanelId = 'debugDiagnosticsPanelRoot';
    private readonly destroyRef = inject(DestroyRef);
    private readonly analytics = inject(AnalyticsService);
    private readonly configStore = inject(ConfigStoreService);
    readonly orchestrator = inject(ConfigurationsOrchestratorService);
    readonly draftRuntime = inject(DraftRuntimeService);
    readonly recentEvents = signal<readonly string[]>([]);
    readonly draftPanelCollapsed = signal(true);
    readonly diagnosticsPanelCollapsed = signal(true);
    readonly configIssues = computed(() => this.configStore.validationIssues());
    readonly debugDraftPanelComponents = computed<readonly TGenericComponent[]>(() => {
        return [
            buildDebugWorkspaceDraftPanel({
                panelId: this.debugDraftPanelId,
                collapsed: this.draftPanelCollapsed(),
                draftOptions: this.draftRuntime.draftOptions(),
                activeDraftLabel: this.draftRuntime.activeDraftLabel(),
                draftRegistryLoading: this.draftRuntime.draftRegistryLoading(),
                selectedDraftKey: this.draftRuntime.selectedDraftKey(),
                onSelectDraft: (key) => this.draftRuntime.selectDraftByKey(key),
                onRefreshDrafts: () => this.draftRuntime.refreshRegistry(),
                onToggleCollapsed: () => this.draftPanelCollapsed.update((collapsed) => !collapsed),
            }),
        ];
    });
    readonly debugWorkspaceComponents = computed<readonly TGenericComponent[]>(() => {
        const children = [
            ...this.debugDraftPanelComponents(),
            ...this.orchestrator.devDemoControlsComponents,
            buildDebugWorkspaceDiagnosticsPanel({
                panelId: this.debugDiagnosticsPanelId,
                collapsed: this.diagnosticsPanelCollapsed(),
                configIssues: this.configIssues(),
                recentEvents: this.recentEvents(),
                onToggleCollapsed: () => this.diagnosticsPanelCollapsed.update((collapsed) => !collapsed),
            }),
        ];

        return [
            GenericComponentBuilder.container(
                this.debugWorkspaceRootId,
                'div',
                '',
                children,
            ),
        ];
    });

    constructor() {
        this.initDebugOverlay();
        this.draftRuntime.initRegistryAutoRefresh(this.destroyRef);
    }

    private initDebugOverlay(): void {
        try {
            const subscription = this.analytics.onEvent().subscribe((evt) => {
                const next = [
                    `${ evt.name } | ${ evt.category || '' } | ${ evt.label || '' }`,
                ].concat(this.recentEvents());
                this.recentEvents.set(next.slice(0, 10));
            });
            this.destroyRef.onDestroy(() => subscription.unsubscribe());
        } catch {
            // ignore overlay errors
        }
    }
}
