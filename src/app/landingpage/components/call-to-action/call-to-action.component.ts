import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { AnalyticsService } from '../../../shared/services/analytics.service';
import { CTA_BASE_CLASSES, CTA_VARIANT_CLASS } from './call-to-action.constants';
import { CTAVariant } from './call-to-action.types';
@Component({
  selector: 'cta-button',
  templateUrl: './call-to-action.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CallToActionComponent {
  private readonly analytics = inject(AnalyticsService);
  readonly label = input<string>('CTA');
  readonly variant = input<CTAVariant>('primary');
  readonly action = output<void>();
  readonly classes = computed(() => [CTA_BASE_CLASSES, CTA_VARIANT_CLASS[this.variant()]].join(' '));
  handleClick(): void {
    this.analytics.track('cta_click', { category: 'cta', label: this.label() });
    this.action.emit();
  }
}
