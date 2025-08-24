import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { AppContainerComponent, AppSectionComponent } from '../../../core/components/layout';
import { AnalyticsCategories, AnalyticsEvents } from '../../../shared/services/analytics.events';
import { AnalyticsService } from '../../../shared/services/analytics.service';

@Component({
  selector: 'services-section',
  standalone: true,
  imports: [CommonModule, AppSectionComponent, AppContainerComponent, MatIconModule],
  templateUrl: './services-section.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ServicesSectionComponent {
  private readonly analytics = inject(AnalyticsService);
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
  onCta(title: string) {
    this.analytics.track(AnalyticsEvents.ServicesCtaClick, {
      category: AnalyticsCategories.Services,
      label: title,
    });
    this.serviceCta.emit(title);
  }
}
