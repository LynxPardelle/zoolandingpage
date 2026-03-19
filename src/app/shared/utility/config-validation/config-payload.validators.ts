import type {
    TAnalyticsConfigPayload,
    TAngoraCombosPayload,
    TComponentsPayload,
    TI18nPayload,
    TPageConfigPayload,
    TSeoPayload,
    TStructuredDataPayload,
    TVariablesPayload,
} from '@/app/shared/types/config-payloads.types';
import {
    THEME_ACCENT_COLOR_TOKENS,
    THEME_COLOR_KEYS,
    THEME_MODES,
    type TThemeAccentColorToken,
    type TThemeColors,
    type TThemeVariableConfig,
} from '@/app/shared/types/theme.types';

const isRecord = (value: unknown): value is Record<string, unknown> =>
    !!value && typeof value === 'object' && !Array.isArray(value);

const isStringArray = (value: unknown): value is readonly string[] =>
    Array.isArray(value) && value.every((item) => typeof item === 'string');

const isNumberArray = (value: unknown): value is readonly number[] =>
    Array.isArray(value) && value.every((item) => typeof item === 'number' && Number.isFinite(item));

const isInteractiveProcessStepVariableConfig = (value: unknown): boolean => {
    if (!isRecord(value)) return false;

    const hasTitle = typeof value['title'] === 'string' || typeof value['titleKey'] === 'string';
    const hasDescription = typeof value['description'] === 'string' || typeof value['descriptionKey'] === 'string';
    const hasDetailed = typeof value['detailedDescription'] === 'string' || typeof value['detailedDescriptionKey'] === 'string';
    const hasDuration = typeof value['duration'] === 'string' || typeof value['durationKey'] === 'string';
    const hasDeliverables =
        isStringArray(value['deliverables']) ||
        typeof value['deliverablesKey'] === 'string' ||
        isStringArray(value['deliverableKeys']);

    return hasTitle && hasDescription && hasDetailed && hasDuration && hasDeliverables;
};

const isInteractiveProcessSectionVariableConfig = (value: unknown): boolean => {
    if (!isRecord(value)) return false;
    if (!Array.isArray(value['steps'])) return false;
    return value['steps'].every((step) => isInteractiveProcessStepVariableConfig(step));
};

const isStatsCounterVariableConfig = (value: unknown): boolean => {
    if (!isRecord(value)) return false;

    const target = value['target'];
    const durationMs = value['durationMs'];
    const min = value['min'];
    const max = value['max'];
    const formatMode = value['formatMode'];
    const formatPrefix = value['formatPrefix'];
    const formatSuffix = value['formatSuffix'];

    if (target !== undefined && (typeof target !== 'number' || !Number.isFinite(target))) return false;
    if (durationMs !== undefined && (typeof durationMs !== 'number' || !Number.isFinite(durationMs))) return false;
    if (min !== undefined && (typeof min !== 'number' || !Number.isFinite(min))) return false;
    if (max !== undefined && (typeof max !== 'number' || !Number.isFinite(max))) return false;
    if (formatMode !== undefined && typeof formatMode !== 'string') return false;
    if (formatPrefix !== undefined && typeof formatPrefix !== 'string') return false;
    if (formatSuffix !== undefined && typeof formatSuffix !== 'string') return false;

    return true;
};

const isStatsCountersVariableConfig = (value: unknown): boolean => {
    if (!isRecord(value)) return false;

    const sections = ['visits', 'cta', 'avgTime'] as const;
    return sections.every((key) => {
        const sectionValue = value[key];
        if (sectionValue === undefined) return true;
        return isStatsCounterVariableConfig(sectionValue);
    });
};

const isThemeColorToken = (value: unknown): value is TThemeAccentColorToken =>
    typeof value === 'string' && (THEME_ACCENT_COLOR_TOKENS as readonly string[]).includes(value);

const isThemeColors = (value: unknown): value is TThemeColors => {
    if (!isRecord(value)) return false;
    return THEME_COLOR_KEYS.every((key) => typeof value[key] === 'string');
};

const isThemeUiConfig = (value: unknown): boolean => {
    if (!isRecord(value)) return false;

    if (value['modalAccentColor'] !== undefined && !isThemeColorToken(value['modalAccentColor'])) return false;
    if (value['legalModalAccentColor'] !== undefined && !isThemeColorToken(value['legalModalAccentColor'])) return false;
    if (value['demoModalAccentColor'] !== undefined && !isThemeColorToken(value['demoModalAccentColor'])) return false;

    return true;
};

