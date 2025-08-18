export type StatsCounterConfig = {
  readonly target: number;
  readonly durationMs?: number;
  readonly startOnVisible?: boolean;
  readonly format?: (value: number) => string;
  readonly ariaLabel?: string;
};
