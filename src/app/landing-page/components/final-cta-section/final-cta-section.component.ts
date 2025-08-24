import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { AppContainerComponent, AppSectionComponent } from '../../../core/components/layout';
import { GenericButtonComponent } from '../../../shared/components/generic-button';
import { WhatsAppButtonComponent } from '../../../shared/components/whatsapp-button';
import { AnalyticsCategories, AnalyticsEvents } from '../../../shared/services/analytics.events';
import { AnalyticsService } from '../../../shared/services/analytics.service';
import { FINAL_CTA_DEFAULT } from './final-cta-section.constants';

@Component({
  selector: 'final-cta-section',
  standalone: true,
  imports: [CommonModule, AppSectionComponent, AppContainerComponent, GenericButtonComponent, WhatsAppButtonComponent],
  templateUrl: './final-cta-section.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FinalCtaSectionComponent {
  readonly primary = output<void>();
  readonly secondary = output<void>();
  // Localizable labels and copy
  readonly title = input<string>('Publica una landing que vende y aprende con datos reales');
  readonly subtitle = input<string>(
    'Empieza hoy con una Landing Page Optimizada: rápida, clara y medible.\nSuscripción desde 900 MXN/mes.'
  );
  readonly primaryLabel = input<string>(FINAL_CTA_DEFAULT.primaryLabel);
  readonly secondaryLabel = input<string>(FINAL_CTA_DEFAULT.secondaryLabel);
  // WhatsApp config
  readonly whatsAppPhone = input<string>('+525522699563');
  readonly whatsAppMessage = input<string | undefined>(undefined);
  private readonly analytics = inject(AnalyticsService);

  onPrimary(): void {
    this.analytics.track(AnalyticsEvents.FinalCtaPrimaryClick, {
      category: AnalyticsCategories.CTA,
      label: this.primaryLabel(),
    });
    this.primary.emit();
  }
  onSecondary(): void {
    this.analytics.track(AnalyticsEvents.FinalCtaSecondaryClick, {
      category: AnalyticsCategories.CTA,
      label: this.secondaryLabel(),
    });
    this.secondary.emit();
  }

  onWhatsAppActivated(): void {
    // Keep our CTA analytics in addition to whatsapp_click emitted by the button component
    this.onPrimary();
  }
}
