import { StatsCounterConfig } from './stats-counter.types';

export const STATS_COUNTER_DEFAULT: StatsCounterConfig = {
  target: 0,
  durationMs: 1200,
  startOnVisible: true,
  format: (v: number) => Math.round(v).toString(),
  ariaLabel: undefined,
} as const;

export function easeOutQuad(t: number): number {
  return 1 - (1 - t) * (1 - t);
}
