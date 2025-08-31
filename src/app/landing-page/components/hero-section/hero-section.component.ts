import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { AppContainerComponent, AppSectionComponent } from '../../../core/components/layout';
import { AnalyticsService } from '../../../shared/services/analytics.service';
import { MotionPreferenceService } from '../../../shared/services/motion-preference.service';
import { CallToActionComponent } from '../call-to-action/call-to-action.component';
import { LandingPageI18nService } from '../landing-page/landing-page-i18n.service';
import { HERO_SECTION_BASE_CLASSES, HERO_SECTION_DEFAULT } from './hero-section.constants';
import { HERO_ANIMATIONS } from './hero-section.styles';
import { HeroSectionData } from './hero-section.types';
@Component({
  selector: 'hero-section',
  standalone: true,
  imports: [CommonModule, AppSectionComponent, AppContainerComponent, CallToActionComponent, MatIconModule],
  templateUrl: './hero-section.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: HERO_ANIMATIONS,
})
export class HeroSectionComponent {
  private readonly analytics = inject(AnalyticsService);
  private readonly i18n = inject(LandingPageI18nService);
  readonly motion = inject(MotionPreferenceService);

  readonly data = input<HeroSectionData>(HERO_SECTION_DEFAULT);
  readonly primary = output<void>();
  readonly secondary = output<void>();

  readonly hostClasses = computed(() => HERO_SECTION_BASE_CLASSES.join(' '));
  readonly bgStyle = computed(() => (this.data().backgroundImage ? `url(${ this.data().backgroundImage })` : 'none'));

  // Computed properties for template access
  readonly heroTranslations = computed(() => this.i18n.hero());
  readonly floatingMetrics = computed(() => this.i18n.hero().floatingMetrics);
  constructor() {
  }
  onPrimary(): void {
    this.primary.emit();
  }
  onSecondary(): void {
    this.secondary.emit();
  }
}
