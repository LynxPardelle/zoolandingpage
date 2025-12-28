import { Component, computed, input } from '@angular/core';
import { /* GenericAccordionComponent, */ TAccordionConfig } from '../generic-accordion';
import { GenericButtonComponent } from '../generic-button/generic-button.component';
import { TGenericButtonConfig } from '../generic-button/generic-button.types';
import { GenericContainerComponent } from '../generic-container/generic-container';
import { TGenericContainerConfig } from '../generic-container/generic-container.types';
import { GenericTextComponent } from '../generic-text/generic-text';
import { TGenericTextConfig } from '../generic-text/generic-text.types';
import { TGenericComponent } from './generic-component-wrapper.types';

@Component({
  selector: 'generic-component-wrapper',
  imports: [
    /* GenericAccordionComponent, */
    GenericButtonComponent,
    GenericContainerComponent,
    GenericTextComponent,
  ],
  templateUrl: './generic-component-wrapper.component.html'
})
export class GenericComponentWrapperComponent {
  readonly componentId = input<string>('');
  readonly component = computed<TGenericComponent>(() => {
    // Placeholder logic; in a real app, fetch component config by ID
    return {
      id: '',
      type: 'none',
      config: undefined
    };
  });
  readonly TAccordionConfig = computed<TAccordionConfig>(() => {
    if (this.component().type === 'accordion') {
      return this.component().config as TAccordionConfig;
    } else {
      return { items: [] };
    }
  });
  readonly buttonConfig = computed<TGenericButtonConfig>(() => {
    if (this.component().type === 'button') {
      return this.component().config as TGenericButtonConfig;
    } else {
      return {}
    }
  });
  readonly containerConfig = computed<TGenericContainerConfig>(() => {
    if (this.component().type === 'container') {
      return this.component().config as TGenericContainerConfig;
    } else {
      return {}
    }
  });
  readonly textConfig = computed<TGenericTextConfig>(() => {
    if (this.component().type === 'text') {
      return this.component().config as TGenericTextConfig;
    } else {
      return {}
    }
  });
}
