import { buildWhatsAppUrl } from '@/app/shared/components/whatsapp-button/whatsapp-button.constants';
import { AnalyticsCategories, AnalyticsEventPayload, AnalyticsEvents } from '@/app/shared/services/analytics.events';
import { AnalyticsService } from '@/app/shared/services/analytics.service';
import { WHATSAPP_PHONE } from '@/app/shared/services/contact.constants';
import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { AppContainerComponent } from '../../../core/components/layout/app-container';
import { AppSectionComponent } from '../../../core/components/layout/app-section';
import { GenericButtonComponent } from '../../../shared/components/generic-button';
import { LandingPageI18nService } from '../landing-page/landing-page-i18n.service';

@Component({
  selector: 'final-cta-section',
  standalone: true,
  imports: [CommonModule, AppSectionComponent, AppContainerComponent, GenericButtonComponent],
  templateUrl: './final-cta-section.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FinalCtaSectionComponent {
  private readonly i18n = inject(LandingPageI18nService);
  // Fallback direct analytics (in case parent Output not wired yet)
  private readonly _analytics = inject(AnalyticsService, { optional: true });
  private hasEmittedOnce = false;

  readonly primary = output<void>();
  readonly secondary = output<void>();
  readonly analyticsEvent = output<AnalyticsEventPayload>();

  // Use centralized final CTA translations
  readonly content = computed(() => this.i18n.finalCtaSection());

  // Localizable labels and copy (with fallbacks to centralized translations)
  readonly title = input<string>();
  readonly subtitle = input<string>();
  readonly primaryLabel = input<string>();
  readonly secondaryLabel = input<string>();

  // Computed properties that use centralized translations as fallback
  readonly finalTitle = computed(() => this.title() ?? this.content().title);
  readonly finalSubtitle = computed(() => this.subtitle() ?? this.content().subtitle);
  readonly finalPrimaryLabel = computed(() => this.primaryLabel() ?? this.content().primaryLabel);
  readonly finalSecondaryLabel = computed(() => this.secondaryLabel() ?? this.content().secondaryLabel);

  // WhatsApp inputs (reintroduced to preserve original behavior when replacing whatsapp-button)
  readonly whatsAppPhone = input<string>(WHATSAPP_PHONE);
  readonly whatsAppMessage = input<string | undefined>(undefined);

  private buildWhatsAppLink(): string | null {
    const phone = this.whatsAppPhone();
    if (!phone) return null;
    const raw = this.whatsAppMessage() ?? this.content().subtitle;
    return buildWhatsAppUrl(phone, raw);
  }

  onPrimary(): void {
    try { console.log('[FinalCtaSection] onPrimary fired'); } catch { }
    this.primary.emit();
    this.analyticsEvent.emit({
      name: AnalyticsEvents.FinalCtaPrimaryClick,
      category: AnalyticsCategories.CTA,
      label: 'final-cta:primary',
      meta: { location: 'final-cta', source: 'final_cta_section', channel: 'whatsapp', phone: this.whatsAppPhone() }
    });
    // Fallback direct track only on first emit if parent not wiring (best effort)
    if (!this.hasEmittedOnce && this._analytics) {
      try { this._analytics.track(AnalyticsEvents.FinalCtaPrimaryClick, { category: AnalyticsCategories.CTA, label: 'final-cta:primary', meta: { location: 'final-cta', fallback: true } }); } catch { }
    }
    this.hasEmittedOnce = true;
    // Open WhatsApp (mimic previous whatsapp-button behavior)
    try {
      const link = this.buildWhatsAppLink();
      if (link && typeof window !== 'undefined') {
        window.open(link, '_blank', 'noopener,noreferrer');
      }
    } catch { /* noop */ }
  }
  onSecondary(): void {
    try { console.log('[FinalCtaSection] onSecondary fired'); } catch { }
    this.secondary.emit();
    this.analyticsEvent.emit({
      name: AnalyticsEvents.FinalCtaSecondaryClick,
      category: AnalyticsCategories.CTA,
      label: 'final-cta:secondary',
      meta: { location: 'final-cta', source: 'final_cta_section', channel: 'whatsapp', phone: this.whatsAppPhone() }
    });
    if (!this.hasEmittedOnce && this._analytics) {
      try { this._analytics.track(AnalyticsEvents.FinalCtaSecondaryClick, { category: AnalyticsCategories.CTA, label: 'final-cta:secondary', meta: { location: 'final-cta', fallback: true } }); } catch { }
    }
    this.hasEmittedOnce = true;
    // Also open WhatsApp like primary (requested parity)
    try {
      const link = this.buildWhatsAppLink();
      if (link && typeof window !== 'undefined') {
        window.open(link, '_blank', 'noopener,noreferrer');
      }
    } catch { /* noop */ }
  }
}
