
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
import type { SearchBoxConfig, SearchBoxFetcher, SearchSuggestion } from '../generic-search-box/generic-search-box.types';
import { GenericStatsCounterComponent } from '../generic-stats-counter/generic-stats-counter.component';
import type { TGenericStatsCounterConfig } from '../generic-stats-counter/generic-stats-counter.types';
import { GenericTabGroupComponent } from '../generic-tab-group/generic-tab-group.component';
import { GenericTextComponent } from '../generic-text/generic-text';
import { InteractionScopeComponent } from '../interaction-scope/interaction-scope.component';

import { ConditionOrchestrator } from '../../services/condition-orchestrator';
import { I18nService } from '../../services/i18n.service';
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
  // Accepts an array of component IDs to render
  readonly componentsIds = input<readonly (string | TGenericComponent)[]>([]);
  readonly hostContext = input<unknown>();

  readonly effectiveHost = computed<unknown>(() => this.hostContext() ?? this._configurationsOrchestratorService);

  private shouldRender(component: TGenericComponent): boolean {
    const cond = component.condition;
    if (cond === undefined) return true;
    if (typeof cond === 'function') return !!cond();
    if (typeof cond === 'boolean') return cond;
    if (typeof cond === 'string') {
      return this.conditionOrchestrator.evaluate({ ...component, condition: cond }, { host: this._configurationsOrchestratorService });
    }
    return true;
  }

  readonly components = computed<TGenericComponent[]>(() => {
    this._configurationsOrchestratorService.componentsRevision();

    return this
      .componentsIds()
      .map((entry) => {
        if (typeof entry === 'string') {
          return this._configurationsOrchestratorService.getComponentById(entry);
        }

        // Direct component objects: ensure render-tracking stays accurate.
        this._configurationsOrchestratorService.markComponentRendered(entry.id);
        return entry;
      })
      .filter((c: TGenericComponent | undefined): c is TGenericComponent => c !== undefined)
      .map((c: TGenericComponent) => this.valueOrchestrator.apply(c, { host: this.effectiveHost() }))
      .filter((c: TGenericComponent) => this.shouldRender(c));
  });

  normalizeType(type: unknown): string {
    return String(type ?? '')
      .trim()
      // Normalize some common non-ASCII hyphen/minus characters to '-'
      .replace(/[\u2010\u2011\u2212]/g, '-');
  }

  resolveMaybeThunk(value: unknown): unknown {
    if (typeof value === 'function' && (value as (...args: unknown[]) => unknown).length === 0) {
      return (value as () => unknown)();
    }
    return value;
  }

  resolveSearchConfig(config: unknown): SearchBoxConfig | null {
    const resolved = this.resolveMaybeThunk(config);
    if (!resolved || typeof resolved !== 'object') {
      return null;
    }

    return resolved as SearchBoxConfig;
  }

  resolveSearchFetcher(config: unknown): SearchBoxFetcher | null {
    const resolved = this.resolveSearchConfig(config);
    const suggestions = Array.isArray(resolved?.suggestions)
      ? resolved.suggestions.filter((entry): entry is SearchSuggestion => !!entry && typeof entry.label === 'string')
      : [];
    const limit = Number(resolved?.maxResults ?? 10);

    return (term: string) => {
      const normalized = String(term ?? '').trim().toLowerCase();
      if (!normalized) return [];

      return suggestions
        .filter((entry) => {
          const haystack = [entry.label, entry.description, entry.href]
            .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
            .join(' ')
            .toLowerCase();
          return haystack.includes(normalized);
        })
        .slice(0, Number.isFinite(limit) && limit > 0 ? limit : 10);
    };
  }

  resolveStatsCounterConfig(config: unknown): TGenericStatsCounterConfig {
    const base = this.resolveMaybeThunk(config) as TGenericStatsCounterConfig | undefined;
    if (!base || typeof base !== 'object') {
      return { target: 0 };
    }

    const rawTarget = this.resolveMaybeThunk((base as any).target);
    const rawDuration = this.resolveMaybeThunk((base as any).durationMs);
    const rawStartOnVisible = this.resolveMaybeThunk((base as any).startOnVisible);
    const rawAriaLabel = this.resolveMaybeThunk((base as any).ariaLabel);
    const resolvedFormat = this.resolveMaybeThunk((base as any).format);

    return {
      target: Number(rawTarget ?? 0),
      durationMs: rawDuration == null ? undefined : Number(rawDuration),
      startOnVisible: rawStartOnVisible == null ? undefined : Boolean(rawStartOnVisible),
      ariaLabel: rawAriaLabel == null ? undefined : String(rawAriaLabel),
      format: typeof resolvedFormat === 'function' ? (resolvedFormat as (value: number) => string) : undefined,
    };
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
