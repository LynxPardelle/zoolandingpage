import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Injector, OnInit, computed, effect, forwardRef, inject, input } from '@angular/core';
import { ConfigurationsOrchestratorService } from '../../services/configurations-orchestrator';
import { WrapperOrchestrator } from '../wrapper-orchestrator/wrapper-orchestrator.component';
import { InteractionScopeService, type TInteractionScopeHost } from './interaction-scope.service';
import type { TInteractionScopeConfig, TInteractionScopeTag } from './interaction-scope.types';

@Component({
    selector: 'interaction-scope',
    standalone: true,
    imports: [CommonModule, forwardRef(() => WrapperOrchestrator)],
    templateUrl: './interaction-scope.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [InteractionScopeService],
})
export class InteractionScopeComponent implements OnInit {
    readonly config = input.required<TInteractionScopeConfig>();
    readonly parentHost = input<unknown>();
    readonly componentId = input<string>('');
    readonly metaTitle = input<string | undefined>(undefined);

    private readonly scope = inject(InteractionScopeService);
    private readonly configurationsOrchestrator = inject(ConfigurationsOrchestratorService);
    private readonly injector = inject(Injector);

    ngOnInit(): void {
        effect(() => {
            this.scope.configure(this.config());
        }, { injector: this.injector });
    }

    readonly tag = computed<TInteractionScopeTag>(() => {
        const resolved = this.resolveMaybeThunk(this.config().tag);
        return (resolved as TInteractionScopeTag) ?? 'div';
    });

    readonly id = computed<string | undefined>(() => {
        const resolved = this.resolveMaybeThunk(this.config().id);
        return resolved ? String(resolved) : undefined;
    });

    readonly classes = computed<string>(() => {
        const resolved = this.resolveMaybeThunk(this.config().classes);
        return typeof resolved === 'string' ? resolved : String(resolved ?? '');
    });

    readonly role = computed<string | undefined>(() => {
        const resolved = this.resolveMaybeThunk(this.config().role);
        return resolved ? String(resolved) : undefined;
    });

    readonly ariaLabel = computed<string | undefined>(() => {
        const resolved = this.resolveMaybeThunk(this.config().ariaLabel);
        return resolved ? String(resolved) : undefined;
    });

    readonly components = computed<readonly string[]>(() =>
        (this.config().components ?? [])
            .filter((entry): entry is string => typeof entry === 'string')
            .map((entry) => entry.trim())
            .filter(Boolean)
    );

    readonly hostContext = computed<TInteractionScopeHost>(() => {
        return {
            scopeId: this.scope.scopeId(),
            interactionScope: this.scope,
            parentHost: this.parentHost(),
            submitInteractionScope: () => this.submitScope(),
            resetInteractionScope: () => this.scope.reset(),
        };
    });

    onSubmit(event: Event): void {
        event.preventDefault();
        event.stopPropagation();
        this.submitScope();
    }

    private submitScope() {
        const snapshot = this.scope.submit();
        const instructions = String(this.config().submitEventInstructions ?? '').trim();
        if (instructions.length > 0) {
            this.configurationsOrchestrator.handleComponentEvent(
                {
                    componentId: this.componentId() || this.scope.scopeId() || 'interaction-scope',
                    meta_title: this.metaTitle(),
                    eventName: 'submitScope',
                    eventData: snapshot,
                    eventInstructions: instructions,
                },
                this.hostContext(),
            );
        }
        return snapshot;
    }

    private resolveMaybeThunk(value: unknown): unknown {
        if (typeof value === 'function' && (value as (...args: unknown[]) => unknown).length === 0) {
            return (value as () => unknown)();
        }
        return value;
    }
}
