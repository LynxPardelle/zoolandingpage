import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { AppContainerComponent, AppSectionComponent } from '../../../core/components/layout';
import { AnalyticsCategories, AnalyticsEventPayload, AnalyticsEvents } from '../../../shared/services/analytics.events';
import { LandingPageI18nService } from '../landing-page/landing-page-i18n.service';

@Component({
  selector: 'services-section',
  standalone: true,
  imports: [CommonModule, AppSectionComponent, AppContainerComponent, MatIconModule],
  templateUrl: './services-section.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ServicesSectionComponent {
  readonly analyticsEvent = output<AnalyticsEventPayload>();
  private readonly i18n = inject(LandingPageI18nService);

  readonly services = input.required<
    readonly {
      readonly icon: string;
      readonly title: string;
      readonly description: string;
      readonly features: readonly string[];
      readonly color: string;
    }[]
  >();
  readonly serviceCta = output<string>();

  // Section titles from centralized translations
  readonly sectionTitle = computed(() => this.i18n.ui().sections.services.title);
  readonly sectionSubtitle = computed(() => this.i18n.ui().sections.services.subtitle);

  onCta(title: string) {
    this.analyticsEvent.emit({
      name: AnalyticsEvents.ServicesCtaClick,
      category: AnalyticsCategories.CTA,
      label: title,
      meta: { location: 'services-section' }
    });
    this.serviceCta.emit(title);
  }
}
