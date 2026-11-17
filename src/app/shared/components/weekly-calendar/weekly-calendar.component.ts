import { afterNextRender, ChangeDetectionStrategy, Component, computed, effect, inject, input, NgZone, signal } from '@angular/core';
import { classCalendarFiles, type WeeklyCalendarConfig } from './weekly-calendar';

@Component({
  selector: 'weekly-calendar',
  template: `
    @if (calendar(); as current) {
      <details>
        <summary [attr.aria-label]="config().ariaLabel">Agregar al calendario</summary>
        <div class="options">
          <p aria-live="polite"><time [attr.datetime]="current.startIso">{{ current.label }}</time> · hora de CDMX</p>
          <a [href]="current.single.href" [attr.download]="current.single.name">Próxima clase</a>
          <a [href]="current.weekly.href" [attr.download]="current.weekly.name">Serie semanal</a>
        </div>
      </details>
    }
  `,
  styles: [`
    :host { display: block; font-size: 0.9375rem; }
    summary { box-sizing: border-box; min-height: 44px; padding-block: 12px; cursor: pointer; font-weight: 700; }
    .options { padding-block-end: 4px; }
    p { margin: 0; }
    a { box-sizing: border-box; display: flex; align-items: center; width: fit-content; min-height: 44px; font-weight: 700; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WeeklyCalendarComponent {
  readonly config = input.required<WeeklyCalendarConfig>();
  private readonly clock = signal<number | null>(null);
  readonly calendar = computed(() => {
    const now = this.clock();
    return now === null ? null : classCalendarFiles(this.config(), now);
  });

  constructor() {
    const zone = inject(NgZone);
    // Keep the cached SSR render and the first browser render in agreement.
    afterNextRender(() => this.clock.set(Date.now()));
    effect(onCleanup => {
      const start = this.calendar()?.start;
      if (start === undefined) return;
      const timeout = zone.runOutsideAngular(() =>
        setTimeout(() => this.clock.set(Date.now()), Math.max(0, start - Date.now())),
      );
      onCleanup(() => clearTimeout(timeout));
    });
  }
}
