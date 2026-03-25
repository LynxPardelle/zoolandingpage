import type {
    TAnalyticsConfigPayload,
    TAngoraCombosPayload,
    TComponentsPayload,
    TDraftLanguageDefinition,
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

const isDraftLanguageDefinition = (value: unknown): value is TDraftLanguageDefinition => {
    if (!isRecord(value)) return false;
    if (typeof value['code'] !== 'string' || value['code'].trim().length === 0) return false;
    if (value['label'] !== undefined && typeof value['label'] !== 'string') return false;
    if (value['dir'] !== undefined && value['dir'] !== 'ltr' && value['dir'] !== 'rtl' && value['dir'] !== 'auto') return false;
    if (value['ogLocale'] !== undefined && typeof value['ogLocale'] !== 'string') return false;
    if (value['aliases'] !== undefined && !isStringArray(value['aliases'])) return false;
    return true;
};

const isDraftI18nVariableConfig = (value: unknown): boolean => {
    if (!isRecord(value)) return false;
    if (value['defaultLanguage'] !== undefined && typeof value['defaultLanguage'] !== 'string') return false;

    const supportedLanguages = value['supportedLanguages'];
    if (supportedLanguages !== undefined) {
        if (!Array.isArray(supportedLanguages) || supportedLanguages.length === 0) return false;
        const allValid = supportedLanguages.every((entry) =>
            typeof entry === 'string'
                ? entry.trim().length > 0
                : isDraftLanguageDefinition(entry)
        );
        if (!allValid) return false;
    }

    return true;
};

const isNumberArray = (value: unknown): value is readonly number[] =>
    Array.isArray(value) && value.every((item) => typeof item === 'number' && Number.isFinite(item));

const isStringThunkFriendly = (value: unknown): boolean =>
    value === undefined || typeof value === 'string';

const isInteractionValidationRule = (value: unknown): boolean => {
    if (!isRecord(value) || typeof value['type'] !== 'string') return false;

    switch (value['type']) {
        case 'required':
        case 'email':
            return value['message'] === undefined || typeof value['message'] === 'string';
        case 'min':
        case 'max':
        case 'minLength':
        case 'maxLength':
            return typeof value['value'] === 'number' && Number.isFinite(value['value']);
        case 'pattern':
            return typeof value['value'] === 'string' && (value['flags'] === undefined || typeof value['flags'] === 'string');
        default:
            return false;
    }
};

const isInteractionNumericSource = (value: unknown): boolean => {
    if (!isRecord(value) || typeof value['source'] !== 'string') return false;
    if (value['source'] === 'field') {
        return typeof value['fieldId'] === 'string' && value['fieldId'].trim().length > 0;
    }
    if (value['source'] === 'literal') {
        return typeof value['value'] === 'number' && Number.isFinite(value['value']);
    }
    return false;
};

const isInteractionComputationStep = (value: unknown): boolean => {
    if (!isRecord(value) || typeof value['op'] !== 'string') return false;
    switch (value['op']) {
        case 'add':
        case 'subtract':
        case 'multiply':
        case 'divide':
        case 'min':
        case 'max':
            return isInteractionNumericSource(value['value']);
        case 'clamp':
            return (
                (value['min'] === undefined || (typeof value['min'] === 'number' && Number.isFinite(value['min']))) &&
                (value['max'] === undefined || (typeof value['max'] === 'number' && Number.isFinite(value['max'])))
            );
        case 'round':
            return value['precision'] === undefined || (typeof value['precision'] === 'number' && Number.isFinite(value['precision']));
        case 'abs':
        case 'floor':
        case 'ceil':
            return true;
        default:
            return false;
    }
};

const isInteractionComputedDefinition = (value: unknown): boolean => {
    if (!isRecord(value)) return false;
    if (typeof value['resultId'] !== 'string' || value['resultId'].trim().length === 0) return false;
    if (!isInteractionNumericSource(value['initial'])) return false;
    if (value['steps'] !== undefined && (!Array.isArray(value['steps']) || !value['steps'].every(isInteractionComputationStep))) {
        return false;
    }
    return true;
};

const isGenericInputOptionConfig = (value: unknown): boolean => {
    if (!isRecord(value)) return false;
    if (!isStringThunkFriendly(value['label'])) return false;
    if (value['description'] !== undefined && !isStringThunkFriendly(value['description'])) return false;
    return 'value' in value;
};

const isGenericInputConfig = (value: unknown): boolean => {
    if (!isRecord(value)) return false;
    if (typeof value['fieldId'] !== 'string' || value['fieldId'].trim().length === 0) return false;

    const controlType = value['controlType'];
    if (!['text', 'textarea', 'number', 'range', 'checkbox', 'select', 'button-group'].includes(String(controlType ?? ''))) {
        return false;
    }

    if (value['options'] !== undefined && (!Array.isArray(value['options']) || !value['options'].every(isGenericInputOptionConfig))) {
        return false;
    }

    if (value['validation'] !== undefined && (!Array.isArray(value['validation']) || !value['validation'].every(isInteractionValidationRule))) {
        return false;
    }

    return true;
};

const isInteractionScopeConfig = (value: unknown): boolean => {
    if (!isRecord(value)) return false;
    if (value['scopeId'] !== undefined && typeof value['scopeId'] !== 'string') return false;
    if (value['id'] !== undefined && typeof value['id'] !== 'string') return false;
    if (value['tag'] !== undefined && !['div', 'section', 'form'].includes(String(value['tag']))) return false;
    if (value['components'] !== undefined && !isStringArray(value['components'])) return false;
    if (value['initialValues'] !== undefined && !isRecord(value['initialValues'])) return false;
    if (value['submitEventInstructions'] !== undefined && typeof value['submitEventInstructions'] !== 'string') return false;
    if (value['computations'] !== undefined && (!Array.isArray(value['computations']) || !value['computations'].every(isInteractionComputedDefinition))) {
        return false;
    }
    return true;
};

const isComponentPayloadRecord = (value: unknown): boolean => {
    if (!isRecord(value)) return false;
    if (typeof value['id'] !== 'string' || value['id'].trim().length === 0) return false;
    if (typeof value['type'] !== 'string' || value['type'].trim().length === 0) return false;
    if (value['condition'] !== undefined && typeof value['condition'] !== 'string' && typeof value['condition'] !== 'boolean') return false;
    if (value['valueInstructions'] !== undefined && typeof value['valueInstructions'] !== 'string') return false;
    if (value['eventInstructions'] !== undefined && typeof value['eventInstructions'] !== 'string') return false;

    if (value['type'] === 'input') {
        return isGenericInputConfig(value['config']);
    }

    if (value['type'] === 'interaction-scope') {
        return isInteractionScopeConfig(value['config']);
    }

    return true;
};

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
    return Object.values(value['components']).every(isComponentPayloadRecord);
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

    const i18n = (value['variables'] as Record<string, unknown>)['i18n'];
    if (i18n !== undefined && !isDraftI18nVariableConfig(i18n)) {
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
