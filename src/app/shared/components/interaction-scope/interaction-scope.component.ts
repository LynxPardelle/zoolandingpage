import {
  ChangeDetectionStrategy,
  Component,
  Injector,
  OnInit,
  computed,
  effect,
  forwardRef,
  inject,
  input,
  untracked,
} from '@angular/core';
import { ConfigurationsOrchestratorService } from '../../services/configurations-orchestrator';
import {
  resolveComponentRootDomId,
  resolveDynamicValue,
  resolveTextValue,
} from '../../utility/component-orchestrator.utility';
import { WrapperOrchestrator } from '../wrapper-orchestrator/wrapper-orchestrator.component';
import {
  InteractionScopeService,
  type TInteractionScopeAutoSubmitSource,
  type TInteractionScopeHost,
} from './interaction-scope.service';
import type {
  TInteractionScopeAutoSubmitConfig,
  TInteractionScopeConfig,
  TInteractionScopeTag,
} from './interaction-scope.types';

const normalizeComponentIds = (
  components: TInteractionScopeConfig['components']
): readonly string[] =>
  (components ?? [])
    .filter((entry): entry is string => typeof entry === 'string')
    .map((entry) => entry.trim())
    .filter(Boolean);

const resolveScopeTag = (
  value: TInteractionScopeConfig['tag']
): TInteractionScopeTag => {
  const resolved = resolveDynamicValue(value);
  return resolved === 'div' || resolved === 'section' || resolved === 'form'
    ? resolved
    : 'div';
};

