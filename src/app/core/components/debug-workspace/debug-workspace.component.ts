import { RuntimeService } from '@/app/core/services/runtime.service';
import { WrapperOrchestrator } from '@/app/shared/components/wrapper-orchestrator/wrapper-orchestrator.component';
import { AnalyticsService } from '@/app/shared/services/analytics.service';
import { ConfigStoreService } from '@/app/shared/services/config-store.service';
import { DraftRuntimeService } from '@/app/shared/services/draft-runtime.service';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';

const DRAFT_BUTTON_BASE_CLASSES = 'ank-display-inlineFlex ank-alignItems-center ank-justifyContent-center ank-gap-6px ank-minHeight-40px ank-px-12px ank-py-8px ank-borderRadius-12px ank-border-1px ank-fontSize-12px ank-fontWeight-700 ank-lineHeight-1_3 ank-transition-all ank-td-200ms';

const resolveDraftButtonClasses = (entryKey: string, selectedDraftKey: string): string => {
    if (selectedDraftKey === entryKey) {
        return `${ DRAFT_BUTTON_BASE_CLASSES } ank-bg-accentColor ank-color-bgColor ank-borderColor-accentColor ank-boxShadow-0__6px__18px__rgbaSD0COM123COM255COM0_22ED`;
    }

    return `${ DRAFT_BUTTON_BASE_CLASSES } ank-bg-transparent ank-color-textColor ank-borderColor-textColorOPA__0_2 ank-bgHover-textColorOPA__0_08`;
};

@Component({
    selector: 'debug-workspace',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [WrapperOrchestrator],
    template: '<wrapper-orchestrator [componentsIds]="runtime.debugWorkspaceRootIds()" [hostContext]="hostContext"></wrapper-orchestrator>',
})
export class DebugWorkspaceComponent {
    private readonly destroyRef = inject(DestroyRef);
    private readonly analytics = inject(AnalyticsService);
    private readonly configStore = inject(ConfigStoreService);
    readonly draftRuntime = inject(DraftRuntimeService);
    readonly runtime = inject(RuntimeService);
    readonly hostContext = this;
    private readonly recentEventsSignal = signal<readonly string[]>([]);
    private readonly draftPanelCollapsedSignal = signal(true);
    private readonly diagnosticsPanelCollapsedSignal = signal(true);

    constructor() {
        this.initDebugOverlay();
        this.draftRuntime.initRegistryAutoRefresh(this.destroyRef);
    }

    get draftPanelCollapsed(): boolean {
        return this.draftPanelCollapsedSignal();
    }

    get diagnosticsPanelCollapsed(): boolean {
        return this.diagnosticsPanelCollapsedSignal();
    }

    get draftOptions(): readonly Record<string, unknown>[] {
        const selectedDraftKey = this.draftRuntime.selectedDraftKey();
        return this.draftRuntime.draftOptions().map((entry) => ({
            ...entry,
            buttonClasses: resolveDraftButtonClasses(entry.key, selectedDraftKey),
            ariaLabel: `Open draft ${ entry.label }`,
        }));
    }

    get activeDraftLabel(): string {
        return this.draftRuntime.activeDraftLabel();
    }

    get draftRegistryLoading(): boolean {
        return this.draftRuntime.draftRegistryLoading();
    }

    get draftOptionsEyebrow(): string {
        const count = this.draftOptions.length;
        return `${ count } draft${ count === 1 ? '' : 's' } detected`;
    }

    get draftOptionsReadyLabel(): string {
        const count = this.draftOptions.length;
        return `${ count } option${ count === 1 ? '' : 's' } ready`;
    }

    get draftRegistryStatusLabel(): string {
        return this.draftRegistryLoading
            ? 'Refreshing draft registry...'
            : 'The list auto-refreshes while debug mode is enabled.';
    }

    get configIssues(): readonly string[] {
        return this.configStore.validationIssues();
    }

    get recentEvents(): readonly string[] {
        return this.recentEventsSignal();
    }

    get recentEventsEyebrow(): string {
        const count = this.recentEvents.length;
        return `${ count } recent event${ count === 1 ? '' : 's' }`;
    }

    get recentEventsBadge(): string {
        const count = this.recentEvents.length;
        return `${ count } event${ count === 1 ? '' : 's' }`;
    }

    get configIssuesBadge(): string {
        const count = this.configIssues.length;
        return `${ count } issue${ count === 1 ? '' : 's' }`;
    }

    toggleDebugDraftPanel(): void {
        this.draftPanelCollapsedSignal.update((collapsed) => !collapsed);
    }

    toggleDebugDiagnosticsPanel(): void {
        this.diagnosticsPanelCollapsedSignal.update((collapsed) => !collapsed);
    }

    selectDebugDraft(key: string): void {
        this.draftRuntime.selectDraftByKey(key);
    }

    refreshDebugDraftRegistry(): void {
        this.draftRuntime.refreshRegistry();
    }

    private initDebugOverlay(): void {
        try {
            const subscription = this.analytics.onEvent().subscribe((evt) => {
                const next = [
                    `${ evt.name } | ${ evt.category || '' } | ${ evt.label || '' }`,
                ].concat(this.recentEventsSignal());
                this.recentEventsSignal.set(next.slice(0, 10));
            });
            this.destroyRef.onDestroy(() => subscription.unsubscribe());
        } catch {
            // ignore overlay errors
        }
    }
}
