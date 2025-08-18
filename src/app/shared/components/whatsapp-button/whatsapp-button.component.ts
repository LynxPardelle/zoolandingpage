import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { AnalyticsService } from '../../services/analytics.service';
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
  private readonly analytics = inject(AnalyticsService);

  readonly config = input<WhatsAppButtonConfig>(WHATSAPP_BUTTON_DEFAULT);

  readonly phone = computed(() => this.config().phone);
  readonly message = computed(() => this.config().message);
  readonly label = computed(() => this.config().label || 'WhatsApp');
  readonly variant = computed(() => this.config().variant || 'outline');
  readonly colorKey = computed(() => this.config().colorKey || 'successColor');
  readonly size = computed(() => this.config().size || 'md');
  readonly target = computed(() => this.config().target || '_blank');
  readonly url = computed(() => buildWhatsAppUrl(this.phone() || '', this.message()));

  readonly activated = output<string>();

  onPressed(): void {
    const link = this.url();
    if (!link) return;
    if (this.target() === '_blank') {
      window.open(link, '_blank', 'noopener,noreferrer');
    } else {
      window.location.href = link;
    }
    this.analytics.track('whatsapp_click', {
      category: 'engagement',
      label: this.phone(),
      meta: { hasMessage: !!this.message(), length: (this.message() || '').length },
    });
    this.activated.emit(link);
  }
}
