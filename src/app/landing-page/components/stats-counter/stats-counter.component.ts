import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  NgZone,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { STATS_COUNTER_DEFAULT, easeOutQuad } from './stats-counter.constants';
import type { StatsCounterConfig } from './stats-counter.types';

@Component({
  selector: 'stats-counter',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './stats-counter.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatsCounterComponent {
  private readonly zone = inject(NgZone);
  private readonly destroyRef = inject(DestroyRef);
  private readonly host = inject(ElementRef<HTMLElement>);

  readonly config = input<StatsCounterConfig>(STATS_COUNTER_DEFAULT);

  readonly internalValue = signal(0);
  readonly started = signal(false);
  readonly completed = output<void>();

  readonly displayValue = () => this.config().format!(this.internalValue());
  readonly ariaLabel = () => this.config().ariaLabel || `Counter value ${ this.displayValue() }`;

  private io?: IntersectionObserver;
  private rafId?: number;

  constructor() {
    effect(() => {
      const cfg = this.config();
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
      this.internalValue.set(this.config().target || 0);
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
    this.destroyRef.onDestroy(() => this.io?.disconnect());
  }

  private start(): void {
    if (this.started()) return;
    this.started.set(true);
    const target = this.config().target || 0;
    const duration = this.config().durationMs ?? 0;
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
    this.destroyRef.onDestroy(() => {
      if (this.rafId) cancelAnimationFrame(this.rafId);
    });
  }
}
