import { animate, style, transition, trigger } from '@angular/animations';
import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { NgxAngoraService } from '../../../angora-css/ngx-angora.service';
import { AppContainerComponent, AppSectionComponent } from '../../../core/components/layout';
import { AnalyticsService } from '../../../shared/services/analytics.service';
import { MotionPreferenceService } from '../../../shared/services/motion-preference.service';
import { CallToActionComponent } from '../call-to-action/call-to-action.component';
import { HERO_SECTION_BASE_CLASSES, HERO_SECTION_DEFAULT } from './hero-section.constants';
import { HeroSectionData } from './hero-section.types';
@Component({
  selector: 'hero-section',
  standalone: true,
  imports: [CommonModule, AppSectionComponent, AppContainerComponent, CallToActionComponent, MatIconModule],
  templateUrl: './hero-section.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(16px)' }),
        animate('300ms ease-out', style({ opacity: 1, transform: 'translateY(0)' })),
      ]),
    ]),
    trigger('fadeInDelay', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(12px)' }),
        animate('500ms 120ms ease-out', style({ opacity: 1, transform: 'translateY(0)' })),
      ]),
    ]),
  ],
})
export class HeroSectionComponent {
  private readonly analytics = inject(AnalyticsService);
  private readonly angora = inject(NgxAngoraService);
  readonly motion = inject(MotionPreferenceService);
  readonly data = input<HeroSectionData>(HERO_SECTION_DEFAULT);
  readonly primary = output<void>();
  readonly secondary = output<void>();
  readonly hostClasses = computed(() => HERO_SECTION_BASE_CLASSES.join(' '));
  readonly bgStyle = computed(() => (this.data().backgroundImage ? `url(${this.data().backgroundImage})` : 'none'));
  constructor() {
    this.angora.pushColors({ heroOverlay: 'rgba(0,0,0,0.45)' });
  }
  onPrimary(): void {
    this.analytics.track('hero_primary_click', {
      category: 'hero',
      label: this.data().primary.trackLabel || this.data().primary.label,
    });
    this.primary.emit();
  }
  onSecondary(): void {
    this.analytics.track('hero_secondary_click', {
      category: 'hero',
      label: this.data().secondary?.trackLabel || this.data().secondary?.label,
    });
    this.secondary.emit();
  }
}
