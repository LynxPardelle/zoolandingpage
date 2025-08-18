import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { AppContainerComponent, AppSectionComponent } from '../../../core/components/layout';
import { TestimonialCardComponent } from '../testimonial-card';

@Component({
  selector: 'testimonials-section',
  standalone: true,
  imports: [CommonModule, AppSectionComponent, AppContainerComponent, TestimonialCardComponent],
  templateUrl: './testimonials-section.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TestimonialsSectionComponent {
  readonly testimonials =
    input.required<
      readonly {
        readonly name: string;
        readonly role: string;
        readonly company: string;
        readonly content: string;
        readonly rating: number;
        readonly avatar: string;
      }[]
    >();
}
