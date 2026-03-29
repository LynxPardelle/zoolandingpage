import type {
    TAnalyticsConfigPayload,
    TAngoraCombosPayload,
    TComponentsPayload,
    TDraftContactVariableConfig,
    TDraftLanguageDefinition,
    TDraftModalUiConfig,
    TDraftSiteConfigPayload,
    TDraftSocialLinkConfig,
    TDraftUiVariableConfig,
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

const isNumberArray = (value: unknown): value is readonly number[] =>
    Array.isArray(value) && value.every((item) => typeof item === 'number' && Number.isFinite(item));

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
    if (value['name'] !== undefined && typeof value['name'] !== 'string') return false;
    if (value['role'] !== undefined && typeof value['role'] !== 'string') return false;
    if (value['company'] !== undefined && typeof value['company'] !== 'string') return false;
    if (value['content'] !== undefined && typeof value['content'] !== 'string') return false;
    if (value['avatar'] !== undefined && typeof value['avatar'] !== 'string') return false;
    if (value['verified'] !== undefined && typeof value['verified'] !== 'boolean') return false;
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
        'indexLabelClasses',
        'indexLabelIsExpandedClasses',
        'indexLabelIsNotExpandedClasses',
        'titleClasses',
        'summaryClasses',
        'detailContainerClasses',
        'detailHeaderClasses',
        'detailIconClasses',
        'detailTitleClasses',
        'detailMetaClasses',
        'detailSummaryClasses',
        'detailContentLabelClasses',
        'detailContentClasses',
        'detailItemsLabelClasses',
        'detailListClasses',
        'detailListItemClasses',
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
        'indexLabelClasses',
        'activeIndexLabelClasses',
        'inactiveIndexLabelClasses',
        'titleClasses',
        'summaryClasses',
        'panelClasses',
        'detailHeaderClasses',
        'detailIconClasses',
        'detailTitleClasses',
        'detailMetaClasses',
        'detailSummaryClasses',
        'detailMetaIconName',
        'detailContentLabelClasses',
        'detailContentClasses',
        'detailItemsLabelClasses',
        'detailListClasses',
        'detailListItemClasses',
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
    if (!ALLOWED_COMPONENT_TYPES.has(value['type'])) return false;
    if (value['condition'] !== undefined && typeof value['condition'] !== 'string' && typeof value['condition'] !== 'boolean') return false;
    if (value['valueInstructions'] !== undefined && typeof value['valueInstructions'] !== 'string') return false;
    if (value['eventInstructions'] !== undefined && typeof value['eventInstructions'] !== 'string') return false;

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

    if (value['type'] === 'tab-group') {
        return isTabGroupConfig(value['config']);
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

const isModalSize = (value: unknown): boolean => value === 'sm' || value === 'md' || value === 'lg' || value === 'full';

const isDraftModalUiConfig = (value: unknown): value is TDraftModalUiConfig => {
    if (!isRecord(value)) return false;

    if (value['size'] !== undefined && !isModalSize(value['size'])) return false;
    if (value['closeOnBackdrop'] !== undefined && typeof value['closeOnBackdrop'] !== 'boolean') return false;
    if (value['showCloseButton'] !== undefined && typeof value['showCloseButton'] !== 'boolean') return false;
    if (value['showAccentBar'] !== undefined && typeof value['showAccentBar'] !== 'boolean') return false;
    if (value['accentColor'] !== undefined && !isThemeColorToken(value['accentColor'])) return false;
    if (value['variant'] !== undefined && value['variant'] !== 'dialog' && value['variant'] !== 'sheet') return false;
    if (value['ariaLabel'] !== undefined && typeof value['ariaLabel'] !== 'string') return false;
    if (value['ariaLabelKey'] !== undefined && typeof value['ariaLabelKey'] !== 'string') return false;

    return true;
};

const isDraftUiVariableConfig = (value: unknown): value is TDraftUiVariableConfig => {
    if (!isRecord(value)) return false;

    if (value['mobileMenuAriaLabel'] !== undefined && typeof value['mobileMenuAriaLabel'] !== 'string') return false;
    if (value['brandTextFallback'] !== undefined && typeof value['brandTextFallback'] !== 'string') return false;
    if (value['contact'] !== undefined && !isDraftContactVariableConfig(value['contact'])) return false;

    const modals = value['modals'];
    if (modals !== undefined) {
        if (!isRecord(modals)) return false;
        if (!Object.values(modals).every((entry) => isDraftModalUiConfig(entry))) return false;
    }

    const languageOptions = value['languageOptions'];
    if (languageOptions !== undefined && !Array.isArray(languageOptions)) return false;

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

export const isDraftSiteConfigPayload = (value: unknown): value is TDraftSiteConfigPayload => {
    if (!isRecord(value)) return false;
    if (typeof value['version'] !== 'number') return false;
    if (typeof value['domain'] !== 'string') return false;
    if (value['defaultPageId'] !== undefined && typeof value['defaultPageId'] !== 'string') return false;
    if (!Array.isArray(value['routes']) || !value['routes'].every(isDraftSiteRouteEntry)) return false;
    return true;
};

export const isComponentsPayload = (value: unknown): value is TComponentsPayload => {
    if (!isRecord(value)) return false;
    if (typeof value['version'] !== 'number') return false;
    if (typeof value['pageId'] !== 'string') return false;
    if (typeof value['domain'] !== 'string') return false;
    if (!isRecord(value['components'])) return false;

    for (const [id, component] of Object.entries(value['components'])) {
        if (!isComponentPayloadRecord(component)) {
            return false;
        }
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

    const ui = (value['variables'] as Record<string, unknown>)['ui'];
    if (ui !== undefined && !isDraftUiVariableConfig(ui)) {
        return false;
    }

    const socialLinks = (value['variables'] as Record<string, unknown>)['socialLinks'];
    if (socialLinks !== undefined && (!Array.isArray(socialLinks) || !socialLinks.every((entry) => isDraftSocialLinkConfig(entry)))) {
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
