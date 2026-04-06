export type TGenericStatsCounterFormatMode = 'number' | 'suffix' | 'percent' | 'prefix' | 'prefixSuffix' | string;

export type TGenericStatsCounterConfig = {
  readonly target: number;
  readonly durationMs?: number;
  readonly startOnVisible?: boolean;
  readonly ariaLabel?: string;
  readonly min?: number;
  readonly max?: number;
  readonly formatMode?: TGenericStatsCounterFormatMode;
  readonly formatPrefix?: string;
  readonly formatSuffix?: string;
};
