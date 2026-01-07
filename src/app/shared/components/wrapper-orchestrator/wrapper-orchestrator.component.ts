
import { CommonModule } from '@angular/common';
import { Component, computed, inject, input } from '@angular/core';
import { InteractiveProcessLeafComponent } from '../../../landing-page/components/interactive-process/interactive-process-leaf.component';
import { StatsCounterComponent } from '../../../landing-page/components/stats-counter/stats-counter.component';
import { ConfigurationsOrchestratorService } from '../../services/configurations-orchestrator';
import { GenericAccordionComponent } from '../generic-accordion';
import { GenericButtonComponent } from '../generic-button/generic-button.component';
import { GenericContainerComponent } from '../generic-container/generic-container';
import { GenericFeatureCardComponent } from '../generic-feature-card';
import { GenericIconComponent } from '../generic-icon/generic-icon.component';
import { GenericLink } from "../generic-link/generic-link";
import { GenericMedia } from "../generic-media/generic-media";
import { GenericTestimonialCardComponent } from '../generic-testimonial-card';
import { GenericTextComponent } from '../generic-text/generic-text';
import { TGenericComponent } from './wrapper-orchestrator.types';

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
    GenericFeatureCardComponent,
    GenericIconComponent,
    GenericTestimonialCardComponent,
    GenericTextComponent,
    InteractiveProcessLeafComponent,
    StatsCounterComponent,
    GenericLink,
    GenericMedia,
  ],
  templateUrl: './wrapper-orchestrator.component.html',
})
export class WrapperOrchestrator {
  private readonly _configurationsOrchestratorService = inject(ConfigurationsOrchestratorService);
  // Accepts an array of component IDs to render
  readonly componentsIds = input<readonly string[]>([]);

  readonly components = computed<TGenericComponent[]>(() =>
    this
      .componentsIds()
      .map((id: string) => this._configurationsOrchestratorService.getComponentById(id))
      .filter((c: TGenericComponent | undefined): c is TGenericComponent => c !== undefined)
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
