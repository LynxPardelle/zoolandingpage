import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, output } from '@angular/core';
import { AppContainerComponent, AppSectionComponent } from '../../../core/components/layout';
import { GenericButtonComponent } from '../../../shared/components/generic-button';
import { AnalyticsService } from '../../../shared/services/analytics.service';
import { FINAL_CTA_DEFAULT } from './final-cta-section.constants';

@Component({
  selector: 'final-cta-section',
  standalone: true,
  imports: [CommonModule, AppSectionComponent, AppContainerComponent, GenericButtonComponent],
  templateUrl: './final-cta-section.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FinalCtaSectionComponent {
  readonly primary = output<void>();
  readonly secondary = output<void>();
  readonly labels = FINAL_CTA_DEFAULT;
  private readonly analytics = inject(AnalyticsService);

  onPrimary(): void {
    this.analytics.track('final_cta_primary_click', { category: 'cta', label: this.labels.primaryLabel });
    this.primary.emit();
  }
  onSecondary(): void {
    this.analytics.track('final_cta_secondary_click', { category: 'cta', label: this.labels.secondaryLabel });
    this.secondary.emit();
  }
}