@Component({
  selector: 'interaction-scope',
  standalone: true,
  imports: [forwardRef(() => WrapperOrchestrator)],
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
  private readonly configurationsOrchestrator = inject(
    ConfigurationsOrchestratorService
  );
  private readonly injector = inject(Injector);

  ngOnInit(): void {
    effect(
      () => {
        untracked(() => this.scope.configure(this.config()));
      },
      { injector: this.injector }
    );
  }

  readonly tag = computed<TInteractionScopeTag>(() =>
    resolveScopeTag(this.config().tag)
  );

  readonly id = computed<string | undefined>(() =>
    resolveComponentRootDomId(
      this.config().id,
      this.componentId(),
      'interaction-scope'
    )
  );

  readonly classes = computed<string>(
    () => resolveTextValue(this.config().classes) ?? ''
  );

  readonly role = computed<string | undefined>(() =>
    resolveTextValue(this.config().role)
  );

  readonly ariaLabel = computed<string | undefined>(() =>
    resolveTextValue(this.config().ariaLabel)
  );

  readonly components = computed<readonly string[]>(() =>
    normalizeComponentIds(this.config().components)
  );

  readonly hostContext = computed<TInteractionScopeHost>(() => {
    return {
      scopeId: this.scope.scopeId(),
      interactionScope: this.scope,
      parentHost: this.parentHost(),
      submitInteractionScope: () => this.submitScope(),
      resetInteractionScope: () => this.scope.reset(),
      autoSubmitInteractionScope: (source) => this.autoSubmitScope(source),
    };
  });

  onSubmit(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.submitScope(event);
  }

  private submitScope(event?: Event) {
    const snapshot = this.scope.submit();
    const instructions = String(
      this.config().submitEventInstructions ?? ''
    ).trim();
    if (instructions.length > 0) {
      this.configurationsOrchestrator.handleComponentEvent(
        {
          componentId:
            this.componentId() || this.scope.scopeId() || 'interaction-scope',
          meta_title: this.metaTitle(),
          eventName: 'submitScope',
          eventData: snapshot,
          eventInstructions: instructions,
          ...(event?.isTrusted === true ? { userGesture: true } : {}),
        },
        this.hostContext()
      );
    }
    return snapshot;
  }

  private autoSubmitScope(source: TInteractionScopeAutoSubmitSource): void {
    if (!this.shouldAutoSubmit(source)) {
      return;
    }

    this.submitScope();
  }

  private shouldAutoSubmit(source: TInteractionScopeAutoSubmitSource): boolean {
    const autoSubmit = this.config().autoSubmit;
    if (autoSubmit == null) {
      return false;
    }

    const config = this.resolveAutoSubmitConfig(autoSubmit);
    if (!this.isAutoSubmitEnabled(config)) {
      return false;
    }

    const eventNames = this.normalizeStringList(config.eventNames);
    const allowedEvents = eventNames.length > 0 ? eventNames : ['valueChanged'];
    if (!allowedEvents.includes(source.eventName)) {
      return false;
    }

    const fieldIds = this.normalizeStringList(config.fieldIds);
    if (fieldIds.length === 0) {
      return true;
    }

    const fieldId = this.resolveEventFieldId(source.eventData);
    return fieldId ? fieldIds.includes(fieldId) : false;
  }

  private resolveAutoSubmitConfig(
    value: TInteractionScopeConfig['autoSubmit']
  ): Required<Pick<TInteractionScopeAutoSubmitConfig, 'enabled'>> &
    Pick<
      TInteractionScopeAutoSubmitConfig,
      'enabledFieldId' | 'enabledPath' | 'eventNames' | 'fieldIds'
    > {
    if (typeof value === 'boolean' || typeof value === 'function') {
      return {
        enabled: Boolean(resolveDynamicValue(value)),
      };
    }

    const enabled =
      value?.enabled === undefined
        ? false
        : Boolean(resolveDynamicValue(value.enabled));

    return {
      enabled,
      enabledFieldId: value?.enabledFieldId,
      enabledPath: value?.enabledPath,
      eventNames: value?.eventNames,
      fieldIds: value?.fieldIds,
    };
  }

  private isAutoSubmitEnabled(
    config: Required<Pick<TInteractionScopeAutoSubmitConfig, 'enabled'>> &
      Pick<TInteractionScopeAutoSubmitConfig, 'enabledFieldId' | 'enabledPath'>
  ): boolean {
    if (!this.coerceBoolean(config.enabled)) {
      return false;
    }

    const enabledPath = this.resolveAutoSubmitEnabledPath(config);
    if (!enabledPath) {
      return true;
    }

    return this.coerceBoolean(this.scope.resolvePath(enabledPath));
  }

  private resolveAutoSubmitEnabledPath(
    config: Pick<
      TInteractionScopeAutoSubmitConfig,
      'enabledFieldId' | 'enabledPath'
    >
  ): string {
    const explicitPath = String(config.enabledPath ?? '').trim();
    if (explicitPath) return explicitPath;

    const fieldId = String(config.enabledFieldId ?? '').trim();
    return fieldId ? `values.${fieldId}` : '';
  }

  private coerceBoolean(value: unknown): boolean {
    const resolved = resolveDynamicValue(value as never);
    if (typeof resolved === 'boolean') return resolved;
    if (typeof resolved === 'number') return resolved !== 0;
    const normalized = String(resolved ?? '')
      .trim()
      .toLowerCase();
    if (!normalized) return false;
    if (['false', '0', 'off', 'no', 'null', 'undefined'].includes(normalized))
      return false;
    if (['true', '1', 'on', 'yes'].includes(normalized)) return true;
    return Boolean(resolved);
  }

  private normalizeStringList(value: unknown): string[] {
    return Array.isArray(value)
      ? value.map((entry) => String(entry ?? '').trim()).filter(Boolean)
      : [];
  }

  private resolveEventFieldId(eventData: unknown): string | undefined {
    if (
      !eventData ||
      typeof eventData !== 'object' ||
      Array.isArray(eventData)
    ) {
      return undefined;
    }

    const fieldId = (eventData as Record<string, unknown>)['fieldId'];
    return typeof fieldId === 'string' && fieldId.trim().length > 0
      ? fieldId.trim()
      : undefined;
  }
}
