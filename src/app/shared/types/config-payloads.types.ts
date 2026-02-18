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
    readonly variables: Record<string, unknown>;
    readonly computed?: Record<string, unknown>;
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
