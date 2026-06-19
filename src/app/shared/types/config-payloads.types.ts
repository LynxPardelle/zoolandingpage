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
    readonly logoUrl?: string;
    readonly logoAlt?: string;
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

export type TDraftLoadingCurtainUiConfig = {
    readonly enabled?: boolean;
    readonly title?: string;
    readonly subtitle?: string;
    readonly logoUrl?: string;
    readonly background?: string;
    readonly foreground?: string;
    readonly accent?: string;
    readonly minVisibleMs?: number;
    readonly exitDurationMs?: number;
};

export type TDraftUiVariableConfig = {
    readonly contact?: TDraftContactVariableConfig;
    readonly modals?: Record<string, TDraftModalUiConfig>;
    readonly toast?: TDraftToastUiConfig;
    readonly loadingCurtain?: TDraftLoadingCurtainUiConfig;
    readonly languageOptions?: readonly Record<string, unknown>[];
};

export type TDraftSiteSeoConfig = {
    readonly siteName?: string;
    readonly title?: string;
    readonly description?: string;
    readonly canonicalOrigin?: string;
    readonly enforceCanonicalHost?: boolean;
    readonly forceHttps?: boolean;
    readonly defaultImage?: string;
    readonly openGraph?: Record<string, unknown>;
    readonly twitter?: Record<string, unknown>;
    readonly keywords?: TLocalizedKeywordsValue;
    readonly robots?: TLocalizedTextValue;
};

export type TDraftRuntimeEnvironment = 'local' | 'test' | 'production';

export type TDraftEnvironmentGateConfig = Partial<Record<TDraftRuntimeEnvironment, boolean>>;

export type TSearchConsoleHtmlFileConfig = {
    readonly path: string;
    readonly content: string;
};

export type TSearchConsoleConfig = {
    readonly googleSiteVerification?: string;
    readonly htmlFile?: TSearchConsoleHtmlFileConfig;
    readonly environments?: TDraftEnvironmentGateConfig;
};

export type TDraftSiteIconConfig = {
    readonly favicon?: string;
    readonly appleTouchIcon?: string;
    readonly maskIcon?: string;
    readonly maskIconColor?: string;
    readonly themeColor?: string;
    readonly manifest?: string;
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
    readonly icons?: TDraftSiteIconConfig;
    readonly seo?: TDraftSiteSeoConfig;
    readonly searchConsole?: TSearchConsoleConfig;
    readonly hostOverrides?: Record<string, TDraftHostOverrideConfig>;
};

export type TDraftSiteDefaultsConfig = Omit<TDraftVariableConfig, 'appIdentity' | 'theme' | 'i18n'>;

export type TDraftSiteRouteEntry = {
    readonly path: string;
    readonly pageId: string;
    readonly label?: string;
    readonly labelKey?: string;
    readonly auth?: TDraftRouteAuthConfig;
};

export type TDraftAuthProvider = 'cognito';

export type TDraftAuthSessionRuntimeConfig = {
    readonly mode: 'server-cookie';
    readonly signinPath?: string;
    readonly mePath?: string;
    readonly logoutPath?: string;
    readonly challengeRespondPath?: string;
    readonly mfaSetupPath?: string;
    readonly mfaVerifyPath?: string;
    readonly mfaEnrollStartPath?: string;
    readonly mfaEnrollVerifyPath?: string;
    readonly mfaDisablePath?: string;
    readonly csrfCookieName?: string;
    readonly challengeCsrfCookieName?: string;
    readonly mfaEnrollCsrfCookieName?: string;
    readonly csrfHeaderName?: string;
};

export type TDraftAuthAdminRuntimeConfig = {
    readonly usersPath?: string;
    readonly approveUserPathTemplate?: string;
    readonly groupsPathTemplate?: string;
    readonly suspendUserPathTemplate?: string;
    readonly reactivateUserPathTemplate?: string;
    readonly resetUserMfaPathTemplate?: string;
};

