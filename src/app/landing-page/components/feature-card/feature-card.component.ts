import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { FEATURE_CARD_ANIMATIONS } from './feature-card.styles';
import { FeatureCardData } from './feature-card.types';
@Component({
  selector: 'feature-card',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './feature-card.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: FEATURE_CARD_ANIMATIONS,
})
export class FeatureCardComponent {
  readonly data = input.required<FeatureCardData>();
}
