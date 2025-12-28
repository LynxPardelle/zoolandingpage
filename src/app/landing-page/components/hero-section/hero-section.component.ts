import { GenericTextComponent } from '@/app/shared/components/generic-text/generic-text';
import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { AppContainerComponent, AppSectionComponent } from '../../../core/components/layout';
import { AnalyticsService } from '../../../shared/services/analytics.service';
import { MotionPreferenceService } from '../../../shared/services/motion-preference.service';
import { CallToActionComponent } from '../call-to-action/call-to-action.component';
import { LandingPageI18nService } from '../landing-page/landing-page-i18n.service';
import { GenericContainerComponent } from './../../../shared/components/generic-container/generic-container';
import { HERO_SECTION_BASE_CLASSES, HERO_SECTION_DEFAULT } from './hero-section.constants';
import { HERO_ANIMATIONS } from './hero-section.styles';
import { HeroSectionData } from './hero-section.types';

@Component({
  selector: 'hero-section',
  imports: [
    CommonModule,
    AppSectionComponent,
    AppContainerComponent,
    CallToActionComponent,
    MatIconModule,
    GenericTextComponent,
    GenericContainerComponent,
  ],
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
  readonly bgStyle = computed(() =>
    this.data().backgroundImage ? `url(${ this.data().backgroundImage })` : 'none'
  );

  readonly heroTranslations = computed(() => this.i18n.hero());
  readonly floatingMetrics = computed(() => this.i18n.hero().floatingMetrics);

  // ✅ cache del último texto "bueno" para evitar flicker
  private readonly _stableText = signal<Pick<HeroSectionData, 'title' | 'subtitle' | 'description'>>({
    title: HERO_SECTION_DEFAULT.title,
    subtitle: HERO_SECTION_DEFAULT.subtitle,
    description: HERO_SECTION_DEFAULT.description,
  });

  readonly viewData = computed<HeroSectionData>(() => {
    const d = this.data();
    const s = this._stableText();

    const pick = (next?: string, prev?: string) => {
      const n = (next ?? '').trim();
      return n.length ? next! : (prev ?? '');
    };

    return {
      ...d,
      title: pick(d.title, s.title),
      subtitle: pick(d.subtitle, s.subtitle),
      description: pick(d.description, s.description),
    };
  });

  constructor() {
    effect(() => {
      const d = this.data();
      const prev = untracked(() => this._stableText());

      const keep = (next?: string, fallback?: string) => {
        const n = (next ?? '').trim();
        return n.length ? next! : (fallback ?? '');
      };

      this._stableText.set({
        title: keep(d.title, prev.title),
        subtitle: keep(d.subtitle, prev.subtitle),
        description: keep(d.description, prev.description),
      });
    });
  }

  onPrimary(): void {
    this.primary.emit();
  }

  onSecondary(): void {
    this.secondary.emit();
  }
}
