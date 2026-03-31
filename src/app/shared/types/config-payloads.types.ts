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

export type TDraftBrandVariableConfig = {
    readonly displayName?: string;
    readonly tagline?: string;
    readonly logoUrl?: string;
};

export type TDraftHeroAssetsVariableConfig = {
    readonly heroImageUrl?: string;
    readonly heroImageAlt?: string;
    readonly heroBackdropUrl?: string;
};

export type TDraftCtaTargetsVariableConfig = Record<string, string>;

export type TDraftNavigationVariableConfig = readonly Record<string, unknown>[];

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

export type TDraftSiteSeoConfig = {
    readonly siteName?: string;
    readonly title?: string;
    readonly description?: string;
    readonly canonicalOrigin?: string;
    readonly defaultImage?: string;
    readonly openGraph?: Record<string, unknown>;
    readonly twitter?: Record<string, unknown>;
};

export type TDraftVariableConfig = Record<string, unknown> & {
    readonly appIdentity?: TDraftAppIdentityVariableConfig;
    readonly brand?: TDraftBrandVariableConfig;
    readonly heroAssets?: TDraftHeroAssetsVariableConfig;
    readonly ctaTargets?: TDraftCtaTargetsVariableConfig;
    readonly navigation?: TDraftNavigationVariableConfig;
    readonly socialLinks?: readonly TDraftSocialLinkConfig[];
    readonly theme?: TThemeVariableConfig;
    readonly i18n?: TDraftI18nVariableConfig;
    readonly ui?: TDraftUiVariableConfig;
    readonly statsCounters?: TStatsCountersVariableConfig;
};

export type TDraftSiteSharedConfig = {
    readonly appIdentity: TDraftAppIdentityVariableConfig;
    readonly theme: TThemeVariableConfig;
    readonly i18n: TDraftI18nVariableConfig;
    readonly seo?: TDraftSiteSeoConfig;
};

export type TDraftSiteDefaultsConfig = Omit<TDraftVariableConfig, 'appIdentity' | 'theme' | 'i18n'>;

export type TDraftSiteRouteEntry = {
    readonly path: string;
    readonly pageId: string;
    readonly label?: string;
    readonly labelKey?: string;
};

export type TDraftAppIdentityVariableConfig = {
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

export type TAnalyticsTaxonomyMap = {
    readonly [key: string]: string;
};

export type TAnalyticsQuickStatsEventConfig = {
    readonly name: string;
    readonly path: string;
    readonly by?: number;
};

export type TAnalyticsQuickStatsPageViewConfig = {
    readonly event?: string;
    readonly path: string;
    readonly by?: number;
};

export type TAnalyticsQuickStatsConfig = {
    readonly pageView?: TAnalyticsQuickStatsPageViewConfig;
    readonly events?: readonly TAnalyticsQuickStatsEventConfig[];
};

export type TAnalyticsSharedConfig = {
    readonly events?: TAnalyticsTaxonomyMap;
    readonly categories?: TAnalyticsTaxonomyMap;
    readonly track?: readonly TTrackOptions[];
    readonly quickStats?: TAnalyticsQuickStatsConfig;
};

export type TDraftAnalyticsRuntimeConfig = TAnalyticsSharedConfig & {
    readonly enabled?: boolean;
    readonly consentUI?: TDraftAnalyticsConsentUiMode;
    readonly consentSnoozeSeconds?: number;
};

export type TDraftFeatureRuntimeConfig = {
    readonly debugMode?: boolean;
};

export type TDraftSiteRuntimeConfig = {
    readonly localStorage?: TDraftLocalStorageRuntimeConfig;
    readonly features?: TDraftFeatureRuntimeConfig;
    readonly analytics?: TDraftAnalyticsRuntimeConfig;
};

export type TDraftSiteConfigPayload = {
    readonly version: number;
    readonly domain: string;
    readonly defaultPageId?: string;
    readonly routes: readonly TDraftSiteRouteEntry[];
    readonly runtime?: TDraftSiteRuntimeConfig;
    readonly site: TDraftSiteSharedConfig;
    readonly defaults?: TDraftSiteDefaultsConfig;
};

export type TSeoPayload = {
    readonly title?: string;
    readonly description?: string;
    readonly openGraph?: Record<string, unknown>;
    readonly twitter?: Record<string, unknown>;
    readonly canonical?: string;
};

export type TStructuredDataPayload = {
    readonly entries: readonly Record<string, unknown>[];
};

export type TPageAnalyticsConfig = TAnalyticsSharedConfig & {
    readonly sectionIds?: readonly string[];
    readonly scrollMilestones?: readonly number[];
};

export type TPageConfigPayload = {
    readonly version: number;
    readonly pageId: string;
    readonly domain: string;
    readonly rootIds: readonly string[];
    readonly modalRootIds?: readonly string[];
    readonly metadata?: Record<string, unknown>;
    readonly routes?: readonly { path: string; rootIds: readonly string[] }[];
    readonly seo?: TSeoPayload;
    readonly structuredData?: TStructuredDataPayload;
    readonly analytics?: TPageAnalyticsConfig;
};

export type TComponentPayloadEntry = Record<string, unknown> & {
    readonly id: string;
    readonly type: string;
    readonly domain?: string;
    readonly pageId?: string;
};

export type TComponentsPayload = {
    readonly version: number;
    readonly pageId: string;
    readonly domain: string;
    readonly components: readonly TComponentPayloadEntry[];
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
    readonly variables: TDraftVariableConfig;
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

export type TAnalyticsConfigPayload = TPageAnalyticsConfig;

export type TResolvedAnalyticsConfig = TAnalyticsConfigPayload & {
    readonly enabled: boolean;
    readonly consentUI: TDraftAnalyticsConsentUiMode;
    readonly consentSnoozeSeconds: number;
};
