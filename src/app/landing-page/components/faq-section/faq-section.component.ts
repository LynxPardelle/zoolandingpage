import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { AppContainerComponent, AppSectionComponent } from '../../../core/components/layout';
import { AccordionComponent } from '../../../shared/components/accordion/accordion.component';
import type { AccordionConfig, AccordionItem } from '../../../shared/components/accordion/accordion.types';
import { GenericButtonComponent } from '../../../shared/components/generic-button/generic-button.component';
import { FAQ_ACCORDION_CONFIG, FAQ_ITEMS } from '../faq-section/faq-section.constants';

@Component({
  selector: 'faq-section',
  standalone: true,
  imports: [AppSectionComponent, AppContainerComponent, AccordionComponent, GenericButtonComponent],
  templateUrl: './faq-section.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FaqSectionComponent {
  readonly faqItems = signal<readonly AccordionItem[]>(FAQ_ITEMS);
  readonly accordionConfig = signal<AccordionConfig>(FAQ_ACCORDION_CONFIG);
}
