import { animate, style, transition, trigger } from '@angular/animations';
import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { TestimonialCardData } from './testimonial-card.types';
@Component({
  selector: 'testimonial-card',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './testimonial-card.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [
    trigger('fadeIn', [
      transition(':enter', [style({ opacity: 0 }), animate('400ms ease-out', style({ opacity: 1 }))]),
    ]),
  ],
})
export class TestimonialCardComponent {
  readonly data = input.required<TestimonialCardData>();
  readonly stars = computed(() => [1, 2, 3, 4, 5]);
}
