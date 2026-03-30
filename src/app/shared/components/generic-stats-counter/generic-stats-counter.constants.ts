import { TGenericStatsCounterConfig } from './generic-stats-counter.types';

export const STATS_COUNTER_DEFAULT: TGenericStatsCounterConfig = {
  target: 0,
  durationMs: 1200,
  startOnVisible: true,
  ariaLabel: undefined,
  min: undefined,
  max: undefined,
  formatMode: 'number',
  formatPrefix: '',
  formatSuffix: '',
} as const;

export function easeOutQuad(t: number): number {
  return 1 - (1 - t) * (1 - t);
}

const coerceFiniteNumber = (value: unknown, fallback: number): number => {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
};

const coerceOptionalFiniteNumber = (value: unknown): number | undefined => {
  if (value == null || value === '') {
    return undefined;
  }

  const next = Number(value);
  return Number.isFinite(next) ? next : undefined;
};

const decodeNumericEntities = (value: string): string => {
  const decimalDecoded = value.replace(/&#(\d+);/g, (_match, dec) => {
    const codePoint = Number(dec);
    return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : '';
  });

  return decimalDecoded.replace(/&#x([\da-fA-F]+);/g, (_match, hex) => {
    const codePoint = Number.parseInt(hex, 16);
    return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : '';
  });
};

const roundValue = (value: number): number => Math.round(value);

const localizedRounded = (value: number): string => roundValue(value).toLocaleString();

const normalizedFormatMode = (value: unknown): string => String(value ?? 'number').trim().toLowerCase();

export function clampStatsCounterTarget(target: number, min?: number, max?: number): number {
  if (min !== undefined && max !== undefined && min > max) {
    return target;
  }

  if (min !== undefined && target < min) {
    return min;
  }

  if (max !== undefined && target > max) {
    return max;
  }

  return target;
}

export function normalizeStatsCounterConfig(config: Partial<TGenericStatsCounterConfig> | null | undefined): TGenericStatsCounterConfig {
  const target = coerceFiniteNumber(config?.target ?? STATS_COUNTER_DEFAULT.target, STATS_COUNTER_DEFAULT.target);
  const min = coerceOptionalFiniteNumber(config?.min);
  const max = coerceOptionalFiniteNumber(config?.max);

  return {
    target: clampStatsCounterTarget(target, min, max),
    durationMs: coerceOptionalFiniteNumber(config?.durationMs) ?? STATS_COUNTER_DEFAULT.durationMs,
    startOnVisible: config?.startOnVisible == null ? STATS_COUNTER_DEFAULT.startOnVisible : Boolean(config.startOnVisible),
    ariaLabel: config?.ariaLabel == null ? undefined : String(config.ariaLabel),
    min,
    max,
    formatMode: normalizedFormatMode(config?.formatMode ?? STATS_COUNTER_DEFAULT.formatMode),
    formatPrefix: decodeNumericEntities(String(config?.formatPrefix ?? STATS_COUNTER_DEFAULT.formatPrefix ?? '')),
    formatSuffix: decodeNumericEntities(String(config?.formatSuffix ?? STATS_COUNTER_DEFAULT.formatSuffix ?? '')),
  };
}

export function formatStatsCounterValue(value: number, config: TGenericStatsCounterConfig): string {
  const prefix = config.formatPrefix ?? '';
  const suffix = config.formatSuffix ?? '';
  const mode = normalizedFormatMode(config.formatMode);

  if (mode === 'percent') {
    return `${ roundValue(value) }%`;
  }

  if (mode === 'suffix') {
    return `${ roundValue(value) }${ suffix }`;
  }

  if (mode === 'prefix') {
    return `${ prefix }${ localizedRounded(value) }`;
  }

  if (mode === 'prefixsuffix') {
    return `${ prefix }${ localizedRounded(value) }${ suffix }`;
  }

  return `${ prefix }${ localizedRounded(value) }${ suffix }`;
}
