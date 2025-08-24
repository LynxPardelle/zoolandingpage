import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { TESTIMONIAL_CARD_ANIMATIONS } from './testimonial-card.styles';
import { TestimonialCardData } from './testimonial-card.types';
@Component({
  selector: 'testimonial-card',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './testimonial-card.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: TESTIMONIAL_CARD_ANIMATIONS,
})
export class TestimonialCardComponent {
  readonly data = input.required<TestimonialCardData>();
  readonly stars = computed(() => [1, 2, 3, 4, 5]);
}
