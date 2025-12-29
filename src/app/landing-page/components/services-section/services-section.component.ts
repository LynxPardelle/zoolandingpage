import { GenericFeatureCardComponent } from '@/app/shared/components/generic-feature-card';
import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { AppContainerComponent, AppSectionComponent } from '../../../core/components/layout';
import { AnalyticsCategories, AnalyticsEventPayload, AnalyticsEvents } from '../../../shared/services/analytics.events';
import { LandingPageI18nService } from '../landing-page/landing-page-i18n.service';
import { SERVICES_SECTION_TITLE_CLASSES } from './services-section.constants';

@Component({
  selector: 'services-section',
  imports: [CommonModule, AppSectionComponent, AppContainerComponent, MatIconModule, GenericFeatureCardComponent],
  templateUrl: './services-section.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ServicesSectionComponent {
  readonly analyticsEvent = output<AnalyticsEventPayload>();
  private readonly i18n = inject(LandingPageI18nService);

  titleClasses = SERVICES_SECTION_TITLE_CLASSES;

  readonly services = input.required<
    readonly {
      readonly icon: string;
      readonly title: string;
      readonly description: string;
      readonly features: readonly string[];
      readonly color: string;
      readonly buttonLabel: string;
    }[]
  >();
  readonly serviceCta = output<string>();


  // Section titles from centralized translations
  readonly sectionTitle = computed(() => this.i18n.ui().sections.services.title);
  readonly sectionSubtitle = computed(() => this.i18n.ui().sections.services.subtitle);
  readonly sectionCTA = computed(() => this.i18n.ui().sections.services.cta);

  readonly onCta = (title: string) => {
    this.analyticsEvent.emit({
      name: AnalyticsEvents.ServicesCtaClick,
      category: AnalyticsCategories.CTA,
      label: title,
      meta: { location: 'services-section' }
    });
    this.serviceCta.emit(title);
  };

}
