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
  // Localizable section heading with sensible defaults (overridden by parent)
  readonly title = input<string>('Resultados que generan confianza');
  readonly subtitle = input<string>(
    'Historias breves de clientes que ya están captando clientes de una mejor manera y gastan mejor su presupuesto'
  );
}
