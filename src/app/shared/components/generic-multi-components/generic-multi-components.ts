import { Component, input } from '@angular/core';
import { GenericComponentWrapperComponent } from '../generic-component-wrapper/generic-component-wrapper.component';

@Component({
  selector: 'generic-multi-components',
  standalone: true,
  imports: [GenericComponentWrapperComponent],
  templateUrl: './generic-multi-components.html'
})
export class GenericMultiComponents {
  readonly components = input<readonly string[]>([]);

}
