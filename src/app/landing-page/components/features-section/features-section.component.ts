import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { AppContainerComponent, AppSectionComponent } from '../../../core/components/layout';
import { FeatureCardComponent } from '../feature-card';
import { LandingPageI18nService } from '../landing-page/landing-page-i18n.service';

@Component({
  selector: 'features-section',
  standalone: true,
  imports: [CommonModule, AppSectionComponent, AppContainerComponent, FeatureCardComponent],
  templateUrl: './features-section.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FeaturesSectionComponent {
  private readonly i18n = inject(LandingPageI18nService);

  readonly features =
    input.required<
      readonly {
        readonly icon: string;
        readonly title: string;
        readonly description: string;
        readonly benefits: readonly string[];
      }[]
    >();

  // Use centralized features section translations
  readonly sectionContent = computed(() => this.i18n.featuresSection());
}
