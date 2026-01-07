import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { TGenericMediaConfig } from './generic-media.types';

@Component({
  selector: 'generic-media',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './generic-media.html',
  styleUrl: './generic-media.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GenericMedia {
  readonly config = input<TGenericMediaConfig>();

}
