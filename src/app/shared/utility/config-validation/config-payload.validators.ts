import type { TTrackOptions } from '@/app/shared/types/analytics.type';
import type {
    TAnalyticsConfigPayload,
    TAnalyticsQuickStatsConfig,
    TAnalyticsQuickStatsEventConfig,
    TAnalyticsQuickStatsPageViewConfig,
    TAngoraCombosPayload,
    TAuthoringDraftFile,
    TAuthoringDraftPackage,
    TComponentsPayload,
    TConfigRegistryPayload,
    TConfigVersionPointer,
    TDraftAnalyticsRuntimeConfig,
    TDraftAppIdentityVariableConfig,
    TDraftAuthRemoteRuntimeConfig,
    TDraftAuthRuntimeConfig,
    TDraftEnvironmentGateConfig,
    TDraftContactVariableConfig,
    TDraftFeatureRuntimeConfig,
    TDraftHostOverrideConfig,
    TDraftLoadingCurtainUiConfig,
    TDraftLanguageDefinition,
    TDraftLocalStorageRuntimeConfig,
    TDraftLocalStorageSlot,
    TDraftModalUiConfig,
    TDraftSiteConfigPayload,
    TDraftSiteDefaultsConfig,
    TDraftSiteEnvironmentConfig,
    TDraftSiteIconConfig,
    TDraftSiteRuntimeConfig,
    TDraftRouteAuthConfig,
    TDraftSiteSeoConfig,
    TDraftSiteSharedConfig,
    TDraftSocialLinkConfig,
    TDraftToastUiConfig,
    TDraftUiVariableConfig,
    TI18nPayload,
    TPageConfigPayload,
    TRuntimeApiActionConfig,
    TRuntimeBundlePayload,
    TRuntimeDataSourceConfig,
    TRuntimeDataSourceFieldMapping,
    TRuntimeDataSourceMapperConfig,
    TRuntimeDataSourceRefreshConfig,
    TSeoPayload,
    TSearchConsoleConfig,
    TSiteLifecycleConfig,
    TGoogleTagConfig,
    TGoogleTagConversionConfig,
    TGoogleTagConversionValue,
    TGoogleTagEventMappingValue,
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

const hasOnlyKnownKeys = (value: Record<string, unknown>, keys: ReadonlySet<string>): boolean =>
    Object.keys(value).every((key) => keys.has(key));

const ALLOWED_TRACK_OPTIONS = new Set<TTrackOptions>([
    'ip',
    'userAgent',
    'language',
    'platform',
    'vendor',
    'cookiesEnabled',
    'doNotTrack',
    'screenWidth',
    'screenHeight',
    'colorDepth',
    'timezone',
    'geolocationLatitude',
    'geolocationLongitude',
    'geolocationAccuracy',
    'cookies',
    'battery',
    'connection',
]);

const ALLOWED_RUNTIME_API_ACTION_METHODS = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']);
const ALLOWED_RUNTIME_DATA_SOURCE_KEYS = new Set([
    'id',
    'kind',
    'proxySourceId',
    'authAdminSource',
    'target',
    'statusTarget',
    'mergeMode',
    'clearTargetOnLoad',
    'enabled',
    'ssr',
    'pageIds',
    'requiredInputKeys',
    'skipWhenQueryParams',
    'input',
    'mapper',
    'refresh',
]);
const ALLOWED_RUNTIME_API_ACTION_KEYS = new Set([
    'id',
    'kind',
    'proxyActionId',
    'authAdminAction',
    'method',
    'statusTarget',
    'enabled',
    'inputFields',
    'requiresUserGesture',
]);
const ALLOWED_RUNTIME_DATA_SOURCE_INPUT_SOURCES = new Set(['literal', 'queryParam', 'var', 'queryParamPageOffset']);
const ALLOWED_RUNTIME_DATA_SOURCE_INPUT_TRANSFORMS = new Set(['trim', 'lowercase', 'uppercase']);
const ALLOWED_RUNTIME_DATA_SOURCE_FIELD_TRANSFORMS = new Set(['uriComponent', 'lastPathSegment', 'lastPathSegmentNumber', 'titleCase']);
const ALLOWED_AUTH_PROVIDERS = new Set(['cognito']);
const ALLOWED_AUTH_CONFIG_KEYS = new Set([
    'enabled',
    'authProfileId',
    'provider',
    'issuer',
    'userPoolId',
    'clientId',
    'hostedUiDomain',
    'scopes',
    'redirectPath',
    'logoutPath',
    'loginPath',
    'loginPageId',
    'logoutPageId',
    'callbackPageId',
    'accountPageId',
    'postLoginPath',
    'postLogoutPath',
    'groupsClaim',
    'allowedGroups',
    'session',
    'admin',
]);
const ALLOWED_AUTH_SESSION_CONFIG_KEYS = new Set([
    'mode',
    'signinPath',
    'mePath',
    'logoutPath',
    'challengeRespondPath',
    'mfaSetupPath',
    'mfaVerifyPath',
    'csrfCookieName',
    'challengeCsrfCookieName',
    'csrfHeaderName',
]);
const ALLOWED_AUTH_ADMIN_CONFIG_KEYS = new Set([
    'usersPath',
    'approveUserPathTemplate',
    'groupsPathTemplate',
    'suspendUserPathTemplate',
    'reactivateUserPathTemplate',
]);
const ALLOWED_AUTH_REMOTE_CONFIG_KEYS = new Set([
    'enabled',
    'authProfileId',
    'endpoint',
]);

const ALLOWED_LOCAL_STORAGE_SLOTS = new Set<TDraftLocalStorageSlot>([
    'theme',
    'language',
    'userPreferences',
    'id',
    'sessionId',
    'allowAnalytics',
    'analyticsConsentSnooze',
    'adAttribution',
    'pageViewCount',
]);

const ALLOWED_RUNTIME_ENVIRONMENTS = new Set(['local', 'test', 'production']);
const GOOGLE_MEASUREMENT_ID_PATTERN = /^(?:G|GT)-[A-Z0-9_-]+$/;
const GOOGLE_ADS_ID_PATTERN = /^AW-[A-Z0-9_-]+$/;
const GOOGLE_TAG_MANAGER_ID_PATTERN = /^GTM-[A-Z0-9_-]+$/;

const ALLOWED_COMPONENT_TYPES = new Set([
    'accordion',
    'button',
    'container',
    'dropdown',
    'embed-frame',
    'generic-card',
    'icon',
    'input',
    'interaction-scope',
    'link',
    'media',
    'modal',
    'pagination',
    'loading-spinner',
    'progress-bar',
    'search-box',
    'stats-counter',
    'stepper',
    'tab-group',
    'text',
    'toast',
    'tooltip',
    'none',
]);

const ALLOWED_SITE_LIFECYCLE_STATUSES = new Set(['active', 'maintenance', 'suspended']);
const ALLOWED_SITE_FALLBACK_MODES = new Set(['system', 'custom-message', 'redirect']);
const ALLOWED_RUNTIME_BUNDLE_SOURCE_STAGES = new Set(['draft', 'published', 'fallback']);
const ALLOWED_AUTHORING_DRAFT_STAGES = new Set(['draft', 'published']);
const ALLOWED_AUTHORING_FILE_KINDS = new Set([
    'site-config',
    'shared-components',
    'shared-variables',
    'shared-angora-combos',
    'shared-i18n',
    'page-config',
    'page-components',
    'variables',
    'angora-combos',
    'i18n',
    'server-auth-profile-registry',
    'server-integrations',
]);

const ALLOWED_LOOP_BINDING_TRANSFORMS = new Set([
    'i18nKey',
    'locale',
    'navigationHref',
    'uriComponent',
]);

const isStringArray = (value: unknown): value is readonly string[] =>
    Array.isArray(value) && value.every((item) => typeof item === 'string');

const hasNoWhitespaceOrControlChars = (value: string): boolean =>
    !/[\s\u0000-\u001F\u007F]/.test(value);

const isHttpsAbsoluteUrl = (value: unknown): value is string => {
    if (typeof value !== 'string' || value.length === 0 || value.trim() !== value || value.includes('\\') || !hasNoWhitespaceOrControlChars(value)) {
        return false;
    }

    try {
        const parsed = new URL(value);
        return parsed.protocol === 'https:' && !parsed.username && !parsed.password;
    } catch {
        return false;
    }
};

const isSafeSameOriginPath = (value: unknown): value is string =>
    typeof value === 'string'
    && value.length > 0
    && value.trim() === value
    && value.startsWith('/')
    && !value.startsWith('//')
    && !value.includes('\\')
    && hasNoWhitespaceOrControlChars(value);

const isLocalizedKeywordValue = (value: unknown): boolean => {
    if (typeof value === 'string') return true;
    if (isStringArray(value)) return true;
    if (!isRecord(value)) return false;

    return Object.values(value).every((entry) => typeof entry === 'string' || isStringArray(entry));
};

const isLoopBindingSource = (value: unknown): boolean => {
    if (typeof value === 'string') return value.trim().length > 0;
    if (!isRecord(value)) return false;
    if (typeof value['from'] !== 'string' || value['from'].trim().length === 0) return false;
    if (value['transform'] !== undefined && !ALLOWED_LOOP_BINDING_TRANSFORMS.has(String(value['transform']))) {
        return false;
    }
    return true;
};

const isLoopBinding = (value: unknown): boolean => {
    if (!isRecord(value)) return false;
    if (typeof value['to'] !== 'string' || value['to'].trim().length === 0) return false;
    if (value['prefix'] !== undefined && typeof value['prefix'] !== 'string') return false;
    if (value['suffix'] !== undefined && typeof value['suffix'] !== 'string') return false;

    const sources = value['sources'];
    if (!Array.isArray(sources) || sources.length === 0 || !sources.every(isLoopBindingSource)) return false;

    return true;
};

const isLoopViewValueSource = (value: unknown): boolean => {
    if (!isRecord(value)) return false;
    if (!['literal', 'scope', 'var', 'host', 'queryParam'].includes(String(value['source']))) return false;
    if (value['source'] === 'queryParam' && (typeof value['key'] !== 'string' || value['key'].trim().length === 0)) {
        return false;
    }
    if (value['source'] !== 'literal' && (typeof value['path'] !== 'string' || value['path'].trim().length === 0)) {
        if (value['source'] === 'queryParam') return true;
        return false;
    }
    return true;
};

const isLoopViewActivation = (value: unknown): boolean => {
    if (!isRecord(value)) return false;
    return isLoopViewValueSource(value['source']);
};

const isLoopViewFilter = (value: unknown): boolean => {
    if (!isRecord(value)) return false;
    if (typeof value['path'] !== 'string' || value['path'].trim().length === 0) return false;
    if (value['op'] !== undefined && !['equals', 'notEquals', 'contains', 'includes', 'exists', 'notExists'].includes(String(value['op']))) {
        return false;
    }
    if (value['value'] !== undefined && isRecord(value['value']) && 'source' in value['value'] && !isLoopViewValueSource(value['value'])) {
        return false;
    }
    if (value['ignoreValues'] !== undefined && !Array.isArray(value['ignoreValues'])) return false;
    if (value['activeWhen'] !== undefined && !isLoopViewActivation(value['activeWhen'])) return false;
    return true;
};

const isLoopViewSortOption = (value: unknown): boolean => {
    if (!isRecord(value)) return false;
    if (typeof value['path'] !== 'string' || value['path'].trim().length === 0) return false;
    if (value['direction'] !== undefined && value['direction'] !== 'asc' && value['direction'] !== 'desc') return false;
    if (value['type'] !== undefined && value['type'] !== 'text' && value['type'] !== 'number') return false;
    return true;
};

const isLoopViewSort = (value: unknown): boolean => {
    if (!isRecord(value)) return false;
    if (value['path'] !== undefined && !isLoopViewSortOption(value)) return false;
    if (value['by'] !== undefined && !isLoopViewValueSource(value['by'])) return false;
    if (value['options'] !== undefined) {
        if (!isRecord(value['options'])) return false;
        if (!Object.values(value['options']).every(isLoopViewSortOption)) return false;
    }
    return value['path'] !== undefined || value['options'] !== undefined;
};

const isLoopViewPaginationValue = (value: unknown): boolean =>
    value === undefined || (typeof value === 'number' && Number.isFinite(value)) || isLoopViewValueSource(value);

const isLoopViewPagination = (value: unknown): boolean => {
    if (!isRecord(value)) return false;
    if (!isLoopViewPaginationValue(value['page'])) return false;
    if (!isLoopViewPaginationValue(value['pageSize'])) return false;
    if (value['pageIndexBase'] !== undefined && value['pageIndexBase'] !== 0 && value['pageIndexBase'] !== 1) return false;
    if (value['applyWhenAnyQueryParam'] !== undefined
        && (!Array.isArray(value['applyWhenAnyQueryParam'])
            || !value['applyWhenAnyQueryParam'].every((entry) => typeof entry === 'string' && entry.trim().length > 0))) return false;
    return true;
};

const isLoopCollectionView = (value: unknown): boolean => {
    if (!isRecord(value)) return false;
    if (value['filters'] !== undefined && (!Array.isArray(value['filters']) || !value['filters'].every(isLoopViewFilter))) return false;
    if (value['sort'] !== undefined && !isLoopViewSort(value['sort'])) return false;
    if (value['pagination'] !== undefined && !isLoopViewPagination(value['pagination'])) return false;
    return true;
};

const isLoopConfig = (value: unknown): boolean => {
    if (!isRecord(value)) return false;
    if (typeof value['templateId'] !== 'string' || value['templateId'].trim().length === 0) return false;
    if (value['idPrefix'] !== undefined && typeof value['idPrefix'] !== 'string') return false;
    if (value['view'] !== undefined && !isLoopCollectionView(value['view'])) return false;

    const bindings = value['bindings'];
    if (bindings !== undefined && (!Array.isArray(bindings) || !bindings.every(isLoopBinding))) {
        return false;
    }

    if (value['source'] === 'repeat') {
        return typeof value['count'] === 'number' && Number.isFinite(value['count']);
    }

    if (value['source'] === 'var' || value['source'] === 'i18n' || value['source'] === 'host') {
        return typeof value['path'] === 'string' && value['path'].trim().length > 0;
    }

    return false;
};

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

const isDraftContactVariableConfig = (value: unknown): value is TDraftContactVariableConfig => {
    if (!isRecord(value)) return false;
    if (typeof value['whatsappPhone'] !== 'string' || value['whatsappPhone'].trim().length === 0) return false;
    if (value['whatsappMessageKey'] !== undefined && typeof value['whatsappMessageKey'] !== 'string') return false;
    if (value['faqMessageKey'] !== undefined && typeof value['faqMessageKey'] !== 'string') return false;
    if (value['finalCtaMessageKey'] !== undefined && typeof value['finalCtaMessageKey'] !== 'string') return false;
    return true;
};

const isLocalizedStringRecord = (value: unknown): boolean => {
    if (!isRecord(value)) return false;
    return Object.values(value).every((entry) => typeof entry === 'string');
};

const isDraftSocialLinkConfig = (value: unknown): value is TDraftSocialLinkConfig => {
    if (!isRecord(value)) return false;

    const href = typeof value['href'] === 'string' ? value['href'].trim() : '';
    const url = typeof value['url'] === 'string' ? value['url'].trim() : '';
    if (!href && !url) return false;

    if (value['id'] !== undefined && typeof value['id'] !== 'string') return false;
    if (value['icon'] !== undefined && typeof value['icon'] !== 'string') return false;
    if (value['label'] !== undefined && typeof value['label'] !== 'string' && !isLocalizedStringRecord(value['label'])) return false;
    if (value['labelKey'] !== undefined && typeof value['labelKey'] !== 'string') return false;
    if (value['ariaLabel'] !== undefined && typeof value['ariaLabel'] !== 'string' && !isLocalizedStringRecord(value['ariaLabel'])) return false;
    if (value['ariaLabelKey'] !== undefined && typeof value['ariaLabelKey'] !== 'string') return false;
    if (value['target'] !== undefined && typeof value['target'] !== 'string') return false;
    if (value['rel'] !== undefined && typeof value['rel'] !== 'string') return false;

    return true;
};

const isDraftSiteRouteEntry = (value: unknown): boolean => {
    if (!isRecord(value)) return false;
    if (typeof value['path'] !== 'string' || value['path'].trim().length === 0) return false;
    if (typeof value['pageId'] !== 'string' || value['pageId'].trim().length === 0) return false;
    if (value['label'] !== undefined && typeof value['label'] !== 'string') return false;
    if (value['labelKey'] !== undefined && typeof value['labelKey'] !== 'string') return false;
    if (value['auth'] !== undefined && !isDraftRouteAuthConfig(value['auth'])) return false;
    return true;
};

const isDraftRouteAuthConfig = (value: unknown): value is TDraftRouteAuthConfig => {
    if (!isRecord(value)) return false;
    if (value['required'] !== undefined && typeof value['required'] !== 'boolean') return false;
    if (value['allowedGroups'] !== undefined && !isStringArray(value['allowedGroups'])) return false;
    if (value['redirectTo'] !== undefined && !isSafeSameOriginPath(value['redirectTo'])) return false;
    return true;
};

const isSiteLifecycleConfig = (value: unknown): value is TSiteLifecycleConfig => {
    if (!isRecord(value)) return false;
    if (typeof value['status'] !== 'string' || !ALLOWED_SITE_LIFECYCLE_STATUSES.has(value['status'])) return false;
    if (value['fallbackMode'] !== undefined && (typeof value['fallbackMode'] !== 'string' || !ALLOWED_SITE_FALLBACK_MODES.has(value['fallbackMode']))) return false;

    const optionalStrings = [
        'fallbackPageId',
        'fallbackDomain',
        'fallbackUrl',
        'message',
        'reason',
        'supportEmail',
        'supportPhone',
        'updatedAt',
        'updatedBy',
    ] as const;

    return optionalStrings.every((key) => value[key] === undefined || typeof value[key] === 'string');
};

const isConfigVersionPointer = (value: unknown): value is TConfigVersionPointer => {
    if (!isRecord(value)) return false;
    if (typeof value['versionId'] !== 'string' || value['versionId'].trim().length === 0) return false;

    const optionalStrings = ['prefix', 'updatedAt', 'updatedBy'] as const;
    return optionalStrings.every((key) => value[key] === undefined || typeof value[key] === 'string');
};

const isDraftAppIdentityVariableConfig = (value: unknown): value is TDraftAppIdentityVariableConfig => {
    if (!isRecord(value)) return false;
    if (value['identifier'] !== undefined && typeof value['identifier'] !== 'string') return false;
    if (value['name'] !== undefined && typeof value['name'] !== 'string') return false;
    if (value['version'] !== undefined && typeof value['version'] !== 'string') return false;
    if (value['description'] !== undefined && typeof value['description'] !== 'string') return false;
    return true;
};

const isDraftBrandVariableConfig = (value: unknown): boolean => {
    if (!isRecord(value)) return false;
    if (value['displayName'] !== undefined && typeof value['displayName'] !== 'string') return false;
    if (value['tagline'] !== undefined && typeof value['tagline'] !== 'string') return false;
    if (value['logoUrl'] !== undefined && typeof value['logoUrl'] !== 'string') return false;
    return true;
};

const isDraftHeroAssetsVariableConfig = (value: unknown): boolean => {
    if (!isRecord(value)) return false;
    if (value['logoUrl'] !== undefined && typeof value['logoUrl'] !== 'string') return false;
    if (value['logoAlt'] !== undefined && typeof value['logoAlt'] !== 'string') return false;
    if (value['heroImageUrl'] !== undefined && typeof value['heroImageUrl'] !== 'string') return false;
    if (value['heroImageAlt'] !== undefined && typeof value['heroImageAlt'] !== 'string') return false;
    if (value['heroBackdropUrl'] !== undefined && typeof value['heroBackdropUrl'] !== 'string') return false;
    return true;
};

const isDraftCtaTargetsVariableConfig = (value: unknown): boolean => {
    if (!isRecord(value)) return false;
    return Object.values(value).every((entry) => typeof entry === 'string');
};

const isDraftNavigationVariableConfig = (value: unknown): boolean =>
    Array.isArray(value) && value.every((entry) => isRecord(entry));

const isDraftLocalStorageRuntimeConfig = (value: unknown): value is TDraftLocalStorageRuntimeConfig => {
    if (!isRecord(value)) return false;

    return Object.entries(value).every(([key, entry]) =>
        ALLOWED_LOCAL_STORAGE_SLOTS.has(key as TDraftLocalStorageSlot)
        && typeof entry === 'string'
        && entry.trim().length > 0
    );
};

const isDraftFeatureRuntimeConfig = (value: unknown): value is TDraftFeatureRuntimeConfig => {
    if (!isRecord(value)) return false;
    if (value['debugMode'] !== undefined && typeof value['debugMode'] !== 'boolean') return false;
    return true;
};

const isDraftNavigationScrollRestorationConfig = (value: unknown): boolean => {
    if (!isRecord(value)) return false;
    if (value['mode'] !== undefined && !['preserve', 'top', 'position'].includes(String(value['mode']))) return false;
    if (value['behavior'] !== undefined && !['auto', 'smooth', 'instant'].includes(String(value['behavior']))) return false;
    if (value['top'] !== undefined && (typeof value['top'] !== 'number' || !Number.isFinite(value['top']))) return false;
    if (value['left'] !== undefined && (typeof value['left'] !== 'number' || !Number.isFinite(value['left']))) return false;
    return true;
};

const isDraftNavigationRuntimeConfig = (value: unknown): boolean => {
    if (!isRecord(value)) return false;
    if (value['scrollRestoration'] !== undefined && !isDraftNavigationScrollRestorationConfig(value['scrollRestoration'])) return false;
    return true;
};

const isDraftSiteSeoConfig = (value: unknown): value is TDraftSiteSeoConfig => {
    if (!isRecord(value)) return false;
    if (value['siteName'] !== undefined && typeof value['siteName'] !== 'string') return false;
    if (value['title'] !== undefined && typeof value['title'] !== 'string') return false;
    if (value['description'] !== undefined && typeof value['description'] !== 'string') return false;
    if (value['canonicalOrigin'] !== undefined && typeof value['canonicalOrigin'] !== 'string') return false;
    if (value['enforceCanonicalHost'] !== undefined && typeof value['enforceCanonicalHost'] !== 'boolean') return false;
    if (value['forceHttps'] !== undefined && typeof value['forceHttps'] !== 'boolean') return false;
    if (value['defaultImage'] !== undefined && typeof value['defaultImage'] !== 'string') return false;
    if (value['openGraph'] !== undefined && !isRecord(value['openGraph'])) return false;
    if (value['twitter'] !== undefined && !isRecord(value['twitter'])) return false;
    if (value['keywords'] !== undefined && !isLocalizedKeywordValue(value['keywords'])) return false;
    if (value['robots'] !== undefined && typeof value['robots'] !== 'string' && !isStringRecord(value['robots'])) return false;
    return true;
};

const isDraftBrowserAssetUrl = (value: unknown): boolean => {
    if (typeof value !== 'string') return false;

    const trimmed = value.trim();
    return trimmed.length > 0 && (trimmed.startsWith('/') || /^https:\/\//i.test(trimmed));
};

const isDraftSiteIconConfig = (value: unknown): value is TDraftSiteIconConfig => {
    if (!isRecord(value)) return false;

    const urlFields = ['favicon', 'appleTouchIcon', 'maskIcon', 'manifest'] as const;
    const colorFields = ['maskIconColor', 'themeColor'] as const;

    if (urlFields.some((field) => value[field] !== undefined && !isDraftBrowserAssetUrl(value[field]))) {
        return false;
    }

    if (colorFields.some((field) => value[field] !== undefined && (typeof value[field] !== 'string' || value[field].trim().length === 0))) {
        return false;
    }

    return [...urlFields, ...colorFields].some((field) => value[field] !== undefined);
};

const isEnvironmentGateConfig = (value: unknown): value is TDraftEnvironmentGateConfig => {
    if (!isRecord(value)) return false;
    return Object.entries(value).every(([key, entry]) =>
        ALLOWED_RUNTIME_ENVIRONMENTS.has(key)
        && typeof entry === 'boolean'
    );
};

const isSearchConsoleConfig = (value: unknown): value is TSearchConsoleConfig => {
    if (!isRecord(value)) return false;
    if (value['googleSiteVerification'] !== undefined
        && (typeof value['googleSiteVerification'] !== 'string' || value['googleSiteVerification'].trim().length === 0)) return false;
    if (value['environments'] !== undefined && !isEnvironmentGateConfig(value['environments'])) return false;

    const htmlFile = value['htmlFile'];
    if (htmlFile !== undefined) {
        if (!isRecord(htmlFile)) return false;
        const filePath = String(htmlFile['path'] ?? '').trim();
        const content = String(htmlFile['content'] ?? '').trim();
        if (!/^\/google[^/]*\.html$/i.test(filePath)) return false;
        if (!content) return false;
    }

    return value['googleSiteVerification'] !== undefined || value['htmlFile'] !== undefined;
};

const isAnalyticsQuickStatsEventConfig = (value: unknown): value is TAnalyticsQuickStatsEventConfig => {
    if (!isRecord(value)) return false;
    if (typeof value['name'] !== 'string' || value['name'].trim().length === 0) return false;
    if (typeof value['path'] !== 'string' || value['path'].trim().length === 0) return false;
    if (value['by'] !== undefined && (typeof value['by'] !== 'number' || !Number.isFinite(value['by']))) return false;
    return true;
};

const isAnalyticsQuickStatsPageViewConfig = (value: unknown): value is TAnalyticsQuickStatsPageViewConfig => {
    if (!isRecord(value)) return false;
    if (value['event'] !== undefined && (typeof value['event'] !== 'string' || value['event'].trim().length === 0)) return false;
    if (typeof value['path'] !== 'string' || value['path'].trim().length === 0) return false;
    if (value['by'] !== undefined && (typeof value['by'] !== 'number' || !Number.isFinite(value['by']))) return false;
    return true;
};

const isAnalyticsQuickStatsConfig = (value: unknown): value is TAnalyticsQuickStatsConfig => {
    if (!isRecord(value)) return false;
    if (value['pageView'] !== undefined && !isAnalyticsQuickStatsPageViewConfig(value['pageView'])) return false;

    const events = value['events'];
    if (events !== undefined && (!Array.isArray(events) || !events.every(isAnalyticsQuickStatsEventConfig))) {
        return false;
    }

    return true;
};

const isStringArrayMatching = (value: unknown, pattern: RegExp): value is readonly string[] =>
    Array.isArray(value)
    && value.every((entry) => typeof entry === 'string' && pattern.test(entry.trim()));

const isGoogleTagConversionConfig = (value: unknown): value is TGoogleTagConversionConfig => {
    if (typeof value === 'string') return /^AW-[A-Z0-9_-]+\/[A-Za-z0-9_-]+$/.test(value.trim());
    if (!isRecord(value)) return false;

    const sendTo = String(value['sendTo'] ?? '').trim();
    const adsId = String(value['adsId'] ?? '').trim();
    const label = String(value['label'] ?? '').trim();
    if (sendTo) {
        if (!/^AW-[A-Z0-9_-]+\/[A-Za-z0-9_-]+$/.test(sendTo)) return false;
    } else if (!GOOGLE_ADS_ID_PATTERN.test(adsId) || !label) {
        return false;
    }

    if (value['value'] !== undefined && (typeof value['value'] !== 'number' || !Number.isFinite(value['value']))) return false;
    if (value['currency'] !== undefined && (typeof value['currency'] !== 'string' || value['currency'].trim().length === 0)) return false;
    return true;
};

const isGoogleTagConversionValue = (value: unknown): value is TGoogleTagConversionValue => {
    if (Array.isArray(value)) {
        return value.length > 0 && value.every(isGoogleTagConversionConfig);
    }

    return isGoogleTagConversionConfig(value);
};

const isGoogleTagEventMappingValue = (value: unknown): value is TGoogleTagEventMappingValue => {
    if (typeof value === 'string') return value.trim().length > 0;
    if (!isRecord(value)) return false;
    if (value['name'] !== undefined && (typeof value['name'] !== 'string' || value['name'].trim().length === 0)) return false;
    if (value['params'] !== undefined && !isGoogleTagEventParams(value['params'])) return false;
    if (value['conversions'] !== undefined
        && (!Array.isArray(value['conversions']) || !value['conversions'].every(isGoogleTagConversionConfig))) return false;
    return value['name'] !== undefined || value['params'] !== undefined || value['conversions'] !== undefined;
};

const isGoogleTagEventParams = (value: unknown): value is Record<string, string | number | boolean> => {
    if (!isRecord(value)) return false;
    return Object.entries(value).every(([key, entry]) =>
        /^[A-Za-z][A-Za-z0-9_]{0,63}$/.test(key)
        && (typeof entry === 'string' || typeof entry === 'number' || typeof entry === 'boolean')
        && (typeof entry !== 'number' || Number.isFinite(entry))
        && (typeof entry !== 'string' || (entry.trim().length > 0 && entry.trim().length <= 200 && !/@/.test(entry) && !/^https?:\/\//i.test(entry)))
    );
};

const isGoogleTagConfig = (value: unknown): value is TGoogleTagConfig => {
    if (!isRecord(value)) return false;
    if (value['enabled'] !== undefined && typeof value['enabled'] !== 'boolean') return false;
    if (value['environments'] !== undefined && !isEnvironmentGateConfig(value['environments'])) return false;
    if (value['measurementIds'] !== undefined && !isStringArrayMatching(value['measurementIds'], GOOGLE_MEASUREMENT_ID_PATTERN)) return false;
    if (value['ga4Ids'] !== undefined && !isStringArrayMatching(value['ga4Ids'], GOOGLE_MEASUREMENT_ID_PATTERN)) return false;
    if (value['adsIds'] !== undefined && !isStringArrayMatching(value['adsIds'], GOOGLE_ADS_ID_PATTERN)) return false;
    if (value['gtmId'] !== undefined
        && (typeof value['gtmId'] !== 'string' || !GOOGLE_TAG_MANAGER_ID_PATTERN.test(value['gtmId'].trim()))) return false;
    if (value['sendPageView'] !== undefined && typeof value['sendPageView'] !== 'boolean') return false;
    if (value['attribution'] !== undefined) {
        if (!isRecord(value['attribution'])) return false;
        if (value['attribution']['storage'] !== undefined
            && value['attribution']['storage'] !== 'session'
            && value['attribution']['storage'] !== 'local') return false;
        if (value['attribution']['ttlDays'] !== undefined
            && (typeof value['attribution']['ttlDays'] !== 'number' || !Number.isFinite(value['attribution']['ttlDays']) || value['attribution']['ttlDays'] < 0)) return false;
    }
    if (value['events'] !== undefined
        && (!isRecord(value['events']) || !Object.values(value['events']).every(isGoogleTagEventMappingValue))) return false;
    if (value['conversions'] !== undefined
        && (!isRecord(value['conversions']) || !Object.values(value['conversions']).every(isGoogleTagConversionValue))) return false;

    return true;
};

const isHostOverrideKey = (value: unknown): boolean => {
    const host = String(value ?? '').trim().toLowerCase();
    return host.length > 0
        && host.length <= 253
        && !host.includes(':')
        && /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)*[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(host);
};

const isDraftHostOverrideConfig = (value: unknown): value is TDraftHostOverrideConfig => {
    if (!isRecord(value)) return false;
    if (value['seo'] !== undefined && !isDraftSiteSeoConfig(value['seo'])) return false;
    if (value['searchConsole'] !== undefined && !isSearchConsoleConfig(value['searchConsole'])) return false;
    if (value['googleTag'] !== undefined && !isGoogleTagConfig(value['googleTag'])) return false;
    return value['seo'] !== undefined || value['searchConsole'] !== undefined || value['googleTag'] !== undefined;
};

const isDraftHostOverrideMap = (value: unknown): value is Record<string, TDraftHostOverrideConfig> => {
    if (!isRecord(value)) return false;
    return Object.entries(value).every(([host, config]) =>
        isHostOverrideKey(host) && isDraftHostOverrideConfig(config)
    );
};

const isDraftAnalyticsRuntimeConfig = (value: unknown): value is TDraftAnalyticsRuntimeConfig => {
    if (!isRecord(value)) return false;
    if (value['enabled'] !== undefined && typeof value['enabled'] !== 'boolean') return false;
    if (value['consentUI'] !== undefined
        && value['consentUI'] !== 'modal'
        && value['consentUI'] !== 'toast'
        && value['consentUI'] !== 'sheet'
        && value['consentUI'] !== 'none') return false;
    if (value['consentSnoozeSeconds'] !== undefined
        && (typeof value['consentSnoozeSeconds'] !== 'number' || !Number.isFinite(value['consentSnoozeSeconds']))) return false;
    if (value['events'] !== undefined && !isStringRecord(value['events'])) return false;
    if (value['categories'] !== undefined && !isStringRecord(value['categories'])) return false;
    if (value['quickStats'] !== undefined && !isAnalyticsQuickStatsConfig(value['quickStats'])) return false;
    if (value['googleTag'] !== undefined && !isGoogleTagConfig(value['googleTag'])) return false;
    if (value['track'] !== undefined
        && (!Array.isArray(value['track'])
            || !value['track'].every((entry) => typeof entry === 'string' && ALLOWED_TRACK_OPTIONS.has(entry as TTrackOptions)))) {
        return false;
    }
    return true;
};

const isRuntimeDataSourceFieldMapping = (value: unknown): value is TRuntimeDataSourceFieldMapping => {
    if (typeof value === 'string' && value.trim().length > 0) return true;
    if (!isRecord(value)) return false;
    if (typeof value['path'] !== 'string' || value['path'].trim().length === 0) return false;
    if (value['transform'] !== undefined
        && (typeof value['transform'] !== 'string'
            || !ALLOWED_RUNTIME_DATA_SOURCE_FIELD_TRANSFORMS.has(value['transform']))) return false;
    if (value['lookup'] !== undefined && !isRecord(value['lookup'])) return false;
    return true;
};

const isRuntimeDataSourceMapperConfig = (value: unknown): value is TRuntimeDataSourceMapperConfig => {
    if (value === null) return true;
    if (!isRecord(value)) return false;
    if (value['itemsPath'] !== undefined && value['itemsPath'] !== null && typeof value['itemsPath'] !== 'string') return false;
    if (value['singleItem'] !== undefined && typeof value['singleItem'] !== 'boolean') return false;
    if (value['prependItems'] !== undefined && value['prependItems'] !== null) {
        if (!Array.isArray(value['prependItems'])) return false;
        if (!value['prependItems'].every(isRecord)) return false;
    }
    if (value['fields'] !== undefined && value['fields'] !== null) {
        if (!isRecord(value['fields'])) return false;
        if (!Object.values(value['fields']).every(isRuntimeDataSourceFieldMapping)) return false;
    }
    if (value['metaFields'] !== undefined && value['metaFields'] !== null) {
        if (!isRecord(value['metaFields'])) return false;
        if (!Object.values(value['metaFields']).every(isRuntimeDataSourceFieldMapping)) return false;
    }
    return true;
};

const isRuntimeDataSourceRefreshConfig = (value: unknown): value is TRuntimeDataSourceRefreshConfig => {
    if (value === null) return true;
    if (!isRecord(value)) return false;
    if (value['mode'] !== undefined && value['mode'] !== 'load' && value['mode'] !== 'interval') return false;
    if (value['intervalMs'] !== undefined && (typeof value['intervalMs'] !== 'number' || !Number.isFinite(value['intervalMs']))) return false;
    return true;
};

const isRuntimeDataSourceInputResolverConfig = (value: Record<string, unknown>): boolean => {
    const source = value['source'];
    if (source === undefined) return true;
    if (typeof source !== 'string' || !ALLOWED_RUNTIME_DATA_SOURCE_INPUT_SOURCES.has(source)) return false;

    if (source === 'queryParam' && (typeof value['key'] !== 'string' || value['key'].trim().length === 0)) return false;
    if (source === 'var' && (typeof value['path'] !== 'string' || value['path'].trim().length === 0)) return false;
    if (source === 'queryParamPageOffset') {
        if (value['pageKey'] !== undefined && (typeof value['pageKey'] !== 'string' || value['pageKey'].trim().length === 0)) return false;
        if (value['pageSizeKey'] !== undefined && (typeof value['pageSizeKey'] !== 'string' || value['pageSizeKey'].trim().length === 0)) return false;
        if (value['pageFallback'] !== undefined && (typeof value['pageFallback'] !== 'number' || !Number.isFinite(value['pageFallback']))) return false;
        if (value['pageSizeFallback'] !== undefined && (typeof value['pageSizeFallback'] !== 'number' || !Number.isFinite(value['pageSizeFallback']))) return false;
        if (value['pageIndexBase'] !== undefined && value['pageIndexBase'] !== 0 && value['pageIndexBase'] !== 1) return false;
    }
    if (value['transforms'] !== undefined
        && (!Array.isArray(value['transforms'])
            || !value['transforms'].every((entry) => typeof entry === 'string'
                && ALLOWED_RUNTIME_DATA_SOURCE_INPUT_TRANSFORMS.has(entry)))) return false;

    return true;
};

const isRuntimeDataSourceInputConfig = (value: unknown): boolean => {
    if (!isRecord(value)) return false;

    return Object.values(value).every((entry) => {
        if (!isRecord(entry)) return true;
        return isRuntimeDataSourceInputResolverConfig(entry);
    });
};

const isRuntimeDataSourceConfig = (value: unknown): value is TRuntimeDataSourceConfig => {
    if (!isRecord(value)) return false;
    if (!hasOnlyKnownKeys(value, ALLOWED_RUNTIME_DATA_SOURCE_KEYS)) return false;
    if (typeof value['id'] !== 'string' || value['id'].trim().length === 0) return false;
    if (value['kind'] !== undefined && !['api-proxy', 'auth-admin'].includes(String(value['kind']))) return false;
    if (value['proxySourceId'] !== undefined && typeof value['proxySourceId'] !== 'string') return false;
    if (value['authAdminSource'] !== undefined && !['account', 'adminUsers'].includes(String(value['authAdminSource']))) return false;
    if (typeof value['target'] !== 'string' || value['target'].trim().length === 0) return false;
    if (value['statusTarget'] !== undefined && typeof value['statusTarget'] !== 'string') return false;
    if (value['mergeMode'] !== undefined && value['mergeMode'] !== 'replace' && value['mergeMode'] !== 'appendItems') return false;
    if (value['clearTargetOnLoad'] !== undefined && typeof value['clearTargetOnLoad'] !== 'boolean') return false;
    if (value['enabled'] !== undefined && typeof value['enabled'] !== 'boolean') return false;
    if (value['ssr'] !== undefined && typeof value['ssr'] !== 'boolean') return false;
    if (value['pageIds'] !== undefined
        && (!Array.isArray(value['pageIds'])
            || !value['pageIds'].every((entry) => typeof entry === 'string' && entry.trim().length > 0))) return false;
    if (value['requiredInputKeys'] !== undefined
        && (!Array.isArray(value['requiredInputKeys'])
            || !value['requiredInputKeys'].every((entry) => typeof entry === 'string' && entry.trim().length > 0))) return false;
    if (value['skipWhenQueryParams'] !== undefined
        && (!Array.isArray(value['skipWhenQueryParams'])
            || !value['skipWhenQueryParams'].every((entry) => typeof entry === 'string' && entry.trim().length > 0))) return false;
    if (value['input'] !== undefined && !isRuntimeDataSourceInputConfig(value['input'])) return false;
    if (value['mapper'] !== undefined && !isRuntimeDataSourceMapperConfig(value['mapper'])) return false;
    if (value['refresh'] !== undefined && !isRuntimeDataSourceRefreshConfig(value['refresh'])) return false;
    return true;
};

const isRuntimeApiActionConfig = (value: unknown): value is TRuntimeApiActionConfig => {
    if (!isRecord(value)) return false;
    if (!hasOnlyKnownKeys(value, ALLOWED_RUNTIME_API_ACTION_KEYS)) return false;
    if (typeof value['id'] !== 'string' || value['id'].trim().length === 0) return false;
    if (value['kind'] !== undefined && !['api-proxy', 'auth-admin'].includes(String(value['kind']))) return false;
    if (value['proxyActionId'] !== undefined && typeof value['proxyActionId'] !== 'string') return false;
    if (value['authAdminAction'] !== undefined
        && !['approveUser', 'setUserGroups', 'suspendUser', 'reactivateUser'].includes(String(value['authAdminAction']))) return false;
    if (value['method'] !== undefined
        && (typeof value['method'] !== 'string' || !ALLOWED_RUNTIME_API_ACTION_METHODS.has(value['method']))) return false;
    if (value['statusTarget'] !== undefined && typeof value['statusTarget'] !== 'string') return false;
    if (value['enabled'] !== undefined && typeof value['enabled'] !== 'boolean') return false;
    if (value['inputFields'] !== undefined
        && (!Array.isArray(value['inputFields'])
            || !value['inputFields'].every((entry) => typeof entry === 'string' && entry.trim().length > 0))) return false;
    if (value['requiresUserGesture'] !== undefined && typeof value['requiresUserGesture'] !== 'boolean') return false;
    return true;
};

const isDraftAuthSessionRuntimeConfig = (value: unknown): boolean => {
    if (!isRecord(value)) return false;
    if (!hasOnlyKnownKeys(value, ALLOWED_AUTH_SESSION_CONFIG_KEYS)) return false;
    if (value['mode'] !== 'server-cookie') return false;
    for (const key of ['signinPath', 'mePath', 'logoutPath', 'challengeRespondPath', 'mfaSetupPath', 'mfaVerifyPath']) {
        if (value[key] !== undefined && !isSafeSameOriginPath(value[key])) return false;
    }
    for (const key of ['csrfCookieName', 'challengeCsrfCookieName', 'csrfHeaderName']) {
        if (value[key] !== undefined
            && (typeof value[key] !== 'string' || value[key].trim().length === 0 || /[\s\u0000-\u001F\u007F]/.test(value[key]))) return false;
    }
    return true;
};

const isDraftAuthAdminRuntimeConfig = (value: unknown): boolean => {
    if (!isRecord(value)) return false;
    if (!hasOnlyKnownKeys(value, ALLOWED_AUTH_ADMIN_CONFIG_KEYS)) return false;
    for (const key of ALLOWED_AUTH_ADMIN_CONFIG_KEYS) {
        if (value[key] !== undefined && !isSafeSameOriginPath(value[key])) return false;
    }
    return true;
};

export const isDraftAuthRuntimeConfig = (value: unknown): value is TDraftAuthRuntimeConfig => {
    if (!isRecord(value)) return false;
    if (!Object.keys(value).every((key) => ALLOWED_AUTH_CONFIG_KEYS.has(key))) return false;
    if (value['enabled'] !== undefined && typeof value['enabled'] !== 'boolean') return false;
    if (typeof value['authProfileId'] !== 'string' || value['authProfileId'].trim().length === 0) return false;
    if (typeof value['provider'] !== 'string' || !ALLOWED_AUTH_PROVIDERS.has(value['provider'])) return false;
    if (!isHttpsAbsoluteUrl(value['issuer'])) return false;
    if (value['userPoolId'] !== undefined && typeof value['userPoolId'] !== 'string') return false;
    if (typeof value['clientId'] !== 'string' || value['clientId'].trim().length === 0) return false;
    if (!isHttpsAbsoluteUrl(value['hostedUiDomain'])) return false;
    if (!isStringArray(value['scopes']) || value['scopes'].length === 0) return false;
    if (!isSafeSameOriginPath(value['redirectPath'])) return false;
    if (!isSafeSameOriginPath(value['logoutPath'])) return false;
    if (value['loginPath'] !== undefined && !isSafeSameOriginPath(value['loginPath'])) return false;
    if (value['loginPageId'] !== undefined && typeof value['loginPageId'] !== 'string') return false;
    if (value['logoutPageId'] !== undefined && typeof value['logoutPageId'] !== 'string') return false;
    if (value['callbackPageId'] !== undefined && typeof value['callbackPageId'] !== 'string') return false;
    if (value['accountPageId'] !== undefined && typeof value['accountPageId'] !== 'string') return false;
    if (value['postLoginPath'] !== undefined && !isSafeSameOriginPath(value['postLoginPath'])) return false;
    if (value['postLogoutPath'] !== undefined && !isSafeSameOriginPath(value['postLogoutPath'])) return false;
    if (value['groupsClaim'] !== undefined && typeof value['groupsClaim'] !== 'string') return false;
    if (value['allowedGroups'] !== undefined && !isStringArray(value['allowedGroups'])) return false;
    if (value['session'] !== undefined && !isDraftAuthSessionRuntimeConfig(value['session'])) return false;
    if (value['admin'] !== undefined && !isDraftAuthAdminRuntimeConfig(value['admin'])) return false;
    return true;
};

const isDraftAuthRemoteRuntimeConfig = (value: unknown): value is TDraftAuthRemoteRuntimeConfig => {
    if (!isRecord(value)) return false;
    if (!hasOnlyKnownKeys(value, ALLOWED_AUTH_REMOTE_CONFIG_KEYS)) return false;
    if (value['enabled'] !== undefined && typeof value['enabled'] !== 'boolean') return false;
    if (typeof value['authProfileId'] !== 'string' || value['authProfileId'].trim().length === 0) return false;
    return isSafeSameOriginPath(value['endpoint']) || isHttpsAbsoluteUrl(value['endpoint']);
};

const isDraftSiteRuntimeConfig = (value: unknown): value is TDraftSiteRuntimeConfig => {
    if (!isRecord(value)) return false;
    if (value['app'] !== undefined) return false;
    if (value['auth'] !== undefined && value['authRemote'] !== undefined) return false;
    if (value['localStorage'] !== undefined && !isDraftLocalStorageRuntimeConfig(value['localStorage'])) return false;
    if (value['features'] !== undefined && !isDraftFeatureRuntimeConfig(value['features'])) return false;
    if (value['analytics'] !== undefined && !isDraftAnalyticsRuntimeConfig(value['analytics'])) return false;
    if (value['navigation'] !== undefined && !isDraftNavigationRuntimeConfig(value['navigation'])) return false;
    if (value['auth'] !== undefined && !isDraftAuthRuntimeConfig(value['auth'])) return false;
    if (value['authRemote'] !== undefined && !isDraftAuthRemoteRuntimeConfig(value['authRemote'])) return false;
    if (value['dataSources'] !== undefined
        && (!Array.isArray(value['dataSources']) || !value['dataSources'].every(isRuntimeDataSourceConfig))) return false;
    if (value['apiActions'] !== undefined
        && (!Array.isArray(value['apiActions']) || !value['apiActions'].every(isRuntimeApiActionConfig))) return false;
    return true;
};

const isDraftSitemapConfig = (value: unknown): boolean => {
    if (!isRecord(value)) return false;
    if (value['urls'] !== undefined
        && (!Array.isArray(value['urls'])
            || !value['urls'].every((entry) => typeof entry === 'string' && entry.trim().length > 0))) return false;
    if (value['excludePaths'] !== undefined
        && (!Array.isArray(value['excludePaths'])
            || !value['excludePaths'].every((entry) => typeof entry === 'string' && entry.trim().length > 0))) return false;
    return true;
};

const isDraftLoadingCurtainUiConfig = (value: unknown): value is TDraftLoadingCurtainUiConfig => {
    if (!isRecord(value)) return false;

    const stringFields = [
        'title',
        'subtitle',
        'logoUrl',
        'background',
        'foreground',
        'accent',
    ] as const;

    if (stringFields.some((field) => value[field] !== undefined && typeof value[field] !== 'string')) {
        return false;
    }

    if (value['enabled'] !== undefined && typeof value['enabled'] !== 'boolean') return false;
    if (value['minVisibleMs'] !== undefined && (typeof value['minVisibleMs'] !== 'number' || !Number.isFinite(value['minVisibleMs']))) return false;
    if (value['exitDurationMs'] !== undefined && (typeof value['exitDurationMs'] !== 'number' || !Number.isFinite(value['exitDurationMs']))) return false;

    return true;
};

const isNumberArray = (value: unknown): value is readonly number[] =>
    Array.isArray(value) && value.every((item) => typeof item === 'number' && Number.isFinite(item));

const isStringRecord = (value: unknown): value is Record<string, string> => {
    if (!isRecord(value)) return false;
    return Object.values(value).every((item) => typeof item === 'string');
};

const isStringThunkFriendly = (value: unknown): boolean =>
    value === undefined || typeof value === 'string';

const isTextLikeValue = (value: unknown): boolean =>
    value === undefined || typeof value === 'string' || (typeof value === 'number' && Number.isFinite(value));

const isBooleanThunkFriendly = (value: unknown): boolean =>
    value === undefined || typeof value === 'boolean';

const isNumberThunkFriendly = (value: unknown): boolean =>
    value === undefined || (typeof value === 'number' && Number.isFinite(value));

const isDropdownConfig = (value: unknown): boolean => {
    if (!isRecord(value)) return false;

    const stringFields = [
        'ariaLabel',
        'classes',
        'buttonClasses',
        'triggerRole',
        'itemLinkClasses',
        'selectedItemClasses',
        'disabledItemClasses',
        'menuContainerClasses',
        'menuNavClasses',
        'menuListClasses',
        'menuId',
        'menuContainerId',
        'inlinePortalTargetSelector',
    ] as const;

    if (stringFields.some((field) => value[field] !== undefined && typeof value[field] !== 'string')) return false;
    if (value['closeOnSelect'] !== undefined && typeof value['closeOnSelect'] !== 'boolean') return false;
    if (value['menuRole'] !== undefined && value['menuRole'] !== 'menu' && value['menuRole'] !== 'listbox') return false;
    if (value['itemRole'] !== undefined && value['itemRole'] !== 'menuitem' && value['itemRole'] !== 'option') return false;
    if (value['renderMode'] !== undefined && value['renderMode'] !== 'overlay' && value['renderMode'] !== 'inline') return false;
    if (value['overlayOrigin'] !== undefined && !['host', 'closestHeader', 'closestContainer'].includes(String(value['overlayOrigin']))) return false;
    if (value['overlayMatchWidth'] !== undefined && !['none', 'origin', 'viewport'].includes(String(value['overlayMatchWidth']))) return false;
    if (value['overlayOffsetY'] !== undefined && !isNumberThunkFriendly(value['overlayOffsetY'])) return false;

    return true;
};

const isGenericInputTextConfig = (value: unknown): boolean => {
    if (!isRecord(value)) return false;
    if (value['tag'] !== undefined && typeof value['tag'] !== 'string') return false;
    if (value['classes'] !== undefined && typeof value['classes'] !== 'string') return false;
    if (value['id'] !== undefined && typeof value['id'] !== 'string') return false;
    if (value['ariaLabel'] !== undefined && typeof value['ariaLabel'] !== 'string') return false;
    return true;
};

const isGenericButtonConfig = (value: unknown): boolean => {
    if (!isRecord(value)) return false;

    const stringFields = [
        'id',
        'classes',
        'disabledClasses',
        'loadingClasses',
        'label',
        'loadingLabel',
        'icon',
        'iconClasses',
        'spinnerClasses',
        'role',
        'ariaLabel',
        'ariaControls',
        'ariaActiveDescendant',
    ] as const;
    if (stringFields.some((field) => value[field] !== undefined && typeof value[field] !== 'string')) return false;

    const booleanFields = [
        'disabled',
        'disabledWhenInvalidScope',
        'loading',
        'ariaSelected',
        'ariaExpanded',
        'ariaHaspopup',
    ] as const;
    if (booleanFields.some((field) => value[field] !== undefined && typeof value[field] !== 'boolean')) return false;

    if (value['type'] !== undefined && !['button', 'submit', 'reset'].includes(String(value['type']))) return false;
    if (value['iconPosition'] !== undefined && value['iconPosition'] !== 'before' && value['iconPosition'] !== 'after') return false;
    if (value['tabIndex'] !== undefined && !isNumberThunkFriendly(value['tabIndex'])) return false;
    if (value['styles'] !== undefined && !isRecord(value['styles'])) return false;
    if (value['components'] !== undefined && !isStringArray(value['components'])) return false;

    return true;
};

const isGenericCardActionConfig = (value: unknown): boolean => {
    if (!isRecord(value)) return false;
    if (typeof value['label'] !== 'string' || value['label'].trim().length === 0) return false;
    if (value['ariaLabel'] !== undefined && typeof value['ariaLabel'] !== 'string') return false;
    if (value['eventInstructions'] !== undefined && typeof value['eventInstructions'] !== 'string') return false;
    if (value['confirmMessage'] !== undefined && typeof value['confirmMessage'] !== 'string') return false;
    if (value['classes'] !== undefined && typeof value['classes'] !== 'string') return false;
    if (value['disabled'] !== undefined && typeof value['disabled'] !== 'boolean') return false;
    if (value['loading'] !== undefined && typeof value['loading'] !== 'boolean') return false;
    if (value['icon'] !== undefined && typeof value['icon'] !== 'string') return false;
    if (value['iconClasses'] !== undefined && typeof value['iconClasses'] !== 'string') return false;
    if (value['iconPosition'] !== undefined && value['iconPosition'] !== 'before' && value['iconPosition'] !== 'after') return false;
    return true;
};

const isGenericCardConfig = (value: unknown): boolean => {
    if (!isRecord(value)) return false;

    if (value['variant'] !== undefined && value['variant'] !== 'feature' && value['variant'] !== 'testimonial') {
        return false;
    }

    if (value['classes'] !== undefined && typeof value['classes'] !== 'string') return false;
    if (value['icon'] !== undefined && typeof value['icon'] !== 'string') return false;
    if (value['title'] !== undefined && typeof value['title'] !== 'string') return false;
    if (value['description'] !== undefined && typeof value['description'] !== 'string') return false;
    if (value['buttonLabel'] !== undefined && typeof value['buttonLabel'] !== 'string') return false;
    if (value['buttonClasses'] !== undefined && typeof value['buttonClasses'] !== 'string') return false;
    if (value['linkEventInstructions'] !== undefined && typeof value['linkEventInstructions'] !== 'string') return false;
    if (value['featureIconContainerClasses'] !== undefined && typeof value['featureIconContainerClasses'] !== 'string') return false;
    if (value['featureIconClasses'] !== undefined && typeof value['featureIconClasses'] !== 'string') return false;
    if (value['featureTitleClasses'] !== undefined && typeof value['featureTitleClasses'] !== 'string') return false;
    if (value['featureDescriptionClasses'] !== undefined && typeof value['featureDescriptionClasses'] !== 'string') return false;
    if (value['benefitsListClasses'] !== undefined && typeof value['benefitsListClasses'] !== 'string') return false;
    if (value['benefitItemClasses'] !== undefined && typeof value['benefitItemClasses'] !== 'string') return false;
    if (value['benefitIconClasses'] !== undefined && typeof value['benefitIconClasses'] !== 'string') return false;
    if (value['benefitTextClasses'] !== undefined && typeof value['benefitTextClasses'] !== 'string') return false;
    if (value['actionListClasses'] !== undefined && typeof value['actionListClasses'] !== 'string') return false;
    if (value['actionButtonClasses'] !== undefined && typeof value['actionButtonClasses'] !== 'string') return false;
    if (value['name'] !== undefined && typeof value['name'] !== 'string') return false;
    if (value['role'] !== undefined && typeof value['role'] !== 'string') return false;
    if (value['company'] !== undefined && typeof value['company'] !== 'string') return false;
    if (value['content'] !== undefined && typeof value['content'] !== 'string') return false;
    if (value['avatar'] !== undefined && typeof value['avatar'] !== 'string') return false;
    if (value['verified'] !== undefined && typeof value['verified'] !== 'boolean') return false;
    if (value['testimonialHeaderClasses'] !== undefined && typeof value['testimonialHeaderClasses'] !== 'string') return false;
    if (value['testimonialAvatarClasses'] !== undefined && typeof value['testimonialAvatarClasses'] !== 'string') return false;
    if (value['testimonialAuthorClasses'] !== undefined && typeof value['testimonialAuthorClasses'] !== 'string') return false;
    if (value['testimonialNameClasses'] !== undefined && typeof value['testimonialNameClasses'] !== 'string') return false;
    if (value['testimonialRoleClasses'] !== undefined && typeof value['testimonialRoleClasses'] !== 'string') return false;
    if (value['testimonialVerifiedIconClasses'] !== undefined && typeof value['testimonialVerifiedIconClasses'] !== 'string') return false;
    if (value['testimonialContentClasses'] !== undefined && typeof value['testimonialContentClasses'] !== 'string') return false;
    if (value['testimonialRatingClasses'] !== undefined && typeof value['testimonialRatingClasses'] !== 'string') return false;
    if (value['testimonialStarClasses'] !== undefined && typeof value['testimonialStarClasses'] !== 'string') return false;
    if (value['testimonialRatingTextClasses'] !== undefined && typeof value['testimonialRatingTextClasses'] !== 'string') return false;
    if (value['rating'] !== undefined && (typeof value['rating'] !== 'number' || !Number.isFinite(value['rating']))) return false;
    if (value['benefits'] !== undefined && !isStringArray(value['benefits'])) return false;
    if (value['actions'] !== undefined && (!Array.isArray(value['actions']) || !value['actions'].every(isGenericCardActionConfig))) return false;
    if (value['onCta'] !== undefined) return false;

    return true;
};

const isInteractionValidationRule = (value: unknown): boolean => {
    if (!isRecord(value) || typeof value['type'] !== 'string') return false;

    switch (value['type']) {
        case 'required':
        case 'email':
            return value['message'] === undefined || typeof value['message'] === 'string';
        case 'matchesField':
            return typeof value['fieldId'] === 'string'
                && value['fieldId'].trim().length > 0
                && (value['message'] === undefined || typeof value['message'] === 'string');
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

const isInteractionAutoSubmitConfig = (value: unknown): boolean => {
    if (isBooleanThunkFriendly(value)) return true;
    if (!isRecord(value)) return false;
    if (value['enabled'] !== undefined && !isBooleanThunkFriendly(value['enabled'])) return false;
    if (value['enabledFieldId'] !== undefined && typeof value['enabledFieldId'] !== 'string') return false;
    if (value['enabledPath'] !== undefined && typeof value['enabledPath'] !== 'string') return false;
    if (value['eventNames'] !== undefined && !isStringArray(value['eventNames'])) return false;
    if (value['fieldIds'] !== undefined && !isStringArray(value['fieldIds'])) return false;
    return true;
};

const isGenericInputOptionConfig = (value: unknown): boolean => {
    if (!isRecord(value)) return false;
    if (!isStringThunkFriendly(value['label'])) return false;
    if (value['description'] !== undefined && !isStringThunkFriendly(value['description'])) return false;
    return 'value' in value;
};

const isGenericInputOptionsSourceConfig = (value: unknown): boolean => {
    if (!isRecord(value)) return false;
    if (value['source'] !== 'var' && value['source'] !== 'i18n') return false;
    if (typeof value['path'] !== 'string' || value['path'].trim().length === 0) return false;
    return value['fallback'] === undefined
        || (Array.isArray(value['fallback']) && value['fallback'].every(isGenericInputOptionConfig));
};

const isGenericInputOptionsConfig = (value: unknown): boolean =>
    Array.isArray(value)
        ? value.every(isGenericInputOptionConfig)
        : isGenericInputOptionsSourceConfig(value);

const isGenericInputConfig = (value: unknown): boolean => {
    if (!isRecord(value)) return false;
    if (typeof value['fieldId'] !== 'string' || value['fieldId'].trim().length === 0) return false;

    const controlType = value['controlType'];
    if (!['text', 'textarea', 'number', 'range', 'checkbox', 'switch', 'select', 'file', 'button-group'].includes(String(controlType ?? ''))) {
        return false;
    }

    if (value['options'] !== undefined && !isGenericInputOptionsConfig(value['options'])) {
        return false;
    }

    if (value['autocompleteOptions'] !== undefined && !isGenericInputOptionsConfig(value['autocompleteOptions'])) {
        return false;
    }

    if (value['validation'] !== undefined && (!Array.isArray(value['validation']) || !value['validation'].every(isInteractionValidationRule))) {
        return false;
    }

    const stringFields = [
        'name',
        'label',
        'description',
        'helperText',
        'placeholder',
        'accept',
        'ariaLabel',
        'classes',
        'labelClasses',
        'descriptionClasses',
        'helperTextClasses',
        'fieldClasses',
        'inputClasses',
        'switchTrackClasses',
        'switchTrackActiveClasses',
        'switchThumbClasses',
        'switchThumbActiveClasses',
        'dropdownTriggerClasses',
        'dropdownIndicatorText',
        'dropdownIndicatorClasses',
        'optionContainerClasses',
        'optionClasses',
        'activeOptionClasses',
        'errorClasses',
        'validationChecklistClasses',
        'validationChecklistItemClasses',
        'validationChecklistValidItemClasses',
        'validationChecklistInvalidItemClasses',
        'validationChecklistIconClasses',
        'validationChecklistLabel',
        'validationChecklistValidIcon',
        'validationChecklistInvalidIcon',
        'valuePrefix',
        'valueSuffix',
    ] as const;

    if (stringFields.some((field) => !isStringThunkFriendly(value[field]))) {
        return false;
    }

    const numberFields = ['min', 'max', 'step', 'rows', 'autocompleteMinLength', 'autocompleteMaxOptions'] as const;
    if (numberFields.some((field) => !isNumberThunkFriendly(value[field]))) {
        return false;
    }

    if (
        value['autocompleteMatchMode'] !== undefined
        && !['none', 'startsWith', 'contains'].includes(String(value['autocompleteMatchMode'] ?? ''))
    ) {
        return false;
    }

    const booleanFields = ['showRangeValue', 'showValidationChecklist', 'multiple', 'required', 'disabled', 'readOnly'] as const;
    if (booleanFields.some((field) => !isBooleanThunkFriendly(value[field]))) {
        return false;
    }

    const textConfigFields = ['labelTextConfig', 'descriptionTextConfig', 'helperTextConfig', 'errorTextConfig', 'dropdownTriggerTextConfig'] as const;
    if (textConfigFields.some((field) => value[field] !== undefined && !isGenericInputTextConfig(value[field]))) {
        return false;
    }

    if (value['dropdownConfig'] !== undefined && !isDropdownConfig(value['dropdownConfig'])) {
        return false;
    }

    return true;
};

const isSearchSuggestion = (value: unknown): boolean => {
    if (!isRecord(value)) return false;
    if (typeof value['id'] !== 'string' || value['id'].trim().length === 0) return false;
    if (typeof value['label'] !== 'string' || value['label'].trim().length === 0) return false;
    if (value['description'] !== undefined && typeof value['description'] !== 'string') return false;
    if (value['href'] !== undefined && typeof value['href'] !== 'string') return false;
    if (value['target'] !== undefined && !['_self', '_blank', '_parent', '_top'].includes(String(value['target']))) return false;
    return true;
};

const isSearchBoxConfig = (value: unknown): boolean => {
    if (!isRecord(value)) return false;

    const stringFields = [
        'ariaLabel',
        'placeholder',
        'classes',
        'inputClasses',
        'resultsClasses',
        'triggerIcon',
        'closeIcon',
        'triggerAriaLabel',
        'closeAriaLabel',
        'triggerClasses',
        'resultItemClasses',
        'statusItemClasses',
        'panelClasses',
        'panelContentClasses',
        'panelInputWrapperClasses',
    ] as const;

    if (stringFields.some((field) => value[field] !== undefined && typeof value[field] !== 'string')) {
        return false;
    }

    const numberFields = ['minLength', 'debounceMs', 'historyLimit', 'maxResults'] as const;
    if (numberFields.some((field) => value[field] !== undefined && !isNumberThunkFriendly(value[field]))) {
        return false;
    }

    const booleanFields = ['collapsed', 'historyEnabled'] as const;
    if (booleanFields.some((field) => value[field] !== undefined && typeof value[field] !== 'boolean')) {
        return false;
    }

    if (value['suggestions'] !== undefined && (!Array.isArray(value['suggestions']) || !value['suggestions'].every(isSearchSuggestion))) {
        return false;
    }

    return true;
};

const isAccordionItemsSource = (value: unknown): boolean => {
    if (!isRecord(value)) return false;
    if (value['source'] !== 'i18n' && value['source'] !== 'var') return false;
    return typeof value['path'] === 'string' && value['path'].trim().length > 0;
};

const isAccordionItem = (value: unknown): boolean => {
    if (!isRecord(value)) return false;

    const textFields = ['title', 'content', 'summary', 'meta', 'indexLabel', 'icon'] as const;
    if (textFields.some((field) => !isTextLikeValue(value[field]))) return false;

    const stringFields = [
        'id',
        'titleKey',
        'contentKey',
        'summaryKey',
        'metaKey',
        'detailItemsKey',
        'containerClasses',
        'containerIsExpandedClasses',
        'containerIsNotExpandedClasses',
        'panelClasses',
        'buttonIsExpandedClasses',
        'buttonIsNotExpandedClasses',
        'iconIsExpandedClasses',
        'iconIsNotExpandedClasses',
    ] as const;
    if (stringFields.some((field) => value[field] !== undefined && typeof value[field] !== 'string')) return false;

    if (value['detailItems'] !== undefined && !isStringArray(value['detailItems'])) return false;
    if (value['detailItemKeys'] !== undefined && !isStringArray(value['detailItemKeys'])) return false;
    if (value['step'] !== undefined && !isNumberThunkFriendly(value['step'])) return false;
    if (value['disabled'] !== undefined && typeof value['disabled'] !== 'boolean') return false;
    if (value['buttonConfig'] !== undefined && !isRecord(value['buttonConfig'])) return false;

    return true;
};

const isAccordionConfig = (value: unknown): boolean => {
    if (!isRecord(value)) return false;

    const stringFields = [
        'containerClasses',
        'defaultItemContainerClasses',
        'defaultItemContainerIsExpandedClasses',
        'defaultItemContainerIsNotExpandedClasses',
        'defaultItemButtonIsExpandedClasses',
        'defaultItemButtonIsNotExpandedClasses',
        'defaultItemPanelClasses',
        'defaultItemIconIsExpandedClasses',
        'defaultItemIconIsNotExpandedClasses',
        'buttonContentClasses',
        'textStackClasses',
        'indexLabelClasses',
        'indexLabelIsExpandedClasses',
        'indexLabelIsNotExpandedClasses',
        'titleClasses',
        'summaryClasses',
        'detailContainerClasses',
        'detailHeaderClasses',
        'detailIconClasses',
        'detailTextStackClasses',
        'detailTitleClasses',
        'detailMetaClasses',
        'detailMetaIconClasses',
        'detailSummaryClasses',
        'detailContentLabelClasses',
        'detailContentClasses',
        'detailItemsLabelClasses',
        'detailListClasses',
        'detailListItemClasses',
        'detailListItemIconClasses',
        'detailMetaIconName',
        'detailItemIconName',
        'toggleIconName',
    ] as const;
    if (stringFields.some((field) => value[field] !== undefined && typeof value[field] !== 'string')) return false;

    const textFields = ['detailContentLabel', 'detailItemsLabel'] as const;
    if (textFields.some((field) => !isTextLikeValue(value[field]))) return false;

    if (value['mode'] !== undefined && value['mode'] !== 'single' && value['mode'] !== 'multiple') return false;
    if (value['allowToggle'] !== undefined && typeof value['allowToggle'] !== 'boolean') return false;
    if (value['items'] !== undefined && (!Array.isArray(value['items']) || !value['items'].every(isAccordionItem))) return false;
    if (value['itemsSource'] !== undefined && !isAccordionItemsSource(value['itemsSource'])) return false;
    if (value['renderMode'] !== undefined && value['renderMode'] !== 'default' && value['renderMode'] !== 'detail') return false;
    if (value['activeId'] !== undefined && typeof value['activeId'] !== 'string') return false;
    if (value['activeIds'] !== undefined && !isStringArray(value['activeIds'])) return false;
    if (value['scrollBehavior'] !== undefined && value['scrollBehavior'] !== 'none' && value['scrollBehavior'] !== 'center') return false;
    if (value['defaultItemButtonConfig'] !== undefined && !isRecord(value['defaultItemButtonConfig'])) return false;

    return true;
};

const isTabItemsSource = (value: unknown): boolean => isAccordionItemsSource(value);

const isTabDefinition = (value: unknown): boolean => {
    if (!isRecord(value)) return false;

    const textFields = ['label', 'title', 'summary', 'content', 'meta', 'indexLabel', 'icon'] as const;
    if (textFields.some((field) => !isTextLikeValue(value[field]))) return false;

    const stringFields = ['id', 'labelKey', 'titleKey', 'summaryKey', 'contentKey', 'metaKey', 'detailItemsKey'] as const;
    if (stringFields.some((field) => value[field] !== undefined && typeof value[field] !== 'string')) return false;

    if (value['detailItems'] !== undefined && !isStringArray(value['detailItems'])) return false;
    if (value['detailItemKeys'] !== undefined && !isStringArray(value['detailItemKeys'])) return false;
    if (value['step'] !== undefined && !isNumberThunkFriendly(value['step'])) return false;
    if (value['disabled'] !== undefined && typeof value['disabled'] !== 'boolean') return false;
    if (value['lazy'] !== undefined && typeof value['lazy'] !== 'boolean') return false;

    return true;
};

const isTabGroupConfig = (value: unknown): boolean => {
    if (!isRecord(value)) return false;

    const stringFields = [
        'containerClasses',
        'listContainerClasses',
        'listHeaderClasses',
        'tabListClasses',
        'tabButtonClasses',
        'activeTabButtonClasses',
        'inactiveTabButtonClasses',
        'buttonContentClasses',
        'textStackClasses',
        'indexLabelClasses',
        'activeIndexLabelClasses',
        'inactiveIndexLabelClasses',
        'titleClasses',
        'summaryClasses',
        'panelsClasses',
        'panelBodyClasses',
        'panelLoadingClasses',
        'panelClasses',
        'detailHeaderClasses',
        'detailIconClasses',
        'detailTextStackClasses',
        'detailTitleClasses',
        'detailMetaClasses',
        'detailMetaIconClasses',
        'detailSummaryClasses',
        'detailMetaIconName',
        'detailContentLabelClasses',
        'detailContentClasses',
        'detailItemsLabelClasses',
        'detailListClasses',
        'detailListItemClasses',
        'detailListItemIconClasses',
        'detailItemIconName',
    ] as const;
    if (stringFields.some((field) => value[field] !== undefined && typeof value[field] !== 'string')) return false;

    const textFields = ['listHeaderLabel', 'detailContentLabel', 'detailItemsLabel'] as const;
    if (textFields.some((field) => !isTextLikeValue(value[field]))) return false;

    if (value['activeId'] !== undefined && typeof value['activeId'] !== 'string') return false;
    if (value['tabs'] !== undefined && (!Array.isArray(value['tabs']) || !value['tabs'].every(isTabDefinition))) return false;
    if (value['tabsSource'] !== undefined && !isTabItemsSource(value['tabsSource'])) return false;
    if (value['layout'] !== undefined && value['layout'] !== 'default' && value['layout'] !== 'split-detail') return false;
    if (value['orientation'] !== undefined && value['orientation'] !== 'horizontal' && value['orientation'] !== 'vertical') return false;
    if (value['scrollBehavior'] !== undefined && value['scrollBehavior'] !== 'none' && value['scrollBehavior'] !== 'center') return false;

    return true;
};

const isTooltipConfig = (value: unknown): boolean => {
    if (!isRecord(value)) return false;

    const stringFields = ['id', 'ariaDescription', 'surfaceClasses', 'arrowClasses', 'motionClasses'] as const;
    if (stringFields.some((field) => value[field] !== undefined && typeof value[field] !== 'string')) return false;

    if (value['position'] !== undefined && !['top', 'bottom', 'left', 'right'].includes(String(value['position']))) return false;
    if (value['trigger'] !== undefined && !['hover', 'focus', 'both'].includes(String(value['trigger']))) return false;
    if (value['showDelayMs'] !== undefined && !isNumberThunkFriendly(value['showDelayMs'])) return false;
    if (value['hideDelayMs'] !== undefined && !isNumberThunkFriendly(value['hideDelayMs'])) return false;
    if (value['ariaLive'] !== undefined && !['off', 'polite', 'assertive'].includes(String(value['ariaLive']))) return false;

    return true;
};

const isStatsCounterConfig = (value: unknown): boolean => {
    if (!isRecord(value)) return false;

    const allowedKeys = new Set([
        'target',
        'durationMs',
        'startOnVisible',
        'ariaLabel',
        'min',
        'max',
        'formatMode',
        'formatPrefix',
        'formatSuffix',
    ]);

    if (Object.keys(value).some((key) => !allowedKeys.has(key))) return false;
    if (value['target'] !== undefined && !isNumberThunkFriendly(value['target'])) return false;
    if (value['durationMs'] !== undefined && !isNumberThunkFriendly(value['durationMs'])) return false;
    if (value['startOnVisible'] !== undefined && typeof value['startOnVisible'] !== 'boolean') return false;
    if (value['ariaLabel'] !== undefined && typeof value['ariaLabel'] !== 'string') return false;
    if (value['min'] !== undefined && !isNumberThunkFriendly(value['min'])) return false;
    if (value['max'] !== undefined && !isNumberThunkFriendly(value['max'])) return false;
    if (value['formatMode'] !== undefined && typeof value['formatMode'] !== 'string') return false;
    if (value['formatPrefix'] !== undefined && typeof value['formatPrefix'] !== 'string') return false;
    if (value['formatSuffix'] !== undefined && typeof value['formatSuffix'] !== 'string') return false;

    return true;
};

const isInteractionScopeConfig = (value: unknown): boolean => {
    if (!isRecord(value)) return false;
    if (value['scopeId'] !== undefined && typeof value['scopeId'] !== 'string') return false;
    if (value['id'] !== undefined && typeof value['id'] !== 'string') return false;
    if (value['tag'] !== undefined && !['div', 'section', 'form'].includes(String(value['tag']))) return false;
    if (value['components'] !== undefined && !isStringArray(value['components'])) return false;
    if (value['initialValues'] !== undefined && !isRecord(value['initialValues'])) return false;
    if (value['autoSubmit'] !== undefined && !isInteractionAutoSubmitConfig(value['autoSubmit'])) return false;
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
    if (value['domain'] !== undefined && typeof value['domain'] !== 'string') return false;
    if (value['pageId'] !== undefined && typeof value['pageId'] !== 'string') return false;
    if (!ALLOWED_COMPONENT_TYPES.has(value['type'])) return false;
    if (value['condition'] !== undefined && typeof value['condition'] !== 'string' && typeof value['condition'] !== 'boolean') return false;
    if (value['valueInstructions'] !== undefined && typeof value['valueInstructions'] !== 'string') return false;
    if (value['eventInstructions'] !== undefined && typeof value['eventInstructions'] !== 'string') return false;
    if (value['loopConfig'] !== undefined && !isLoopConfig(value['loopConfig'])) return false;

    if (value['type'] === 'generic-card') {
        return isGenericCardConfig(value['config']);
    }

    if (value['type'] === 'button') {
        return isGenericButtonConfig(value['config']);
    }

    if (value['type'] === 'accordion') {
        return isAccordionConfig(value['config']);
    }

    if (value['type'] === 'input') {
        return isGenericInputConfig(value['config']);
    }

    if (value['type'] === 'interaction-scope') {
        return isInteractionScopeConfig(value['config']);
    }

    if (value['type'] === 'search-box') {
        return isSearchBoxConfig(value['config']);
    }

    if (value['type'] === 'stats-counter') {
        return isStatsCounterConfig(value['config']);
    }

    if (value['type'] === 'tab-group') {
        return isTabGroupConfig(value['config']);
    }

    if (value['type'] === 'tooltip') {
        return isTooltipConfig(value['config']);
    }

    return true;
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

const isStatsCountersVariableConfig = (value: unknown): boolean =>
    isRecord(value) && Object.values(value).every((entry) => entry === undefined || isStatsCounterVariableConfig(entry));

const isThemeColorToken = (value: unknown): value is TThemeAccentColorToken =>
    typeof value === 'string' && (THEME_ACCENT_COLOR_TOKENS as readonly string[]).includes(value);

const isThemeColors = (value: unknown): value is TThemeColors => {
    if (!isRecord(value)) return false;
    return THEME_COLOR_KEYS.every((key) => typeof value[key] === 'string');
};

const isModalSize = (value: unknown): boolean => value === 'sm' || value === 'md' || value === 'lg' || value === 'full';

const isDraftModalUiConfig = (value: unknown): value is TDraftModalUiConfig => {
    if (!isRecord(value)) return false;

    const stringFields = [
        'ariaLabel',
        'ariaLabelKey',
        'ariaDescribedBy',
        'containerClasses',
        'containerDialogClasses',
        'containerSheetClasses',
        'panelClasses',
        'panelDialogClasses',
        'panelSheetClasses',
        'panelMotionClasses',
        'panelNoMotionClasses',
        'panelSMClasses',
        'panelMDClasses',
        'panelLGClasses',
        'accentBarClasses',
        'closeButtonClasses',
    ] as const;

    if (value['size'] !== undefined && !isModalSize(value['size'])) return false;
    if (value['closeOnBackdrop'] !== undefined && typeof value['closeOnBackdrop'] !== 'boolean') return false;
    if (value['showCloseButton'] !== undefined && typeof value['showCloseButton'] !== 'boolean') return false;
    if (value['showAccentBar'] !== undefined && typeof value['showAccentBar'] !== 'boolean') return false;
    if (value['accentColor'] !== undefined && !isThemeColorToken(value['accentColor'])) return false;
    if (value['variant'] !== undefined && value['variant'] !== 'dialog' && value['variant'] !== 'sheet') return false;
    if (stringFields.some((key) => value[key] !== undefined && typeof value[key] !== 'string')) return false;

    return true;
};

const isDraftUiVariableConfig = (value: unknown): value is TDraftUiVariableConfig => {
    if (!isRecord(value)) return false;

    if (value['contact'] !== undefined && !isDraftContactVariableConfig(value['contact'])) return false;

    const modals = value['modals'];
    if (modals !== undefined) {
        if (!isRecord(modals)) return false;
        if (!Object.values(modals).every((entry) => isDraftModalUiConfig(entry))) return false;
    }

    const toast = value['toast'];
    if (toast !== undefined && !isDraftToastUiConfig(toast)) return false;

    const loadingCurtain = value['loadingCurtain'];
    if (loadingCurtain !== undefined && !isDraftLoadingCurtainUiConfig(loadingCurtain)) return false;

    const languageOptions = value['languageOptions'];
    if (languageOptions !== undefined && !Array.isArray(languageOptions)) return false;

    return true;
};

const isDraftVariableConfig = (value: unknown): boolean => {
    if (!isRecord(value)) return false;

    if (value['statsCounters'] !== undefined && !isStatsCountersVariableConfig(value['statsCounters'])) return false;
    if (value['theme'] !== undefined && !isThemeVariableConfig(value['theme'])) return false;
    if (value['i18n'] !== undefined && !isDraftI18nVariableConfig(value['i18n'])) return false;
    if (value['appIdentity'] !== undefined && !isDraftAppIdentityVariableConfig(value['appIdentity'])) return false;
    if (value['ui'] !== undefined && !isDraftUiVariableConfig(value['ui'])) return false;
    if (value['brand'] !== undefined && !isDraftBrandVariableConfig(value['brand'])) return false;
    if (value['heroAssets'] !== undefined && !isDraftHeroAssetsVariableConfig(value['heroAssets'])) return false;
    if (value['ctaTargets'] !== undefined && !isDraftCtaTargetsVariableConfig(value['ctaTargets'])) return false;
    if (value['navigation'] !== undefined && !isDraftNavigationVariableConfig(value['navigation'])) return false;

    const socialLinks = value['socialLinks'];
    if (socialLinks !== undefined && (!Array.isArray(socialLinks) || !socialLinks.every((entry) => isDraftSocialLinkConfig(entry)))) {
        return false;
    }

    return true;
};

const isDraftSiteSharedConfig = (value: unknown): value is TDraftSiteSharedConfig => {
    if (!isRecord(value)) return false;
    if (!isDraftAppIdentityVariableConfig(value['appIdentity'])) return false;
    if (!isThemeVariableConfig(value['theme'])) return false;
    if (!isDraftI18nVariableConfig(value['i18n'])) return false;
    if (value['icons'] !== undefined && !isDraftSiteIconConfig(value['icons'])) return false;
    if (value['seo'] !== undefined && !isDraftSiteSeoConfig(value['seo'])) return false;
    if (value['searchConsole'] !== undefined && !isSearchConsoleConfig(value['searchConsole'])) return false;
    if (value['hostOverrides'] !== undefined && !isDraftHostOverrideMap(value['hostOverrides'])) return false;
    return true;
};

const isDraftSiteDefaultsConfig = (value: unknown): value is TDraftSiteDefaultsConfig => {
    if (!isDraftVariableConfig(value)) return false;
    if (!isRecord(value)) return false;
    if (value['appIdentity'] !== undefined) return false;
    if (value['theme'] !== undefined) return false;
    if (value['i18n'] !== undefined) return false;
    return true;
};

const isDraftToastUiConfig = (value: unknown): value is TDraftToastUiConfig => {
    if (!isRecord(value)) return false;

    const stringFields = [
        'hostClasses',
        'hostTopClasses',
        'hostBottomClasses',
        'hostLeftClasses',
        'hostRightClasses',
        'hostCenterClasses',
        'itemClasses',
        'hoveredItemClasses',
        'levelSuccessClasses',
        'levelErrorClasses',
        'levelWarningClasses',
        'levelInfoClasses',
        'progressClasses',
        'progressBarClasses',
        'progressBarSurfaceClasses',
        'iconSurfaceClasses',
        'iconContainerClasses',
        'iconSuccessClasses',
        'iconErrorClasses',
        'iconWarningClasses',
        'iconInfoClasses',
        'contentClasses',
        'titleClasses',
        'textClasses',
        'actionsClasses',
        'actionButtonClasses',
        'actionPrimaryClasses',
        'actionSecondaryClasses',
        'dismissButtonClasses',
    ] as const;

    if (stringFields.some((key) => value[key] !== undefined && typeof value[key] !== 'string')) return false;

    return true;
};

const isDraftSiteEnvironmentConfig = (value: unknown): value is TDraftSiteEnvironmentConfig => {
    if (!isRecord(value)) return false;
    if (value['aliases'] !== undefined && !isStringArray(value['aliases'])) return false;
    return true;
};

const isDraftSiteEnvironmentMap = (value: unknown): value is Record<string, TDraftSiteEnvironmentConfig> => {
    if (!isRecord(value)) return false;
    return Object.entries(value).every(([environment, config]) =>
        ALLOWED_RUNTIME_ENVIRONMENTS.has(environment) && isDraftSiteEnvironmentConfig(config)
    );
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
    if (value['seo'] !== undefined && !isSeoPayload(value['seo'])) return false;
    if (value['structuredData'] !== undefined && !isStructuredDataPayload(value['structuredData'])) return false;
    if (value['analytics'] !== undefined && !isAnalyticsConfigPayload(value['analytics'])) return false;
    return true;
};

export const isDraftSiteConfigPayload = (value: unknown): value is TDraftSiteConfigPayload => {
    if (!isRecord(value)) return false;
    if (typeof value['version'] !== 'number') return false;
    if (typeof value['domain'] !== 'string') return false;
    if (value['aliases'] !== undefined && !isStringArray(value['aliases'])) return false;
    if (value['environments'] !== undefined && !isDraftSiteEnvironmentMap(value['environments'])) return false;
    if (value['defaultPageId'] !== undefined && typeof value['defaultPageId'] !== 'string') return false;
    if (value['notFoundPageId'] !== undefined && typeof value['notFoundPageId'] !== 'string') return false;
    if (!Array.isArray(value['routes']) || !value['routes'].every(isDraftSiteRouteEntry)) return false;
    if (value['lifecycle'] !== undefined && !isSiteLifecycleConfig(value['lifecycle'])) return false;
    if (value['runtime'] !== undefined && !isDraftSiteRuntimeConfig(value['runtime'])) return false;
    if (value['sitemap'] !== undefined && !isDraftSitemapConfig(value['sitemap'])) return false;
    if (!isDraftSiteSharedConfig(value['site'])) return false;
    if (value['defaults'] !== undefined && !isDraftSiteDefaultsConfig(value['defaults'])) return false;
    return true;
};

export const isConfigRegistryPayload = (value: unknown): value is TConfigRegistryPayload => {
    if (!isRecord(value)) return false;
    if (typeof value['version'] !== 'number') return false;
    if (typeof value['domain'] !== 'string') return false;
    if (value['aliases'] !== undefined && !isStringArray(value['aliases'])) return false;
    if (value['defaultPageId'] !== undefined && typeof value['defaultPageId'] !== 'string') return false;
    if (value['notFoundPageId'] !== undefined && typeof value['notFoundPageId'] !== 'string') return false;
    if (!Array.isArray(value['routes']) || !value['routes'].every(isDraftSiteRouteEntry)) return false;
    if (!isSiteLifecycleConfig(value['lifecycle'])) return false;
    if (value['draft'] !== undefined && !isConfigVersionPointer(value['draft'])) return false;
    if (value['published'] !== undefined && !isConfigVersionPointer(value['published'])) return false;
    if (value['metadata'] !== undefined && !isRecord(value['metadata'])) return false;
    return true;
};

export const isComponentsPayload = (value: unknown): value is TComponentsPayload => {
    if (!isRecord(value)) return false;
    if (typeof value['version'] !== 'number') return false;
    if (typeof value['pageId'] !== 'string') return false;
    if (typeof value['domain'] !== 'string') return false;
    if (!Array.isArray(value['components'])) return false;

    const ids = new Set<string>();

    for (const component of value['components']) {
        if (!isComponentPayloadRecord(component)) {
            return false;
        }

        const id = String(component['id']).trim();
        if (ids.has(id)) {
            return false;
        }
        ids.add(id);
    }

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

    return isDraftVariableConfig(value['variables']);
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

const isAuthoringDraftFile = (value: unknown): value is TAuthoringDraftFile => {
    if (!isRecord(value)) return false;
    if (typeof value['path'] !== 'string' || value['path'].trim().length === 0) return false;
    if (typeof value['kind'] !== 'string' || !ALLOWED_AUTHORING_FILE_KINDS.has(value['kind'])) return false;
    if (value['pageId'] !== undefined && typeof value['pageId'] !== 'string') return false;
    if (value['lang'] !== undefined && typeof value['lang'] !== 'string') return false;
    if (!isRecord(value['content'])) return false;
    return true;
};

export const isAuthoringDraftPackage = (value: unknown): value is TAuthoringDraftPackage => {
    if (!isRecord(value)) return false;
    if (typeof value['version'] !== 'number') return false;
    if (typeof value['domain'] !== 'string') return false;
    if (typeof value['stage'] !== 'string' || !ALLOWED_AUTHORING_DRAFT_STAGES.has(value['stage'])) return false;
    if (value['versionId'] !== undefined && typeof value['versionId'] !== 'string') return false;
    if (!Array.isArray(value['files']) || !value['files'].every(isAuthoringDraftFile)) return false;
    if (value['metadata'] !== undefined && !isRecord(value['metadata'])) return false;
    return true;
};

export const isRuntimeBundlePayload = (value: unknown): value is TRuntimeBundlePayload => {
    if (!isRecord(value)) return false;
    if (typeof value['version'] !== 'number') return false;
    if (typeof value['domain'] !== 'string') return false;
    if (typeof value['pageId'] !== 'string') return false;
    if (typeof value['sourceStage'] !== 'string' || !ALLOWED_RUNTIME_BUNDLE_SOURCE_STAGES.has(value['sourceStage'])) return false;
    if (value['versionId'] !== undefined && typeof value['versionId'] !== 'string') return false;
    if (value['lang'] !== undefined && typeof value['lang'] !== 'string') return false;
    if (value['generatedAt'] !== undefined && typeof value['generatedAt'] !== 'string') return false;
    if (value['route'] !== undefined && value['route'] !== null && !isDraftSiteRouteEntry(value['route'])) return false;
    if (value['lifecycle'] !== undefined && !isSiteLifecycleConfig(value['lifecycle'])) return false;
    if (!isDraftSiteConfigPayload(value['siteConfig'])) return false;
    if (!isPageConfigPayload(value['pageConfig'])) return false;
    if (!isComponentsPayload(value['components'])) return false;
    if (value['variables'] !== undefined && value['variables'] !== null && !isVariablesPayload(value['variables'])) return false;
    if (value['angoraCombos'] !== undefined && value['angoraCombos'] !== null && !isAngoraCombosPayload(value['angoraCombos'])) return false;
    if (value['i18n'] !== undefined && value['i18n'] !== null && !isI18nPayload(value['i18n'])) return false;
    if (value['metadata'] !== undefined && !isRecord(value['metadata'])) return false;
    return true;
};

export const isSeoPayload = (value: unknown): value is TSeoPayload => {
    if (!isRecord(value)) return false;
    if (value['title'] !== undefined && typeof value['title'] !== 'string' && !isStringRecord(value['title'])) return false;
    if (value['description'] !== undefined && typeof value['description'] !== 'string' && !isStringRecord(value['description'])) return false;
    if (value['openGraph'] !== undefined && !isRecord(value['openGraph'])) return false;
    if (value['twitter'] !== undefined && !isRecord(value['twitter'])) return false;
    if (value['canonical'] !== undefined && typeof value['canonical'] !== 'string' && !isStringRecord(value['canonical'])) return false;
    if (value['keywords'] !== undefined && !isLocalizedKeywordValue(value['keywords'])) return false;
    if (value['robots'] !== undefined && typeof value['robots'] !== 'string' && !isStringRecord(value['robots'])) return false;
    return true;
};

export const isStructuredDataPayload = (value: unknown): value is TStructuredDataPayload => {
    if (!isRecord(value)) return false;
    if (!Array.isArray(value['entries'])) return false;
    if (!value['entries'].every((entry) => isRecord(entry))) return false;
    return true;
};

export const isAnalyticsConfigPayload = (value: unknown): value is TAnalyticsConfigPayload => {
    if (!isRecord(value)) return false;
    if (value['sectionIds'] !== undefined && !isStringArray(value['sectionIds'])) return false;
    if (value['scrollMilestones'] !== undefined && !isNumberArray(value['scrollMilestones'])) return false;
    if (value['events'] !== undefined && !isStringRecord(value['events'])) return false;
    if (value['categories'] !== undefined && !isStringRecord(value['categories'])) return false;
    if (value['quickStats'] !== undefined && !isAnalyticsQuickStatsConfig(value['quickStats'])) return false;
    if (value['track'] !== undefined
        && (!Array.isArray(value['track'])
            || !value['track'].every((entry) => typeof entry === 'string' && ALLOWED_TRACK_OPTIONS.has(entry as TTrackOptions)))) {
        return false;
    }
    return true;
};
