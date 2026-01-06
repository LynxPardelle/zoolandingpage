import { Component, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { TGenericIconConfig } from './generic-icon.types';

@Component({
  selector: 'generic-icon',
  imports: [
    MatIconModule,],
  templateUrl: './generic-icon.component.html',
})
export class GenericIconComponent {
  readonly config = input.required<TGenericIconConfig>();
}
