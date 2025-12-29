import { AnalyticsService } from '@/app/shared/services/analytics.service';
import { WHATSAPP_PHONE } from '@/app/shared/services/contact.constants';
import { buildWhatsAppUrl } from '@/app/shared/utility/buildWhatsAppUrl.utility';
import { ChangeDetectionStrategy, Component, computed, inject, output } from '@angular/core';
import { AppContainerComponent, AppSectionComponent } from '../../../core/components/layout';
import { GenericAccordionComponent } from '../../../shared/components/generic-accordion/generic-accordion.component';
import type { AccordionItem, TAccordionConfig } from '../../../shared/components/generic-accordion/generic-accordion.types';
import { GenericButtonComponent } from '../../../shared/components/generic-button/generic-button.component';
import { AnalyticsCategories, AnalyticsEventPayload, AnalyticsEvents } from '../../../shared/services/analytics.events';
import { LandingPageI18nService } from '../landing-page/landing-page-i18n.service';
import { FAQ_FOOTER_CLASSES, FAQ_GENERIC_BUTTON_CLASSES, FAQ_TITLE_CLASSES } from './faq-section.constants';

@Component({
  selector: 'faq-section',
  imports: [AppSectionComponent, AppContainerComponent, GenericAccordionComponent, GenericButtonComponent],
  templateUrl: './faq-section.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FaqSectionComponent {
  readonly analyticsEvent = output<AnalyticsEventPayload>();
  private readonly i18n = inject(LandingPageI18nService);
  private readonly _analytics = inject(AnalyticsService, { optional: true });
  titleClasses = FAQ_TITLE_CLASSES;
  footerClasses = FAQ_FOOTER_CLASSES;
  buttonClasses = FAQ_GENERIC_BUTTON_CLASSES;
  // Use centralized FAQ translations
  readonly faqItems = computed<readonly AccordionItem[]>(() =>
    this.i18n.faq().map(faqItem => ({
      id: faqItem.id,
      title: faqItem.title,
      content: faqItem.content,
    }))
  );

  readonly accordionConfig = computed<TAccordionConfig>(() => ({
    items: this.faqItems(),
    mode: 'single',
    allowToggle: true,

    // Clases del acordeón
    containerClasses: 'ank-display-flex ank-flexDirection-column ank-gap-0_25rem',
    defaultItemContainerClasses: 'ank-border-1px-solid ank-borderColor-bgColor ank-borderRadius-0_5rem ank-transition-all ank-bgColor-transparent ng-star-inserted',
    defaultItemButtonConfig: {
      classes: 'ank-outline-2px__solid__secondaryAccentColor ank-m-8px ank-color-textColor ank-borderRadius-0_25rem ank-border-0 ank-width-100per ank-textAlign-left ank-padding-0_75rem ank-fontWeight-600 ank-transition-all ank-bgHover-secondaryAccentColor ank-colorHover-titleColor ank-cursor-pointer ank-bg-transparent'
    },
    defaultItemContainerIsExpandedClasses: 'accItemExpandedContainer',
    defaultItemContainerIsNotExpandedClasses: 'accItemNotExpandedContainer',
    defaultItemPanelClasses: 'ank-marginBlockStart-0 ank-marginBlockEnd-0 ank-color-textColor',
  }));

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
