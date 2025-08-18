import { animate, style, transition, trigger } from '@angular/animations';
import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { FeatureCardData } from './feature-card.types';
@Component({
  selector: 'feature-card',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './feature-card.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(12px)' }),
        animate('350ms ease-out', style({ opacity: 1, transform: 'translateY(0)' })),
      ]),
    ]),
  ],
})
export class FeatureCardComponent {
  readonly data = input.required<FeatureCardData>();
}
