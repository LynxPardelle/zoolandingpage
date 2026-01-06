
import { CommonModule } from '@angular/common';
import { Component, computed, inject, input } from '@angular/core';
import { ConfigurationsOrchestratorService } from '../../services/configurations-orchestrator';
import { GenericAccordionComponent } from '../generic-accordion';
import { GenericButtonComponent } from '../generic-button/generic-button.component';
import { GenericContainerComponent } from '../generic-container/generic-container';
import { GenericIconComponent } from '../generic-icon/generic-icon.component';
import { GenericTextComponent } from '../generic-text/generic-text';
import { TGenericComponent } from './wrapper-orchestrator.types';

@Component({
  selector: 'wrapper-orchestrator',
  standalone: true,
  imports: [
    CommonModule,
    GenericAccordionComponent,
    GenericButtonComponent,
    GenericContainerComponent,
    GenericIconComponent,
    GenericTextComponent,
    // Add other generic components here as needed
  ],
  templateUrl: './wrapper-orchestrator.component.html',
})
export class WrapperOrchestrator {
  private readonly _configurationsOrchestratorService = inject(ConfigurationsOrchestratorService);
  // Accepts an array of component IDs to render
  readonly componentsIds = input<readonly string[]>([]);

  readonly components = computed<TGenericComponent[]>(() => this.componentsIds().map(id => this._configurationsOrchestratorService.getComponentById(id)).filter((c): c is TGenericComponent => c !== undefined));
  eventEmitted(event: { component: string; meta_title?: string; eventName: string; eventData?: unknown; eventInstructions?: string; }) {
    this._configurationsOrchestratorService.handleComponentEvent({
      componentId: event.component,
      meta_title: event.meta_title,
      eventName: event.eventName, eventData: event.eventData, eventInstructions: event.eventInstructions
    });
  }
}
