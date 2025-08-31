import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { AppContainerComponent, AppSectionComponent } from '../../../core/components/layout';
import { GenericButtonComponent } from '../../../shared/components/generic-button';
import { WhatsAppButtonComponent } from '../../../shared/components/whatsapp-button';
import { LandingPageI18nService } from '../landing-page/landing-page-i18n.service';

@Component({
  selector: 'final-cta-section',
  standalone: true,
  imports: [CommonModule, AppSectionComponent, AppContainerComponent, GenericButtonComponent, WhatsAppButtonComponent],
  templateUrl: './final-cta-section.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FinalCtaSectionComponent {
  private readonly i18n = inject(LandingPageI18nService);

  readonly primary = output<void>();
  readonly secondary = output<void>();

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

  // WhatsApp config
  readonly whatsAppPhone = input<string>('+525522699563');
  readonly whatsAppMessage = input<string | undefined>(undefined);

  onPrimary(): void {
    this.primary.emit();
  }
  onSecondary(): void {
    this.secondary.emit();
  }

  onWhatsAppActivated(): void {
    // WhatsApp button already tracks the click; only emit the action
    this.primary.emit();
  }
}
