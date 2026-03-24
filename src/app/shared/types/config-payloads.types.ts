import type { TThemeVariableConfig } from './theme.types';

export type TDraftLanguageDefinition = {
    readonly code: string;
    readonly label?: string;
    readonly dir?: 'ltr' | 'rtl' | 'auto';
    readonly ogLocale?: string;
    readonly aliases?: readonly string[];
};

export type TDraftI18nVariableConfig = {
    readonly defaultLanguage?: string;
    readonly supportedLanguages?: readonly (string | TDraftLanguageDefinition)[];
};

export type TPageConfigPayload = {
    readonly version: number;
    readonly pageId: string;
    readonly domain: string;
    readonly rootIds: readonly string[];
    readonly modalRootIds?: readonly string[];
    readonly metadata?: Record<string, unknown>;
    readonly routes?: readonly { path: string; rootIds: readonly string[] }[];
};

export type TComponentsPayload = {
    readonly version: number;
    readonly pageId: string;
    readonly domain: string;
    readonly components: Record<string, unknown>;
};

export type TAngoraCombosPayload = {
    readonly version: number;
    readonly pageId: string;
    readonly domain: string;
    readonly combos: Record<string, readonly string[]>;
};

export type TVariablesPayload = {
    readonly version: number;
    readonly pageId: string;
    readonly domain: string;
    readonly variables: Record<string, unknown> & {
        readonly theme?: TThemeVariableConfig;
        readonly i18n?: TDraftI18nVariableConfig;
    };
    readonly computed?: Record<string, unknown>;
};

export type TInteractiveProcessVariableStep = {
    readonly step?: number;
    readonly icon?: string;
    readonly title?: string;
    readonly titleKey?: string;
    readonly description?: string;
    readonly descriptionKey?: string;
    readonly detailedDescription?: string;
    readonly detailedDescriptionKey?: string;
    readonly duration?: string;
    readonly durationKey?: string;
    readonly deliverables?: readonly string[];
    readonly deliverablesKey?: string;
    readonly deliverableKeys?: readonly string[];
};

export type TInteractiveProcessSectionVariableConfig = {
    readonly titleKey?: string;
    readonly sidebarTitleKey?: string;
    readonly detailedDescriptionLabelKey?: string;
    readonly deliverablesLabelKey?: string;
    readonly steps: readonly TInteractiveProcessVariableStep[];
};

export type TStatsCounterVariableConfig = {
    readonly target?: number;
    readonly durationMs?: number;
    readonly min?: number;
    readonly max?: number;
    readonly formatMode?: 'number' | 'suffix' | 'percent' | 'prefix' | 'prefixSuffix' | string;
    readonly formatPrefix?: string;
    readonly formatSuffix?: string;
};

export type TStatsCountersVariableConfig = {
    readonly visits?: TStatsCounterVariableConfig;
    readonly cta?: TStatsCounterVariableConfig;
    readonly avgTime?: TStatsCounterVariableConfig;
};

export type TI18nPayload = {
    readonly version: number;
    readonly pageId: string;
    readonly domain: string;
    readonly lang: string;
    readonly dictionary: Record<string, unknown>;
};

export type TSeoPayload = {
    readonly version: number;
    readonly pageId: string;
    readonly domain: string;
    readonly title?: string;
    readonly description?: string;
    readonly openGraph?: Record<string, unknown>;
    readonly twitter?: Record<string, unknown>;
    readonly canonical?: string;
};

export type TStructuredDataPayload = {
    readonly version: number;
    readonly pageId: string;
    readonly domain: string;
    readonly entries: readonly Record<string, unknown>[];
};

export type TAnalyticsConfigPayload = {
    readonly version: number;
    readonly pageId: string;
    readonly domain: string;
    readonly sectionIds: readonly string[];
    readonly scrollMilestones: readonly number[];
    readonly consentMode?: string;
};
