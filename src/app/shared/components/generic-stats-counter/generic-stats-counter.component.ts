import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  NgZone,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import {
  STATS_COUNTER_DEFAULT,
  easeOutQuad,
  formatStatsCounterValue,
  normalizeStatsCounterConfig,
} from './generic-stats-counter.constants';
import type { TGenericStatsCounterConfig } from './generic-stats-counter.types';

@Component({
  selector: 'generic-stats-counter',
  imports: [CommonModule],
  templateUrl: './generic-stats-counter.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GenericStatsCounterComponent {
  private readonly zone = inject(NgZone);
  private readonly destroyRef = inject(DestroyRef);
  private readonly host = inject(ElementRef<HTMLElement>);

  readonly config = input<TGenericStatsCounterConfig>(STATS_COUNTER_DEFAULT);

  readonly internalValue = signal(0);
  readonly started = signal(false);
  readonly completed = output<void>();
  readonly normalizedConfig = computed(() => normalizeStatsCounterConfig(this.config()));

  readonly displayValue = computed(() => formatStatsCounterValue(this.internalValue(), this.normalizedConfig()));
  readonly ariaLabel = computed(() => this.normalizedConfig().ariaLabel || `Counter value ${ this.displayValue() }`);

  private io?: IntersectionObserver;
  private rafId?: number;

  constructor() {
    this.destroyRef.onDestroy(() => {
      this.io?.disconnect();

      if (this.rafId !== undefined) {
        cancelAnimationFrame(this.rafId);
      }
    });

    effect(() => {
      const cfg = this.normalizedConfig();
      if (!cfg.startOnVisible) {
        this.start();
      } else {
        this.setupObserver();
      }
    });
  }

  private setupObserver(): void {
    if (this.io) return;
    if (typeof window === 'undefined') return;
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) {
      this.internalValue.set(this.normalizedConfig().target);
      return;
    }
    this.io = new IntersectionObserver(
      entries => {
        entries.forEach(e => {
          if (e.isIntersecting) {
            this.start();
            this.io?.disconnect();
          }
        });
      },
      { threshold: 0.4 }
    );
    queueMicrotask(() => {
      const el = this.host.nativeElement as HTMLElement | null;
      if (el) this.io?.observe(el);
    });
  }

  private start(): void {
    if (this.started()) return;
    this.started.set(true);
    const cfg = this.normalizedConfig();
    const target = cfg.target;
    const duration = cfg.durationMs ?? 0;
    if (duration <= 0) {
      this.internalValue.set(target);
      this.completed.emit();
      return;
    }
    const startTs = performance.now();
    const animate = (now: number) => {
      const elapsed = now - startTs;
      const t = Math.min(1, elapsed / duration);
      const eased = easeOutQuad(t);
      this.internalValue.set(target * eased);
      if (t < 1) {
        this.rafId = requestAnimationFrame(animate);
      } else {
        this.internalValue.set(target);
        this.completed.emit();
      }
    };
    this.zone.runOutsideAngular(() => {
      this.rafId = requestAnimationFrame(animate);
    });
  }
}
