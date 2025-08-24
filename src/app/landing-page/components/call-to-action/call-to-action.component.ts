import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { GenericButtonComponent } from '../../../shared/components/generic-button';
import { AnalyticsService } from '../../../shared/services/analytics.service';
import { CTAVariant } from './call-to-action.types';
@Component({
  selector: 'cta-button',
  imports: [GenericButtonComponent],
  templateUrl: './call-to-action.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CallToActionComponent {
  private readonly analytics = inject(AnalyticsService);
  readonly label = input<string>('CTA');
  readonly variant = input<CTAVariant>('primary');
  /** colorKey forwarded to generic-button for dynamic theme color usage */
  readonly colorKey = input<string>('secondaryLinkColor');
  readonly action = output<void>();
  handleClick(): void {
    this.analytics.track('cta_click', { category: 'cta', label: this.label() });
    this.action.emit();
  }
}
