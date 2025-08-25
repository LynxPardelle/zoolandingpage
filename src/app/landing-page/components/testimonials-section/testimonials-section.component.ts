import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { AppContainerComponent, AppSectionComponent } from '../../../core/components/layout';
import { LandingPageI18nService } from '../landing-page/landing-page-i18n.service';
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
  private readonly i18n = inject(LandingPageI18nService);

  readonly testimonials = input.required<readonly TestimonialItem[]>();

  // Use centralized translations with parent override capability
  readonly title = input<string>();
  readonly subtitle = input<string>();

  // Computed titles that fall back to centralized translations
  readonly sectionTitle = computed(() =>
    this.title() || this.i18n.ui().sections.testimonials.title
  );

  readonly sectionSubtitle = computed(() =>
    this.subtitle() || this.i18n.ui().sections.testimonials.subtitle
  );
}