export const isThemeVariableConfig = (value: unknown): value is TThemeVariableConfig => {
    if (!isRecord(value)) return false;

    const defaultMode = value['defaultMode'];
    if (defaultMode !== undefined && (typeof defaultMode !== 'string' || !(THEME_MODES as readonly string[]).includes(defaultMode))) {
        return false;
    }

    const palettes = value['palettes'];
    if (!isRecord(palettes)) return false;
    if (!isThemeColors(palettes['light'])) return false;
    if (!isThemeColors(palettes['dark'])) return false;

    if (value['ui'] !== undefined && !isThemeUiConfig(value['ui'])) return false;

    return true;
};

export const isPageConfigPayload = (value: unknown): value is TPageConfigPayload => {
    if (!isRecord(value)) return false;
    if (typeof value['version'] !== 'number') return false;
    if (typeof value['pageId'] !== 'string') return false;
    if (typeof value['domain'] !== 'string') return false;
    if (!isStringArray(value['rootIds'])) return false;
    if (value['modalRootIds'] && !isStringArray(value['modalRootIds'])) return false;
    if (value['routes'] && !Array.isArray(value['routes'])) return false;
    return true;
};

export const isComponentsPayload = (value: unknown): value is TComponentsPayload => {
    if (!isRecord(value)) return false;
    if (typeof value['version'] !== 'number') return false;
    if (typeof value['pageId'] !== 'string') return false;
    if (typeof value['domain'] !== 'string') return false;
    if (!isRecord(value['components'])) return false;
    return true;
};

export const isAngoraCombosPayload = (value: unknown): value is TAngoraCombosPayload => {
    if (!isRecord(value)) return false;
    if (typeof value['version'] !== 'number') return false;
    if (typeof value['pageId'] !== 'string') return false;
    if (typeof value['domain'] !== 'string') return false;
    if (!isRecord(value['combos'])) return false;
    return Object.values(value['combos']).every((list) => isStringArray(list));
};

export const isVariablesPayload = (value: unknown): value is TVariablesPayload => {
    if (!isRecord(value)) return false;
    if (typeof value['version'] !== 'number') return false;
    if (typeof value['pageId'] !== 'string') return false;
    if (typeof value['domain'] !== 'string') return false;
    if (!isRecord(value['variables'])) return false;
    if (value['computed'] && !isRecord(value['computed'])) return false;

    const processSection = (value['variables'] as Record<string, unknown>)['processSection'];
    if (processSection !== undefined && !isInteractiveProcessSectionVariableConfig(processSection)) {
        return false;
    }

    const statsCounters = (value['variables'] as Record<string, unknown>)['statsCounters'];
    if (statsCounters !== undefined && !isStatsCountersVariableConfig(statsCounters)) {
        return false;
    }

    const theme = (value['variables'] as Record<string, unknown>)['theme'];
    if (theme !== undefined && !isThemeVariableConfig(theme)) {
        return false;
    }

    return true;
};

export const isI18nPayload = (value: unknown): value is TI18nPayload => {
    if (!isRecord(value)) return false;
    if (typeof value['version'] !== 'number') return false;
    if (typeof value['pageId'] !== 'string') return false;
    if (typeof value['domain'] !== 'string') return false;
    if (typeof value['lang'] !== 'string') return false;
    if (!isRecord(value['dictionary'])) return false;
    return true;
};

export const isSeoPayload = (value: unknown): value is TSeoPayload => {
    if (!isRecord(value)) return false;
    if (typeof value['version'] !== 'number') return false;
    if (typeof value['pageId'] !== 'string') return false;
    if (typeof value['domain'] !== 'string') return false;
    return true;
};

export const isStructuredDataPayload = (value: unknown): value is TStructuredDataPayload => {
    if (!isRecord(value)) return false;
    if (typeof value['version'] !== 'number') return false;
    if (typeof value['pageId'] !== 'string') return false;
    if (typeof value['domain'] !== 'string') return false;
    if (!Array.isArray(value['entries'])) return false;
    return true;
};

export const isAnalyticsConfigPayload = (value: unknown): value is TAnalyticsConfigPayload => {
    if (!isRecord(value)) return false;
    if (typeof value['version'] !== 'number') return false;
    if (typeof value['pageId'] !== 'string') return false;
    if (typeof value['domain'] !== 'string') return false;
    if (!isStringArray(value['sectionIds'])) return false;
    if (!isNumberArray(value['scrollMilestones'])) return false;
    return true;
};
