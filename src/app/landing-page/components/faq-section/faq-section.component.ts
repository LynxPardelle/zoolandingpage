import { ChangeDetectionStrategy, Component, computed, inject, output, signal } from '@angular/core';
import { AppContainerComponent, AppSectionComponent } from '../../../core/components/layout';
import { AccordionComponent } from '../../../shared/components/accordion/accordion.component';
import type { AccordionConfig, AccordionItem } from '../../../shared/components/accordion/accordion.types';
import { GenericButtonComponent } from '../../../shared/components/generic-button/generic-button.component';
import { AnalyticsCategories, AnalyticsEvents } from '../../../shared/services/analytics.events';
import { AnalyticsService } from '../../../shared/services/analytics.service';
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
  private readonly analytics = inject(AnalyticsService);
  private readonly i18n = inject(LandingPageI18nService);

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
    this.analytics.track(item.expanded ? AnalyticsEvents.FaqOpen : AnalyticsEvents.FaqClose, {
      category: AnalyticsCategories.Engagement,
      label: item.id,
    });
  }
  readonly primary = output<void>();
}
