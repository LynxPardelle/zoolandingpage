
import { CommonModule } from '@angular/common';
import { Component, computed, inject, input } from '@angular/core';
import { ConfigurationsOrchestratorService } from '../../services/configurations-orchestrator';
import { ValueOrchestrator } from '../../services/value-orchestrator';
import { GenericAccordionComponent } from '../generic-accordion';
import { GenericButtonComponent } from '../generic-button/generic-button.component';
import { GenericCardComponent } from '../generic-card';
import { GenericContainerComponent } from '../generic-container/generic-container';
import { GenericDropdown } from '../generic-dropdown';
import { GenericEmbedFrameComponent } from '../generic-embed-frame/generic-embed-frame.component';
import { GenericIconComponent } from '../generic-icon/generic-icon.component';
import { GenericInputComponent } from '../generic-input/generic-input.component';
import { GenericLink } from "../generic-link/generic-link";
import { GenericMedia } from "../generic-media/generic-media";
import { GenericSearchBoxComponent } from '../generic-search-box/generic-search-box.component';
import type { SearchBoxConfig } from '../generic-search-box/generic-search-box.types';
import { GenericStatsCounterComponent } from '../generic-stats-counter/generic-stats-counter.component';
import { normalizeStatsCounterConfig } from '../generic-stats-counter/generic-stats-counter.constants';
import type { TGenericStatsCounterConfig } from '../generic-stats-counter/generic-stats-counter.types';
import { GenericTabGroupComponent } from '../generic-tab-group/generic-tab-group.component';
import { GenericTextComponent } from '../generic-text/generic-text';
import { InteractionScopeComponent } from '../interaction-scope/interaction-scope.component';

import { ConditionOrchestrator } from '../../services/condition-orchestrator';
import { I18nService } from '../../services/i18n.service';
import { resolveDynamicValue } from '../../utility/component-orchestrator.utility';
import type { TGenericComponent } from './wrapper-orchestrator.types';

@Component({
  selector: 'wrapper-orchestrator',
  standalone: true,
  host: {
    style: 'display: contents;',
  },
  imports: [
    CommonModule,
    GenericAccordionComponent,
    GenericButtonComponent,
    GenericCardComponent,
    GenericContainerComponent,
    GenericDropdown,
    GenericEmbedFrameComponent,
    GenericIconComponent,
    GenericInputComponent,
    InteractionScopeComponent,
    GenericSearchBoxComponent,
    GenericTextComponent,
    GenericStatsCounterComponent,
    GenericLink,
    GenericMedia,
    GenericTabGroupComponent,
  ],
  templateUrl: './wrapper-orchestrator.component.html',
})
export class WrapperOrchestrator {
  private readonly _configurationsOrchestratorService = inject(ConfigurationsOrchestratorService);
  private readonly valueOrchestrator = inject(ValueOrchestrator);
  private readonly conditionOrchestrator = inject(ConditionOrchestrator);
  private readonly i18n = inject(I18nService);
  readonly componentsIds = input<readonly string[]>([]);
  readonly hostContext = input<unknown>();

  readonly effectiveHost = computed<unknown>(() => this.hostContext() ?? this._configurationsOrchestratorService);

  private shouldRender(component: TGenericComponent): boolean {
    const cond = component.condition;
    if (cond === undefined) return true;
    if (typeof cond === 'function') return !!cond();
    if (typeof cond === 'boolean') return cond;
    if (typeof cond === 'string') {
      return this.conditionOrchestrator.evaluate({ ...component, condition: cond }, { host: this.effectiveHost() });
    }
    return true;
  }

  readonly components = computed<TGenericComponent[]>(() => {
    this._configurationsOrchestratorService.componentsRevision();

    return this
      .componentsIds()
      .map((entry) => this._configurationsOrchestratorService.getComponentById(entry, this.effectiveHost()))
      .filter((c: TGenericComponent | undefined): c is TGenericComponent => c !== undefined)
      .map((c: TGenericComponent) => this.valueOrchestrator.apply(c, { host: this.effectiveHost() }))
      .filter((c: TGenericComponent) => this.shouldRender(c));
  });

  resolveValue(value: unknown): unknown {
    return resolveDynamicValue(value as never);
  }

  resolveSearchConfig(config: unknown): SearchBoxConfig | null {
    const resolved = this.resolveValue(config);
    if (!resolved || typeof resolved !== 'object') {
      return null;
    }

    return resolved as SearchBoxConfig;
  }

  resolveStatsCounterConfig(config: unknown): TGenericStatsCounterConfig {
    const base = this.resolveValue(config) as Record<string, unknown> | undefined;
    if (!base || typeof base !== 'object') {
      return normalizeStatsCounterConfig(undefined);
    }

    return normalizeStatsCounterConfig({
      target: this.resolveValue(base['target']),
      durationMs: this.resolveValue(base['durationMs']),
      startOnVisible: this.resolveValue(base['startOnVisible']),
      ariaLabel: this.resolveValue(base['ariaLabel']),
      min: this.resolveValue(base['min']),
      max: this.resolveValue(base['max']),
      formatMode: this.resolveValue(base['formatMode']),
      formatPrefix: this.resolveValue(base['formatPrefix']),
      formatSuffix: this.resolveValue(base['formatSuffix']),
    } as Partial<TGenericStatsCounterConfig>);
  }

  eventEmitted(event: { component: string; meta_title?: string; eventName: string; eventData?: unknown; eventInstructions?: string; }) {
    this._configurationsOrchestratorService.handleComponentEvent({
      componentId: event.component,
      meta_title: event.meta_title,
      eventName: event.eventName, eventData: event.eventData, eventInstructions: event.eventInstructions
    }, this.effectiveHost());
  }

  unknownComponentLabel(type: unknown): string {
    return `${ this.i18n.t('ui.debugPanel.unknownComponentPrefix') }: ${ String(type ?? '') }`;
  }
}
