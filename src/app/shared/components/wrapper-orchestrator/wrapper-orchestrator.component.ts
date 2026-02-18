
import { CommonModule } from '@angular/common';
import { Component, computed, inject, input } from '@angular/core';
import { InteractiveProcessLeafComponent } from '../../../landing-page/components/interactive-process/interactive-process-leaf.component';
import { ConfigurationsOrchestratorService } from '../../services/configurations-orchestrator';
import { ValueOrchestrator } from '../../services/value-orchestrator';
import { GenericAccordionComponent } from '../generic-accordion';
import { GenericButtonComponent } from '../generic-button/generic-button.component';
import { GenericContainerComponent } from '../generic-container/generic-container';
import { GenericDropdown } from '../generic-dropdown';
import { GenericFeatureCardComponent } from '../generic-feature-card';
import { GenericIconComponent } from '../generic-icon/generic-icon.component';
import { GenericLink } from "../generic-link/generic-link";
import { GenericMedia } from "../generic-media/generic-media";
import { GenericStatsCounterComponent } from '../generic-stats-counter/generic-stats-counter.component';
import { GenericTestimonialCardComponent } from '../generic-testimonial-card';
import { GenericTextComponent } from '../generic-text/generic-text';

import { ConditionOrchestrator } from '../../services/condition-orchestrator';
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
    GenericContainerComponent,
    GenericDropdown,
    GenericFeatureCardComponent,
    GenericIconComponent,
    GenericTestimonialCardComponent,
    GenericTextComponent,
    InteractiveProcessLeafComponent,
    GenericStatsCounterComponent,
    GenericLink,
    GenericMedia,
  ],
  templateUrl: './wrapper-orchestrator.component.html',
})
export class WrapperOrchestrator {
  private readonly _configurationsOrchestratorService = inject(ConfigurationsOrchestratorService);
  private readonly valueOrchestrator = inject(ValueOrchestrator);
  private readonly conditionOrchestrator = inject(ConditionOrchestrator);
  // Accepts an array of component IDs to render
  readonly componentsIds = input<readonly (string | TGenericComponent)[]>([]);

  private shouldRender(component: TGenericComponent): boolean {
    const cond = component.condition;
    if (cond === undefined) return true;
    if (typeof cond === 'function') return !!cond();
    if (typeof cond === 'boolean') return cond;
    if (typeof cond === 'string') {
      // If the string looks like a DSL (contains colon or comma), use ConditionOrchestrator
      if (cond.includes(':') || cond.includes(',')) {
        return this.conditionOrchestrator.evaluate({ ...component, condition: cond }, { host: this._configurationsOrchestratorService });
      }
      // Otherwise, treat as legacy string boolean
      const normalized = cond.trim().toLowerCase();
      if (normalized === 'false') return false;
      if (normalized === 'true') return true;
      return normalized.length > 0;
    }
    return true;
  }

  readonly components = computed<TGenericComponent[]>(() =>
    this
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
      .map((c: TGenericComponent) => this.valueOrchestrator.apply(c, { host: this._configurationsOrchestratorService }))
      .filter((c: TGenericComponent) => this.shouldRender(c))
  );

  normalizeType(type: unknown): string {
    return String(type ?? '')
      .trim()
      // Normalize some common non-ASCII hyphen/minus characters to '-'
      .replace(/[\u2010\u2011\u2212]/g, '-');
  }
  eventEmitted(event: { component: string; meta_title?: string; eventName: string; eventData?: unknown; eventInstructions?: string; }) {
    this._configurationsOrchestratorService.handleComponentEvent({
      componentId: event.component,
      meta_title: event.meta_title,
      eventName: event.eventName, eventData: event.eventData, eventInstructions: event.eventInstructions
    });
  }
}
