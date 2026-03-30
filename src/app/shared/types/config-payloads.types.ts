import type { TGenericInputConfig } from '../components/generic-input/generic-input.types';
import type { ModalConfig } from '../components/generic-modal/generic-modal.types';
import type { ToastUiConfig } from '../components/generic-toast/generic-toast.types';
import type { TInteractionScopeConfig } from '../components/interaction-scope/interaction-scope.types';
import type { TTrackOptions } from './analytics.type';
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

export type TDraftContactVariableConfig = {
    readonly whatsappPhone: string;
    readonly whatsappMessageKey?: string;
    readonly faqMessageKey?: string;
    readonly finalCtaMessageKey?: string;
};

export type TDraftSocialLinkConfig = {
    readonly id?: string;
    readonly url?: string;
    readonly href?: string;
    readonly icon?: string;
    readonly label?: string | Record<string, string>;
    readonly labelKey?: string;
    readonly ariaLabel?: string | Record<string, string>;
    readonly ariaLabelKey?: string;
    readonly target?: string;
    readonly rel?: string;
};

export type TDraftModalUiConfig = Pick<ModalConfig,
    'size'
    | 'closeOnBackdrop'
    | 'showCloseButton'
    | 'showAccentBar'
    | 'accentColor'
    | 'variant'
    | 'ariaLabel'
    | 'ariaDescribedBy'
    | 'containerClasses'
    | 'containerDialogClasses'
    | 'containerSheetClasses'
    | 'panelClasses'
    | 'panelDialogClasses'
    | 'panelSheetClasses'
    | 'panelMotionClasses'
    | 'panelNoMotionClasses'
    | 'panelSMClasses'
    | 'panelMDClasses'
    | 'panelLGClasses'
    | 'accentBarClasses'
    | 'closeButtonClasses'
> & {
    readonly ariaLabelKey?: string;
};

export type TDraftToastUiConfig = ToastUiConfig;

export type TDraftUiVariableConfig = {
    readonly contact?: TDraftContactVariableConfig;
    readonly modals?: Record<string, TDraftModalUiConfig>;
    readonly toast?: TDraftToastUiConfig;
    readonly languageOptions?: readonly Record<string, unknown>[];
};

export type TDraftSiteRouteEntry = {
    readonly path: string;
    readonly pageId: string;
    readonly label?: string;
    readonly labelKey?: string;
};

export type TDraftAppRuntimeConfig = {
    readonly identifier?: string;
    readonly name?: string;
    readonly version?: string;
    readonly description?: string;
};

export type TDraftLocalStorageSlot =
    | 'theme'
    | 'language'
    | 'userPreferences'
    | 'id'
    | 'sessionId'
    | 'allowAnalytics'
    | 'analyticsConsentSnooze'
    | 'pageViewCount';

export type TDraftLocalStorageRuntimeConfig = Partial<Record<TDraftLocalStorageSlot, string>>;

export type TDraftAnalyticsConsentUiMode = 'modal' | 'toast' | 'sheet' | 'none';

export type TDraftFeatureRuntimeConfig = {
    readonly analytics?: boolean;
    readonly debugMode?: boolean;
    readonly analyticsConsentUI?: TDraftAnalyticsConsentUiMode;
    readonly analyticsConsentSnoozeSeconds?: number;
};

export type TDraftSiteRuntimeConfig = {
    readonly app?: TDraftAppRuntimeConfig;
    readonly localStorage?: TDraftLocalStorageRuntimeConfig;
    readonly features?: TDraftFeatureRuntimeConfig;
};

export type TDraftSiteConfigPayload = {
    readonly version: number;
    readonly domain: string;
    readonly defaultPageId?: string;
    readonly routes: readonly TDraftSiteRouteEntry[];
    readonly runtime?: TDraftSiteRuntimeConfig;
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

export type TInputComponentPayload = TGenericInputConfig;
export type TInteractionScopeComponentPayload = TInteractionScopeConfig;

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
        readonly socialLinks?: readonly TDraftSocialLinkConfig[];
        readonly theme?: TThemeVariableConfig;
        readonly i18n?: TDraftI18nVariableConfig;
        readonly ui?: TDraftUiVariableConfig;
    };
    readonly computed?: Record<string, unknown>;
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
    readonly [key: string]: TStatsCounterVariableConfig | undefined;
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

export type TAnalyticsTaxonomyMap = {
    readonly [key: string]: string;
};

export type TAnalyticsConfigPayload = {
    readonly version: number;
    readonly pageId: string;
    readonly domain: string;
    readonly sectionIds: readonly string[];
    readonly scrollMilestones: readonly number[];
    readonly consentMode?: string;
    readonly events?: TAnalyticsTaxonomyMap;
    readonly categories?: TAnalyticsTaxonomyMap;
    readonly quickStatsCtaEvents?: readonly string[];
    readonly track?: readonly TTrackOptions[];
};