export type TDraftAuthRuntimeConfig = {
    readonly enabled?: boolean;
    readonly authProfileId: string;
    readonly provider: TDraftAuthProvider;
    readonly issuer: string;
    readonly userPoolId?: string;
    readonly clientId: string;
    readonly hostedUiDomain: string;
    readonly scopes: readonly string[];
    readonly redirectPath: string;
    readonly logoutPath: string;
    readonly loginPath?: string;
    readonly loginPageId?: string;
    readonly logoutPageId?: string;
    readonly callbackPageId?: string;
    readonly accountPageId?: string;
    readonly postLoginPath?: string;
    readonly postLogoutPath?: string;
    readonly groupsClaim?: string;
    readonly allowedGroups?: readonly string[];
    readonly session?: TDraftAuthSessionRuntimeConfig;
    readonly admin?: TDraftAuthAdminRuntimeConfig;
};

export type TDraftAuthRemoteRuntimeConfig = {
    readonly enabled?: boolean;
    readonly authProfileId: string;
    readonly endpoint: string;
};

export type TDraftRouteAuthConfig = {
    readonly required?: boolean;
    readonly allowedGroups?: readonly string[];
    readonly redirectTo?: string;
};

export type TSiteLifecycleStatus = 'active' | 'maintenance' | 'suspended';

export type TSiteFallbackMode = 'system' | 'custom-message' | 'redirect';

export type TSiteLifecycleConfig = {
    readonly status: TSiteLifecycleStatus;
    readonly fallbackMode?: TSiteFallbackMode;
    readonly fallbackPageId?: string;
    readonly fallbackDomain?: string;
    readonly fallbackUrl?: string;
    readonly message?: string;
    readonly reason?: string;
    readonly supportEmail?: string;
    readonly supportPhone?: string;
    readonly updatedAt?: string;
    readonly updatedBy?: string;
};

