import { buildWhatsAppUrl } from '@/app/shared/components/whatsapp-button/whatsapp-button.constants';
import { AnalyticsService } from '@/app/shared/services/analytics.service';
import { WHATSAPP_PHONE } from '@/app/shared/services/contact.constants';
import { ChangeDetectionStrategy, Component, computed, inject, output, signal } from '@angular/core';
import { AppContainerComponent, AppSectionComponent } from '../../../core/components/layout';
import { AccordionComponent } from '../../../shared/components/accordion/accordion.component';
import type { AccordionConfig, AccordionItem } from '../../../shared/components/accordion/accordion.types';
import { GenericButtonComponent } from '../../../shared/components/generic-button/generic-button.component';
import { AnalyticsCategories, AnalyticsEventPayload, AnalyticsEvents } from '../../../shared/services/analytics.events';
import { FAQ_ACCORDION_CONFIG } from '../faq-section/faq-section.constants';
import { LandingPageI18nService } from '../landing-page/landing-page-i18n.service';

@Component({
  selector: 'faq-section',
  standalone: true,
  imports: [AppSectionComponent, AppContainerComponent, AccordionComponent, GenericButtonComponent],
  templateUrl: './faq-section.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FaqSectionComponent {
  readonly analyticsEvent = output<AnalyticsEventPayload>();
  private readonly i18n = inject(LandingPageI18nService);
  private readonly _analytics = inject(AnalyticsService, { optional: true });

  // Use centralized FAQ translations
  readonly faqItems = computed<readonly AccordionItem[]>(() =>
    this.i18n.faq().map(faqItem => ({
      id: faqItem.id,
      title: faqItem.title,
      content: faqItem.content,
    }))
  );

  readonly accordionConfig = signal<AccordionConfig>(FAQ_ACCORDION_CONFIG);

  // Section titles from centralized translations
  readonly sectionTitle = computed(() => this.i18n.ui().sections.faq.title);
  readonly sectionSubtitle = computed(() => this.i18n.ui().sections.faq.subtitle);

  // Footer content from centralized translations
  readonly sectionFooter = computed(() => this.i18n.faqSection());

  onToggle(item: { id: string; expanded: boolean }): void {
    if (item.expanded) {
      this.analyticsEvent.emit({ name: AnalyticsEvents.FaqOpen, category: AnalyticsCategories.Faq, label: item.id });
    }
  }
  readonly primary = output<void>();

  onFaqCta(): void {
    // Emit custom FAQ CTA analytics event
    const phone = WHATSAPP_PHONE;
    this.analyticsEvent.emit({ name: AnalyticsEvents.FaqCtaClick, category: AnalyticsCategories.CTA, label: 'faq:whatsapp', meta: { location: 'faq-section', channel: 'whatsapp' } });
    // Open WhatsApp
    try {
      const link = buildWhatsAppUrl(phone, this.sectionSubtitle());
      if (link && typeof window !== 'undefined') window.open(link, '_blank', 'noopener,noreferrer');
    } catch { }
    this.primary.emit();
  }
}
