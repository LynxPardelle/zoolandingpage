import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { AnalyticsCategories, AnalyticsEventPayload, AnalyticsEvents } from '../../services/analytics.events';
import { GenericButtonComponent } from '../generic-button';
import { WHATSAPP_BUTTON_DEFAULT, buildWhatsAppUrl } from './whatsapp-button.constants';
import type { WhatsAppButtonConfig } from './whatsapp-button.types';

@Component({
  selector: 'whatsapp-button',
  standalone: true,
  imports: [CommonModule, GenericButtonComponent],
  templateUrl: './whatsapp-button.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WhatsAppButtonComponent {
  readonly analyticsEvent = output<AnalyticsEventPayload>();

  readonly config = input<WhatsAppButtonConfig>(WHATSAPP_BUTTON_DEFAULT);

  readonly phone = computed(() => this.config().phone);
  readonly message = computed(() => this.config().message);
  readonly label = computed(() => this.config().label || 'WhatsApp');
  readonly variant = computed(() => this.config().variant || 'outline');
  readonly colorKey = computed(() => this.config().colorKey || 'secondaryBgColor');
  readonly size = computed(() => this.config().size || 'md');
  readonly target = computed(() => this.config().target || '_blank');
  readonly url = computed(() => buildWhatsAppUrl(this.phone() || '', this.message()));

  readonly activated = output<string>();

  onPressed(location: string): void {
    const link = this.url();
    if (!link) return;
    if (this.target() === '_blank') {
      window.open(link, '_blank', 'noopener,noreferrer');
    } else {
      window.location.href = link;
    }
    this.analyticsEvent.emit({ name: AnalyticsEvents.Convertion, category: AnalyticsCategories.CTA, label: this.phone(), meta: { location, source: 'whatsapp_button' } });
    this.activated.emit(link);
  }
}