export type TConfigVersionPointer = {
    readonly versionId: string;
    readonly prefix?: string;
    readonly updatedAt?: string;
    readonly updatedBy?: string;
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
    | 'adAttribution'
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

export type TGoogleTagAttributionStorage = 'session' | 'local';

export type TGoogleTagAttributionConfig = {
    readonly storage?: TGoogleTagAttributionStorage;
    readonly ttlDays?: number;
};

export type TGoogleTagConversionConfig = {
    readonly sendTo?: string;
    readonly adsId?: string;
    readonly label?: string;
    readonly value?: number;
    readonly currency?: string;
};

export type TGoogleTagEventMappingConfig = {
    readonly name?: string;
    readonly params?: Readonly<Record<string, string | number | boolean>>;
    readonly conversions?: readonly TGoogleTagConversionConfig[];
};

export type TGoogleTagEventMappingValue = string | TGoogleTagEventMappingConfig;

export type TGoogleTagConversionValue =
    | string
    | TGoogleTagConversionConfig
    | readonly TGoogleTagConversionConfig[];

export type TGoogleTagConfig = {
    readonly enabled?: boolean;
    readonly environments?: TDraftEnvironmentGateConfig;
    readonly measurementIds?: readonly string[];
    readonly ga4Ids?: readonly string[];
    readonly adsIds?: readonly string[];
    readonly gtmId?: string;
    readonly sendPageView?: boolean;
    readonly attribution?: TGoogleTagAttributionConfig;
    readonly events?: Record<string, TGoogleTagEventMappingValue>;
    readonly conversions?: Record<string, TGoogleTagConversionValue>;
};

export type TDraftHostOverrideConfig = {
    readonly seo?: TDraftSiteSeoConfig;
    readonly searchConsole?: TSearchConsoleConfig;
    readonly googleTag?: TGoogleTagConfig;
};

export type TDraftAnalyticsRuntimeConfig = TAnalyticsSharedConfig & {
    readonly enabled?: boolean;
    readonly consentUI?: TDraftAnalyticsConsentUiMode;
    readonly consentSnoozeSeconds?: number;
    readonly googleTag?: TGoogleTagConfig;
};

export type TDraftFeatureRuntimeConfig = {
    readonly debugMode?: boolean;
};

export type TDraftNavigationScrollRestorationMode = 'preserve' | 'top' | 'position';

export type TDraftNavigationScrollRestorationBehavior = 'auto' | 'smooth' | 'instant';

export type TDraftNavigationScrollRestorationConfig = {
    readonly mode?: TDraftNavigationScrollRestorationMode;
    readonly top?: number;
    readonly left?: number;
    readonly behavior?: TDraftNavigationScrollRestorationBehavior;
};

export type TDraftNavigationRuntimeConfig = {
    readonly scrollRestoration?: TDraftNavigationScrollRestorationConfig;
};

export type TRuntimeDataSourceFieldTransform =
    | 'uriComponent'
    | 'lastPathSegment'
    | 'lastPathSegmentNumber'
    | 'titleCase';

export type TRuntimeDataSourceFieldMapping =
    | string
    | {
        readonly path: string;
        readonly fallback?: unknown;
        readonly lookup?: Readonly<Record<string, unknown>>;
        readonly prefix?: string;
        readonly suffix?: string;
        readonly transform?: TRuntimeDataSourceFieldTransform;
    };

export type TRuntimeDataSourceMapperConfig = {
    readonly itemsPath?: string | null;
    readonly singleItem?: boolean;
    readonly prependItems?: readonly Record<string, unknown>[] | null;
    readonly fields?: Record<string, TRuntimeDataSourceFieldMapping> | null;
    readonly metaFields?: Record<string, TRuntimeDataSourceFieldMapping> | null;
};

export type TRuntimeDataSourceRefreshConfig = {
    readonly mode?: 'load' | 'interval';
    readonly intervalMs?: number;
};

export type TRuntimeDataSourceInputTransform = 'trim' | 'lowercase' | 'uppercase';

export type TRuntimeDataSourceInputResolverConfig = {
    readonly source: 'literal';
    readonly value?: unknown;
    readonly fallback?: unknown;
    readonly transforms?: readonly TRuntimeDataSourceInputTransform[];
} | {
    readonly source: 'queryParam';
    readonly key: string;
    readonly fallback?: unknown;
    readonly transforms?: readonly TRuntimeDataSourceInputTransform[];
} | {
    readonly source: 'var';
    readonly path: string;
    readonly fallback?: unknown;
    readonly transforms?: readonly TRuntimeDataSourceInputTransform[];
} | {
    readonly source: 'queryParamPageOffset';
    readonly pageKey?: string;
    readonly pageSizeKey?: string;
    readonly pageFallback?: number;
    readonly pageSizeFallback?: number;
    readonly pageIndexBase?: 0 | 1;
};

export type TRuntimeDataSourceConfig = {
    readonly id: string;
    readonly kind?: 'api-proxy' | 'auth-admin';
    readonly proxySourceId?: string;
    readonly authAdminSource?: 'account' | 'adminUsers';
    readonly target: string;
    readonly statusTarget?: string;
    readonly mergeMode?: 'replace' | 'appendItems';
    readonly clearTargetOnLoad?: boolean;
    readonly enabled?: boolean;
    readonly ssr?: boolean;
    readonly pageIds?: readonly string[];
    readonly requiredInputKeys?: readonly string[];
    readonly skipWhenQueryParams?: readonly string[];
    readonly input?: Record<string, unknown>;
    readonly mapper?: TRuntimeDataSourceMapperConfig | null;
    readonly refresh?: TRuntimeDataSourceRefreshConfig | null;
};

export type TRuntimeApiActionConfig = {
    readonly id: string;
    readonly kind?: 'api-proxy' | 'auth-admin';
    readonly proxyActionId?: string;
    readonly authAdminAction?: 'approveUser' | 'setUserGroups' | 'suspendUser' | 'reactivateUser' | 'resetUserMfa';
    readonly method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    readonly statusTarget?: string;
    readonly enabled?: boolean;
    readonly inputFields?: readonly string[];
    readonly requiresUserGesture?: boolean;
};

export type TDraftSiteRuntimeConfig = {
    readonly localStorage?: TDraftLocalStorageRuntimeConfig;
    readonly features?: TDraftFeatureRuntimeConfig;
    readonly analytics?: TDraftAnalyticsRuntimeConfig;
    readonly navigation?: TDraftNavigationRuntimeConfig;
    readonly auth?: TDraftAuthRuntimeConfig;
    readonly authRemote?: TDraftAuthRemoteRuntimeConfig;
    readonly dataSources?: readonly TRuntimeDataSourceConfig[];
    readonly apiActions?: readonly TRuntimeApiActionConfig[];
};

export type TDraftSitemapConfig = {
    readonly urls?: readonly string[];
    readonly excludePaths?: readonly string[];
};

export type TDraftSiteEnvironmentConfig = {
    readonly aliases?: readonly string[];
};

export type TDraftSiteConfigPayload = {
    readonly version: number;
    readonly domain: string;
    readonly aliases?: readonly string[];
    readonly environments?: Record<string, TDraftSiteEnvironmentConfig>;
    readonly defaultPageId?: string;
    readonly notFoundPageId?: string;
    readonly routes: readonly TDraftSiteRouteEntry[];
    readonly sitemap?: TDraftSitemapConfig;
    readonly lifecycle?: TSiteLifecycleConfig;
    readonly runtime?: TDraftSiteRuntimeConfig;
    readonly site: TDraftSiteSharedConfig;
    readonly defaults?: TDraftSiteDefaultsConfig;
};

export type TConfigRegistryPayload = {
    readonly version: number;
    readonly domain: string;
    readonly aliases?: readonly string[];
    readonly defaultPageId?: string;
    readonly notFoundPageId?: string;
    readonly routes: readonly TDraftSiteRouteEntry[];
    readonly lifecycle: TSiteLifecycleConfig;
    readonly draft?: TConfigVersionPointer;
    readonly published?: TConfigVersionPointer;
    readonly metadata?: Record<string, unknown>;
};

export type TLocalizedTextValue = string | Record<string, string>;

export type TLocalizedKeywordEntry = string | readonly string[];

export type TLocalizedKeywordsValue = TLocalizedKeywordEntry | Record<string, TLocalizedKeywordEntry>;

export type TSeoPayload = {
    readonly title?: TLocalizedTextValue;
    readonly description?: TLocalizedTextValue;
    readonly openGraph?: Record<string, unknown>;
    readonly twitter?: Record<string, unknown>;
    readonly canonical?: TLocalizedTextValue;
    readonly keywords?: TLocalizedKeywordsValue;
    readonly robots?: TLocalizedTextValue;
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

export type TRuntimeBundleSourceStage = 'draft' | 'published' | 'fallback';

export type TRuntimeBundlePayload = {
    readonly version: number;
    readonly domain: string;
    readonly pageId: string;
    readonly sourceStage: TRuntimeBundleSourceStage;
    readonly versionId?: string;
    readonly lang?: string;
    readonly generatedAt?: string;
    readonly route?: TDraftSiteRouteEntry | null;
    readonly lifecycle?: TSiteLifecycleConfig;
    readonly siteConfig: TDraftSiteConfigPayload;
    readonly pageConfig: TPageConfigPayload;
    readonly components: TComponentsPayload;
    readonly variables?: TVariablesPayload | null;
    readonly angoraCombos?: TAngoraCombosPayload | null;
    readonly i18n?: TI18nPayload | null;
    readonly metadata?: Record<string, unknown>;
};

export type TAuthoringDraftStage = 'draft' | 'published';

export type TAuthoringDraftFileKind =
    | 'site-config'
    | 'shared-components'
    | 'shared-variables'
    | 'shared-angora-combos'
    | 'shared-i18n'
    | 'page-config'
    | 'page-components'
    | 'variables'
    | 'angora-combos'
    | 'i18n'
    | 'server-auth-profile-registry'
    | 'server-integrations';

export type TAuthoringDraftFile = {
    readonly path: string;
    readonly kind: TAuthoringDraftFileKind;
    readonly pageId?: string;
    readonly lang?: string;
    readonly content: Record<string, unknown>;
};

export type TAuthoringDraftPackage = {
    readonly version: number;
    readonly domain: string;
    readonly stage: TAuthoringDraftStage;
    readonly versionId?: string;
    readonly files: readonly TAuthoringDraftFile[];
    readonly metadata?: Record<string, unknown>;
};

export type TAnalyticsConfigPayload = TPageAnalyticsConfig;

export type TResolvedAnalyticsConfig = TAnalyticsConfigPayload & {
    readonly enabled: boolean;
    readonly consentUI: TDraftAnalyticsConsentUiMode;
    readonly consentSnoozeSeconds: number;
    readonly googleTag?: TGoogleTagConfig;
};
