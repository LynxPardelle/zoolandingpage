import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { AppContainerComponent, AppSectionComponent } from '../../../core/components/layout';
import { TestimonialCardComponent } from '../testimonial-card';
import { TestimonialItem } from './testimonials-section.types';

@Component({
  selector: 'testimonials-section',
  standalone: true,
  imports: [CommonModule, AppSectionComponent, AppContainerComponent, TestimonialCardComponent],
  templateUrl: './testimonials-section.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TestimonialsSectionComponent {
  readonly testimonials = input.required<readonly TestimonialItem[]>();
}
