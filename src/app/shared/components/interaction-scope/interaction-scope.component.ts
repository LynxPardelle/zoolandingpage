import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Injector, OnInit, computed, effect, forwardRef, inject, input } from '@angular/core';
import { ConfigurationsOrchestratorService } from '../../services/configurations-orchestrator';
import { resolveDynamicValue, resolveTextValue } from '../../utility/component-orchestrator.utility';
import { WrapperOrchestrator } from '../wrapper-orchestrator/wrapper-orchestrator.component';
import { InteractionScopeService, type TInteractionScopeHost } from './interaction-scope.service';
import type { TInteractionScopeConfig, TInteractionScopeTag } from './interaction-scope.types';

const normalizeComponentIds = (components: TInteractionScopeConfig['components']): readonly string[] =>
    (components ?? [])
        .filter((entry): entry is string => typeof entry === 'string')
        .map((entry) => entry.trim())
        .filter(Boolean);

const resolveScopeTag = (value: TInteractionScopeConfig['tag']): TInteractionScopeTag => {
    const resolved = resolveDynamicValue(value);
    return resolved === 'div' || resolved === 'section' || resolved === 'form' ? resolved : 'div';
};

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

    readonly tag = computed<TInteractionScopeTag>(() => resolveScopeTag(this.config().tag));

    readonly id = computed<string | undefined>(() => resolveTextValue(this.config().id));

    readonly classes = computed<string>(() => resolveTextValue(this.config().classes) ?? '');

    readonly role = computed<string | undefined>(() => resolveTextValue(this.config().role));

    readonly ariaLabel = computed<string | undefined>(() => resolveTextValue(this.config().ariaLabel));

    readonly components = computed<readonly string[]>(() => normalizeComponentIds(this.config().components));

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
}
