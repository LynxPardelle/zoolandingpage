import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, Input } from '@angular/core';
import { AppContainerComponent, AppSectionComponent } from '../../../core/components/layout';
import { GenericFeatureCardComponent } from '../../../shared/components/generic-feature-card';
import { LandingPageI18nService } from '../landing-page/landing-page-i18n.service';
import { FeatureItem } from './features-section.types';

@Component({
  selector: 'features-section',
  imports: [CommonModule, AppSectionComponent, AppContainerComponent, GenericFeatureCardComponent],
  templateUrl: './features-section.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FeaturesSectionComponent {
  private readonly i18n = inject(LandingPageI18nService);
  private readonly _config = computed<readonly FeatureItem[]>(() => this.i18n.features());

  @Input()
  get config(): readonly FeatureItem[] {
    return this._config();
  }
  set config(value: readonly FeatureItem[]) {
    // Config is currently sourced from i18n features; keep setter for compatibility.
  }



  /* readonly features =
    input.required<
      readonly {
        readonly icon: string;
        readonly title: string;
        readonly description: string;
        readonly benefits: readonly string[];
      }[]
    >(); */

  // Use centralized features section translations
  readonly sectionContent = computed(() => this.i18n.featuresSection());
}
