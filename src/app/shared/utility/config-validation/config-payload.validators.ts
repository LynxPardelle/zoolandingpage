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
    TDraftContactVariableConfig,
    TDraftFeatureRuntimeConfig,
    TDraftLanguageDefinition,
    TDraftLocalStorageRuntimeConfig,
    TDraftLocalStorageSlot,
    TDraftModalUiConfig,
    TDraftSiteConfigPayload,
    TDraftSiteDefaultsConfig,
    TDraftSiteRuntimeConfig,
    TDraftSiteSeoConfig,
    TDraftSiteSharedConfig,
    TDraftSocialLinkConfig,
    TDraftToastUiConfig,
    TDraftUiVariableConfig,
    TI18nPayload,
    TPageConfigPayload,
    TRuntimeBundlePayload,
    TSeoPayload,
    TSiteLifecycleConfig,
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

const ALLOWED_LOCAL_STORAGE_SLOTS = new Set<TDraftLocalStorageSlot>([
    'theme',
    'language',
    'userPreferences',
    'id',
    'sessionId',
    'allowAnalytics',
    'analyticsConsentSnooze',
    'pageViewCount',
]);

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
]);

const ALLOWED_LOOP_BINDING_TRANSFORMS = new Set([
    'i18nKey',
    'locale',
    'navigationHref',
]);

const isStringArray = (value: unknown): value is readonly string[] =>
    Array.isArray(value) && value.every((item) => typeof item === 'string');

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

    const sources = value['sources'];
    if (!Array.isArray(sources) || sources.length === 0 || !sources.every(isLoopBindingSource)) return false;

    return true;
};

const isLoopConfig = (value: unknown): boolean => {
    if (!isRecord(value)) return false;
    if (typeof value['templateId'] !== 'string' || value['templateId'].trim().length === 0) return false;
    if (value['idPrefix'] !== undefined && typeof value['idPrefix'] !== 'string') return false;

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

const isDraftSiteSeoConfig = (value: unknown): value is TDraftSiteSeoConfig => {
    if (!isRecord(value)) return false;
    if (value['siteName'] !== undefined && typeof value['siteName'] !== 'string') return false;
    if (value['title'] !== undefined && typeof value['title'] !== 'string') return false;
    if (value['description'] !== undefined && typeof value['description'] !== 'string') return false;
    if (value['canonicalOrigin'] !== undefined && typeof value['canonicalOrigin'] !== 'string') return false;
    if (value['defaultImage'] !== undefined && typeof value['defaultImage'] !== 'string') return false;
    if (value['openGraph'] !== undefined && !isRecord(value['openGraph'])) return false;
    if (value['twitter'] !== undefined && !isRecord(value['twitter'])) return false;
    return true;
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
    if (value['track'] !== undefined
        && (!Array.isArray(value['track'])
            || !value['track'].every((entry) => typeof entry === 'string' && ALLOWED_TRACK_OPTIONS.has(entry as TTrackOptions)))) {
        return false;
    }
    return true;
};

const isDraftSiteRuntimeConfig = (value: unknown): value is TDraftSiteRuntimeConfig => {
    if (!isRecord(value)) return false;
    if (value['app'] !== undefined) return false;
    if (value['localStorage'] !== undefined && !isDraftLocalStorageRuntimeConfig(value['localStorage'])) return false;
    if (value['features'] !== undefined && !isDraftFeatureRuntimeConfig(value['features'])) return false;
    if (value['analytics'] !== undefined && !isDraftAnalyticsRuntimeConfig(value['analytics'])) return false;
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
    if (value['featureIconContainerClasses'] !== undefined && typeof value['featureIconContainerClasses'] !== 'string') return false;
    if (value['featureIconClasses'] !== undefined && typeof value['featureIconClasses'] !== 'string') return false;
    if (value['featureTitleClasses'] !== undefined && typeof value['featureTitleClasses'] !== 'string') return false;
    if (value['featureDescriptionClasses'] !== undefined && typeof value['featureDescriptionClasses'] !== 'string') return false;
    if (value['benefitsListClasses'] !== undefined && typeof value['benefitsListClasses'] !== 'string') return false;
    if (value['benefitItemClasses'] !== undefined && typeof value['benefitItemClasses'] !== 'string') return false;
    if (value['benefitIconClasses'] !== undefined && typeof value['benefitIconClasses'] !== 'string') return false;
    if (value['benefitTextClasses'] !== undefined && typeof value['benefitTextClasses'] !== 'string') return false;
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
    if (value['onCta'] !== undefined) return false;

    return true;
};

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

    const stringFields = [
        'name',
        'label',
        'description',
        'helperText',
        'placeholder',
        'ariaLabel',
        'classes',
        'labelClasses',
        'descriptionClasses',
        'helperTextClasses',
        'fieldClasses',
        'inputClasses',
        'dropdownTriggerClasses',
        'dropdownIndicatorText',
        'dropdownIndicatorClasses',
        'optionContainerClasses',
        'optionClasses',
        'activeOptionClasses',
        'errorClasses',
        'valuePrefix',
        'valueSuffix',
    ] as const;

    if (stringFields.some((field) => !isStringThunkFriendly(value[field]))) {
        return false;
    }

    const numberFields = ['min', 'max', 'step', 'rows'] as const;
    if (numberFields.some((field) => !isNumberThunkFriendly(value[field]))) {
        return false;
    }

    const booleanFields = ['showRangeValue', 'required', 'disabled', 'readOnly'] as const;
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
    if (value['seo'] !== undefined && !isDraftSiteSeoConfig(value['seo'])) return false;
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
    if (value['defaultPageId'] !== undefined && typeof value['defaultPageId'] !== 'string') return false;
    if (!Array.isArray(value['routes']) || !value['routes'].every(isDraftSiteRouteEntry)) return false;
    if (value['lifecycle'] !== undefined && !isSiteLifecycleConfig(value['lifecycle'])) return false;
    if (value['runtime'] !== undefined && !isDraftSiteRuntimeConfig(value['runtime'])) return false;
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
    if (value['route'] !== undefined && !isDraftSiteRouteEntry(value['route'])) return false;
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
    if (value['title'] !== undefined && typeof value['title'] !== 'string') return false;
    if (value['description'] !== undefined && typeof value['description'] !== 'string') return false;
    if (value['openGraph'] !== undefined && !isRecord(value['openGraph'])) return false;
    if (value['twitter'] !== undefined && !isRecord(value['twitter'])) return false;
    if (value['canonical'] !== undefined && typeof value['canonical'] !== 'string') return false;
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
