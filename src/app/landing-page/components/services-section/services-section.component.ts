import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { AppContainerComponent, AppSectionComponent } from '../../../core/components/layout';
import { AnalyticsCategories, AnalyticsEvents } from '../../../shared/services/analytics.events';
import { AnalyticsService } from '../../../shared/services/analytics.service';
import { LandingPageI18nService } from '../landing-page/landing-page-i18n.service';

@Component({
  selector: 'services-section',
  standalone: true,
  imports: [CommonModule, AppSectionComponent, AppContainerComponent, MatIconModule],
  templateUrl: './services-section.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ServicesSectionComponent {
  private readonly analytics = inject(AnalyticsService);
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
    this.analytics.track(AnalyticsEvents.ServicesCtaClick, {
      category: AnalyticsCategories.Services,
      label: title,
    });
    this.serviceCta.emit(title);
  }
}
